import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";

const PORTONE_API_BASE = "https://api.portone.io";

export const TEAM_SEAT_PRICE_KRW = 2200;

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

// Removes the billing key on PortOne's side so the card mandate doesn't
// linger after the user deletes the card from their list.
export async function deleteBillingKey(billingKey: string) {
  return portoneFetch(`/billing-keys/${encodeURIComponent(billingKey)}`, { method: "DELETE" });
}

// Pulls a display summary (issuer name + masked number) out of PortOne's
// billing-key lookup response. Field shapes follow PortOne V2's
// BillingKeyPaymentMethodCard; every access is defensive since only the
// happy path has been observed live.
export function extractCardSummary(billingKeyInfo: any): { cardName: string | null; cardNumberMasked: string | null } {
  const method = billingKeyInfo?.methods?.find((m: any) => m?.card) ?? billingKeyInfo?.methods?.[0];
  const card = method?.card;
  return {
    cardName: card?.name || card?.issuer || card?.publisher || null,
    cardNumberMasked: card?.number || null,
  };
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

// Team billing anchors every team's monthly charge to the 1st of the next
// month, no matter how few days remain in the current one — the gap gets
// covered by the prorated first-cycle charge (calcProratedSeatAmount), so
// there's no grace period to skip a month for.
export function calcNextBillingAt(paymentDate: Date): Date {
  const year = paymentDate.getFullYear();
  const month = paymentDate.getMonth();
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
  // Temporary diagnostic logging for the "Not an owner/admin" investigation —
  // remove once resolved. Cardlogue auto-deletes the team on payment failure,
  // destroying DB-side evidence, so this is the only way to see what the
  // token's userId and this query actually were at the moment of the check.
  console.log("[isTeamBillingAdmin]", JSON.stringify({ teamId, userId, data, error: error?.message }));
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

// Records a billing key in the registering user's card list
// (team_payment_cards) so it shows up in card management — scoped by
// created_by (the account), not team_id, so the same card is reusable
// across every team the user administers. teamId is stored only as a
// historical "first registered from" reference, not used for lookups.
// Best-effort: a failure here must never fail the payment that just
// succeeded — the batch charges from subscriptions.portone_billing_key,
// not from this table.
export async function recordTeamPaymentCard(teamId: string, billingKey: string, createdBy: string) {
  try {
    let cardName: string | null = null;
    let cardNumberMasked: string | null = null;
    try {
      const info = await getBillingKeyInfo(billingKey);
      ({ cardName, cardNumberMasked } = extractCardSummary(info));
    } catch {
      // Card info stays null and gets lazily filled on the next list fetch.
    }
    const supabase = getCardlogueSupabase();
    // deleted_at: null resurrects a card the user previously removed and is
    // now re-registering.
    const { error } = await supabase.from("team_payment_cards").upsert(
      {
        team_id: teamId,
        billing_key: billingKey,
        card_name: cardName,
        card_number_masked: cardNumberMasked,
        created_by: createdBy,
        deleted_at: null,
      },
      { onConflict: "billing_key" },
    );
    if (error) throw error;
  } catch (err: any) {
    console.error("recordTeamPaymentCard failed (non-fatal):", err?.message ?? err);
  }
}

// Verifies a PortOne webhook per the Standard Webhooks spec PortOne V2
// follows (https://www.standardwebhooks.com/): the message's id, timestamp,
// and raw body are concatenated with "." and HMAC-SHA256'd using the
// base64-decoded secret (after stripping its "whsec_" prefix); the result is
// compared against each base64 signature in the "v1,<sig>" space-separated
// webhook-signature header (multiple entries support secret rotation).
export function verifyPortoneWebhookSignature(
  rawBody: Buffer | string,
  headers: { id?: string; timestamp?: string; signature?: string },
): boolean {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) throw new Error("PORTONE_WEBHOOK_SECRET not configured");
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Rejects stale/replayed deliveries. The spec recommends *a* tolerance
  // without mandating a value; 5 minutes matches common webhook-signing
  // practice (e.g. Svix's own default).
  const tsSeconds = Number(timestamp);
  if (!Number.isFinite(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected, "base64");

  return signature.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    const sigBuf = Buffer.from(sig, "base64");
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  });
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
