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
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid report id" });
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

  app.delete("/api/reports/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid report id" });
      await storage.deleteReport(id);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to delete report" });
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
