import { useEffect, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { PageGlow } from "@/components/page-glow";
import { getCardlogueToken, getWebSession, loginUrlFor, isInAppWebView, notifyApp } from "@/lib/cardlogue-auth";

const NAVY = "#03045E";
const GOLD = "#D4AF37";
const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string;
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string;
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;
const PADDLE_ENVIRONMENT = (import.meta.env.VITE_PADDLE_ENVIRONMENT as string) || "sandbox";

type TeamCard = {
  id: string;
  cardName: string | null;
  cardNumberMasked: string | null;
  createdAt: string;
  isActive: boolean;
};

// Card management entry point — branches on ?pg=, same convention as
// team-payment.tsx. PortOne supports multiple registered cards (its own
// billing-key model); Paddle keeps exactly one saved payment method per
// subscription, so that flow is a single "change card" action instead of a
// list.
export default function TeamCardsPage() {
  const provider = new URLSearchParams(window.location.search).get("pg") === "paddle" ? "paddle" : "portone";
  return provider === "paddle" ? <TeamCardsPaddle /> : <TeamCardsPortOne />;
}

// Same reasoning as team-payment.tsx: on mobile, requestIssueBillingKey runs
// in REDIRECTION mode (KCP's popup doesn't survive the app WebView), so the
// page navigates away and returns with the result as query params — and our
// own params (teamId) are stashed in sessionStorage across that round-trip
// rather than trusted to survive in the URL.
const REDIRECT_PARAMS_KEY = "team-cards-redirect-params";

function getPortoneRedirectResult() {
  const params = new URLSearchParams(window.location.search);
  const billingKey = params.get("billingKey");
  const code = params.get("code");
  if (!billingKey && !code) return null;
  return {
    billingKey,
    code,
    message: params.get("message") || params.get("pgMessage"),
  };
}

// Card management for a team's PortOne auto-billing: every registered card
// is its own billing key, the subscription points at one of them, and the
// user can register more, switch which one is charged monthly, or delete
// unused ones. Registration alone never charges anything.
function TeamCardsPortOne() {
  const { lang } = useLang();
  const [teamId, setTeamId] = useState(() => new URLSearchParams(window.location.search).get("teamId") || "");
  const [cards, setCards] = useState<TeamCard[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const t = {
    title: lang === "ko" ? "결제 카드 관리" : "Payment Cards",
    subtitle:
      lang === "ko"
        ? "등록된 카드 중 자동결제에 사용할 카드를 선택할 수 있어요. 카드 등록만으로는 결제되지 않습니다."
        : "Pick which registered card is charged automatically. Registering a card never charges it.",
    loading: lang === "ko" ? "불러오는 중..." : "Loading...",
    noCards: lang === "ko" ? "등록된 카드가 없습니다." : "No cards registered yet.",
    activeBadge: lang === "ko" ? "자동결제 카드" : "Auto-billing card",
    unknownCard: lang === "ko" ? "카드" : "Card",
    select: lang === "ko" ? "이 카드로 자동결제" : "Use for auto-billing",
    remove: lang === "ko" ? "삭제" : "Delete",
    removeConfirm:
      lang === "ko" ? "이 카드를 삭제할까요? 카드사에 등록된 자동결제 정보도 함께 해지됩니다." : "Delete this card? Its billing mandate is revoked with the card issuer too.",
    addCard: lang === "ko" ? "새 카드 등록" : "Register a new card",
    processing: lang === "ko" ? "처리 중..." : "Processing...",
    back: lang === "ko" ? "팀 관리로 돌아가기" : "Back to team management",
    missing: lang === "ko" ? "잘못된 접근입니다 (teamId 누락)" : "Invalid request (missing teamId)",
    failed: lang === "ko" ? "실패했습니다" : "Something went wrong",
  };

  async function api(path: string, init: RequestInit = {}) {
    const token = getCardlogueToken();
    if (!token) throw new Error("missing Cardlogue session token");
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "request failed");
    return data;
  }

  async function refreshCards(id: string = teamId) {
    const data = await api(`/api/portone/team-cards?teamId=${encodeURIComponent(id)}`);
    setCards(data.cards);
  }

  async function registerBillingKey(billingKey: string, id: string) {
    const data = await api("/api/portone/team-cards", {
      method: "POST",
      body: JSON.stringify({ teamId: id, billingKey }),
    });
    await refreshCards(id);
    notifyApp({
      type: "team-card-registered",
      teamId: id,
      cardId: data.card?.id,
      cardName: data.card?.cardName ?? null,
      cardNumberMasked: data.card?.cardNumberMasked ?? null,
    });
  }

  useEffect(() => {
    if (!getCardlogueToken() && !isInAppWebView()) {
      window.location.href = loginUrlFor(window.location.pathname + window.location.search);
      return;
    }

    // Returning from a mobile REDIRECTION-mode billing-key issue — restore
    // the stashed teamId and finish the registration.
    const redirectResult = getPortoneRedirectResult();
    if (redirectResult) {
      const stashedTeamId = sessionStorage.getItem(REDIRECT_PARAMS_KEY) || teamId;
      sessionStorage.removeItem(REDIRECT_PARAMS_KEY);
      setTeamId(stashedTeamId);
      history.replaceState(null, "", `${window.location.pathname}?teamId=${encodeURIComponent(stashedTeamId)}`);

      if (redirectResult.code || !redirectResult.billingKey) {
        const message = redirectResult.message || "billing key issue failed";
        setErrorMessage(message);
        notifyApp({ type: "team-card-error", teamId: stashedTeamId, message });
        refreshCards(stashedTeamId).catch((err: any) => setErrorMessage(err?.message || "unknown error"));
        return;
      }
      setBusy(true);
      registerBillingKey(redirectResult.billingKey, stashedTeamId)
        .catch((err: any) => {
          const message = err?.message || "unknown error";
          setErrorMessage(message);
          notifyApp({ type: "team-card-error", teamId: stashedTeamId, message });
        })
        .finally(() => setBusy(false));
      return;
    }

    if (!teamId) return;
    refreshCards().catch((err: any) => setErrorMessage(err?.message || "unknown error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddCard() {
    setBusy(true);
    setErrorMessage("");
    try {
      const session = getWebSession();
      sessionStorage.setItem(REDIRECT_PARAMS_KEY, teamId);

      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        billingKeyMethod: "CARD",
        issueId: `issue-card-${teamId}-${Date.now()}`,
        issueName: lang === "ko" ? "Cardlogue 팀 플랜 결제 카드 등록" : "Cardlogue Team Plan Card Registration",
        customer: {
          fullName: session?.user?.name || undefined,
          email: session?.user?.email || undefined,
        },
        windowType: { mobile: "REDIRECTION" },
        redirectUrl: window.location.href,
      } as any);

      if ((issueResponse as any)?.code != null) {
        throw new Error((issueResponse as any).message || "billing key issue failed");
      }
      await registerBillingKey((issueResponse as any).billingKey, teamId);
    } catch (err: any) {
      const message = err?.message || "unknown error";
      setErrorMessage(message);
      notifyApp({ type: "team-card-error", teamId, message });
    } finally {
      setBusy(false);
    }
  }

  async function handleSelect(card: TeamCard) {
    setBusy(true);
    setErrorMessage("");
    try {
      await api("/api/portone/team-cards/select", {
        method: "POST",
        body: JSON.stringify({ teamId, cardId: card.id }),
      });
      await refreshCards();
      notifyApp({
        type: "team-card-selected",
        teamId,
        cardId: card.id,
        cardName: card.cardName,
        cardNumberMasked: card.cardNumberMasked,
      });
    } catch (err: any) {
      const message = err?.message || "unknown error";
      setErrorMessage(message);
      notifyApp({ type: "team-card-error", teamId, message });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(card: TeamCard) {
    if (!window.confirm(t.removeConfirm)) return;
    setBusy(true);
    setErrorMessage("");
    try {
      await api("/api/portone/team-cards/delete", {
        method: "POST",
        body: JSON.stringify({ teamId, cardId: card.id }),
      });
      await refreshCards();
      notifyApp({
        type: "team-card-deleted",
        teamId,
        cardId: card.id,
        cardName: card.cardName,
        cardNumberMasked: card.cardNumberMasked,
      });
    } catch (err: any) {
      const message = err?.message || "unknown error";
      setErrorMessage(message);
      notifyApp({ type: "team-card-error", teamId, message });
    } finally {
      setBusy(false);
    }
  }

  function cardLabel(card: TeamCard) {
    const name = card.cardName || t.unknownCard;
    return card.cardNumberMasked ? `${name} · ${card.cardNumberMasked}` : name;
  }

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4 py-10"
      style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}
    >
      <PageGlow />
      <div className="w-full max-w-md space-y-4">
        <h1 className="font-brand text-2xl font-bold">{t.title}</h1>
        <p className="text-white/60 text-sm">{t.subtitle}</p>

        {!teamId ? (
          <p className="text-white/60 text-sm">{t.missing}</p>
        ) : (
          <>
            {cards === null ? (
              <p className="text-white/60 text-sm">{t.loading}</p>
            ) : cards.length === 0 ? (
              <p className="text-white/60 text-sm">{t.noCards}</p>
            ) : (
              cards.map((card) => (
                <div
                  key={card.id}
                  className="border border-white/15 bg-white/[0.04] backdrop-blur-sm rounded-2xl p-5 space-y-3"
                  data-testid={`card-payment-card-${card.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-brand font-semibold">{cardLabel(card)}</p>
                    {card.isActive && (
                      <span className="text-xs px-2 py-1 rounded-full border shrink-0" style={{ color: GOLD, borderColor: GOLD }}>
                        {t.activeBadge}
                      </span>
                    )}
                  </div>
                  {!card.isActive && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 font-brand font-semibold"
                        style={{ background: GOLD, color: NAVY }}
                        disabled={busy}
                        onClick={() => handleSelect(card)}
                        data-testid={`button-select-card-${card.id}`}
                      >
                        {t.select}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white/20 hover:bg-white/10"
                        disabled={busy}
                        onClick={() => handleDelete(card)}
                        data-testid={`button-delete-card-${card.id}`}
                      >
                        {t.remove}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}

            <Button
              className="w-full font-brand font-semibold"
              style={{ background: GOLD, color: NAVY }}
              disabled={busy}
              onClick={handleAddCard}
              data-testid="button-add-card"
            >
              {busy ? t.processing : t.addCard}
            </Button>

            {errorMessage && (
              <p className="text-sm text-red-300" data-testid="text-team-cards-error">
                {t.failed}: {errorMessage}
              </p>
            )}

            {!isInAppWebView() && (
              <button
                onClick={() => (window.location.href = "/team/manage")}
                className="w-full text-sm text-white/60 hover:text-white"
                data-testid="button-back-to-manage"
              >
                {t.back}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Paddle keeps exactly one saved payment method per subscription — there's
// no list to manage, just a single "change card" action that opens Paddle's
// own checkout overlay scoped to a $0 payment-method-update transaction
// (server: POST /api/paddle/change-card-transaction). Card details
// (issuer/last4) come back in the checkout.completed event itself, since
// Paddle's API doesn't expose a "get current card" lookup the way PortOne's
// billing-key lookup does.
function TeamCardsPaddle() {
  const { lang } = useLang();
  const teamId = new URLSearchParams(window.location.search).get("teamId") || "";
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [changedCard, setChangedCard] = useState<{ type: string; last4: string } | null>(null);

  const t = {
    title: lang === "ko" ? "결제 카드 변경" : "Change Payment Card",
    subtitle:
      lang === "ko"
        ? "이 팀의 자동결제에 사용되는 카드를 변경합니다. 변경만으로는 결제되지 않습니다."
        : "Change the card used for this team's auto-billing. Changing it never charges anything.",
    changeCard: lang === "ko" ? "카드 변경" : "Change card",
    processing: lang === "ko" ? "처리 중..." : "Processing...",
    changed: (type: string, last4: string) =>
      lang === "ko" ? `카드가 변경되었습니다: ${type} ****${last4}` : `Card changed: ${type} ****${last4}`,
    back: lang === "ko" ? "팀 관리로 돌아가기" : "Back to team management",
    missing: lang === "ko" ? "잘못된 접근입니다 (teamId 누락)" : "Invalid request (missing teamId)",
    failed: lang === "ko" ? "실패했습니다" : "Something went wrong",
  };

  useEffect(() => {
    if (!getCardlogueToken() && !isInAppWebView()) {
      window.location.href = loginUrlFor(window.location.pathname + window.location.search);
      return;
    }
    if (!PADDLE_CLIENT_TOKEN) {
      setErrorMessage("missing Paddle client token");
      return;
    }
    initializePaddle({
      token: PADDLE_CLIENT_TOKEN,
      environment: PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox",
      eventCallback(event) {
        if (event.name === "checkout.completed") {
          const card = (event.data as any)?.payment?.method_details?.card;
          const type = card?.type || "";
          const last4 = card?.last4 || "";
          setChangedCard({ type, last4 });
          setBusy(false);
          notifyApp({
            type: "team-card-selected",
            teamId,
            cardId: null,
            cardName: type || null,
            cardNumberMasked: last4 ? `****${last4}` : null,
          });
        } else if (event.name === "checkout.closed" && busy) {
          setBusy(false);
        }
      },
    }).then((instance) => setPaddle(instance ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChangeCard() {
    if (!paddle) return;
    setBusy(true);
    setErrorMessage("");
    try {
      const token = getCardlogueToken();
      if (!token) throw new Error("missing Cardlogue session token");
      const res = await fetch("/api/paddle/change-card-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "failed to prepare card update");
      paddle.Checkout.open({ transactionId: data.transactionId });
    } catch (err: any) {
      const message = err?.message || "unknown error";
      setErrorMessage(message);
      notifyApp({ type: "team-card-error", teamId, message });
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4 py-10"
      style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}
    >
      <PageGlow />
      <div className="w-full max-w-md space-y-4">
        <h1 className="font-brand text-2xl font-bold">{t.title}</h1>
        <p className="text-white/60 text-sm">{t.subtitle}</p>

        {!teamId ? (
          <p className="text-white/60 text-sm">{t.missing}</p>
        ) : (
          <>
            {changedCard && (
              <p className="text-sm text-white/80" data-testid="text-paddle-card-changed">
                {t.changed(changedCard.type, changedCard.last4)}
              </p>
            )}

            <Button
              className="w-full font-brand font-semibold"
              style={{ background: GOLD, color: NAVY }}
              disabled={busy || !paddle}
              onClick={handleChangeCard}
              data-testid="button-change-card-paddle"
            >
              {busy ? t.processing : t.changeCard}
            </Button>

            {errorMessage && (
              <p className="text-sm text-red-300" data-testid="text-team-cards-error">
                {t.failed}: {errorMessage}
              </p>
            )}

            {!isInAppWebView() && (
              <button
                onClick={() => (window.location.href = "/team/manage")}
                className="w-full text-sm text-white/60 hover:text-white"
                data-testid="button-back-to-manage"
              >
                {t.back}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
