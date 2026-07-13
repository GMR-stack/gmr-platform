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
  return {
    teamId: params.get("teamId") || "",
    slotCount: Number(params.get("slotCount") || "1"),
    name: params.get("name") || "",
    email: params.get("email") || "",
    provider: (pg === "paddle" ? "paddle" : "portone") as Provider,
  };
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

export default function TeamPaymentPage() {
  const { lang } = useLang();
  const [status, setStatus] = useState<Status>("confirm");
  const [errorMessage, setErrorMessage] = useState("");
  const [params, setParams] = useState(getParams);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  // Paddle's own formatted total (e.g. "$11.00") — never reformatted or
  // computed on our side, only ever displayed as Paddle returns it.
  const [paddleTotal, setPaddleTotal] = useState<string | null>(null);

  useEffect(() => {
    setParams(getParams());
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

  useEffect(() => {
    if (params.provider !== "paddle" || !paddle || !params.teamId) return;
    (async () => {
      try {
        const token = getCardlogueToken();
        if (!token) throw new Error("missing Cardlogue session token");
        const res = await fetch("/api/paddle/checkout-context", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ teamId: params.teamId, slotCount: params.slotCount }),
        });
        const ctx = await res.json();
        if (!res.ok) throw new Error(ctx?.message || "failed to prepare checkout");

        const preview = await paddle.PricePreview({
          items: [{ priceId: ctx.priceId, quantity: ctx.quantity }],
        });
        const totals = preview.data.details.lineItems[0]?.formattedTotals;
        setPaddleTotal(totals?.total ?? null);
      } catch (err: any) {
        setErrorMessage(err?.message || "unknown error");
        setStatus("error");
      }
    })();
  }, [paddle, params.provider, params.teamId, params.slotCount]);

  const amount = params.slotCount * SEAT_PRICE_KRW;
  const missingParams = !params.teamId || !params.slotCount;

  const t = {
    title: lang === "ko" ? "팀 플랜 결제" : "Team Plan Payment",
    seats: lang === "ko" ? `인원 ${params.slotCount}명` : `${params.slotCount} seats`,
    amount: lang === "ko" ? `월 ${amount.toLocaleString()}원` : `${amount.toLocaleString()} KRW / month`,
    confirm: lang === "ko" ? "이 내용으로 결제할까요?" : "Proceed with this payment?",
    pay: lang === "ko" ? "확인 (카드 등록하고 결제)" : "Confirm & pay",
    cancel: lang === "ko" ? "취소" : "Cancel",
    processing: lang === "ko" ? "결제 처리 중..." : "Processing...",
    success: lang === "ko" ? "결제가 완료되었습니다. 앱으로 돌아가세요." : "Payment complete. You can return to the app.",
    error: lang === "ko" ? "결제에 실패했습니다" : "Payment failed",
    missing: lang === "ko" ? "잘못된 접근입니다 (필수 정보 누락)" : "Invalid request (missing required parameters)",
    loadingPrice: lang === "ko" ? "가격 불러오는 중..." : "Loading price...",
  };

  function handleCancel() {
    notifyApp({ type: "team-payment-cancelled", teamId: params.teamId });
  }

  async function handlePayPortOne() {
    setStatus("processing");
    setErrorMessage("");
    try {
      const token = getCardlogueToken();
      if (!token) throw new Error("missing Cardlogue session token");

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
      } as any);

      if ((issueResponse as any)?.code != null) {
        throw new Error((issueResponse as any).message || "billing key issue failed");
      }

      const billingKey = (issueResponse as any).billingKey;

      const res = await fetch("/api/portone/team-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          billingKey,
          teamId: params.teamId,
          slotCount: params.slotCount,
          customerName: params.name,
          customerEmail: params.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "subscribe failed");

      setStatus("success");
      notifyApp({
        type: "team-payment-success",
        teamId: params.teamId,
        slotCount: data.slotCount,
        amount: data.amount,
        nextBillingAt: data.nextBillingAt,
      });
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "unknown error");
      notifyApp({ type: "team-payment-error", teamId: params.teamId, message: err?.message });
    }
  }

  async function handlePayPaddle() {
    setErrorMessage("");
    try {
      const token = getCardlogueToken();
      if (!token) throw new Error("missing Cardlogue session token");
      if (!paddle) throw new Error("Paddle not ready");

      const res = await fetch("/api/paddle/checkout-context", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId: params.teamId, slotCount: params.slotCount }),
      });
      const ctx = await res.json();
      if (!res.ok) throw new Error(ctx?.message || "failed to prepare checkout");

      setStatus("processing");
      paddle.Checkout.open({
        items: [{ priceId: ctx.priceId, quantity: ctx.quantity }],
        customData: ctx.customData,
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
              <p className="font-brand text-3xl font-black" style={{ color: GOLD }}>
                {params.provider === "paddle" ? (paddleTotal ?? t.loadingPrice) : t.amount}
              </p>
            </div>

            {status === "confirm" && <p className="text-white/60 text-sm">{t.confirm}</p>}

            {status === "success" ? (
              <p className="text-sm text-white/80" data-testid="text-payment-success">
                {t.success}
              </p>
            ) : (
              <>
                <Button
                  className="w-full font-brand font-semibold"
                  style={{ background: GOLD, color: NAVY }}
                  disabled={status === "processing" || (params.provider === "paddle" && !paddleTotal)}
                  onClick={handlePay}
                  data-testid="button-team-pay"
                >
                  {status === "processing" ? t.processing : t.pay}
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
