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
  Archive,
  Settings,
  LogOut,
  Calendar,
  ChevronRight,
  BarChart3,
  Clock,
} from "lucide-react";
import type { Report, Subscription } from "@shared/schema";
import { isAdmin as checkIsAdmin, isSubscribed as checkIsSubscribed } from "@/lib/access";
import { getQueryFn } from "@/lib/queryClient";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

function reportTypeLabel(type: string) {
  const labels: Record<string, string> = {
    free: "Free",
    "weekly-outlook": "Weekly Outlook",
    "market-pulse": "Market Pulse",
    "deep-dive": "Deep Dive",
    "data-drop": "Data Drop",
    "week-wrap": "Week Wrap",
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function reportTypeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "weekly-outlook" || type === "deep-dive") return "default";
  if (type === "market-pulse" || type === "data-drop") return "secondary";
  return "outline";
}


export default function DashboardPage() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const paypalPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID || "";

  const { data: recentReports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports", "recent"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: subscription } = useQuery<Subscription | null>({
    queryKey: ["/api/subscriptions", "me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const userIsAdmin = checkIsAdmin(user);
  const userIsSubscribed = checkIsSubscribed(subscription);

  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = session?.access_token;
      const res = await fetch("/api/paypal/cancel-subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions", "me"] });
      setShowCancelModal(false);
      toast({ title: "Subscription cancelled", description: "You no longer have premium access." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to cancel subscription", description: err.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const token = session?.access_token;
      const res = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: async () => {
      await signOut();
      window.location.href = "/";
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete account", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    fetch("/api/paypal/client-id")
      .then((r) => r.json())
      .then((data) => setPaypalClientId(data.clientId))
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap px-6 py-3">
          <GmrLogo showTagline />

          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="link-dashboard">
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <Link href="/archive">
              <Button variant="ghost" size="sm" data-testid="link-archive">
                <Archive className="w-4 h-4 mr-1.5" />
                Archive
              </Button>
            </Link>
            {userIsAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="link-admin">
                  <Settings className="w-4 h-4 mr-1.5" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!userIsAdmin && userIsSubscribed && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5" data-testid="badge-premium">
                Premium
              </Badge>
            )}
            {!userIsAdmin && !userIsSubscribed && (
              <Button
                size="sm"
                className="bg-[#1a1f36] hover:bg-[#2a2f46] text-white text-xs px-3 h-7"
                onClick={() => setShowPaypalModal(true)}
                data-testid="button-navbar-subscribe"
              >
                Subscribe
              </Button>
            )}
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-welcome">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Your latest financial research and market insights.
            </p>
          </div>
          <p className="text-sm text-muted-foreground pt-1" data-testid="text-today-date">
            {new Date().toLocaleDateString('en-US', {
              timeZone: 'America/New_York',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className={`p-5 space-y-2 md:col-span-2 ${userIsSubscribed ? "bg-[#1a1f36] text-white border-[#1a1f36]" : ""}`}
            data-testid="card-subscription-status"
          >
            <div className="flex items-center gap-2">
              <p className={`text-xs font-medium uppercase tracking-wider ${userIsSubscribed ? "text-white/60" : "text-muted-foreground"}`}>Subscription</p>
              {userIsSubscribed ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs">Active</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
            </div>
            <p className="text-2xl font-bold tracking-tight" data-testid="text-subscription-tier">
              {userIsSubscribed ? "Premium" : "Free"}
            </p>
            <p className={`text-xs ${userIsSubscribed ? "text-white/60" : "text-muted-foreground"}`} data-testid="text-subscription-detail">
              {userIsSubscribed
                ? subscription?.createdAt
                  ? `Member since ${format(new Date(subscription.createdAt), "MMMM d, yyyy")}`
                  : "Active member"
                : "Subscribe for full access"}
            </p>
            {userIsSubscribed && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2 cursor-pointer bg-transparent border-none p-0 mt-1"
                data-testid="link-cancel-subscription"
              >
                Cancel subscription
              </button>
            )}
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Latest</p>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">
              {recentReports?.[0]
                ? format(new Date(recentReports[0].publishedAt), "MMM d, yyyy")
                : "---"}
            </p>
            <p className="text-xs text-muted-foreground">Most recent publication</p>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-serif font-semibold">Recent Reports</h2>
            <Link href="/archive">
              <Button variant="ghost" size="sm" data-testid="link-view-all">
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {reportsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : recentReports && recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.slice(0, 5).map((report) => (
                <Link
                  key={report.id}
                  href={report.reportType === "free" ? `/report/${report.id}` : `/archive?report=${report.id}`}
                >
                  <Card className="p-5 hover-elevate cursor-pointer" data-testid={`card-report-${report.id}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{report.title}</h3>
                          <Badge variant={reportTypeVariant(report.reportType)} className="text-xs">
                            {reportTypeLabel(report.reportType)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {report.content.replace(/[#*_`]/g, "").slice(0, 200)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {format(new Date(report.publishedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No reports available yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon for new publications.</p>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          GMR &middot; Global Market Radar
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 cursor-pointer bg-transparent border-none p-0"
          data-testid="link-delete-account"
        >
          Delete account
        </button>
      </footer>

      <Dialog open={showPaypalModal} onOpenChange={setShowPaypalModal}>
        <DialogContent className="max-w-md" data-testid="dialog-subscribe">
          <DialogHeader>
            <DialogTitle data-testid="text-subscribe-modal-title">Subscribe to GMR Premium</DialogTitle>
            <DialogDescription>
              Get full access to all daily reports, archive, and expert market analysis for $12/month.
            </DialogDescription>
          </DialogHeader>
          {paypalClientId && paypalPlanId ? (
            <PayPalScriptProvider options={{ clientId: paypalClientId, vault: true, intent: "subscription", locale: "en_US" }}>
              <PayPalButtons
                style={{ shape: "rect", color: "gold", layout: "vertical", label: "subscribe" }}
                createSubscription={(_data, actions) => {
                  return actions.subscription.create({ plan_id: paypalPlanId });
                }}
                onApprove={async (data) => {
                  try {
                    const token = session?.access_token;
                    if (!token) return;
                    const res = await fetch("/api/paypal/create-subscription", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ subscriptionId: data.subscriptionID }),
                    });
                    if (res.ok) {
                      toast({ title: "Subscription activated! Welcome to GMR." });
                      window.location.reload();
                    } else {
                      toast({ title: "Failed to activate subscription", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Something went wrong", variant: "destructive" });
                  }
                }}
                onError={() => {}}
                data-testid="paypal-modal-subscribe"
              />
            </PayPalScriptProvider>
          ) : (
            <Link href="/">
              <Button className="w-full" data-testid="button-modal-subscribe">View Plans</Button>
            </Link>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md" data-testid="dialog-cancel-subscription">
          <DialogHeader>
            <DialogTitle data-testid="text-cancel-modal-title">Cancel Subscription</DialogTitle>
            <DialogDescription data-testid="text-cancel-modal-description">
              Are you sure you want to cancel your subscription? You will immediately lose access to premium reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-modal-dismiss"
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md" data-testid="dialog-delete-account">
          <DialogHeader>
            <DialogTitle data-testid="text-delete-modal-title">Delete Account</DialogTitle>
            <DialogDescription data-testid="text-delete-modal-description">
              Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteAccountMutation.isPending}
              data-testid="button-delete-modal-dismiss"
            >
              Keep Account
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Yes, Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
