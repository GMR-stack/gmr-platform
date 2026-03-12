import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReportSchema } from "@shared/schema";

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
      } else {
        await storage.updateSubscriptionStatusByUserId(user.id, "cancelled");
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

  return httpServer;
}
