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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Report, Subscription } from "@shared/schema";
import { canAccessReport, isAdmin as checkIsAdmin, isSubscribed as checkIsSubscribed } from "@/lib/access";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { marked } from "marked";
import DOMPurify from "dompurify";

const DAY_FILTERS = [
  "all",
  "weekly-outlook",
  "market-pulse",
  "deep-dive",
  "data-drop",
  "week-wrap",
  "free",
] as const;

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

export default function ArchivePage() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
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

  const queryClient = useQueryClient();

  const userIsAdmin = checkIsAdmin(user);
  const userIsSubscribed = checkIsSubscribed(subscription);

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

  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / reportsPerPage));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * reportsPerPage;
    return filteredReports.slice(start, start + reportsPerPage);
  }, [filteredReports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  useEffect(() => {
    if (reportIdFromUrl && reports) {
      const found = reports.find((r) => r.id === reportIdFromUrl);
      if (found && canAccessReport(user, found, subscription)) {
        setSelectedReport(found);
      }
    }
  }, [reportIdFromUrl, reports, user, subscription]);

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
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap px-6 py-3">
          <GmrLogo showTagline />

          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <button
                className="text-base font-normal px-4 py-3 border-b-2 border-transparent text-muted-foreground bg-transparent hover:text-foreground hover:border-[#1a1f36]/40 transition-colors"
                data-testid="link-dashboard"
              >
                Dashboard
              </button>
            </Link>
            <Link href="/archive">
              <button
                className="text-base font-medium px-4 py-3 border-b-2 border-[#1a1f36] text-foreground bg-transparent hover:bg-transparent transition-colors"
                data-testid="link-archive-active"
              >
                Archive
              </button>
            </Link>
            {userIsAdmin && (
              <Link href="/admin">
                <button
                  className="text-base font-normal px-4 py-3 border-b-2 border-transparent text-muted-foreground bg-transparent hover:text-foreground hover:border-[#1a1f36]/40 transition-colors"
                  data-testid="link-admin"
                >
                  Admin
                </button>
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

        {/* ── Filter Buttons ── */}
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

        {/* ── Report List ── */}
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
            {paginatedReports.map((report) => (
              <Card
                key={report.id}
                className="p-5 hover-elevate cursor-pointer transition-colors"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (report.reportType === "free") {
                    navigate(`/report/${report.id}`);
                  } else if (canAccessReport(user, report, subscription)) {
                    setSelectedReport(report);
                  } else {
                    setShowLockedModal(true);
                  }
                }}
                data-testid={`card-archive-report-${report.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Badge row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {report.reportType === "free" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/60 text-emerald-500 bg-emerald-500/10">
                          Free
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1a1f36] text-blue-300 border border-blue-500/20">
                          <Lock className="w-2.5 h-2.5" />
                          {reportTypeLabel(report.reportType)}
                        </span>
                      )}
                    </div>
                    {/* Title */}
                    <h3
                      className="font-semibold text-sm line-clamp-1"
                      data-testid={`text-report-title-${report.id}`}
                    >
                      {report.title}
                    </h3>
                    {/* Preview */}
                    <p
                      className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                      data-testid={`text-report-preview-${report.id}`}
                    >
                      {report.content.replace(/[#*_`\[\]]/g, "").slice(0, 200)}
                    </p>
                  </div>
                  {/* Date */}
                  <div
                    className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-0.5"
                    data-testid={`text-report-date-${report.id}`}
                  >
                    <Clock className="w-3 h-3" />
                    {format(new Date(report.publishedAt), "MMM d, yyyy")}
                  </div>
                </div>
              </Card>
            ))}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4" data-testid="pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
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

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          GMR &middot; Global Market Radar
        </p>
      </footer>

      {/* ── Locked Modal ── */}
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
          {user ? (
            <Button
              className="w-full bg-[#1a1f36] hover:bg-[#2a2f46] text-white"
              data-testid="button-upgrade-premium"
              onClick={() => { setShowLockedModal(false); setShowPaypalModal(true); }}
            >
              Upgrade to Premium
            </Button>
          ) : (
            <Link href="/login?mode=signup">
              <Button className="w-full bg-[#1a1f36] hover:bg-[#2a2f46] text-white" data-testid="button-upgrade-premium">
                Upgrade to Premium
              </Button>
            </Link>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Subscribe Modal ── */}
      <Dialog open={showPaypalModal} onOpenChange={setShowPaypalModal}>
        <DialogContent className="max-w-md" data-testid="dialog-subscribe">
          <DialogHeader>
            <DialogTitle data-testid="text-subscribe-modal-title">Subscribe to GMR Premium</DialogTitle>
            <DialogDescription>
              Institutional-quality macro analysis for individual investors. $12/month — founding member rate.
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
