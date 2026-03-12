import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import {
  users, subscriptions, reports, reportReads,
  type User, type InsertUser,
  type Subscription, type InsertSubscription,
  type Report, type InsertReport,
  type ReportRead,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  getSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByPaypalId(paypalSubscriptionId: string): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscriptionStatus(paypalSubscriptionId: string, status: string): Promise<Subscription | undefined>;
  updateSubscriptionStatusByUserId(userId: string, status: string): Promise<Subscription | undefined>;

  getReports(): Promise<Report[]>;
  getRecentReports(limit?: number): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  deleteReport(id: string): Promise<void>;
  updateReport(id: string, data: Partial<InsertReport>): Promise<Report | undefined>;

  deleteAccount(userId: string): Promise<void>;

  getReadReportIds(userId: string): Promise<string[]>;
  markReportRead(userId: string, reportId: string): Promise<ReportRead>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub;
  }

  async getSubscriptionByPaypalId(paypalSubscriptionId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.paypalSubscriptionId, paypalSubscriptionId));
    return sub;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(sub).returning();
    return subscription;
  }

  async updateSubscriptionStatus(paypalSubscriptionId: string, status: string): Promise<Subscription | undefined> {
    const [sub] = await db.update(subscriptions).set({ status }).where(eq(subscriptions.paypalSubscriptionId, paypalSubscriptionId)).returning();
    return sub;
  }

  async updateSubscriptionStatusByUserId(userId: string, status: string): Promise<Subscription | undefined> {
    const [sub] = await db.update(subscriptions).set({ status }).where(eq(subscriptions.userId, userId)).returning();
    return sub;
  }

  async getReports(): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.publishedAt));
  }

  async getRecentReports(limit = 5): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.publishedAt)).limit(limit);
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [r] = await db.insert(reports).values(report).returning();
    return r;
  }

  async deleteReport(id: string): Promise<void> {
    await db.delete(reportReads).where(eq(reportReads.reportId, id));
    await db.delete(reports).where(eq(reports.id, id));
  }

  async updateReport(id: string, data: Partial<InsertReport>): Promise<Report | undefined> {
    const [updated] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    return updated;
  }

  async getReadReportIds(userId: string): Promise<string[]> {
    const rows = await db.select({ reportId: reportReads.reportId }).from(reportReads).where(eq(reportReads.userId, userId));
    return rows.map((r) => r.reportId);
  }

  async markReportRead(userId: string, reportId: string): Promise<ReportRead> {
    const [read] = await db.insert(reportReads).values({ userId, reportId }).onConflictDoNothing().returning();
    if (read) return read;
    const [existing] = await db.select().from(reportReads).where(and(eq(reportReads.userId, userId), eq(reportReads.reportId, reportId)));
    return existing;
  }

  async deleteAccount(userId: string): Promise<void> {
    await db.delete(reportReads).where(eq(reportReads.userId, userId));
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
