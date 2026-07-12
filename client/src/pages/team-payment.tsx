import { useEffect, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const NAVY = "#0A1F44";
const GOLD = "#D4AF37";
const SEAT_PRICE_KRW = 2200;
const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string;
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string;

type Status = "idle" | "processing" | "success" | "error";

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    teamId: params.get("teamId") || "",
    userId: params.get("userId") || "",
    slotCount: Number(params.get("slotCount") || "1"),
    name: params.get("name") || "",
    email: params.get("email") || "",
  };
}

function notifyApp(payload: Record<string, unknown>) {
  // The Cardlogue RN app loads this page inside a WebView and listens for
  // postMessage to know when the payment flow is done (see app/team/payment.tsx).
  (window as any).ReactNativeWebView?.postMessage(JSON.stringify(payload));
}

export default function TeamPaymentPage() {
  const { lang } = useLang();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [params, setParams] = useState(getParams);

  useEffect(() => {
    setParams(getParams());
  }, []);

  const amount = params.slotCount * SEAT_PRICE_KRW;
  const missingParams = !params.teamId || !params.userId || !params.slotCount;

  const t = {
    title: lang === "ko" ? "팀 플랜 결제" : "Team Plan Payment",
    seats: lang === "ko" ? `인원 ${params.slotCount}명` : `${params.slotCount} seats`,
    amount: lang === "ko" ? `월 ${amount.toLocaleString()}원` : `${amount.toLocaleString()} KRW / month`,
    pay: lang === "ko" ? "카드 등록하고 결제하기" : "Register card & subscribe",
    processing: lang === "ko" ? "결제 처리 중..." : "Processing...",
    success: lang === "ko" ? "결제가 완료되었습니다. 앱으로 돌아가세요." : "Payment complete. You can return to the app.",
    error: lang === "ko" ? "결제에 실패했습니다" : "Payment failed",
    missing: lang === "ko" ? "잘못된 접근입니다 (필수 정보 누락)" : "Invalid request (missing required parameters)",
    retry: lang === "ko" ? "다시 시도" : "Try again",
  };

  async function handlePay() {
    setStatus("processing");
    setErrorMessage("");
    try {
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        billingKeyMethod: "CARD",
        issueId: `issue-${params.teamId}-${Date.now()}`,
        issueName: lang === "ko" ? "Cardlogue 팀 플랜 정기결제" : "Cardlogue Team Plan Subscription",
        customer: {
          customerId: params.userId,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingKey,
          teamId: params.teamId,
          userId: params.userId,
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

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, #071531 100%)` }}
    >
      <div className="w-full max-w-sm border border-white/15 bg-white/[0.04] backdrop-blur-sm rounded-2xl p-7 space-y-6 text-center">
        <h1 className="font-brand text-2xl font-bold">{t.title}</h1>

        {missingParams ? (
          <p className="text-white/60 text-sm">{t.missing}</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-white/70">{t.seats}</p>
              <p className="font-brand text-3xl font-black" style={{ color: GOLD }}>
                {t.amount}
              </p>
            </div>

            {status === "success" ? (
              <p className="text-sm text-white/80" data-testid="text-payment-success">
                {t.success}
              </p>
            ) : (
              <>
                <Button
                  className="w-full font-brand font-semibold"
                  style={{ background: GOLD, color: NAVY }}
                  disabled={status === "processing"}
                  onClick={handlePay}
                  data-testid="button-team-pay"
                >
                  {status === "processing" ? t.processing : t.pay}
                </Button>
                {status === "error" && (
                  <>
                    <p className="text-sm text-red-300" data-testid="text-payment-error">
                      {t.error}: {errorMessage}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full text-white border-white/20 hover:bg-white/10"
                      onClick={handlePay}
                      data-testid="button-team-pay-retry"
                    >
                      {t.retry}
                    </Button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
