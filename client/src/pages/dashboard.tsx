import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
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
  FileText,
  Archive,
  Settings,
  LogOut,
  Calendar,
  ChevronRight,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react";
import type { Report, Subscription } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { format } from "date-fns";
import { useState, useEffect } from "react";

function reportTypeLabel(type: string) {
  const labels: Record<string, string> = {
    market_analysis: "Market Analysis",
    equity_research: "Equity Research",
    macro_outlook: "Macro Outlook",
    sector_review: "Sector Review",
    weekly_digest: "Weekly Digest",
  };
  return labels[type] || type;
}

function reportTypeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "market_analysis" || type === "macro_outlook") return "default";
  if (type === "equity_research") return "secondary";
  return "outline";
}

export default function DashboardPage() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
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

  const isSubscribed = subscription?.status === "active";

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
            {user?.email === "globalmarketradar@gmail.com" && (
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
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-welcome">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your latest financial research and market insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subscription</p>
              <Badge variant={subscription?.status === "active" ? "default" : "secondary"} className="text-xs">
                {subscription?.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-lg font-semibold">{subscription?.status === "active" ? "Premium" : "Free"}</p>
            <p className="text-xs text-muted-foreground">
              {subscription?.status === "active"
                ? "Full access to all reports"
                : "Subscribe for full access"}
            </p>
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reports</p>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">{recentReports?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Available in archive</p>
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

        {!isSubscribed && (
          <Card className="p-6 border-2 border-primary/30 bg-primary/5" data-testid="card-subscribe-banner">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-base">Unlock Premium Access</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Subscribe to access all daily reports, full archive, and expert market analysis.
                </p>
              </div>
              {paypalClientId && paypalPlanId ? (
                <div className="w-full sm:w-64">
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
                      data-testid="paypal-dashboard-subscribe"
                    />
                  </PayPalScriptProvider>
                </div>
              ) : (
                <Link href="/">
                  <Button data-testid="button-subscribe-banner">Subscribe Now</Button>
                </Link>
              )}
            </div>
          </Card>
        )}

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
                <Link key={report.id} href={`/archive?report=${report.id}`}>
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

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          GMR &middot; Global Market Radar
        </p>
      </footer>
    </div>
  );
}
