import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { GmrLogo } from "@/components/gmr-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Archive,
  Settings,
  LogOut,
  BarChart3,
  Clock,
  FileText,
  ArrowLeft,
  Lock,
} from "lucide-react";
import type { Report, Subscription } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { marked } from "marked";
import DOMPurify from "dompurify";

const DAY_FILTERS = [
  "all",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "free",
] as const;

function reportTypeLabel(type: string) {
  const labels: Record<string, string> = {
    free: "Free",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    market_analysis: "Market Analysis",
    equity_research: "Equity Research",
    macro_outlook: "Macro Outlook",
    sector_review: "Sector Review",
    weekly_digest: "Weekly Digest",
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function reportTypeVariant(type: string): "default" | "secondary" | "outline" {
  if (
    type === "monday" ||
    type === "wednesday" ||
    type === "market_analysis" ||
    type === "macro_outlook"
  )
    return "default";
  if (type === "tuesday" || type === "thursday" || type === "equity_research")
    return "secondary";
  return "outline";
}

export default function ArchivePage() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const paypalPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID;

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const reportIdFromUrl = searchParams.get("report");

  const { data: subscription, isLoading: subLoading } =
    useQuery<Subscription | null>({
      queryKey: ["/api/subscriptions", "me"],
      queryFn: getQueryFn({ on401: "returnNull" }),
    });

  const { data: readReportIds } = useQuery<string[]>({
    queryKey: ["/api/report-reads"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const queryClient = useQueryClient();

  const isSubscribed = subscription?.status === "active";
  const isAdmin = user?.email === "globalmarketradar@gmail.com";

  const isNewReport = (report: Report) => {
    const hoursAgo = (Date.now() - new Date(report.publishedAt).getTime()) / (1000 * 60 * 60);
    return hoursAgo <= 36 && !(readReportIds || []).includes(report.id);
  };

  const markAsRead = async (reportId: string) => {
    try {
      const token = session?.access_token;
      if (!token) return;
      await fetch(`/api/report-reads/${reportId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/report-reads"] });
    } catch {}
  };

  useEffect(() => {
    fetch("/api/paypal/client-id")
      .then((r) => r.json())
      .then((data) => setPaypalClientId(data.clientId))
      .catch(() => {});
  }, []);

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (filterType === "all") return sortedReports;
    return sortedReports.filter((r) => r.reportType === filterType);
  }, [sortedReports, filterType]);

  useEffect(() => {
    if (reportIdFromUrl && reports) {
      const found = reports.find((r) => r.id === reportIdFromUrl);
      if (found && (found.reportType === "free" || isSubscribed)) {
        setSelectedReport(found);
        markAsRead(found.id);
      }
    }
  }, [reportIdFromUrl, reports, isSubscribed]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "?";

  if (selectedReport) {
    const rawHtml = marked.parse(selectedReport.content) as string;
    const htmlContent = DOMPurify.sanitize(rawHtml);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-background">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedReport(null)}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Archive
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
          <article className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={reportTypeVariant(selectedReport.reportType)}>
                  {reportTypeLabel(selectedReport.reportType)}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(selectedReport.publishedAt), "MMMM d, yyyy")}
                </span>
              </div>
              <h1
                className="text-3xl font-serif font-bold tracking-tight"
                data-testid="text-report-title"
              >
                {selectedReport.title}
              </h1>
            </div>

            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              data-testid="text-report-content"
            />
          </article>
        </main>
      </div>
    );
  }

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
              <Button
                variant="ghost"
                size="sm"
                data-testid="link-archive-active"
              >
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
            {!isAdmin && isSubscribed && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5" data-testid="badge-premium">
                Premium
              </Badge>
            )}
            {!isAdmin && !isSubscribed && (
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
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1
            className="text-2xl font-serif font-bold tracking-tight"
            data-testid="text-archive-title"
          >
            Report Archive
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse all published financial reports and research.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {DAY_FILTERS.map((day) => (
            <Button
              key={day}
              variant={filterType === day ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(day)}
              data-testid={`button-filter-${day}`}
              className="toggle-elevate"
            >
              {day === "all" ? "All" : reportTypeLabel(day)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <Card
                key={report.id}
                className="p-5 hover-elevate cursor-pointer"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (report.reportType === "free" || isSubscribed) {
                    setSelectedReport(report);
                    markAsRead(report.id);
                  } else {
                    setShowLockedModal(true);
                  }
                }}
                data-testid={`card-archive-report-${report.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="font-semibold text-sm"
                        data-testid={`text-report-title-${report.id}`}
                      >
                        {report.title}
                      </h3>
                      <Badge
                        variant={reportTypeVariant(report.reportType)}
                        className="text-xs"
                        data-testid={`badge-type-${report.id}`}
                      >
                        {reportTypeLabel(report.reportType)}
                      </Badge>
                      {isNewReport(report) && (
                        <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] px-1.5 py-0" data-testid={`badge-new-${report.id}`}>
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p
                      className="text-xs text-muted-foreground line-clamp-2"
                      data-testid={`text-report-preview-${report.id}`}
                    >
                      {report.content.replace(/[#*_`\[\]]/g, "").slice(0, 200)}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"
                    data-testid={`text-report-date-${report.id}`}
                  >
                    <Clock className="w-3 h-3" />
                    {format(new Date(report.publishedAt), "MMM d, yyyy")}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Archive className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p
              className="text-sm text-muted-foreground"
              data-testid="text-no-reports"
            >
              {filterType !== "all"
                ? `No ${reportTypeLabel(filterType)} reports found.`
                : "No reports available yet."}
            </p>
          </Card>
        )}
      </main>

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          GMR &middot; Global Market Radar
        </p>
      </footer>

      <Dialog open={showLockedModal} onOpenChange={setShowLockedModal}>
        <DialogContent className="max-w-md text-center" data-testid="dialog-locked-report">
          <DialogHeader className="flex flex-col items-center space-y-3">
            <Lock className="w-12 h-12 text-muted-foreground" />
            <DialogTitle className="text-xl font-serif font-bold" data-testid="text-locked-title">
              Subscribe to Access Premium Reports
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed" data-testid="text-locked-description">
              The report archive is available exclusively to premium subscribers. Upgrade your plan to browse our full library of financial research, market analysis, and investment insights.
            </DialogDescription>
          </DialogHeader>
          <Link href="/">
            <Button className="w-full bg-[#1a1f36] hover:bg-[#2a2f46] text-white" data-testid="button-upgrade-premium">
              Upgrade to Premium
            </Button>
          </Link>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
