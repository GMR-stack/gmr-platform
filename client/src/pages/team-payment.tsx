import { useEffect, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { PageGlow } from "@/components/page-glow";

const NAVY = "#03045E";
const GOLD = "#D4AF37";
const SEAT_PRICE_KRW = 2200;
const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string;
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string;
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;
const PADDLE_ENVIRONMENT = (import.meta.env.VITE_PADDLE_ENVIRONMENT as string) || "sandbox";

type Provider = "portone" | "paddle";
type Status = "confirm" | "processing" | "success" | "error";

function getParams() {
  const params = new URLSearchParams(window.location.search);
  const pg = params.get("pg");
  const currentSlotCountRaw = params.get("currentSlotCount");
  return {
    // Empty teamId is the signal for "brand-new team, not created yet" — the
    // server creates teams/team_members/subscriptions together only once
    // payment succeeds (see draftTeamName below), instead of Cardlogue
    // creating the team upfront and rolling it back on failure/cancel.
    teamId: params.get("teamId") || "",
    slotCount: Number(params.get("slotCount") || "1"),
    // Only present when the app already has an active subscription for this
    // team — lets us tell a decrease apart from a new subscribe/increase
    // before ever calling the server, since a decrease shows different
    // confirm copy (and never opens a card form).
    currentSlotCount: currentSlotCountRaw != null ? Number(currentSlotCountRaw) : null,
    name: params.get("name") || "",
    email: params.get("email") || "",
    provider: (pg === "paddle" ? "paddle" : "portone") as Provider,
    // Only present (and only meaningful) when teamId is empty — the team's
    // not-yet-created details, sent to the server on payment success.
    draftTeamName: params.get("draftTeamName") || "",
    draftTeamDescription: params.get("draftTeamDescription") || "",
    draftTeamIsPublic: params.get("draftTeamIsPublic") === "true",
  };
}

// Team billing is anchored to the 1st of the month (CLAUDE.md 11-2) — used
// here only to tell the user when a seat decrease actually takes effect.
// Mirrors server/portone.ts calcNextBillingAt; keep both in sync.
const TEAM_BILLING_GRACE_DAYS = 3;
function calcNextBillingAt(paymentDate: Date): Date {
  const year = paymentDate.getFullYear();
  const month = paymentDate.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = lastDayOfMonth - paymentDate.getDate();
  if (remainingDays <= TEAM_BILLING_GRACE_DAYS) {
    return new Date(year, month + 2, 1);
  }
  return new Date(year, month + 1, 1);
}

function notifyApp(payload: Record<string, unknown>) {
  // The Cardlogue RN app loads this page inside a WebView and listens for
  // postMessage to know when the payment flow is done (see app/team/payment.tsx).
  (window as any).ReactNativeWebView?.postMessage(JSON.stringify(payload));
}

// The RN app injects its Cardlogue Supabase session token via
// injectedJavaScriptBeforeContentLoaded (never via the URL, so it can't leak
// through server logs or the Referer header) — see app/team/payment.tsx.
function getCardlogueToken(): string | undefined {
  return (window as any).__CARDLOGUE_TOKEN;
}

// On mobile, requestIssueBillingKey uses windowType.mobile: "REDIRECTION" —
// no popup, the page navigates to KCP's auth flow and back to redirectUrl
// (this same URL) with the result as query params instead of a resolved
// promise. Field names mirror @portone/browser-sdk's IssueBillingKeyResponse;
// exact casing wasn't confirmed from docs, so this logs the raw query string
// once on first sight to make that verifiable from device logs if it's wrong.
// PortOne's mobile REDIRECTION flow navigates away and back — it's not
// guaranteed to preserve our own query params (teamId, slotCount, etc.)
// alongside its own result params on the return trip, so those are stashed
// here before leaving and restored on return instead of trusting the URL.
const REDIRECT_PARAMS_KEY = "team-payment-redirect-params";

function getPortoneRedirectResult() {
  const params = new URLSearchParams(window.location.search);
  const billingKey = params.get("billingKey");
  const code = params.get("code");
  if (!billingKey && !code) return null;
  console.log("[team-payment] PortOne redirect result:", window.location.search);
  return {
    billingKey,
    code,
    message: params.get("message"),
    pgMessage: params.get("pgMessage"),
  };
}

export default function TeamPaymentPage() {
  const { lang } = useLang();
  const [status, setStatus] = useState<Status>("confirm");
  const [errorMessage, setErrorMessage] = useState("");
  const [params, setParams] = useState(getParams);
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  useEffect(() => {
    setParams(getParams());
  }, []);

  // Returning from a mobile REDIRECTION-mode billing-key flow (see
  // handlePayPortOne) — the page reloaded with the result as query params
  // instead of a resolved promise.
  useEffect(() => {
    const result = getPortoneRedirectResult();
    if (!result) return;
    const cleanedSearch = new URLSearchParams(window.location.search);
    ["billingKey", "code", "message", "pgMessage"].forEach((key) => cleanedSearch.delete(key));
    const cleanedQuery = cleanedSearch.toString();
    history.replaceState(null, "", window.location.pathname + (cleanedQuery ? `?${cleanedQuery}` : ""));

    setStatus("processing");

    // Restore the params saved right before leaving for the redirect — don't
    // trust window.location.search to still have them after the round-trip.
    const stashed = sessionStorage.getItem(REDIRECT_PARAMS_KEY);
    const restoredParams: typeof params = stashed ? JSON.parse(stashed) : getParams();
    sessionStorage.removeItem(REDIRECT_PARAMS_KEY);
    setParams(restoredParams);

    if (result.code || !result.billingKey) {
      setStatus("error");
      setErrorMessage(result.message || result.pgMessage || "billing key issue failed");
      notifyApp({ type: "team-payment-error", teamId: restoredParams.teamId, message: result.message });
      return;
    }
    finishPortoneSubscribe(result.billingKey, restoredParams).catch((err: any) => {
      setStatus("error");
      setErrorMessage(err?.message || "unknown error");
      notifyApp({ type: "team-payment-error", teamId: restoredParams.teamId, message: err?.message });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params.provider !== "paddle") return;
    if (!PADDLE_CLIENT_TOKEN) {
      setErrorMessage("missing Paddle client token");
      setStatus("error");
      return;
    }
    initializePaddle({
      token: PADDLE_CLIENT_TOKEN,
      environment: PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox",
      eventCallback(event) {
        if (event.name === "checkout.completed") {
          setStatus("success");
          notifyApp({ type: "team-payment-success", teamId: params.teamId });
        } else if (event.name === "checkout.closed" && status === "processing") {
          setStatus("confirm");
        }
      },
    }).then((instance) => setPaddle(instance ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.provider]);

  const amount = params.slotCount * SEAT_PRICE_KRW;
  const missingParams = (!params.teamId && !params.draftTeamName) || !params.slotCount;
  const isDecrease = params.currentSlotCount != null && params.slotCount < params.currentSlotCount;
  const isIncrease = params.currentSlotCount != null && params.slotCount > params.currentSlotCount;
  const nextBillingLabel = calcNextBillingAt(new Date()).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US");

  const t = {
    title: lang === "ko" ? "팀 플랜 결제" : "Team Plan Payment",
    seats: lang === "ko" ? `인원 ${params.slotCount}명` : `${params.slotCount} seats`,
    amount: lang === "ko" ? `월 ${amount.toLocaleString()}원` : `${amount.toLocaleString()} KRW / month`,
    confirm: lang === "ko" ? "이 내용으로 결제할까요?" : "Proceed with this payment?",
    confirmDecrease:
      lang === "ko"
        ? `${params.currentSlotCount}슬롯에서 ${params.slotCount}슬롯으로 줄입니다. 지금은 청구되지 않고, ${nextBillingLabel}부터 ${params.slotCount}슬롯 요금만 청구돼요.`
        : `Reducing from ${params.currentSlotCount} to ${params.slotCount} seats. Nothing is charged now — starting ${nextBillingLabel}, you'll only be billed for ${params.slotCount} seats.`,
    confirmIncrease:
      lang === "ko"
        ? `${params.currentSlotCount}슬롯에서 ${params.slotCount}슬롯으로 늘립니다. 늘어난 ${params.slotCount - (params.currentSlotCount ?? 0)}슬롯분만 오늘 일할 계산되어 즉시 청구돼요.`
        : `Increasing from ${params.currentSlotCount} to ${params.slotCount} seats. Only the added ${params.slotCount - (params.currentSlotCount ?? 0)} seats are charged today, prorated.`,
    pay: lang === "ko" ? "확인" : "Confirm",
    payNew: lang === "ko" ? "확인 (카드 등록하고 결제)" : "Confirm & pay",
    cancel: lang === "ko" ? "취소" : "Cancel",
    processing: lang === "ko" ? "결제 처리 중..." : "Processing...",
    success: lang === "ko" ? "결제가 완료되었습니다. 앱으로 돌아가세요." : "Payment complete. You can return to the app.",
    error: lang === "ko" ? "결제에 실패했습니다" : "Payment failed",
    missing: lang === "ko" ? "잘못된 접근입니다 (필수 정보 누락)" : "Invalid request (missing required parameters)",
  };

  function handleCancel() {
    notifyApp({ type: "team-payment-cancelled", teamId: params.teamId });
  }

  async function finishPortoneSubscribe(billingKey: string, target: typeof params = params) {
    const token = getCardlogueToken();
    if (!token) throw new Error("missing Cardlogue session token");

    const res = await fetch("/api/portone/team-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(
        target.teamId
          ? {
              billingKey,
              teamId: target.teamId,
              slotCount: target.slotCount,
              customerName: target.name,
              customerEmail: target.email,
            }
          : {
              billingKey,
              slotCount: target.slotCount,
              customerName: target.name,
              customerEmail: target.email,
              draftTeamName: target.draftTeamName,
              draftTeamDescription: target.draftTeamDescription,
              draftTeamIsPublic: target.draftTeamIsPublic,
            },
      ),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "subscribe failed");

    setStatus("success");
    notifyApp({
      type: "team-payment-success",
      // For an existing team the server just echoes teamId back; for a new
      // team this is the freshly created one — either way, trust the
      // response over target.teamId (which is "" for a new team).
      teamId: data.teamId,
      slotCount: data.slotCount,
      amount: data.amount,
      nextBillingAt: data.nextBillingAt,
    });
  }

  async function handlePayPortOne() {
    setStatus("processing");
    setErrorMessage("");
    try {
      const token = getCardlogueToken();
      if (!token) throw new Error("missing Cardlogue session token");

      // Stashed so the mobile REDIRECTION round-trip below can restore
      // teamId/slotCount/etc. without depending on whether PortOne preserves
      // our own query params alongside its own result params on return.
      sessionStorage.setItem(REDIRECT_PARAMS_KEY, JSON.stringify(params));

      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        billingKeyMethod: "CARD",
        issueId: `issue-${params.teamId}-${Date.now()}`,
        issueName: lang === "ko" ? "Cardlogue 팀 플랜 정기결제" : "Cardlogue Team Plan Subscription",
        customer: {
          fullName: params.name || undefined,
          email: params.email || undefined,
        },
        // KCP's phone-verification popup doesn't work inside Cardlogue's app
        // WebView (window.open/iframe issues) — on mobile, redirect the whole
        // page to KCP's auth flow and back instead of using a popup. PC keeps
        // the default (popup/iframe), which already works fine.
        windowType: { mobile: "REDIRECTION" },
        redirectUrl: window.location.href,
      } as any);

      if ((issueResponse as any)?.code != null) {
        throw new Error((issueResponse as any).message || "billing key issue failed");
      }

      await finishPortoneSubscribe((issueResponse as any).billingKey);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "unknown error");
      notifyApp({ type: "team-payment-error", teamId: params.teamId, message: err?.message });
    }
  }

  async function handlePayPaddle() {
    setStatus("processing");
    setErrorMessage("");
    try {
      if (!paddle) throw new Error("Paddle not ready");
      const token = getCardlogueToken();
      if (!token) throw new Error("missing Cardlogue session token");

      // Only created on an actual attempt to pay — not on page load — so
      // reloading or abandoning this screen doesn't litter Paddle with
      // draft transactions.
      const res = await fetch("/api/paddle/checkout-context", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId: params.teamId, slotCount: params.slotCount }),
      });
      const ctx = await res.json();
      if (!res.ok) throw new Error(ctx?.message || "failed to prepare checkout");

      if (!ctx.needsCheckout) {
        // Same seat count, an increase (charged directly against the card
        // already on file), or a decrease (free, deferred) — none of these
        // need the buyer to see a checkout overlay at all.
        setStatus("success");
        notifyApp({
          type: "team-payment-success",
          teamId: params.teamId,
          slotCount: ctx.slotCount,
          amount: ctx.amount,
          nextBillingAt: ctx.nextBillingAt,
        });
        return;
      }

      // Opened by transactionId (not `items`) so the seat count we already
      // validated server-side can't be edited in the checkout overlay.
      // Paddle's own overlay displays the total, so we don't need a
      // separate price preview on our side.
      paddle.Checkout.open({
        transactionId: ctx.transactionId,
        customer: params.email ? { email: params.email } : undefined,
      });
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "unknown error");
      notifyApp({ type: "team-payment-error", teamId: params.teamId, message: err?.message });
    }
  }

  const handlePay = params.provider === "paddle" ? handlePayPaddle : handlePayPortOne;

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4"
      style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}
    >
      <PageGlow />
      <div className="w-full max-w-sm border border-white/15 bg-white/[0.04] backdrop-blur-sm rounded-2xl p-7 space-y-6 text-center">
        <h1 className="font-brand text-2xl font-bold">{t.title}</h1>

        {missingParams ? (
          <p className="text-white/60 text-sm">{t.missing}</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-white/70">{t.seats}</p>
              {params.provider !== "paddle" && !isDecrease && (
                <p className="font-brand text-3xl font-black" style={{ color: GOLD }}>
                  {t.amount}
                </p>
              )}
            </div>

            {status === "confirm" && (
              <p className="text-white/60 text-sm">
                {isDecrease ? t.confirmDecrease : isIncrease ? t.confirmIncrease : t.confirm}
              </p>
            )}

            {status === "success" ? (
              <p className="text-sm text-white/80" data-testid="text-payment-success">
                {t.success}
              </p>
            ) : (
              <>
                <Button
                  className="w-full font-brand font-semibold"
                  style={{ background: GOLD, color: NAVY }}
                  disabled={status === "processing" || (params.provider === "paddle" && !paddle)}
                  onClick={handlePay}
                  data-testid="button-team-pay"
                >
                  {status === "processing" ? t.processing : params.currentSlotCount == null ? t.payNew : t.pay}
                </Button>
                {status !== "processing" && (
                  <Button
                    variant="outline"
                    className="w-full text-white border-white/20 hover:bg-white/10"
                    onClick={handleCancel}
                    data-testid="button-team-pay-cancel"
                  >
                    {t.cancel}
                  </Button>
                )}
                {status === "error" && (
                  <p className="text-sm text-red-300" data-testid="text-payment-error">
                    {t.error}: {errorMessage}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
