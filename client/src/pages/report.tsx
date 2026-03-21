import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GmrLogo } from "@/components/gmr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Clock, Lock, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { Report } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

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

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: report, isLoading, isError } = useQuery<Report>({
    queryKey: ["/api/reports", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${params.id}`);
      if (!res.ok) throw new Error("Report not found");
      return res.json();
    },
    enabled: !!params.id,
    retry: false,
  });

  const isFree = report?.reportType === "free";
  const pageUrl = `https://globalmarketradar.com/report/${params.id}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-background">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
            <GmrLogo />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet>
          <title>Report Not Found · GMR</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <header className="sticky top-0 z-50 border-b bg-background">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
            <GmrLogo />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16 text-center space-y-4">
          <h1 className="text-2xl font-serif font-bold">Report not found</h1>
          <p className="text-muted-foreground text-sm">This report may have been removed or does not exist.</p>
          <Link href={user ? "/archive" : "/"}>
            <Button variant="outline" className="mt-2" data-testid="button-back-not-found">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {user ? "Back to Archive" : "Go to Home"}
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const rawHtml = isFree ? (marked.parse(report.content) as string) : "";
  const htmlContent = isFree ? DOMPurify.sanitize(rawHtml) : "";
  const previewText = report.content.replace(/[#*_`\[\]!]/g, "").slice(0, 200);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{report.title} · GMR</title>
        <meta
          name="description"
          content={isFree ? previewText : "Subscribe to GMR to read this report."}
        />
        <meta name="robots" content={isFree ? "index, follow" : "noindex, nofollow"} />
        <meta property="og:title" content={`${report.title} · GMR`} />
        <meta
          property="og:description"
          content={isFree ? previewText : "Subscribe to GMR to read this report."}
        />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
      </Helmet>

      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (user ? navigate("/archive") : navigate("/"))}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Archive
          </Button>
          <div className="flex items-center gap-2">
            <GmrLogo />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <article className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={reportTypeVariant(report.reportType)} data-testid="badge-report-type">
                {reportTypeLabel(report.reportType)}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-report-date">
                <Clock className="w-3 h-3" />
                {format(new Date(report.publishedAt), "MMMM d, yyyy")}
              </span>
            </div>
            <h1
              className="text-3xl font-serif font-bold tracking-tight"
              data-testid="text-report-title"
            >
              {report.title}
            </h1>
          </div>

          {isFree ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              data-testid="text-report-content"
            />
          ) : (
            <div className="space-y-6" data-testid="text-report-preview">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {previewText}…
              </p>
              <Card className="p-8 text-center space-y-4 border-dashed">
                <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
                <div className="space-y-1">
                  <h2 className="font-semibold text-base">Subscribe to read the full report</h2>
                  <p className="text-sm text-muted-foreground">
                    Get full access to all daily reports for $12/month.
                  </p>
                </div>
                <Link href="/">
                  <Button
                    className="bg-[#1a1f36] hover:bg-[#2a2f46] text-white"
                    data-testid="button-subscribe-cta"
                  >
                    View Plans
                  </Button>
                </Link>
              </Card>
            </div>
          )}
        </article>
      </main>

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">GMR &middot; Global Market Radar</p>
      </footer>
    </div>
  );
}
