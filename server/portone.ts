import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";

const PORTONE_API_BASE = "https://api.portone.io";

export function getPortoneSecret(): string {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error("PORTONE_API_SECRET not configured");
  return secret;
}

async function portoneFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${PORTONE_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `PortOne ${getPortoneSecret()}`,
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PortOne API error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data as any;
}

export async function getBillingKeyInfo(billingKey: string) {
  return portoneFetch(`/billing-keys/${encodeURIComponent(billingKey)}`);
}

export async function getPaymentStatus(paymentId: string) {
  return portoneFetch(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function chargeBillingKey(params: {
  paymentId: string;
  billingKey: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
}) {
  return portoneFetch(`/payments/${encodeURIComponent(params.paymentId)}/billing-key`, {
    method: "POST",
    body: JSON.stringify({
      billingKey: params.billingKey,
      orderName: params.orderName,
      customer: { name: { full: params.customerName }, email: params.customerEmail },
      amount: { total: params.amount },
      currency: "KRW",
    }),
  });
}

// Team billing anchors every team's monthly charge to the 1st of the month.
// Mirrors Cardlogue app's lib/payment.ts calcNextBillingAt (CLAUDE.md section 11-2).
const TEAM_BILLING_GRACE_DAYS = 3;

export function calcNextBillingAt(paymentDate: Date): Date {
  const year = paymentDate.getFullYear();
  const month = paymentDate.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = lastDayOfMonth - paymentDate.getDate();

  if (remainingDays <= TEAM_BILLING_GRACE_DAYS) {
    return new Date(year, month + 2, 1);
  }
  return new Date(year, month + 1, 1);
}

// Increasing a team's seat count mid-cycle bills only the added seats,
// prorated for the days remaining in the current billing month (CLAUDE.md
// 11-2: "slot 증가: 즉시 적용, 증가분 일할 선결제"). Decreasing seats is free
// and takes effect on the next billing date instead (handled by the caller).
export function calcProratedSeatAmount(chargeDate: Date, addedSeats: number, seatPriceKrw: number): number {
  const year = chargeDate.getFullYear();
  const month = chargeDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = daysInMonth - chargeDate.getDate() + 1; // include today
  return Math.round((addedSeats * seatPriceKrw * remainingDays) / daysInMonth);
}

// Decodes (without cryptographic verification) the access token from
// Cardlogue's own Supabase auth session — the RN app injects this into the
// WebView via injectedJavaScriptBeforeContentLoaded rather than the URL, so
// it never ends up in server logs or the Referer header. Mirrors the same
// payload-only decoding this codebase already does for its own auth tokens
// (see getSupabaseUser above); the real trust boundary is the team_members
// lookup that follows, not the token signature.
export function getCardlogueUserFromToken(req: Request): { sub: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (!payload.sub) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

// Confirms the caller is an owner/admin of the given team before letting them
// touch its billing. Membership is looked up directly (service role, bypasses
// RLS) rather than trusted from the request body.
export async function isTeamBillingAdmin(teamId: string, userId: string): Promise<boolean> {
  const supabase = getCardlogueSupabase();
  const { data, error } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === "owner" || data.role === "admin";
}

// Slot count can never drop below the team's actual current member count
// (CLAUDE.md team creation policy: min 2, or current headcount if higher).
export async function getTeamMemberCount(teamId: string): Promise<number> {
  const supabase = getCardlogueSupabase();
  const { count, error } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  if (error) throw error;
  return count ?? 1;
}

export function getCardlogueSupabase() {
  const url = process.env.CARDLOGUE_SUPABASE_URL;
  const serviceRoleKey = process.env.CARDLOGUE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("CARDLOGUE_SUPABASE_URL or CARDLOGUE_SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
