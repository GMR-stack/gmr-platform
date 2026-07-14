import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReportSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import {
  getBillingKeyInfo,
  chargeBillingKey,
  getPaymentStatus,
  calcNextBillingAt,
  calcProratedSeatAmount,
  getCardlogueSupabase,
  getCardlogueUserFromToken,
  isTeamBillingAdmin,
  getTeamMemberCount,
} from "./portone";
import {
  getPaddleEnvironment,
  getPaddleSeatUnitPriceCents,
  createTransaction,
  chargeExistingSubscription,
  updateSubscriptionRecurringPrice,
  rescheduleNextBilling,
  verifyPaddleWebhookSignature,
} from "./paddle";

const TEAM_SEAT_PRICE_KRW = 2200;

async function sendAdminEmail(subject: string, body: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    console.warn("[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping notification");
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });
    await transporter.sendMail({
      from: gmailUser,
      to: "globalmarketradar@gmail.com",
      subject,
      text: body,
    });
    console.log("[email] Admin notification sent:", subject);
  } catch (err: any) {
    console.error("[email] Failed to send admin notification:", err.message);
  }
}

async function sendNewSubscriberEmail(userId: string, subscriptionId: string) {
  const date = new Date().toUTCString();
  await sendAdminEmail(
    "New GMR Subscriber!",
    `A new subscriber has joined GMR.\n\nUser ID: ${userId}\nPayPal Subscription ID: ${subscriptionId}\nDate: ${date}`
  );
}

async function sendCancellationEmail(userId: string, subscriptionId: string) {
  const date = new Date().toUTCString();
  await sendAdminEmail(
    "GMR Subscriber Cancelled",
    `A subscriber has cancelled.\n\nUser ID: ${userId}\nPayPal Subscription ID: ${subscriptionId}\nDate: ${date}`
  );
}

async function getSupabaseUser(req: Request): Promise<{ sub: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (!payload.sub || !payload.email) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const supaUser = await getSupabaseUser(req);
  if (!supaUser) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const user = await storage.getUserBySupabaseId(supaUser.sub);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  (req as any).user = user;
  next();
}

