import crypto from "crypto";

export type PaddleEnvironment = "sandbox" | "production";

// Never default this — a silent default risks running against the wrong
// Paddle account (e.g. charging real cards while believing you're in
// sandbox). Fail loudly instead.
export function getPaddleEnvironment(): PaddleEnvironment {
  const env = process.env.PADDLE_ENVIRONMENT;
  if (env !== "sandbox" && env !== "production") {
    throw new Error(
      `PADDLE_ENVIRONMENT must be set to "sandbox" or "production" (got: ${JSON.stringify(env)})`,
    );
  }
  return env;
}

function getPaddleApiBase(): string {
  return getPaddleEnvironment() === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export function getPaddleApiKey(): string {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY not configured");
  return key;
}

export function getPaddleProductId(): string {
  const id = process.env.PADDLE_PRODUCT_ID;
  if (!id) throw new Error("PADDLE_PRODUCT_ID not configured");
  return id;
}

export function getPaddleSeatUnitPriceCents(): number {
  const raw = process.env.PADDLE_SEAT_UNIT_PRICE_USD_CENTS;
  if (!raw) throw new Error("PADDLE_SEAT_UNIT_PRICE_USD_CENTS not configured");
  const cents = Number(raw);
  if (!Number.isInteger(cents) || cents < 1) throw new Error("PADDLE_SEAT_UNIT_PRICE_USD_CENTS must be a positive integer");
  return cents;
}

async function paddleFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${getPaddleApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getPaddleApiKey()}`,
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Paddle API error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data as any;
}

export async function getSubscription(subscriptionId: string) {
  return paddleFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

// Paddle's checkout quantity stepper is governed by the *price's own*
// min/max quantity config, not by anything we can override per-transaction
// via `items: [{ price_id, quantity }]` — a shared catalog price wide
// enough to fit every team size necessarily lets the buyer edit it back
// down in the checkout UI, bypassing the slot-floor check we already did.
//
// Instead we mint a one-off "custom" (non-catalog) price per checkout,
// with the seat count already baked into a single unit_price and its own
// quantity locked to exactly 1 — there's no adjustable quantity for the
// buyer to touch. Charged in a fixed currency (USD); no adaptive/local-
// currency pricing for this item (acceptable for this product).
export async function createTransaction(params: {
  slots: number;
  amountCents: number;
  customData: Record<string, unknown>;
}) {
  return paddleFetch("/transactions", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          price: {
            description: `Cardlogue Team Subscription (${params.slots} seats)`,
            product_id: getPaddleProductId(),
            unit_price: { amount: String(params.amountCents), currency_code: "USD" },
            billing_cycle: { interval: "month", frequency: 1 },
            tax_mode: "account_setting",
            quantity: { minimum: 1, maximum: 1 },
          },
          quantity: 1,
        },
      ],
      custom_data: params.customData,
    }),
  });
}

// A team that already has an active subscription has a card on file —
// charging a seat increase should use it directly (Paddle bills the saved
// payment method immediately), not send the buyer through checkout again.
export async function chargeExistingSubscription(params: {
  subscriptionId: string;
  amountCents: number;
  description: string;
}) {
  return paddleFetch(`/subscriptions/${encodeURIComponent(params.subscriptionId)}/charge`, {
    method: "POST",
    body: JSON.stringify({
      effective_from: "immediately",
      items: [
        {
          price: {
            description: params.description,
            product_id: getPaddleProductId(),
            unit_price: { amount: String(params.amountCents), currency_code: "USD" },
            tax_mode: "account_setting",
          },
          quantity: 1,
        },
      ],
    }),
  });
}

// Swaps the subscription's recurring item to a new custom price reflecting
// the new total seat count, so future renewals bill the right amount.
// `do_not_bill` because the seat-increase difference for the *current*
// cycle is charged separately via chargeExistingSubscription — this call
// must not also trigger Paddle's own automatic proration charge.
export async function updateSubscriptionRecurringPrice(params: {
  subscriptionId: string;
  slots: number;
  totalCents: number;
}) {
  return paddleFetch(`/subscriptions/${encodeURIComponent(params.subscriptionId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      items: [
        {
          price: {
            description: `Cardlogue Team Subscription (${params.slots} seats)`,
            product_id: getPaddleProductId(),
            unit_price: { amount: String(params.totalCents), currency_code: "USD" },
            billing_cycle: { interval: "month", frequency: 1 },
            tax_mode: "account_setting",
            quantity: { minimum: 1, maximum: 1 },
          },
          quantity: 1,
        },
      ],
      proration_billing_mode: "do_not_bill",
    }),
  });
}

// Anchors every team's recurring charge to the 1st of the month (CLAUDE.md
// 11-2), regardless of the day the first prorated payment landed on.
// `proration_billing_mode: "do_not_bill"` reschedules the date only — it
// does not trigger an extra charge.
export async function rescheduleNextBilling(subscriptionId: string, nextBilledAt: Date) {
  return paddleFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      next_billed_at: nextBilledAt.toISOString(),
      proration_billing_mode: "do_not_bill",
    }),
  });
}

// Verifies the `Paddle-Signature` header (format: "ts=<unix>;h1=<hex hmac>")
// against the raw request body, per Paddle's webhook signing spec:
// HMAC-SHA256(secret, `${ts}:${rawBody}`) must equal h1.
export function verifyPaddleWebhookSignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("PADDLE_WEBHOOK_SECRET not configured");
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string]),
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${body}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(h1, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
