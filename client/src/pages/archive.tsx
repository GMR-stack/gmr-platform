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
import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { marked } from "marked";
import DOMPurify from "dompurify";

const DAY_FILTERS = ["all", "monday", "tuesday", "wednesday", "thursday", "friday", "free"] as const;

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
  if (type === "monday" || type === "wednesday" || type === "market_analysis" || type === "macro_outlook") return "default";
  if (type === "tuesday" || type === "thursday" || type === "equity_research") return "secondary";
  return "outline";
}

export default function ArchivePage() {
  const { user, signOut } = useAuth();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast(); 

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const reportIdFromUrl = searchParams.get("report");

  const { data: subscription, isLoading: subLoading } = useQuery<Subscription | null>({
    queryKey: ["/api/subscriptions", "me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const isSubscribed = subscription?.status === "active";

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
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
      }
    }
  }, [reportIdFromUrl, reports, isSubscribed]);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "?";

  if (!isSubscribed && !subLoading && subscription !== undefined) {
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
                <Button variant="ghost" size="sm" data-testid="link-archive-active">
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
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md w-full text-center space-y-4">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-serif font-bold" data-testid="text-subscribe-title">
              Subscribe to Access Premium Reports
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The report archive is available exclusively to premium subscribers. Upgrade your plan to browse our full library of financial research, market analysis, and investment insights.
            </p>
            <Button data-testid="button-subscribe-cta">Upgrade to Premium</Button>
          </Card>
        </main>

        <footer className="border-t px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            GMR &middot; Global Market Radar
          </p>
        </footer>
      </div>
    );
  }

  if (selectedReport) {
    const rawHtml = marked.parse(selectedReport.content) as string;
    const htmlContent = DOMPurify.sanitize(rawHtml);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-background">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap px-6 py-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)} data-testid="button-back">
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
              <h1 className="text-3xl font-serif font-bold tracking-tight" data-testid="text-report-title">
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
              <Button variant="ghost" size="sm" data-testid="link-archive-active">
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
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-archive-title">
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
                  } else {
                    toast({ title: "구독이 필요합니다", description: "이 리포트는 구독자 전용입니다." });
                  }
                }}
                data-testid={`card-archive-report-${report.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm" data-testid={`text-report-title-${report.id}`}>{report.title}</h3>
                      <Badge variant={reportTypeVariant(report.reportType)} className="text-xs" data-testid={`badge-type-${report.id}`}>
                        {reportTypeLabel(report.reportType)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-report-preview-${report.id}`}>
                      {report.content.replace(/[#*_`\[\]]/g, "").slice(0, 200)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0" data-testid={`text-report-date-${report.id}`}>
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
            <p className="text-sm text-muted-foreground" data-testid="text-no-reports">
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
    </div>
  );
}
