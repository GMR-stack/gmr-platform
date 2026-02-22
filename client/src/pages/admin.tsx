import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, Redirect } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { GmrLogo } from "@/components/gmr-logo";
import { useToast } from "@/hooks/use-toast";
import {
  Archive,
  Settings,
  LogOut,
  BarChart3,
  FileText,
  Clock,
  Trash2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { Report } from "@shared/schema";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo } from "react";

const ADMIN_EMAIL = "globalmarketradar@gmail.com";

const createReportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  reportType: z.string().min(1, "Report type is required"),
});

type CreateReportForm = z.infer<typeof createReportSchema>;

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

export default function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const recentReports = useMemo(() => {
    if (!reports) return [];
    return [...reports]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 10);
  }, [reports]);

  const form = useForm<CreateReportForm>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: "",
      content: "",
      reportType: "monday",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateReportForm) => {
      const res = await apiRequest("POST", "/api/reports", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      form.reset({ title: "", content: "", reportType: "monday" });
      toast({ title: "Report published successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to publish report", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete report", description: err.message, variant: "destructive" });
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Redirect to="/dashboard" />;
  }

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.charAt(0).toUpperCase();

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
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="link-admin-active">
                <Settings className="w-4 h-4 mr-1.5" />
                Admin
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-admin-title">
              Admin Panel
            </h1>
            <Badge variant="outline" className="text-xs">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Publish and manage financial reports.
          </p>
        </div>

        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-lg" data-testid="text-publish-heading">Publish New Report</h2>
          <form
            onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Weekly Market Update"
                  {...form.register("title")}
                  data-testid="input-report-title"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select
                  value={form.watch("reportType")}
                  onValueChange={(val) => form.setValue("reportType", val)}
                >
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea
                id="content"
                placeholder={"## Summary\n\nWrite your report content in Markdown format...\n\n### Key Points\n- Point 1\n- Point 2"}
                className="min-h-[300px] font-mono text-sm"
                {...form.register("content")}
                data-testid="textarea-report-content"
              />
              {form.formState.errors.content && (
                <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
              )}
            </div>

            <Button type="submit" disabled={createMutation.isPending} data-testid="button-publish">
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Publish Report
            </Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider" data-testid="text-recent-heading">
            Recent Reports ({recentReports.length})
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </Card>
              ))}
            </div>
          ) : recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <Card key={report.id} className="p-5" data-testid={`card-admin-report-${report.id}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" data-testid={`text-admin-report-title-${report.id}`}>{report.title}</h3>
                        <Badge variant={reportTypeVariant(report.reportType)} className="text-xs" data-testid={`badge-admin-type-${report.id}`}>
                          {reportTypeLabel(report.reportType)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-admin-report-date-${report.id}`}>
                        <Clock className="w-3 h-3" />
                        Published {format(new Date(report.publishedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm("이 리포트를 삭제하시겠습니까?")) {
                          deleteMutation.mutate(report.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-report-${report.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No reports published yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the form above to publish your first report.</p>
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
