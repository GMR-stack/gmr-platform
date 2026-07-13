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

export function getPaddleSeatPriceId(): string {
  const id = process.env.PADDLE_TEAM_SEAT_PRICE_ID;
  if (!id) throw new Error("PADDLE_TEAM_SEAT_PRICE_ID not configured");
  return id;
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
