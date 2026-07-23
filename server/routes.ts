import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReportSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import {
  getBillingKeyInfo,
  deleteBillingKey,
  extractCardSummary,
  recordTeamPaymentCard,
  chargeBillingKey,
  getPaymentStatus,
  calcNextBillingAt,
  calcProratedSeatAmount,
  getCardlogueSupabase,
  getCardlogueUserFromToken,
  isTeamBillingAdmin,
  getTeamMemberCount,
  verifyPortoneWebhookSignature,
  TEAM_SEAT_PRICE_KRW,
} from "./portone";
import {
  getPaddleEnvironment,
  getPaddleSeatUnitPriceCents,
  createTransaction,
  chargeExistingSubscription,
  updateSubscriptionRecurringPrice,
  rescheduleNextBilling,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  createPaymentMethodUpdateTransaction,
  verifyPaddleWebhookSignature,
} from "./paddle";
import { analyzeBusinessCard } from "./scan";
import { getPublicMyCard, buildVCard } from "./mycard";

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
      const { billingKey, cardId, teamId, slotCount, customerName, customerEmail, draftTeamName, draftTeamDescription, draftTeamIsPublic } = req.body;
      const isNewTeam = !teamId;
      if (!slotCount) {
        return res.status(400).json({ message: "Missing slotCount" });
      }
      // A brand-new team always needs a card — there's nothing to decrease
      // from. An existing team's decrease is checked further below, once we
      // know the current slot_count to compare against.
      if (isNewTeam && !billingKey && !cardId) {
        return res.status(400).json({ message: "Missing billingKey/cardId" });
      }
      if (isNewTeam && !draftTeamName) {
        return res.status(400).json({ message: "Missing teamId or draftTeamName" });
      }
      const slots = Number(slotCount);
      if (!Number.isInteger(slots) || slots < 1) {
        return res.status(400).json({ message: "Invalid slotCount" });
      }

      // The request body's userId is not trusted — the caller's identity comes
      // only from their Cardlogue session token.
      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      const userId = cardlogueUser.sub;

      const supabase = getCardlogueSupabase();

      // Resolve which billing key to charge: either one freshly issued by
      // the client (billingKey) or one already on file that the user picked
      // from their registered cards (cardId) — never both. Cards are scoped
      // by account (created_by), not by team, so this works the same way
      // whether teamId refers to an existing team or a not-yet-created one.
      // Neither may be present at all for an existing team's seat decrease
      // (checked below) — that path never touches a card.
      let payBillingKey = billingKey as string | undefined;
      if (!payBillingKey && cardId) {
        const { data: card, error: cardErr } = await supabase
          .from("team_payment_cards")
          .select("billing_key")
          .eq("id", cardId)
          .eq("created_by", userId)
          .is("deleted_at", null)
          .maybeSingle();
        if (cardErr) throw cardErr;
        if (!card) return res.status(404).json({ message: "Card not found" });
        payBillingKey = card.billing_key as string;
      }

      // A brand-new team has no existing membership to check ownership
      // against — the caller becomes the owner by definition of creating it.
      // Team creation itself is deferred until after a successful charge
      // (see below) so a failed/cancelled payment leaves nothing behind.
      if (isNewTeam) {
        const minSlots = 2;
        if (slots < minSlots) {
          return res.status(400).json({ message: `slotCount can't be below ${minSlots}` });
        }

        await getBillingKeyInfo(payBillingKey!);

        // No "was this billing key already used to create a team" guard here
        // anymore — now that a card can be reused across many teams by
        // choice (see cardId above), that would wrongly treat "create a
        // second team with the same card" as a retry of the first team's
        // creation, skipping the charge and handing back the wrong team.

        const now = new Date();
        // First charge is prorated for the days left in this billing cycle —
        // full-price billing starts at the next 1st (calcNextBillingAt below),
        // same treatment as a mid-cycle seat increase.
        const amount = calcProratedSeatAmount(now, slots, TEAM_SEAT_PRICE_KRW);
        // Unique per attempt (not deterministic from team/card) — a
        // deterministic id would collide with an earlier charge that reused
        // the same billing key for a *different* team, causing PortOne's own
        // duplicate-payment guard to silently skip charging this one.
        const paymentId = `team-new-${crypto.randomUUID()}`;
        try {
          await chargeBillingKey({
            paymentId,
            billingKey: payBillingKey!,
            orderName: `Cardlogue 팀 플랜 (${slots}인)`,
            amount,
            customerName: customerName || "Cardlogue User",
            customerEmail,
          });
        } catch (chargeErr: any) {
          const existingPayment = await getPaymentStatus(paymentId).catch(() => null);
          if (existingPayment?.status !== "PAID") throw chargeErr;
        }

        const { data: newTeam, error: teamErr } = await supabase
          .from("teams")
          .insert({ name: draftTeamName, description: draftTeamDescription || null, is_public: !!draftTeamIsPublic, owner_id: userId })
          .select("id")
          .single();
        if (teamErr) throw teamErr;
        const newTeamId = newTeam.id as string;

        try {
          const { error: memberErr } = await supabase
            .from("team_members")
            .insert({ team_id: newTeamId, user_id: userId, role: "owner" });
          if (memberErr) throw memberErr;

          const { error: subErr } = await supabase.from("subscriptions").insert({
            user_id: userId,
            team_id: newTeamId,
            type: "team",
            status: "active",
            slot_count: slots,
            payment_method: "web",
            next_billing_at: calcNextBillingAt(now).toISOString(),
            portone_billing_key: payBillingKey,
          });
          if (subErr) throw subErr;
        } catch (postChargeErr: any) {
          // Payment already succeeded — don't leave a broken half-created
          // team behind. Best-effort cleanup; log loudly if even that fails
          // since at that point it needs manual attention.
          const { error: cleanupErr } = await supabase.from("teams").delete().eq("id", newTeamId);
          if (cleanupErr) {
            console.error("PortOne team-subscribe: failed to clean up team after post-charge error", { newTeamId, cleanupErr, postChargeErr });
          }
          throw postChargeErr;
        }

        await recordTeamPaymentCard(newTeamId, payBillingKey!, userId);

        return res.json({
          message: "Team created",
          teamId: newTeamId,
          nextBillingAt: calcNextBillingAt(now),
          amount,
          slotCount: slots,
        });
      }

      // They must actually be an owner/admin of teamId to touch its billing.
      if (!(await isTeamBillingAdmin(teamId, userId))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const memberCount = await getTeamMemberCount(teamId);
      const minSlots = Math.max(2, memberCount);
      if (slots < minSlots) {
        return res.status(400).json({ message: `slotCount can't be below the current member count (${minSlots})` });
      }

      const { data: existing, error: findErr } = await supabase
        .from("subscriptions")
        .select("id, status, slot_count, next_billing_at")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (findErr) throw findErr;

      const isExistingActive = existing?.status === "active";
      // A pure decrease never charges and never needs a card — everything
      // else (new/reactivated subscription, same-count card refresh,
      // increase) does.
      const isDecreaseRequest = isExistingActive && slots < existing!.slot_count;
      if (!isDecreaseRequest) {
        if (!payBillingKey) {
          return res.status(400).json({ message: "Missing billingKey/cardId" });
        }
        // Confirm PortOne actually issued this billing key before charging it.
        await getBillingKeyInfo(payBillingKey);
      }

      const now = new Date();
      let amount = 0;
      let subscriptionFields: Record<string, unknown>;

      if (!isExistingActive) {
        // New team subscription (or reactivating an expired one): prorated
        // for the rest of this cycle, full-price billing starts next 1st —
        // same as the fresh-team-creation path above.
        amount = calcProratedSeatAmount(now, slots, TEAM_SEAT_PRICE_KRW);
        subscriptionFields = {
          user_id: userId,
          team_id: teamId,
          type: "team",
          status: "active",
          slot_count: slots,
          payment_method: "web",
          next_billing_at: calcNextBillingAt(now).toISOString(),
          portone_billing_key: payBillingKey,
        };
      } else if (slots === existing!.slot_count) {
        // Same seat count — refreshing the card/billing key (and, if a
        // different person is doing it — e.g. after a team ownership
        // transfer — reassigning who's responsible for billing). No charge.
        subscriptionFields = { user_id: userId, portone_billing_key: payBillingKey };
      } else if (slots > existing!.slot_count) {
        // Seat increase: bill only the added seats, prorated for the rest of this cycle.
        amount = calcProratedSeatAmount(now, slots - existing!.slot_count, TEAM_SEAT_PRICE_KRW);
        subscriptionFields = {
          user_id: userId,
          slot_count: slots,
          portone_billing_key: payBillingKey,
        };
      } else {
        // Seat decrease: capacity (slot_count) drops immediately; the billed
        // amount doesn't change (no refund) until the next renewal.
        // portone_billing_key is deliberately left untouched — a decrease
        // never involves a card at all (see isDecreaseRequest above).
        // pending_slot_count is no longer used — whatever syncs the
        // recurring charge to slot_count at each renewal (not built yet)
        // reads slot_count directly.
        subscriptionFields = {
          user_id: userId,
          slot_count: slots,
        };
      }

      if (amount > 0) {
        // Unique per attempt, not deterministic from team+card — a card can
        // now be reused across multiple separate charges for the same team
        // (e.g. two different seat increases), and a deterministic id would
        // collide with the earlier charge, making PortOne's own
        // duplicate-payment guard silently skip charging this one.
        const paymentId = `team-${teamId}-${crypto.randomUUID()}`;
        try {
          await chargeBillingKey({
            paymentId,
            billingKey: payBillingKey!,
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

      // Nothing to record for a decrease — no card was involved.
      if (payBillingKey) {
        await recordTeamPaymentCard(teamId, payBillingKey, userId);
      }

      return res.json({
        message: "Team subscription updated",
        teamId,
        nextBillingAt: existing?.next_billing_at ?? calcNextBillingAt(now),
        amount,
        slotCount: slots,
      });
    } catch (err: any) {
      console.error("PortOne team-subscribe error:", err.message);
      return res.status(500).json({ message: "Failed to activate team subscription" });
    }
  });

  app.post("/api/portone/webhook", async (req, res) => {
    try {
      const isValid = verifyPortoneWebhookSignature(req.rawBody as Buffer, {
        id: req.headers["webhook-id"] as string | undefined,
        timestamp: req.headers["webhook-timestamp"] as string | undefined,
        signature: req.headers["webhook-signature"] as string | undefined,
      });
      if (!isValid) return res.status(401).json({ message: "Invalid signature" });
    } catch (err: any) {
      console.error("PortOne webhook signature check error:", err.message);
      return res.status(500).json({ message: "Signature verification not configured" });
    }
    console.log("[portone webhook]", JSON.stringify(req.body));
    return res.status(200).json({ received: true });
  });

  // Business-card OCR/AI proxy for the Cardlogue app — CLOVA OCR + Claude
  // Haiku analysis run here instead of on-device so the CLOVA secret and
  // Claude API key never ship inside the app bundle (see server/scan.ts).
  app.post("/api/scan/analyze", async (req, res) => {
    try {
      const { image, lang, existingFields } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ message: "Missing image" });
      }
      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        // Temporary diagnostic for the "Missing or invalid Cardlogue session"
        // report on this route — logs shape only, never the token itself.
        // Remove once resolved.
        const authHeader = req.headers.authorization;
        console.log("[scan/analyze auth]", JSON.stringify({
          hasHeader: !!authHeader,
          startsWithBearer: authHeader?.startsWith("Bearer ") ?? false,
          tokenParts: authHeader?.startsWith("Bearer ") ? authHeader.slice(7).split(".").length : null,
        }));
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      const result = await analyzeBusinessCard({
        imageBase64: image,
        lang: lang === "en" ? "en" : "ko",
        existingFields: existingFields && typeof existingFields === "object" ? existingFields : undefined,
      });
      return res.json(result);
    } catch (err: any) {
      console.error("Scan analyze error:", err.message);
      return res.status(500).json({ message: "Failed to analyze card" });
    }
  });

  // Public digital-card lookup for /cardlogue/card/:id (share-by-link, no
  // app/login required). The id is an unguessable UUID and the response
  // never includes user_id — see server/mycard.ts.
  app.get("/api/cardlogue/card/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: "Missing id" });
      const card = await getPublicMyCard(id);
      if (!card) return res.status(404).json({ message: "Card not found" });
      return res.json(card);
    } catch (err: any) {
      console.error("Public card lookup error:", err.message);
      return res.status(500).json({ message: "Failed to load card" });
    }
  });

  // Real, navigable vCard download — see buildVCard's comment in
  // server/mycard.ts for why this isn't a client-side blob: URL.
  app.get("/api/cardlogue/card/:id/vcard", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: "Missing id" });
      const card = await getPublicMyCard(id);
      if (!card) return res.status(404).json({ message: "Card not found" });
      const filename = (card.name || "card").replace(/["/\\<>:*?|\r\n]/g, "").trim() || "card";
      res.setHeader("Content-Type", "text/vcard; charset=utf-8");
      res.setHeader("Content-Disposition", `inline; filename="${filename}.vcf"`);
      return res.send(buildVCard(card));
    } catch (err: any) {
      console.error("vCard download error:", err.message);
      return res.status(500).json({ message: "Failed to generate vCard" });
    }
  });

  // ── Cardlogue web account (browser flow for PG/card-issuer review) ──────
  // The payment pages normally run inside the Cardlogue app's WebView, which
  // injects the user's Supabase session token. For the browser flow there's
  // no app to inject it, so this proxies Supabase's password grant using the
  // server-side credentials — the client never needs Cardlogue's Supabase
  // URL/keys, and the token it gets back is the same kind the app injects.
  app.post("/api/cardlogue/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }
      const url = process.env.CARDLOGUE_SUPABASE_URL;
      const key = process.env.CARDLOGUE_SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        return res.status(500).json({ message: "Cardlogue auth not configured" });
      }
      const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify({ email, password }),
      });
      const data: any = await authRes.json().catch(() => ({}));
      if (!authRes.ok || !data?.access_token) {
        return res.status(401).json({ message: data?.error_description || data?.msg || "Invalid email or password" });
      }
      return res.json({
        accessToken: data.access_token,
        expiresAt: data.expires_at ?? null,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.name || data.user?.user_metadata?.full_name || null,
        },
      });
    } catch (err: any) {
      console.error("Cardlogue login error:", err.message);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // Public account-deletion request form (see client/src/pages/account-deletion.tsx)
  // — required by Google Play's account-deletion policy: a web page reachable
  // without the app installed or a live Cardlogue session. Deliberately just
  // emails the request for manual handling rather than deleting anything
  // automatically — same "request, then we process it" pattern as refunds.
  app.post("/api/cardlogue/account-deletion-request", async (req, res) => {
    try {
      const { email, note } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Missing or invalid email" });
      }
      await sendAdminEmail(
        "Cardlogue account deletion request",
        `A Cardlogue account deletion request was submitted via the web form.\n\nAccount email: ${email}\nNote: ${note || "(none)"}\nDate: ${new Date().toUTCString()}`,
      );
      return res.json({ message: "Request received" });
    } catch (err: any) {
      console.error("Cardlogue account-deletion-request error:", err.message);
      return res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // Teams the logged-in Cardlogue user belongs to, with each team's
  // subscription state — feeds the browser team-management page.
  app.get("/api/cardlogue/my-teams", async (req, res) => {
    try {
      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      const supabase = getCardlogueSupabase();
      const { data: memberships, error: memberErr } = await supabase
        .from("team_members")
        .select("team_id, role, teams(id, name)")
        .eq("user_id", cardlogueUser.sub);
      if (memberErr) throw memberErr;

      const teamIds = (memberships ?? []).map((m: any) => m.team_id);
      const subsByTeam: Record<string, any> = {};
      const countByTeam: Record<string, number> = {};
      if (teamIds.length > 0) {
        const { data: subs, error: subErr } = await supabase
          .from("subscriptions")
          .select("team_id, status, slot_count, next_billing_at, pending_cancellation, portone_billing_key, paddle_subscription_id")
          .eq("type", "team")
          .in("team_id", teamIds);
        if (subErr) throw subErr;
        for (const s of subs ?? []) subsByTeam[s.team_id] = s;

        const { data: allMembers, error: countErr } = await supabase
          .from("team_members")
          .select("team_id")
          .in("team_id", teamIds);
        if (countErr) throw countErr;
        for (const m of allMembers ?? []) countByTeam[m.team_id] = (countByTeam[m.team_id] ?? 0) + 1;
      }

      return res.json({
        teams: (memberships ?? []).map((m: any) => {
          const sub = subsByTeam[m.team_id];
          return {
            teamId: m.team_id,
            name: m.teams?.name ?? "",
            role: m.role,
            memberCount: countByTeam[m.team_id] ?? 1,
            subscription: sub
              ? {
                  status: sub.status,
                  slotCount: sub.slot_count,
                  nextBillingAt: sub.next_billing_at,
                  pendingCancellation: !!sub.pending_cancellation,
                  // Which PG a team bills through is decided by whether it
                  // has a Paddle subscription, not by whether a PortOne
                  // card happens to be on file right now — a PortOne team
                  // that currently has no billing key (e.g. its only card
                  // was deleted) is still a PortOne team, and still needs
                  // its card-management button to reach /team/cards and
                  // register a new one, not lose it entirely.
                  provider: sub.paddle_subscription_id ? "paddle" : "portone",
                }
              : null,
          };
        }),
      });
    } catch (err: any) {
      console.error("Cardlogue my-teams error:", err.message);
      return res.status(500).json({ message: "Failed to load teams" });
    }
  });

  // ── Cardlogue team card management (PortOne billing keys) ───────────────
  // Multiple cards per team: each registered card is its own billing key in
  // team_payment_cards, and subscriptions.portone_billing_key points at the
  // one the monthly batch charges. Selecting a card just moves that pointer;
  // the batch itself needs no changes.
  app.get("/api/portone/team-cards", async (req, res) => {
    try {
      // teamId is optional — a not-yet-created team (see team-subscribe's
      // isNewTeam path) has nothing to check admin-of yet, but the caller's
      // own card list is still meaningful to show before they've picked a
      // team name at all.
      const teamId = String(req.query.teamId || "");

      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }

      const supabase = getCardlogueSupabase();
      let subscriptionStatus: string | null = null;
      let activeBillingKey: string | null = null;

      if (teamId) {
        if (!(await isTeamBillingAdmin(teamId, cardlogueUser.sub))) {
          return res.status(403).json({ message: "Not an owner/admin of this team" });
        }

        const { data: sub, error: subErr } = await supabase
          .from("subscriptions")
          .select("status, portone_billing_key")
          .eq("team_id", teamId)
          .eq("type", "team")
          .maybeSingle();
        if (subErr) throw subErr;
        subscriptionStatus = sub?.status ?? null;
        activeBillingKey = sub?.portone_billing_key ?? null;

        // The subscription's current key can be missing from the list (card
        // registered before this feature shipped and not caught by the
        // migration backfill) — recover it so the active card always shows.
        if (activeBillingKey) {
          const { data: activeRow } = await supabase
            .from("team_payment_cards")
            .select("id")
            .eq("billing_key", activeBillingKey)
            .maybeSingle();
          if (!activeRow) {
            await recordTeamPaymentCard(teamId, activeBillingKey, cardlogueUser.sub);
          }
        }
      }

      // Scoped by the caller's account (created_by), not this team — a card
      // registered while managing one team is reusable for any other team
      // the same person administers.
      const { data: cards, error: cardsErr } = await supabase
        .from("team_payment_cards")
        .select("id, billing_key, card_name, card_number_masked, created_at")
        .eq("created_by", cardlogueUser.sub)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (cardsErr) throw cardsErr;

      // Rows whose card info was never captured (migration backfill, or the
      // PortOne lookup failed at registration) get filled here, once.
      for (const card of cards ?? []) {
        if (card.card_name || card.card_number_masked) continue;
        try {
          const info = await getBillingKeyInfo(card.billing_key);
          const summary = extractCardSummary(info);
          if (summary.cardName || summary.cardNumberMasked) {
            await supabase
              .from("team_payment_cards")
              .update({ card_name: summary.cardName, card_number_masked: summary.cardNumberMasked })
              .eq("id", card.id);
            card.card_name = summary.cardName;
            card.card_number_masked = summary.cardNumberMasked;
          }
        } catch {
          // Leave it blank; the client renders a placeholder label.
        }
      }

      return res.json({
        subscriptionStatus,
        cards: (cards ?? []).map((c) => ({
          id: c.id,
          cardName: c.card_name,
          cardNumberMasked: c.card_number_masked,
          createdAt: c.created_at,
          isActive: c.billing_key === activeBillingKey,
        })),
      });
    } catch (err: any) {
      console.error("PortOne team-cards list error:", err.message);
      return res.status(500).json({ message: "Failed to load cards" });
    }
  });

  // Registers a freshly issued billing key as a new card in the team's list.
  // Registration only — nothing is charged and the active card doesn't
  // change until the user explicitly selects it.
  app.post("/api/portone/team-cards", async (req, res) => {
    try {
      const { teamId, billingKey } = req.body;
      if (!billingKey) {
        return res.status(400).json({ message: "Missing billingKey" });
      }
      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      // teamId is optional — registering a card while setting up a
      // not-yet-created team (empty teamId) has no team to check admin-of
      // yet; the card still gets recorded under the caller's account.
      if (teamId && !(await isTeamBillingAdmin(teamId, cardlogueUser.sub))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      // Confirm PortOne actually issued this key (and grab the card info)
      // before trusting the client-supplied value.
      const info = await getBillingKeyInfo(billingKey);
      const summary = extractCardSummary(info);

      const supabase = getCardlogueSupabase();
      const { data: card, error: upsertErr } = await supabase
        .from("team_payment_cards")
        .upsert(
          {
            team_id: teamId || null,
            billing_key: billingKey,
            card_name: summary.cardName,
            card_number_masked: summary.cardNumberMasked,
            created_by: cardlogueUser.sub,
            deleted_at: null,
          },
          { onConflict: "billing_key" },
        )
        .select("id, card_name, card_number_masked, created_at")
        .single();
      if (upsertErr) throw upsertErr;

      return res.json({
        message: "Card registered",
        card: {
          id: card.id,
          cardName: card.card_name,
          cardNumberMasked: card.card_number_masked,
          createdAt: card.created_at,
          isActive: false,
        },
      });
    } catch (err: any) {
      console.error("PortOne team-cards register error:", err.message);
      return res.status(500).json({ message: "Failed to register card" });
    }
  });

  // Points the subscription's auto-billing at a different registered card.
  app.post("/api/portone/team-cards/select", async (req, res) => {
    try {
      const { teamId, cardId } = req.body;
      if (!teamId || !cardId) {
        return res.status(400).json({ message: "Missing teamId or cardId" });
      }
      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      if (!(await isTeamBillingAdmin(teamId, cardlogueUser.sub))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const supabase = getCardlogueSupabase();
      // Scoped by account (created_by), not this team — the card just has
      // to belong to the calling user, not to the team they're managing.
      const { data: card, error: cardErr } = await supabase
        .from("team_payment_cards")
        .select("id, billing_key")
        .eq("id", cardId)
        .eq("created_by", cardlogueUser.sub)
        .is("deleted_at", null)
        .maybeSingle();
      if (cardErr) throw cardErr;
      if (!card) return res.status(404).json({ message: "Card not found" });

      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("id, portone_billing_key")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (subErr) throw subErr;
      if (!sub) return res.status(400).json({ message: "No subscription for this team" });
      // A Paddle-billed team has no PortOne key to swap — switching PG
      // mid-subscription isn't supported here.
      if (!sub.portone_billing_key) {
        return res.status(400).json({ message: "This team is not billed through PortOne" });
      }

      const { error: writeErr } = await supabase
        .from("subscriptions")
        .update({ portone_billing_key: card.billing_key })
        .eq("id", sub.id);
      if (writeErr) throw writeErr;

      return res.json({ message: "Card selected", activeCardId: card.id });
    } catch (err: any) {
      console.error("PortOne team-cards select error:", err.message);
      return res.status(500).json({ message: "Failed to select card" });
    }
  });

  // Removes a card: deletes the billing key on PortOne's side (so the card
  // mandate doesn't linger with the card issuer) and soft-deletes the row.
  // The card currently wired to auto-billing can't be removed — select a
  // different one first.
  app.post("/api/portone/team-cards/delete", async (req, res) => {
    try {
      const { teamId, cardId } = req.body;
      if (!teamId || !cardId) {
        return res.status(400).json({ message: "Missing teamId or cardId" });
      }
      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      if (!(await isTeamBillingAdmin(teamId, cardlogueUser.sub))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const supabase = getCardlogueSupabase();
      // Scoped by account (created_by), not this team — see /select above.
      const { data: card, error: cardErr } = await supabase
        .from("team_payment_cards")
        .select("id, billing_key")
        .eq("id", cardId)
        .eq("created_by", cardlogueUser.sub)
        .is("deleted_at", null)
        .maybeSingle();
      if (cardErr) throw cardErr;
      if (!card) return res.status(404).json({ message: "Card not found" });

      // A card shared across teams can be the active auto-billing key for
      // any of them, not just the one currently being managed — check all.
      // Blocked rather than clearing portone_billing_key on delete: leaving
      // a team "active" with no billing key would silently skip it from the
      // recurring batch forever (never charged, never expired) instead of
      // either staying billed or being cancelled — an unintended free-access
      // state. Select a different card first instead.
      const { data: activeSubs, error: subErr } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("type", "team")
        .eq("status", "active")
        .eq("portone_billing_key", card.billing_key);
      if (subErr) throw subErr;
      if (activeSubs && activeSubs.length > 0) {
        return res.status(400).json({ message: "This card is used for auto-billing — select another card first" });
      }

      try {
        await deleteBillingKey(card.billing_key);
      } catch (err: any) {
        // Already gone on PortOne's side is fine — still remove it locally.
        if (!String(err?.message).includes("ALREADY_DELETED")) throw err;
      }

      const { error: writeErr } = await supabase
        .from("team_payment_cards")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", card.id);
      if (writeErr) throw writeErr;

      return res.json({ message: "Card deleted" });
    } catch (err: any) {
      console.error("PortOne team-cards delete error:", err.message);
      return res.status(500).json({ message: "Failed to delete card" });
    }
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
        .select("id, status, slot_count, next_billing_at, paddle_subscription_id, user_id")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (findErr) throw findErr;

      const isExistingActive = existing?.status === "active" && existing?.paddle_subscription_id;
      const unitPriceCents = getPaddleSeatUnitPriceCents();
      const now = new Date();

      if (isExistingActive && existing!.user_id !== userId) {
        // Team ownership changed hands — the new owner needs to register
        // their own card, but this isn't a new subscription or a seat
        // change, so it must not charge anything or touch the recurring
        // price. Store who's taking over billing so the webhook can finish
        // the handoff once Paddle confirms the new payment method (its
        // custom_data still reflects the *old* owner, since this transaction
        // type is generated by Paddle itself, not created by us).
        const subscriptionId = existing!.paddle_subscription_id as string;
        const transaction = await createPaymentMethodUpdateTransaction(subscriptionId);
        const { error: writeErr } = await supabase
          .from("subscriptions")
          .update({ pending_owner_user_id: userId })
          .eq("id", existing!.id);
        if (writeErr) throw writeErr;
        return res.json({
          needsCheckout: true,
          isOwnershipTransfer: true,
          transactionId: transaction.data.id,
          environment: getPaddleEnvironment(),
        });
      }

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
          .update({ slot_count: slots })
          .eq("id", existing!.id);
        if (writeErr) throw writeErr;
        return res.json({
          needsCheckout: false,
          slotCount: slots,
          amount: amountCents,
          nextBillingAt: existing!.next_billing_at,
        });
      }

      // Seat decrease: capacity (slot_count) drops immediately, but the
      // billed amount doesn't change (no refund) until the next renewal —
      // so we leave Paddle's subscription price untouched here. Whatever
      // syncs the recurring price to slot_count at each renewal (not built
      // yet) is the only thing that needs to know the new lower price;
      // pending_slot_count is no longer used for this.
      const { error: writeErr } = await supabase
        .from("subscriptions")
        .update({ slot_count: slots })
        .eq("id", existing!.id);
      if (writeErr) throw writeErr;
      return res.json({
        needsCheckout: false,
        slotCount: slots,
        amount: 0,
        nextBillingAt: existing!.next_billing_at,
      });
    } catch (err: any) {
      console.error("Paddle checkout-context error:", err.message);
      return res.status(500).json({ message: "Failed to prepare checkout" });
    }
  });

  // Paddle keeps exactly one saved payment method per subscription (unlike
  // PortOne's multiple-billing-keys model) — this generates a $0 checkout
  // scoped to just replacing it. Same underlying Paddle call as the
  // ownership-transfer handoff in checkout-context above, but without
  // touching user_id: Paddle swaps the card on its side on completion, and
  // there's nothing else in our DB that needs updating.
  app.post("/api/paddle/change-card-transaction", async (req, res) => {
    try {
      const { teamId } = req.body;
      if (!teamId) return res.status(400).json({ message: "Missing teamId" });

      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      if (!(await isTeamBillingAdmin(teamId, cardlogueUser.sub))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const supabase = getCardlogueSupabase();
      const { data: existing, error: findErr } = await supabase
        .from("subscriptions")
        .select("status, paddle_subscription_id")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (findErr) throw findErr;
      if (!existing?.paddle_subscription_id) {
        return res.status(400).json({ message: "This team is not billed through Paddle" });
      }

      const transaction = await createPaymentMethodUpdateTransaction(existing.paddle_subscription_id);
      return res.json({ transactionId: transaction.data.id, environment: getPaddleEnvironment() });
    } catch (err: any) {
      console.error("Paddle change-card-transaction error:", err.message);
      return res.status(500).json({ message: "Failed to prepare card update" });
    }
  });

  // ── Cardlogue team subscription cancellation (both PGs) ─────────────────
  // Cancel takes effect at the end of the already-paid period — full access
  // continues until then, no refund. Paddle has its own recurring
  // subscription object to stop; PortOne doesn't (we charge its billing key
  // ourselves each cycle via a batch job), so canceling it is purely a flag
  // for that batch to check before charging again.
  app.post("/api/team-subscription/cancel", async (req, res) => {
    try {
      const { teamId } = req.body;
      if (!teamId) return res.status(400).json({ message: "Missing teamId" });

      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      if (!(await isTeamBillingAdmin(teamId, cardlogueUser.sub))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const supabase = getCardlogueSupabase();
      const { data: existing, error: findErr } = await supabase
        .from("subscriptions")
        .select("id, status, next_billing_at, paddle_subscription_id, portone_billing_key")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (findErr) throw findErr;

      if (!existing || existing.status !== "active") {
        return res.status(400).json({ message: "No active subscription to cancel" });
      }

      if (existing.paddle_subscription_id) {
        await cancelSubscriptionAtPeriodEnd(existing.paddle_subscription_id);
      }
      // PortOne needs no external call — there's no live subscription object
      // on their side to stop, just our own decision to stop rebilling it.

      const { error: writeErr } = await supabase
        .from("subscriptions")
        .update({ pending_cancellation: true })
        .eq("id", existing.id);
      if (writeErr) throw writeErr;

      return res.json({ message: "Cancellation scheduled", effectiveAt: existing.next_billing_at });
    } catch (err: any) {
      console.error("Team subscription cancel error:", err.message);
      return res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Reverses a pending cancellation from /cancel above — Cardlogue's "해지
  // 취소" button. Paddle: clears the scheduled cancellation so recurring
  // billing continues. PortOne: has no live subscription object to un-cancel
  // on their side — pending_cancellation is purely our own flag the
  // recurring batch checks before charging, so flipping it back is enough.
  app.post("/api/team-subscription/resume", async (req, res) => {
    try {
      const { teamId } = req.body;
      if (!teamId) return res.status(400).json({ message: "Missing teamId" });

      const cardlogueUser = getCardlogueUserFromToken(req);
      if (!cardlogueUser) {
        return res.status(401).json({ message: "Missing or invalid Cardlogue session" });
      }
      if (!(await isTeamBillingAdmin(teamId, cardlogueUser.sub))) {
        return res.status(403).json({ message: "Not an owner/admin of this team" });
      }

      const supabase = getCardlogueSupabase();
      const { data: existing, error: findErr } = await supabase
        .from("subscriptions")
        .select("id, status, pending_cancellation, paddle_subscription_id")
        .eq("team_id", teamId)
        .eq("type", "team")
        .maybeSingle();
      if (findErr) throw findErr;

      if (!existing || existing.status !== "active") {
        return res.status(400).json({ message: "No active subscription to resume" });
      }
      // Idempotent: nothing pending just confirms the already-normal state
      // instead of erroring — Cardlogue only shows this button when
      // pending_cancellation is true, so this is a safety net, not the
      // expected path.
      if (!existing.pending_cancellation) {
        return res.json({ message: "Subscription is already active" });
      }

      if (existing.paddle_subscription_id) {
        await resumeSubscription(existing.paddle_subscription_id);
      }

      const { error: writeErr } = await supabase
        .from("subscriptions")
        .update({ pending_cancellation: false })
        .eq("id", existing.id);
      if (writeErr) throw writeErr;

      return res.json({ message: "Cancellation reversed" });
    } catch (err: any) {
      console.error("Team subscription resume error:", err.message);
      return res.status(500).json({ message: "Failed to resume subscription" });
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

      if (eventType === "transaction.completed" && event.data?.origin === "subscription_payment_method_change") {
        // A $0 transaction generated by createPaymentMethodUpdateTransaction
        // for a team-ownership handoff — its custom_data is copied from the
        // *old* owner's original subscribe, so identity comes from the
        // pending_owner_user_id we stashed when initiating this instead.
        // Must not touch slot_count/next_billing_at/status.
        const subscriptionId = event.data?.subscription_id;
        if (subscriptionId) {
          const supabase = getCardlogueSupabase();
          const { data: existing } = await supabase
            .from("subscriptions")
            .select("id, pending_owner_user_id")
            .eq("paddle_subscription_id", subscriptionId)
            .eq("type", "team")
            .maybeSingle();
          if (existing?.pending_owner_user_id) {
            await supabase
              .from("subscriptions")
              .update({ user_id: existing.pending_owner_user_id, pending_owner_user_id: null })
              .eq("id", existing.id);
          }
        }
      } else if (
        (eventType === "transaction.completed" && event.data?.origin === "api") ||
        eventType === "subscription.created" ||
        eventType === "subscription.activated"
      ) {
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
      } else if (eventType === "transaction.completed" && event.data?.origin === "subscription_recurring") {
        // Paddle's own automatic renewal charge — nothing for us to charge,
        // but the local next_billing_at mirror must advance or every later
        // batch run (server/team-billing-batch.ts) would treat this
        // subscription as perpetually due.
        const subscriptionId = event.data?.subscription_id;
        if (subscriptionId) {
          const supabase = getCardlogueSupabase();
          await supabase
            .from("subscriptions")
            .update({ next_billing_at: calcNextBillingAt(new Date()).toISOString() })
            .eq("paddle_subscription_id", subscriptionId)
            .eq("type", "team");
        }
      } else if (eventType === "subscription.canceled") {
        const teamId = event.data?.custom_data?.teamId;
        if (teamId) {
          const supabase = getCardlogueSupabase();
          await supabase
            .from("subscriptions")
            .update({ status: "expired", pending_cancellation: false })
            .eq("team_id", teamId)
            .eq("type", "team");
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