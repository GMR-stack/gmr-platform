import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { GmrLogo } from "@/components/gmr-logo";
import { useToast } from "@/hooks/use-toast";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  LogOut,
  ChevronRight,
  Clock,
  Lock,
  CheckCircle2,
} from "lucide-react";
import type { Report, Subscription } from "@shared/schema";
import { isAdmin as checkIsAdmin, isSubscribed as checkIsSubscribed } from "@/lib/access";
import { getQueryFn } from "@/lib/queryClient";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TrendingUp, TrendingDown } from "lucide-react";

// ─── Market Snapshot ────────────────────────────────────────────────────────
interface TickerData { key: string; name: string; price: number | null; change: number | null; }
interface SnapshotMap { sp500: TickerData; brent: TickerData; dxy: TickerData; us10y: TickerData; }

function formatPrice(key: string, price: number | null) {
  if (price == null) return "—";
  if (key === "us10y") return price.toFixed(3) + "%";
  if (key === "dxy") return price.toFixed(2);
  if (key === "brent") return "$" + price.toFixed(2);
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MarketSnapshot() {
  const { data, isLoading } = useQuery<SnapshotMap>({
    queryKey: ["/api/market/snapshot"],
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  const order: (keyof SnapshotMap)[] = ["sp500", "brent", "dxy", "us10y"];
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-serif font-semibold">Market Snapshot</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {order.map((key) => {
          const ticker = data?.[key];
          const isPos = (ticker?.change ?? 0) >= 0;
          return (
            <div key={key} className="rounded-xl p-4 bg-[#0f1117] border border-white/8 space-y-2" data-testid={`card-market-${key}`}>
              {isLoading || !ticker ? (
                <><Skeleton className="h-3 w-20 bg-white/10" /><Skeleton className="h-6 w-24 bg-white/10" /><Skeleton className="h-3 w-14 bg-white/10" /></>
              ) : (
                <>
                  <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">{ticker.name}</p>
                  <p className="text-xl font-bold text-white font-mono">{formatPrice(key, ticker.price)}</p>
                  <div className={`flex items-center gap-1 text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {ticker.change != null ? (isPos ? "+" : "") + ticker.change.toFixed(2) + "%" : "—"}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sentiment Gauge ─────────────────────────────────────────────────────────
interface SentimentData { score: number; rating: string; }

function sentimentColor(score: number) {
  if (score <= 25) return "#ef4444";
  if (score <= 45) return "#f97316";
  if (score <= 55) return "#eab308";
  if (score <= 75) return "#84cc16";
  return "#22c55e";
}

function sentimentLabel(score: number) {
  if (score <= 25) return "Extreme Fear";
  if (score <= 45) return "Fear";
  if (score <= 55) return "Neutral";
  if (score <= 75) return "Greed";
  return "Extreme Greed";
}

function SentimentGaugeInline() {
  const { data, isLoading } = useQuery<SentimentData>({
    queryKey: ["/api/market/sentiment"],
    refetchInterval: 300_000,
    staleTime: 290_000,
  });
  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        <Skeleton className="h-10 w-24 bg-white/10" />
        <Skeleton className="h-1.5 w-full bg-white/10" />
        <Skeleton className="h-4 w-20 bg-white/10" />
      </div>
    );
  }
  const score = data?.score ?? 50;
  const color = sentimentColor(score);
  const label = sentimentLabel(score);
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="w-full space-y-3">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold font-mono leading-none" style={{ color }}>{score.toFixed(1)}</span>
        <span className="text-xs text-white/30 pb-1">/ 100</span>
      </div>
      <div className="w-full bg-white/[0.06] rounded h-1.5 overflow-hidden">
        <div className="h-full rounded transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-white/25">Fear</span>
        <span className="text-[10px] text-white/25">Greed</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ color, background: color + "20" }}>{label}</span>
        <span className="text-[10px] text-white/25">CNN F&amp;G</span>
      </div>
    </div>
  );
}

// ─── Report Type Badge ───────────────────────────────────────────────────────
function reportTypeLabel(type: string) {
  const labels: Record<string, string> = {
    free: "Free",
    premium: "Premium",
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function ReportTypeBadge({ type }: { type: string }) {
  if (type === "free") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/60 text-emerald-500 bg-emerald-500/10">Free</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-400/30">
      <Lock className="w-2.5 h-2.5" />{reportTypeLabel(type)}
    </span>
  );
}

// ─── Subscription Cards ──────────────────────────────────────────────────────
function SubscribePromptCard({ onSubscribe }: { onSubscribe: () => void }) {
  const perks = [
    "2–3 reports per week on macro & geopolitics",
    "2nd & 3rd order market analysis",
    "Full archive access",
  ];
  return (
    <div className="h-full flex flex-col justify-between space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subscription</p>
          <Badge variant="secondary" className="text-xs">Inactive</Badge>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-3xl font-bold tracking-tight">$12</span>
          <span className="text-sm text-muted-foreground">/month</span>
          <span className="text-xs text-amber-500 font-medium ml-1">Founding rate</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{perk}
          </li>
        ))}
      </ul>
      {/* subtle 텍스트 링크 스타일 — 압박감 없이 */}
      <button
        onClick={onSubscribe}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer bg-transparent border-none p-0 text-left transition-colors"
        data-testid="button-subscribe-card"
      >
        Unlock premium access → $12/mo
      </button>
    </div>
  );
}

function ActiveSubscriptionCard({ subscription, onCancel }: { subscription: Subscription | null | undefined; onCancel: () => void; }) {
  return (
    <div className="h-full flex flex-col justify-between space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/60">Subscription</p>
          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs">Active</Badge>
        </div>
        <p className="text-2xl font-bold tracking-tight" data-testid="text-subscription-tier">Premium</p>
        <p className="text-xs text-white/60" data-testid="text-subscription-detail">
          {subscription?.createdAt ? `Member since ${format(new Date(subscription.createdAt), "MMMM d, yyyy")}` : "Active member"}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/50"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Full archive access</div>
        <div className="flex items-center gap-2 text-xs text-white/50"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />2–3 reports per week</div>
      </div>
      <button onClick={onCancel} className="text-xs text-white/30 hover:text-white/60 underline underline-offset-2 cursor-pointer bg-transparent border-none p-0 text-left" data-testid="link-cancel-subscription">
        Cancel subscription
      </button>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const paypalPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID || "";
  const isGuest = !user;

  const { data: recentReports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports", "recent"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: subscription } = useQuery<Subscription | null>({
    queryKey: ["/api/subscriptions", "me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const userIsAdmin = checkIsAdmin(user);
  const userIsSubscribed = checkIsSubscribed(subscription);

  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = session?.access_token;
      const res = await fetch("/api/paypal/cancel-subscription", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed to cancel"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions", "me"] });
      setShowCancelModal(false);
      toast({ title: "Subscription cancelled", description: "You no longer have premium access." });
    },
    onError: (err: Error) => toast({ title: "Failed to cancel subscription", description: err.message, variant: "destructive" }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const token = session?.access_token;
      const res = await fetch("/api/auth/delete-account", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed to delete account"); }
      return res.json();
    },
    onSuccess: async () => { await signOut(); window.location.href = "/"; },
    onError: (err: Error) => toast({ title: "Failed to delete account", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    fetch("/api/paypal/client-id").then((r) => r.json()).then((data) => setPaypalClientId(data.clientId)).catch(() => {});
  }, []);

  const getGreeting = () => {
    const h = parseInt(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.name?.split(" ")[0] || null;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap px-6 py-3">
          <GmrLogo showTagline />
          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <button className="text-base font-medium px-4 py-3 border-b-2 border-[#1a1f36] text-foreground bg-transparent hover:bg-transparent transition-colors" data-testid="link-dashboard">
                Dashboard
              </button>
            </Link>
            <Link href="/archive">
              <button className="text-base font-normal px-4 py-3 border-b-2 border-transparent text-muted-foreground bg-transparent hover:text-foreground hover:border-[#1a1f36]/40 transition-colors" data-testid="link-archive">
                Archive
              </button>
            </Link>
            {userIsAdmin && (
              <Link href="/admin">
                <button className="text-base font-normal px-4 py-3 border-b-2 border-transparent text-muted-foreground bg-transparent hover:text-foreground hover:border-[#1a1f36]/40 transition-colors" data-testid="link-admin">
                  Admin
                </button>
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isGuest ? (
              <>
                <Link href="/login"><Button variant="outline" size="sm" className="text-xs h-7">Log In</Button></Link>
                <button onClick={() => setShowPaypalModal(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 bg-transparent border-none cursor-pointer" data-testid="button-navbar-subscribe">Subscribe</button>
              </>
            ) : (
              <>
                {!userIsAdmin && userIsSubscribed && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5" data-testid="badge-premium">Premium</Badge>
                )}
                {!userIsAdmin && !userIsSubscribed && (
                  <button onClick={() => setShowPaypalModal(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 bg-transparent border-none cursor-pointer" data-testid="button-navbar-subscribe">Subscribe</button>
                )}
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-logout"><LogOut className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {/* ── Welcome ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-welcome">
              {isGuest ? "Global Market Radar" : `${getGreeting()}${firstName ? `, ${firstName}` : ""}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isGuest ? "Institutional-quality macro analysis, published 2–3× weekly." : "Your latest financial research and market insights."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium" data-testid="text-today-date">
              {new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true })} ET
            </p>
          </div>
        </div>

        {/* ── Subscription + Sentiment ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`p-5 md:col-span-2 ${userIsSubscribed ? "bg-[#1a1f36] text-white border-[#1a1f36]" : "border-border"}`} data-testid="card-subscription-status">
            {userIsSubscribed
              ? <ActiveSubscriptionCard subscription={subscription} onCancel={() => setShowCancelModal(true)} />
              : <SubscribePromptCard onSubscribe={() => setShowPaypalModal(true)} />}
          </Card>
          <Card className="p-5 flex flex-col bg-[#0f1117] border-[#0f1117]" data-testid="card-sentiment-gauge">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50 mb-4">Market Sentiment</p>
            <div className="flex-1 flex flex-col justify-center"><SentimentGaugeInline /></div>
          </Card>
        </div>

        {/* ── Market Snapshot ── */}
        <MarketSnapshot />

        {/* ── Recent Reports ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-serif font-semibold">Recent Reports</h2>
            <Link href="/archive"><Button variant="ghost" size="sm" data-testid="link-view-all">View all <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
          {reportsLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => (<Card key={i} className="p-5"><div className="space-y-3"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div></Card>))}</div>
          ) : recentReports && recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.slice(0, 5).map((report) => {
                const isFree = report.reportType === "free";
                const canRead = isFree || userIsSubscribed || userIsAdmin;
                const handleClick = () => {
                  if (isFree) navigate(`/report/${report.id}`);
                  else if (canRead) navigate(`/archive?report=${report.id}`);
                  else setShowPaypalModal(true);
                };
                return (
                  <Card key={report.id} className={`p-5 hover-elevate cursor-pointer transition-colors ${!canRead ? "opacity-80 hover:opacity-100" : ""}`} onClick={handleClick} data-testid={`card-report-${report.id}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><ReportTypeBadge type={report.reportType} /></div>
                        <h3 className="font-semibold text-sm leading-snug line-clamp-1">{report.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{report.content.replace(/[#*_`]/g, "").slice(0, 180)}...</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-0.5">
                        <Clock className="w-3 h-3" />{format(new Date(report.publishedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center"><FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No reports available yet.</p></Card>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-4 text-center space-y-2">
        <p className="text-xs text-muted-foreground">GMR &middot; Global Market Radar</p>
        {!isGuest && (
          <button onClick={() => setShowDeleteModal(true)} className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 cursor-pointer bg-transparent border-none p-0" data-testid="link-delete-account">
            Delete account
          </button>
        )}
      </footer>

      {/* ── Subscribe Modal ── */}
      <Dialog open={showPaypalModal} onOpenChange={setShowPaypalModal}>
        <DialogContent className="max-w-md" data-testid="dialog-subscribe">
          <DialogHeader>
            <DialogTitle data-testid="text-subscribe-modal-title">Subscribe to GMR Premium</DialogTitle>
            <DialogDescription>Institutional-quality macro analysis for individual investors. $12/month — founding member rate.</DialogDescription>
          </DialogHeader>
          {isGuest ? (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">Create a free account to subscribe and access all premium reports.</p>
              <Link href="/login?mode=signup">
                <Button className="w-full bg-[#1a1f36] hover:bg-[#2a2f46] text-white">Create Account & Subscribe</Button>
              </Link>
              <div className="text-center">
                <Link href="/login"><span className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">Already have an account? Log in</span></Link>
              </div>
            </div>
          ) : paypalClientId && paypalPlanId ? (
            <PayPalScriptProvider options={{ clientId: paypalClientId, vault: true, intent: "subscription", locale: "en_US" }}>
              <PayPalButtons
                style={{ shape: "rect", color: "gold", layout: "vertical", label: "subscribe" }}
                createSubscription={(_data, actions) => actions.subscription.create({ plan_id: paypalPlanId })}
                onApprove={async (data) => {
                  try {
                    const token = session?.access_token;
                    if (!token) return;
                    const res = await fetch("/api/paypal/create-subscription", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ subscriptionId: data.subscriptionID }),
                    });
                    if (res.ok) { toast({ title: "Subscription activated! Welcome to GMR." }); window.location.reload(); }
                    else toast({ title: "Failed to activate subscription", variant: "destructive" });
                  } catch { toast({ title: "Something went wrong", variant: "destructive" }); }
                }}
                onError={() => {}}
                data-testid="paypal-modal-subscribe"
              />
            </PayPalScriptProvider>
          ) : (
            <Link href="/"><Button className="w-full">View Plans</Button></Link>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel Modal ── */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md" data-testid="dialog-cancel-subscription">
          <DialogHeader><DialogTitle>Cancel Subscription</DialogTitle><DialogDescription>Are you sure you want to cancel? You will immediately lose access to all premium reports.</DialogDescription></DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={cancelMutation.isPending}>Keep Subscription</Button>
            <Button variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>{cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md" data-testid="dialog-delete-account">
          <DialogHeader><DialogTitle>Delete Account</DialogTitle><DialogDescription>This cannot be undone. All your data will be permanently deleted.</DialogDescription></DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleteAccountMutation.isPending}>Keep Account</Button>
            <Button variant="destructive" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>{deleteAccountMutation.isPending ? "Deleting..." : "Yes, Delete Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