const ADMIN_EMAIL = "globalmarketradar@gmail.com";

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const allReports = await storage.getReports();
      const freeReports = allReports.filter((r) => r.reportType === "free");

      const freeReportUrls = freeReports
        .map((r) => {
          const lastmod = new Date(r.publishedAt).toISOString().split("T")[0];
          return `  <url>\n    <loc>https://www.globalmarketradar.com/report/${r.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>never</changefreq>\n    <priority>0.7</priority>\n  </url>`;
        })
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.globalmarketradar.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.globalmarketradar.com/archive</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${freeReportUrls}
</urlset>`;

      res.setHeader("Content-Type", "application/xml");
      res.send(xml);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      res.status(500).send("Failed to generate sitemap");
    }
  });

  app.post("/api/auth/sync", async (req, res) => {
    try {
      const { supabaseId, email, name, avatarUrl } = req.body;
      if (!supabaseId || !email) {
        return res.status(400).json({ message: "Missing supabaseId or email" });
      }

      let user = await storage.getUserBySupabaseId(supabaseId);
      if (user) {
        user = (await storage.updateUser(user.id, { name, avatarUrl })) || user;
      } else {
        user = await storage.createUser({ supabaseId, email, name, avatarUrl, isAdmin: false });
      }

      return res.json(user);
    } catch (err: any) {
      console.error("Auth sync error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/auth/delete-account", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      console.log("[delete-account] Starting deletion for user:", { id: user.id, email: user.email, supabaseId: user.supabaseId });

      const subscription = await storage.getSubscription(user.id);
      console.log("[delete-account] Subscription found:", subscription ? { id: subscription.id, status: subscription.status } : "none");

      if (subscription?.status === "active" && subscription.paypalSubscriptionId) {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        if (clientId && clientSecret) {
          try {
            const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
              },
              body: "grant_type=client_credentials",
            });
            const tokenData = await tokenRes.json();
            if (tokenData.access_token) {
              const cancelRes = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscription.paypalSubscriptionId}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenData.access_token}` },
                body: JSON.stringify({ reason: "User account deletion" }),
              });
              console.log("[delete-account] PayPal cancel status:", cancelRes.status);
            }
          } catch (e) {
            console.error("[delete-account] PayPal cancel error:", e);
          }
        }
      }

      console.log("[delete-account] Deleting DB records for userId:", user.id);
      try {
        await storage.deleteAccount(user.id);
        console.log("[delete-account] DB records deleted successfully");
      } catch (dbErr: any) {
        console.error("[delete-account] DB deletion error:", dbErr.message);
        throw dbErr;
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      console.log("[delete-account] Supabase config — url present:", !!supabaseUrl, "serviceRoleKey present:", !!serviceRoleKey);
      console.log("[delete-account] Deleting Supabase Auth user:", user.supabaseId);

      if (supabaseUrl && serviceRoleKey && user.supabaseId) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.supabaseId);
          if (authDeleteError) {
            console.error("[delete-account] Supabase Auth delete error:", authDeleteError.message);
          } else {
            console.log("[delete-account] Supabase Auth user deleted successfully");
          }
        } catch (e: any) {
          console.error("[delete-account] Supabase Admin client error:", e.message);
        }
      } else {
        console.warn("[delete-account] Skipping Supabase Auth deletion — missing config or supabaseId");
      }

      console.log("[delete-account] Deletion complete for:", user.email);
      return res.json({ message: "Account deleted" });
    } catch (err: any) {
      console.error("[delete-account] Fatal error:", err.message);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/reports", async (_req, res) => {
    try {
      const reports = await storage.getReports();
      return res.json(reports);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/recent", async (_req, res) => {
    try {
      const reports = await storage.getRecentReports(5);
      return res.json(reports);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ message: "Invalid report id" });
      const report = await storage.getReport(id);
      if (!report) return res.status(404).json({ message: "Report not found" });
      return res.json(report);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post("/api/reports", requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = insertReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid report data", errors: parsed.error.errors });
      }
      const report = await storage.createReport(parsed.data);
      return res.status(201).json(report);
    } catch (err: any) {
      console.error("Create report error:", err);
      return res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.put("/api/reports/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      if (!id) return res.status(400).json({ message: "Invalid report id" });
      const parsed = insertReportSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid report data", errors: parsed.error.errors });
      }
      const updated = await storage.updateReport(id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Report not found" });
      return res.json(updated);
    } catch (err: any) {
      console.error("Update report error:", err);
      return res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.delete("/api/reports/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      if (!id) return res.status(400).json({ message: "Invalid report id" });
      await storage.deleteReport(id);
      return res.status(204).send();
    } catch (err: any) {
      console.error("Delete report error:", err);
      return res.status(500).json({ message: "Failed to delete report" });
    }
  });

  app.get("/api/paypal/client-id", (_req, res) => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: "PayPal client ID not configured" });
    }
    return res.json({ clientId });
  });

  app.post("/api/paypal/create-subscription", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { subscriptionId } = req.body;
      if (!subscriptionId) {
        return res.status(400).json({ message: "Missing subscriptionId" });
      }

      const existing = await storage.getSubscription(user.id);
      if (existing && existing.status === "active") {
        return res.json({ message: "Already subscribed", subscription: existing });
      }

      const subscription = await storage.createSubscription({
        userId: user.id,
        paypalSubscriptionId: subscriptionId,
        status: "active",
      });

      return res.status(201).json(subscription);
    } catch (err: any) {
      console.error("PayPal create subscription error:", err);
      return res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/paypal/cancel-subscription", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const subscription = await storage.getSubscription(user.id);

      if (!subscription || subscription.status !== "active") {
        return res.status(400).json({ message: "No active subscription found" });
      }

      const paypalSubscriptionId = subscription.paypalSubscriptionId;

      if (paypalSubscriptionId) {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (clientId && clientSecret) {
          const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            },
            body: "grant_type=client_credentials",
          });
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          if (accessToken) {
            await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${paypalSubscriptionId}/cancel`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ reason: "User requested cancellation" }),
            });
          }
        }

        await storage.updateSubscriptionStatus(paypalSubscriptionId, "cancelled");
        await sendCancellationEmail(user.id, paypalSubscriptionId);
      } else {
        await storage.updateSubscriptionStatusByUserId(user.id, "cancelled");
        await sendCancellationEmail(user.id, "N/A");
      }

      return res.json({ message: "Subscription cancelled" });
    } catch (err: any) {
      console.error("Cancel subscription error:", err);
      return res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post("/api/paypal/webhook", async (req, res) => {
    try {
      const event = req.body;
      const eventType = event?.event_type;

      if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const subscriptionId = event?.resource?.id;
        if (subscriptionId) {
          const existing = await storage.getSubscriptionByPaypalId(subscriptionId);
          if (existing) {
            await storage.updateSubscriptionStatus(subscriptionId, "active");
            await sendNewSubscriberEmail(existing.userId, subscriptionId);
          }
        }
      } else if (
        eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
        eventType === "BILLING.SUBSCRIPTION.EXPIRED" ||
        eventType === "BILLING.SUBSCRIPTION.SUSPENDED"
      ) {
        const subscriptionId = event?.resource?.id;
        if (subscriptionId) {
          await storage.updateSubscriptionStatus(subscriptionId, "cancelled");
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("PayPal webhook error:", err);
      return res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  app.get("/api/report-reads", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const readIds = await storage.getReadReportIds(user.id);
      return res.json(readIds);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch read reports" });
    }
  });

  app.post("/api/report-reads/:reportId", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { reportId } = req.params;
      const read = await storage.markReportRead(user.id, reportId);
      return res.json(read);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to mark report as read" });
    }
  });

  app.get("/api/subscriptions/me", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const sub = await storage.getSubscription(user.id);
      return res.json(sub || null);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // ── Market data ──────────────────────────────────────────────────────────
  app.get("/api/market/snapshot", async (req, res) => {
    const tickers = [
      { key: "sp500",  symbol: "%5EGSPC",  name: "S&P 500" },
      { key: "brent",  symbol: "BZ%3DF",   name: "Brent Crude" },
      { key: "dxy",    symbol: "DX-Y.NYB", name: "DXY" },
      { key: "us10y",  symbol: "%5ETNX",   name: "US 10Y" },
      { key: "gold",   symbol: "GC%3DF",   name: "Gold" },
      { key: "vix",    symbol: "%5EVIX",   name: "VIX" },
    ];
    try {
      const results = await Promise.all(
        tickers.map(async (t) => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t.symbol}?interval=1d&range=2d`;
          const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!r.ok) return { key: t.key, name: t.name, price: null, change: null };
          const data = await r.json() as any;
          const meta = data?.chart?.result?.[0]?.meta;
          const price: number | null = meta?.regularMarketPrice ?? null;
          const prev: number | null = meta?.chartPreviousClose ?? meta?.previousClose ?? null;
          const change: number | null = (price != null && prev != null && prev !== 0)
            ? ((price - prev) / prev) * 100
            : null;
          return { key: t.key, name: t.name, price, change };
        })
      );
      const map: Record<string, any> = {};
      results.forEach((r) => { map[r.key] = r; });
      return res.json(map);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  app.get("/api/market/sentiment", async (req, res) => {
    try {
      const r = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Referer": "https://edition.cnn.com/markets/fear-and-greed",
          "Origin": "https://edition.cnn.com",
          "Connection": "keep-alive",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
      });
      if (!r.ok) return res.status(502).json({ message: "CNN API error" });
      const data = await r.json() as any;
      const score: number = data?.fear_and_greed?.score ?? data?.score ?? null;
      const rating: string = data?.fear_and_greed?.rating ?? data?.rating ?? "";
      return res.json({ score, rating });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch sentiment data" });
    }
  });

  // ── Economic Calendar ────────────────────────────────────────────────────
  app.get("/api/economic-calendar", async (_req, res) => {
    try {
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "FMP API key not configured" });

      const from = new Date().toISOString().split("T")[0];
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const r = await fetch(
        `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!r.ok) return res.status(502).json({ message: "FMP API error" });

      const data = await r.json() as any[];

      if (!Array.isArray(data)) {
        return res.status(502).json({ message: "Unexpected FMP response" });
      }

      const important = data
        .filter((e: any) => e.impact === "High")
        .slice(0, 8)
        .map((e: any) => ({
          date: e.date,
          event: e.event,
          country: e.country,
          impact: e.impact,
          actual: e.actual ?? null,
          estimate: e.estimate ?? null,
          previous: e.previous ?? null,
        }));

      return res.json(important);
    } catch (err: any) {
      console.error("Economic calendar error:", err);
      return res.status(500).json({ message: "Failed to fetch economic calendar" });
    }
  });

  // ── Cardlogue team payment (PortOne, Korea) ─────────────────────────────
  app.post("/api/portone/team-subscribe", async (req, res) => {
    try {
      const { billingKey, teamId, slotCount, customerName, customerEmail } = req.body;
      if (!billingKey || !teamId || !slotCount) {
        return res.status(400).json({ message: "Missing billingKey, teamId, or slotCount" });
      }
      const slots = Number(slotCount);
      if (!Number.isInteger(slots) || slots < 1) {
        return res.status(400).json({ message: "Invalid slotCount" });
      }

      // The request body's userId is not trusted — the caller's identity comes
      // only from their Cardlogue session token, and they must actually be an
      // owner/admin of teamId to touch its billing.
      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      const userId = cardlogueUser.sub;
      if (!(await isTeamBillingAdmin(teamId, userId))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const memberCount = await getTeamMemberCount(teamId);
      const minSlots = Math.max(2, memberCount);
      if (slots < minSlots) {
        return res.status(400).json({ message: `slotCount can't be below the current member count (${minSlots})` });
      }

      // Confirm PortOne actually issued this billing key before charging it.
      await getBillingKeyInfo(billingKey);

      const supabase = getCardlogueSupabase();
      const { data: existing, error: findErr } = await supabase
        .from("subscriptions")
        .select("id, status, slot_count, next_billing_at")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (findErr) throw findErr;

      const isExistingActive = existing?.status === "active";
      const now = new Date();
      let amount = 0;
      let subscriptionFields: Record<string, unknown>;

      if (!isExistingActive) {
        // New team subscription (or reactivating an expired one): charge the full seat count.
        amount = slots * TEAM_SEAT_PRICE_KRW;
        subscriptionFields = {
          user_id: userId,
          team_id: teamId,
          type: "team",
          status: "active",
          slot_count: slots,
          pending_slot_count: null,
          payment_method: "web",
          next_billing_at: calcNextBillingAt(now).toISOString(),
          portone_billing_key: billingKey,
        };
      } else if (slots === existing!.slot_count) {
        // Same seat count — just refreshing the card/billing key, no charge.
        subscriptionFields = { portone_billing_key: billingKey };
      } else if (slots > existing!.slot_count) {
        // Seat increase: bill only the added seats, prorated for the rest of this cycle.
        amount = calcProratedSeatAmount(now, slots - existing!.slot_count, TEAM_SEAT_PRICE_KRW);
        subscriptionFields = {
          slot_count: slots,
          pending_slot_count: null,
          portone_billing_key: billingKey,
        };
      } else {
        // Seat decrease: free, but only takes effect on the next billing date.
        subscriptionFields = {
          pending_slot_count: slots,
          portone_billing_key: billingKey,
        };
      }

      if (amount > 0) {
        // Deterministic (not random) so a client retry with the same billing key
        // hits PortOne's own duplicate-payment guard instead of charging twice.
        const paymentId = `team-${teamId}-${billingKey}`;
        try {
          await chargeBillingKey({
            paymentId,
            billingKey,
            orderName: `Cardlogue 팀 플랜 (${slots}인)`,
            amount,
            customerName: customerName || "Cardlogue User",
            customerEmail,
          });
        } catch (chargeErr: any) {
          // If this exact charge already succeeded (e.g. the first request's
          // response never reached the client and it retried), treat it as
          // success and continue on to write the subscription row below.
          const existingPayment = await getPaymentStatus(paymentId).catch(() => null);
          if (existingPayment?.status !== "PAID") throw chargeErr;
        }
      }

      const { error: writeErr } = existing
        ? await supabase.from("subscriptions").update(subscriptionFields).eq("id", existing.id)
        : await supabase.from("subscriptions").insert(subscriptionFields);
      if (writeErr) throw writeErr;

      return res.json({
        message: "Team subscription updated",
        nextBillingAt: existing?.next_billing_at ?? calcNextBillingAt(now),
        amount,
        slotCount: isExistingActive && slots < existing!.slot_count ? existing!.slot_count : slots,
      });
    } catch (err: any) {
      console.error("PortOne team-subscribe error:", err.message);
      return res.status(500).json({ message: "Failed to activate team subscription" });
    }
  });

  app.post("/api/portone/webhook", async (req, res) => {
    // TODO: verify the PortOne webhook signature once the webhook secret is
    // registered in the PortOne console (결제알림(Webhook) 관리).
    console.log("[portone webhook]", JSON.stringify(req.body));
    return res.status(200).json({ received: true });
  });

  // ── Cardlogue team payment (Paddle, international) ──────────────────────
  // Paddle Checkout runs entirely client-side, so custom_data attached to a
  // checkout is just client-supplied and not trustworthy on its own. This
  // endpoint does the same membership/slot-floor check as PortOne's
  // team-subscribe route, then hands back a server-approved teamId/userId
  // pair for the client to embed as custom_data — the webhook below only
  // ever trusts custom_data that passed through here.
  app.post("/api/paddle/checkout-context", async (req, res) => {
    try {
      const { teamId, slotCount } = req.body;
      if (!teamId || !slotCount) {
        return res.status(400).json({ message: "Missing teamId or slotCount" });
      }
      const slots = Number(slotCount);
      if (!Number.isInteger(slots) || slots < 1) {
        return res.status(400).json({ message: "Invalid slotCount" });
      }

      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      const userId = cardlogueUser.sub;
      if (!(await isTeamBillingAdmin(teamId, userId))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const memberCount = await getTeamMemberCount(teamId);
      const minSlots = Math.max(2, memberCount);
      if (slots < minSlots) {
        return res.status(400).json({ message: `slotCount can't be below the current member count (${minSlots})` });
      }

      const supabase = getCardlogueSupabase();
      const { data: existing, error: findErr } = await supabase
        .from("subscriptions")
        .select("id, status, slot_count, next_billing_at, paddle_subscription_id")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (findErr) throw findErr;

      const isExistingActive = existing?.status === "active" && existing?.paddle_subscription_id;
      const unitPriceCents = getPaddleSeatUnitPriceCents();
      const now = new Date();

      if (!isExistingActive) {
        // New team subscription (or reactivating one with no Paddle
        // subscription on file yet): needs an actual checkout to collect a
        // card. First charge is prorated for the days left in this cycle —
        // the webhook anchors billing to the 1st once this completes.
        const amountCents = calcProratedSeatAmount(now, slots, unitPriceCents);
        const transaction = await createTransaction({
          slots,
          amountCents,
          customData: { teamId, userId, slots },
        });
        return res.json({
          needsCheckout: true,
          customPriceId: transaction.data.items[0].price.id,
          transactionId: transaction.data.id,
          environment: getPaddleEnvironment(),
        });
      }

      // Every other case already has a card on file (the existing Paddle
      // subscription) — no checkout, no re-entering payment details.
      const subscriptionId = existing!.paddle_subscription_id as string;

      if (slots === existing!.slot_count) {
        // Same seat count — nothing to charge or change.
        return res.json({ needsCheckout: false, slotCount: slots, amount: 0, nextBillingAt: existing!.next_billing_at });
      }

      if (slots > existing!.slot_count) {
        // Seat increase: charge only the added seats now (prorated for the
        // rest of this cycle) directly against the saved card, and update
        // the subscription's recurring price so future renewals bill the
        // new total — neither step opens a checkout.
        const addedSeats = slots - existing!.slot_count;
        const amountCents = calcProratedSeatAmount(now, addedSeats, unitPriceCents);
        await chargeExistingSubscription({
          subscriptionId,
          amountCents,
          description: `Cardlogue 팀 플랜 좌석 추가 (+${addedSeats})`,
        });
        await updateSubscriptionRecurringPrice({
          subscriptionId,
          slots,
          totalCents: slots * unitPriceCents,
        });
        const { error: writeErr } = await supabase
          .from("subscriptions")
          .update({ slot_count: slots, pending_slot_count: null })
          .eq("id", existing!.id);
        if (writeErr) throw writeErr;
        return res.json({
          needsCheckout: false,
          slotCount: slots,
          amount: amountCents,
          nextBillingAt: existing!.next_billing_at,
        });
      }

      // Seat decrease: free, but only takes effect on the next billing date
      // — record the intent and leave the active subscription untouched
      // until then (no Paddle call at all).
      const { error: writeErr } = await supabase
        .from("subscriptions")
        .update({ pending_slot_count: slots })
        .eq("id", existing!.id);
      if (writeErr) throw writeErr;
      return res.json({
        needsCheckout: false,
        slotCount: existing!.slot_count,
        amount: 0,
        nextBillingAt: existing!.next_billing_at,
      });
    } catch (err: any) {
      console.error("Paddle checkout-context error:", err.message);
      return res.status(500).json({ message: "Failed to prepare checkout" });
    }
  });

  app.post("/api/paddle/webhook", async (req, res) => {
    try {
      const signatureHeader = req.headers["paddle-signature"] as string | undefined;
      if (!verifyPaddleWebhookSignature(req.rawBody as Buffer, signatureHeader)) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      const event = req.body;
      const eventType = event?.event_type;
      console.log("[paddle webhook]", eventType);

      if (eventType === "transaction.completed" || eventType === "subscription.created" || eventType === "subscription.activated") {
        const data = event.data;
        const customData = data?.custom_data || data?.subscription?.custom_data;
        const teamId = customData?.teamId;
        const userId = customData?.userId;
        // The transaction's own item quantity is always 1 (the seat count is
        // baked into that item's unit price instead — see createTransaction
        // in server/paddle.ts), so the real seat count comes from custom_data.
        const slots = Number(customData?.slots) || 1;
        const subscriptionId = data?.subscription_id || data?.id;

        if (teamId && userId) {
          const supabase = getCardlogueSupabase();

          const subscriptionFields = {
            user_id: userId,
            team_id: teamId,
            type: "team",
            status: "active",
            slot_count: slots,
            pending_slot_count: null,
            payment_method: "web",
            next_billing_at: calcNextBillingAt(new Date()).toISOString(),
            paddle_subscription_id: subscriptionId,
          };

          // Paddle redelivers webhooks (retries, duplicate events for the
          // same purchase), so this must be idempotent — select-then-branch
          // races two concurrent deliveries into two inserted rows. Upsert
          // on the (team_id, type) unique constraint instead.
          const { error: writeErr } = await supabase
            .from("subscriptions")
            .upsert(subscriptionFields, { onConflict: "team_id,type" });
          if (writeErr) throw writeErr;

          // Anchor this subscription's recurring charge to the 1st, instead
          // of the day-of-month the first (prorated) payment happened to
          // land on. Harmless to repeat if both transaction.completed and
          // subscription.created fire for the same purchase.
          if (subscriptionId) {
            await rescheduleNextBilling(subscriptionId, calcNextBillingAt(new Date())).catch((err) =>
              console.error("Paddle reschedule next_billed_at error:", err.message),
            );
          }
        }
      } else if (eventType === "subscription.canceled") {
        const teamId = event.data?.custom_data?.teamId;
        if (teamId) {
          const supabase = getCardlogueSupabase();
          await supabase.from("subscriptions").update({ status: "expired" }).eq("team_id", teamId).eq("type", "team");
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("Paddle webhook error:", err.message);
      return res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  return httpServer;
}