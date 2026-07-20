import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { PageGlow } from "@/components/page-glow";
import { getCardlogueToken, getWebSession, clearWebSession, loginUrlFor, isInAppWebView } from "@/lib/cardlogue-auth";

const NAVY = "#03045E";
const GOLD = "#D4AF37";
const SEAT_PRICE_KRW = 2200;

type TeamSubscription = {
  status: string;
  slotCount: number;
  nextBillingAt: string | null;
  pendingCancellation: boolean;
  provider: "portone" | "paddle" | null;
};

type Team = {
  teamId: string;
  name: string;
  role: string;
  memberCount: number;
  subscription: TeamSubscription | null;
};

// Browser team-management page (the app has its own screens for this) —
// the entry point of the reviewable web flow: sign in → pick a team → see
// the plan → go to the payment screen or card management.
export default function TeamManagePage() {
  const { lang } = useLang();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Seat count the user is dialing in per team, before going to payment.
  const [slotDrafts, setSlotDrafts] = useState<Record<string, number>>({});

  const session = getWebSession();

  const t = {
    title: lang === "ko" ? "팀 플랜 관리" : "Team Plan Management",
    loading: lang === "ko" ? "불러오는 중..." : "Loading...",
    noTeams: lang === "ko" ? "속한 팀이 없습니다." : "You don't belong to any team yet.",
    members: (n: number) => (lang === "ko" ? `멤버 ${n}명` : `${n} member${n === 1 ? "" : "s"}`),
    role: (r: string) =>
      lang === "ko" ? (r === "owner" ? "소유자" : r === "admin" ? "관리자" : "멤버") : r,
    active: lang === "ko" ? "구독 중" : "Active",
    pendingCancel: lang === "ko" ? "해지 예정" : "Cancels at period end",
    noSub: lang === "ko" ? "구독 없음" : "No subscription",
    slots: (n: number) => (lang === "ko" ? `${n}슬롯` : `${n} seats`),
    nextBilling: (d: string) =>
      lang === "ko"
        ? `다음 결제일 ${new Date(d).toLocaleDateString("ko-KR")}`
        : `Next billing ${new Date(d).toLocaleDateString("en-US")}`,
    monthly: (n: number) =>
      lang === "ko" ? `월 ${(n * SEAT_PRICE_KRW).toLocaleString()}원` : `${(n * SEAT_PRICE_KRW).toLocaleString()} KRW / mo`,
    subscribe: lang === "ko" ? "결제하기" : "Subscribe",
    changeSlots: lang === "ko" ? "슬롯 변경" : "Change seats",
    manageCards: lang === "ko" ? "카드 관리" : "Manage cards",
    changeCard: lang === "ko" ? "카드 변경" : "Change card",
    adminOnly: lang === "ko" ? "결제 관리는 소유자/관리자만 할 수 있어요." : "Only owners/admins can manage billing.",
    logout: lang === "ko" ? "로그아웃" : "Sign out",
    error: lang === "ko" ? "팀 정보를 불러오지 못했습니다" : "Failed to load teams",
  };

  useEffect(() => {
    const token = getCardlogueToken();
    if (!token) {
      if (!isInAppWebView()) window.location.href = loginUrlFor("/team/manage");
      return;
    }
    fetch("/api/cardlogue/my-teams", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "failed");
        setTeams(data.teams);
      })
      .catch((err: any) => setErrorMessage(err?.message || "unknown error"));
  }, []);

  function draftSlots(team: Team): number {
    return (
      slotDrafts[team.teamId] ??
      team.subscription?.slotCount ??
      Math.max(2, team.memberCount)
    );
  }

  function adjustSlots(team: Team, delta: number) {
    const min = Math.max(2, team.memberCount);
    const next = Math.max(min, draftSlots(team) + delta);
    setSlotDrafts((prev) => ({ ...prev, [team.teamId]: next }));
  }

  function goToPayment(team: Team) {
    const params = new URLSearchParams({
      teamId: team.teamId,
      slotCount: String(draftSlots(team)),
      // An active subscription's own provider decides which PG the payment
      // page shows (an active team can't switch PGs mid-subscription); a new
      // team defaults to PortOne.
      pg: team.subscription?.provider || "portone",
      name: session?.user?.name || "",
      email: session?.user?.email || "",
    });
    if (team.subscription?.status === "active") {
      params.set("currentSlotCount", String(team.subscription.slotCount));
    }
    window.location.href = `/team/payment?${params.toString()}`;
  }

  function handleLogout() {
    clearWebSession();
    window.location.href = loginUrlFor("/team/manage");
  }

  const canManage = (team: Team) => team.role === "owner" || team.role === "admin";

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4 py-10"
      style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}
    >
      <PageGlow />
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-brand text-2xl font-bold">{t.title}</h1>
          {!isInAppWebView() && (
            <button onClick={handleLogout} className="text-sm text-white/60 hover:text-white" data-testid="button-team-logout">
              {t.logout}
            </button>
          )}
        </div>
        {session?.user?.email && <p className="text-white/50 text-sm">{session.user.email}</p>}

        {errorMessage ? (
          <p className="text-sm text-red-300" data-testid="text-team-manage-error">
            {t.error}: {errorMessage}
          </p>
        ) : teams === null ? (
          <p className="text-white/60 text-sm">{t.loading}</p>
        ) : teams.length === 0 ? (
          <p className="text-white/60 text-sm">{t.noTeams}</p>
        ) : (
          teams.map((team) => {
            const sub = team.subscription;
            const isActive = sub?.status === "active";
            return (
              <div
                key={team.teamId}
                className="border border-white/15 bg-white/[0.04] backdrop-blur-sm rounded-2xl p-5 space-y-3"
                data-testid={`card-team-${team.teamId}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-brand font-semibold text-lg">{team.name}</p>
                    <p className="text-white/50 text-sm">
                      {t.role(team.role)} · {t.members(team.memberCount)}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full border"
                    style={
                      isActive
                        ? { color: GOLD, borderColor: GOLD }
                        : { color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.2)" }
                    }
                  >
                    {isActive ? (sub!.pendingCancellation ? t.pendingCancel : t.active) : t.noSub}
                  </span>
                </div>

                {isActive && (
                  <p className="text-white/70 text-sm">
                    {t.slots(sub!.slotCount)} · {t.monthly(sub!.slotCount)}
                    {sub!.nextBillingAt ? ` · ${t.nextBilling(sub!.nextBillingAt)}` : ""}
                  </p>
                )}

                {canManage(team) ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white border-white/20 hover:bg-white/10 px-3"
                        onClick={() => adjustSlots(team, -1)}
                        data-testid={`button-slots-minus-${team.teamId}`}
                      >
                        −
                      </Button>
                      <span className="font-brand font-semibold min-w-[5rem] text-center">
                        {t.slots(draftSlots(team))}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white border-white/20 hover:bg-white/10 px-3"
                        onClick={() => adjustSlots(team, 1)}
                        data-testid={`button-slots-plus-${team.teamId}`}
                      >
                        +
                      </Button>
                      <span className="text-white/50 text-sm ml-auto">{t.monthly(draftSlots(team))}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 font-brand font-semibold"
                        style={{ background: GOLD, color: NAVY }}
                        onClick={() => goToPayment(team)}
                        data-testid={`button-team-subscribe-${team.teamId}`}
                      >
                        {isActive ? t.changeSlots : t.subscribe}
                      </Button>
                      {isActive && sub!.provider === "portone" && (
                        <Button
                          variant="outline"
                          className="flex-1 text-white border-white/20 hover:bg-white/10"
                          onClick={() => (window.location.href = `/team/cards?teamId=${team.teamId}`)}
                          data-testid={`button-team-cards-${team.teamId}`}
                        >
                          {t.manageCards}
                        </Button>
                      )}
                      {isActive && sub!.provider === "paddle" && (
                        <Button
                          variant="outline"
                          className="flex-1 text-white border-white/20 hover:bg-white/10"
                          onClick={() => (window.location.href = `/team/cards?teamId=${team.teamId}&pg=paddle`)}
                          data-testid={`button-team-cards-${team.teamId}`}
                        >
                          {t.changeCard}
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-white/40 text-sm">{t.adminOnly}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
