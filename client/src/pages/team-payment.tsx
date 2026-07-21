import { useEffect, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { PageGlow } from "@/components/page-glow";
import { getCardlogueToken, isInAppWebView, loginUrlFor, notifyApp } from "@/lib/cardlogue-auth";

const NAVY = "#03045E";
const GOLD = "#D4AF37";
const SEAT_PRICE_KRW = 2200;
const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string;
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string;
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;
const PADDLE_ENVIRONMENT = (import.meta.env.VITE_PADDLE_ENVIRONMENT as string) || "sandbox";

type Provider = "portone" | "paddle";
// "reviewing": card is registered/selected but not yet charged — a distinct
// final "결제하기" click is required before the actual charge fires, so
// registering a card (or picking one already on file) is never itself the
// action that spends money.
type Status = "confirm" | "reviewing" | "processing" | "success" | "error";

type TeamCard = {
  id: string;
  cardName: string | null;
  cardNumberMasked: string | null;
  createdAt: string;
  isActive: boolean;
};

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

// Mirrors server/portone.ts calcProratedSeatAmount — used only to show the
// user the actual amount they're about to be charged today for a seat
// increase, before they confirm; the server computes and charges this
// independently, this is display-only.
function calcProratedSeatAmount(chargeDate: Date, addedSeats: number, seatPriceKrw: number): number {
  const year = chargeDate.getFullYear();
  const month = chargeDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = daysInMonth - chargeDate.getDate() + 1;
  return Math.round((addedSeats * seatPriceKrw * remainingDays) / daysInMonth);
}

// Token comes either from the RN app's WebView injection or, in the browser
// flow, from the /team/login web session — see lib/cardlogue-auth.ts.

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
// Distinguishes what a returning mobile REDIRECTION round-trip is for:
// "pay" (register-then-charge, the original flow) vs "addCard" (register
// only, triggered from the card list — see handleAddNewCard). Defaults to
// "pay" for old stashes so nothing breaks mid-flight across a deploy.
const REDIRECT_INTENT_KEY = "team-payment-redirect-intent";

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
  // Cards already registered for this team (PortOne only, existing team
  // only) — null until loaded, [] once loaded with none. Existing cards
  // mean the user picks one instead of registering a new one; a team with
  // zero cards on file — including every brand-new team, until its owner
  // has registered at least one — goes straight to registration, unchanged.
  // Cards are scoped by account, not by team, so this applies the same way
  // whether params.teamId is an existing team or empty (new-team flow).
  const [cards, setCards] = useState<TeamCard[] | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // Set once a card is registered or picked, cleared on cancel/success —
  // the payload finishPortoneSubscribe will actually charge once the user
  // hits the final "결제하기" confirm.
  const [pendingCharge, setPendingCharge] = useState<{ billingKey?: string; cardId?: string } | null>(null);
  // True while a "새 카드 등록" (register-only, from the card list) attempt
  // is in flight — separate from `status`, which tracks the payment itself.
  const [addingCard, setAddingCard] = useState(false);

  async function refreshCards(target: typeof params = params) {
    const token = getCardlogueToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/portone/team-cards?teamId=${encodeURIComponent(target.teamId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "failed to load cards");
      const loaded: TeamCard[] = data.cards ?? [];
      setCards(loaded);
      const active = loaded.find((c) => c.isActive);
      setSelectedCardId((prev) => prev ?? active?.id ?? loaded[0]?.id ?? null);
      return loaded;
    } catch {
      // Falls back to the registration flow (treated as "no cards") rather
      // than blocking the page on a card-list fetch failure.
      setCards((prev) => prev ?? []);
    }
  }

  useEffect(() => {
    setParams(getParams());
  }, []);

  useEffect(() => {
    // A seat decrease never charges or touches the card on file (see
    // handleDecreaseConfirm) — no need to fetch the card list for it at all.
    const isDecreaseAttempt = params.currentSlotCount != null && params.slotCount < params.currentSlotCount;
    if (params.provider !== "portone" || isDecreaseAttempt) return;
    refreshCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.provider, params.teamId, params.currentSlotCount, params.slotCount]);

  // Browser flow (PG/card-issuer review): no app to inject the token, so an
  // unauthenticated visitor goes through /team/login first and comes back
  // here with the full query string intact. Inside the app WebView this never
  // fires — the injected token is present before this page's code runs.
  useEffect(() => {
    if (!getCardlogueToken() && !isInAppWebView()) {
      window.location.href = loginUrlFor(window.location.pathname + window.location.search);
    }
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

    // Restore the params saved right before leaving for the redirect — don't
    // trust window.location.search to still have them after the round-trip.
    const stashed = sessionStorage.getItem(REDIRECT_PARAMS_KEY);
    const restoredParams: typeof params = stashed ? JSON.parse(stashed) : getParams();
    sessionStorage.removeItem(REDIRECT_PARAMS_KEY);
    const intent = sessionStorage.getItem(REDIRECT_INTENT_KEY) || "pay";
    sessionStorage.removeItem(REDIRECT_INTENT_KEY);
    setParams(restoredParams);

    if (result.code || !result.billingKey) {
      if (intent === "addCard") {
        setAddingCard(false);
        setErrorMessage(result.message || result.pgMessage || "billing key issue failed");
        return;
      }
      setStatus("error");
      setErrorMessage(result.message || result.pgMessage || "billing key issue failed");
      notifyApp({ type: "team-payment-error", teamId: restoredParams.teamId, message: result.message });
      return;
    }

    if (intent === "addCard") {
      setAddingCard(true);
      registerNewCard(result.billingKey, restoredParams)
        .catch((err: any) => setErrorMessage(err?.message || "unknown error"))
        .finally(() => setAddingCard(false));
      return;
    }
    // Card registration succeeded — hold for the user's explicit final
    // confirm rather than charging immediately (see handleFinalConfirm).
    setPendingCharge({ billingKey: result.billingKey });
    setStatus("reviewing");
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
  const isNewSubscribe = params.currentSlotCount == null;
  const nextBillingLabel = calcNextBillingAt(new Date()).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US");
  // Actual amount charged today for an increase — prorated for the days
  // left in the current billing cycle, distinct from the full monthly
  // total shown above it. Display-only; the server computes and charges
  // this independently (see calcProratedSeatAmount above).
  const proratedIncreaseAmount = isIncrease
    ? calcProratedSeatAmount(new Date(), params.slotCount - (params.currentSlotCount ?? 0), SEAT_PRICE_KRW)
    : 0;
  // Same treatment for a brand-new subscription: today's charge is prorated
  // for the rest of this cycle, full-price billing starts at the next 1st.
  const proratedNewAmount = isNewSubscribe ? calcProratedSeatAmount(new Date(), params.slotCount, SEAT_PRICE_KRW) : 0;

  const t = {
    title: lang === "ko" ? "팀 플랜 결제" : "Team Plan Payment",
    seats: lang === "ko" ? `인원 ${params.slotCount}명` : `${params.slotCount} seats`,
    amount: lang === "ko" ? `월 ${amount.toLocaleString()}원` : `${amount.toLocaleString()} KRW / month`,
    confirm: lang === "ko" ? "이 내용으로 결제할까요?" : "Proceed with this payment?",
    confirmNew:
      lang === "ko"
        ? `오늘은 남은 기간만큼 일할 계산되어 ${proratedNewAmount.toLocaleString()}원이 결제되고, ${nextBillingLabel}부터 정상 요금인 월 ${amount.toLocaleString()}원이 매달 자동으로 청구돼요.`
        : `${proratedNewAmount.toLocaleString()} KRW (prorated for the rest of this cycle) will be charged today, then ${amount.toLocaleString()} KRW/month automatically starting ${nextBillingLabel}.`,
    confirmDecrease:
      lang === "ko"
        ? `${params.currentSlotCount}슬롯에서 ${params.slotCount}슬롯으로 줄입니다. 지금 결제하신 금액은 환불되지 않고, ${nextBillingLabel}부터 ${params.slotCount}슬롯 요금(월 ${amount.toLocaleString()}원)으로 청구돼요.`
        : `Reducing from ${params.currentSlotCount} to ${params.slotCount} seats. No refund for the amount already paid this period — starting ${nextBillingLabel}, you'll be billed ${amount.toLocaleString()} KRW/month for ${params.slotCount} seats.`,
    confirmIncrease:
      lang === "ko"
        ? `${params.currentSlotCount}슬롯에서 ${params.slotCount}슬롯으로 늘립니다. 늘어난 ${params.slotCount - (params.currentSlotCount ?? 0)}슬롯분을 오늘 일할 계산하여 ${proratedIncreaseAmount.toLocaleString()}원이 즉시 청구돼요.`
        : `Increasing from ${params.currentSlotCount} to ${params.slotCount} seats. The added ${params.slotCount - (params.currentSlotCount ?? 0)} seats are prorated — ${proratedIncreaseAmount.toLocaleString()} KRW charged today.`,
    pay: lang === "ko" ? "확인" : "Confirm",
    payNew: lang === "ko" ? "확인 (카드 등록하고 결제)" : "Confirm & pay",
    payWithSelectedCard: lang === "ko" ? "선택한 카드로 결제" : "Pay with selected card",
    cardsLoading: lang === "ko" ? "등록된 카드를 불러오는 중..." : "Loading your cards...",
    selectCardPrompt: lang === "ko" ? "결제에 사용할 카드를 선택해주세요." : "Choose which card to pay with.",
    unknownCard: lang === "ko" ? "카드" : "Card",
    addNewCard: lang === "ko" ? "+ 새 카드 등록" : "+ Register a new card",
    addingCard: lang === "ko" ? "카드 등록 중..." : "Registering card...",
    cancel: lang === "ko" ? "취소" : "Cancel",
    reviewPrompt: lang === "ko" ? "아래 카드로 결제를 진행할까요?" : "Proceed with payment using this card?",
    newCardLabel: lang === "ko" ? "새로 등록한 카드" : "Newly registered card",
    todayCharge: (n: number) => (lang === "ko" ? `오늘 ${n.toLocaleString()}원 결제` : `${n.toLocaleString()} KRW charged today`),
    finalConfirm: lang === "ko" ? "결제하기" : "Pay now",
    processing: lang === "ko" ? "결제 처리 중..." : "Processing...",
    success: lang === "ko" ? "결제가 완료되었습니다. 앱으로 돌아가세요." : "Payment complete. You can return to the app.",
    successWeb: lang === "ko" ? "결제가 완료되었습니다." : "Payment complete.",
    backToManage: lang === "ko" ? "팀 관리로 돌아가기" : "Back to team management",
    error: lang === "ko" ? "결제에 실패했습니다" : "Payment failed",
    missing: lang === "ko" ? "잘못된 접근입니다 (필수 정보 누락)" : "Invalid request (missing required parameters)",
  };

  function handleCancel() {
    notifyApp({ type: "team-payment-cancelled", teamId: params.teamId });
    // In the browser there's no app listening for the postMessage — go back
    // to the team-management page instead.
    if (!isInAppWebView()) window.location.href = "/team/manage";
  }

  async function finishPortoneSubscribe(payload: { billingKey?: string; cardId?: string }, target: typeof params = params) {
    const token = getCardlogueToken();
    if (!token) throw new Error("missing Cardlogue session token");

    const res = await fetch("/api/portone/team-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(
        target.teamId
          ? {
              ...payload,
              teamId: target.teamId,
              slotCount: target.slotCount,
              customerName: target.name,
              customerEmail: target.email,
            }
          : {
              ...payload,
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
      sessionStorage.setItem(REDIRECT_INTENT_KEY, "pay");

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

      // Card registration succeeded — hold for the user's explicit final
      // confirm rather than charging immediately (see handleFinalConfirm).
      setPendingCharge({ billingKey: (issueResponse as any).billingKey });
      setStatus("reviewing");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "unknown error");
      notifyApp({ type: "team-payment-error", teamId: params.teamId, message: err?.message });
    }
  }

  // Registers a billing key into the account's card list (no charge) and
  // selects it — used by handleAddNewCard, both for the desktop path and
  // the mobile REDIRECTION return (see the redirect-handling effect above).
  async function registerNewCard(billingKey: string, target: typeof params = params) {
    const token = getCardlogueToken();
    if (!token) throw new Error("missing Cardlogue session token");
    const res = await fetch("/api/portone/team-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ teamId: target.teamId, billingKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "register failed");
    await refreshCards(target);
    if (data.card?.id) setSelectedCardId(data.card.id);
  }

  // "새 카드 등록" from within the card-selection screen — registers a card
  // without paying, then drops the user back on the (now updated) card
  // list to pick it and continue through the normal confirm/review flow.
  async function handleAddNewCard() {
    setAddingCard(true);
    setErrorMessage("");
    try {
      const token = getCardlogueToken();
      if (!token) throw new Error("missing Cardlogue session token");

      sessionStorage.setItem(REDIRECT_PARAMS_KEY, JSON.stringify(params));
      sessionStorage.setItem(REDIRECT_INTENT_KEY, "addCard");

      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        billingKeyMethod: "CARD",
        issueId: `issue-card-${params.teamId || "new"}-${Date.now()}`,
        issueName: lang === "ko" ? "Cardlogue 팀 플랜 결제 카드 등록" : "Cardlogue Team Plan Card Registration",
        customer: {
          fullName: params.name || undefined,
          email: params.email || undefined,
        },
        windowType: { mobile: "REDIRECTION" },
        redirectUrl: window.location.href,
      } as any);

      if ((issueResponse as any)?.code != null) {
        throw new Error((issueResponse as any).message || "billing key issue failed");
      }

      // Desktop/popup path resolves here directly; the mobile REDIRECTION
      // path instead completes in the redirect-handling effect above and
      // never reaches this line (the page navigated away).
      await registerNewCard((issueResponse as any).billingKey);
    } catch (err: any) {
      setErrorMessage(err?.message || "unknown error");
    } finally {
      setAddingCard(false);
    }
  }

  function handleReviewSelectedCard() {
    if (!selectedCardId) return;
    setPendingCharge({ cardId: selectedCardId });
    setStatus("reviewing");
  }

  function handleCancelReview() {
    setPendingCharge(null);
    setStatus("confirm");
  }

  async function handleFinalConfirm() {
    if (!pendingCharge) return;
    setStatus("processing");
    setErrorMessage("");
    try {
      await finishPortoneSubscribe(pendingCharge);
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

  // A seat decrease charges nothing and never touches the card on file, so
  // it skips card selection/registration entirely — submits directly with
  // no billingKey/cardId (the server leaves portone_billing_key untouched).
  async function handleDecreaseConfirm() {
    setStatus("processing");
    setErrorMessage("");
    try {
      await finishPortoneSubscribe({});
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "unknown error");
      notifyApp({ type: "team-payment-error", teamId: params.teamId, message: err?.message });
    }
  }

  // PortOne only: once cards are loaded, a non-empty list means "pick one
  // and pay" instead of the registration flow — for an existing team or a
  // brand-new one alike, since cards belong to the account, not the team.
  // A Paddle-billed team, a seat decrease (see handleDecreaseConfirm above),
  // or an account with zero cards on file all skip straight to registration
  // (decrease skips even that — nothing to register or select for it).
  const cardsLoading = params.provider === "portone" && !isDecrease && cards === null;
  const hasExistingCards = params.provider === "portone" && !isDecrease && !!cards && cards.length > 0;
  const handlePay =
    params.provider === "paddle" ? handlePayPaddle : isDecrease ? handleDecreaseConfirm : hasExistingCards ? handleReviewSelectedCard : handlePayPortOne;

  function cardLabel(card: TeamCard) {
    const name = card.cardName || t.unknownCard;
    return card.cardNumberMasked ? `${name} · ${card.cardNumberMasked}` : name;
  }

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
                {isDecrease ? t.confirmDecrease : isIncrease ? t.confirmIncrease : isNewSubscribe ? t.confirmNew : t.confirm}
              </p>
            )}

            {cardsLoading && status === "confirm" && <p className="text-white/60 text-sm">{t.cardsLoading}</p>}

            {hasExistingCards && status === "confirm" && (
              <div className="space-y-2 text-left">
                <p className="text-white/60 text-sm text-center">{t.selectCardPrompt}</p>
                {cards!.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className="w-full text-left border rounded-xl px-4 py-3 transition-colors"
                    style={
                      selectedCardId === card.id
                        ? { borderColor: GOLD, background: "rgba(212,175,55,0.1)" }
                        : { borderColor: "rgba(255,255,255,0.15)" }
                    }
                    data-testid={`button-select-payment-card-${card.id}`}
                  >
                    <span className="text-sm">{cardLabel(card)}</span>
                  </button>
                ))}
                <button
                  type="button"
                  disabled={addingCard}
                  onClick={handleAddNewCard}
                  className="w-full text-center border border-dashed rounded-xl px-4 py-3 text-sm text-white/60 hover:text-white hover:border-white/40 transition-colors disabled:opacity-50"
                  style={{ borderColor: "rgba(255,255,255,0.2)" }}
                  data-testid="button-add-new-card"
                >
                  {addingCard ? t.addingCard : t.addNewCard}
                </button>
              </div>
            )}

            {status === "success" ? (
              <>
                <p className="text-sm text-white/80" data-testid="text-payment-success">
                  {isInAppWebView() ? t.success : t.successWeb}
                </p>
                {!isInAppWebView() && (
                  <Button
                    className="w-full font-brand font-semibold"
                    style={{ background: GOLD, color: NAVY }}
                    onClick={() => (window.location.href = "/team/manage")}
                    data-testid="button-back-to-manage"
                  >
                    {t.backToManage}
                  </Button>
                )}
              </>
            ) : status === "reviewing" ? (
              <>
                <p className="text-white/60 text-sm">{t.reviewPrompt}</p>
                <p className="text-sm font-semibold" style={{ color: GOLD }} data-testid="text-review-card">
                  {pendingCharge?.cardId
                    ? cardLabel(cards?.find((c) => c.id === pendingCharge.cardId) ?? { id: "", cardName: null, cardNumberMasked: null, createdAt: "", isActive: false })
                    : t.newCardLabel}
                </p>
                <p className="font-brand text-2xl font-black" style={{ color: GOLD }} data-testid="text-review-amount">
                  {t.todayCharge(isIncrease ? proratedIncreaseAmount : isNewSubscribe ? proratedNewAmount : amount)}
                </p>
                <Button
                  className="w-full font-brand font-semibold"
                  style={{ background: GOLD, color: NAVY }}
                  onClick={handleFinalConfirm}
                  data-testid="button-team-pay-final-confirm"
                >
                  {t.finalConfirm}
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-white border-white/20 hover:bg-white/10"
                  onClick={handleCancelReview}
                  data-testid="button-team-pay-review-cancel"
                >
                  {t.cancel}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full font-brand font-semibold"
                  style={{ background: GOLD, color: NAVY }}
                  disabled={
                    status === "processing" ||
                    cardsLoading ||
                    addingCard ||
                    (params.provider === "paddle" && !paddle) ||
                    (hasExistingCards && !selectedCardId)
                  }
                  onClick={handlePay}
                  data-testid="button-team-pay"
                >
                  {status === "processing"
                    ? t.processing
                    : hasExistingCards
                      ? t.payWithSelectedCard
                      : params.currentSlotCount == null
                        ? t.payNew
                        : t.pay}
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
