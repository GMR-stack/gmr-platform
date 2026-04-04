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
  FileText,
  Clock,
  Trash2,
  Pencil,
  Loader2,
  ShieldAlert,
  Search,
  ImagePlus,
} from "lucide-react";
import type { Report } from "@shared/schema";
import { isAdmin as checkIsAdmin } from "@/lib/access";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const BUCKET = "report-images";

const createReportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  reportType: z.string().min(1, "Report type is required"),
});

type CreateReportForm = z.infer<typeof createReportSchema>;

function reportTypeLabel(type: string) {
  const labels: Record<string, string> = {
    free: "Free",
    premium: "Premium",
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function reportTypeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "premium") return "default";
  return "outline";
}

function insertAtCursor(textarea: HTMLTextAreaElement, text: string, setValue: (val: string) => void) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const newValue = before + text + after;
  setValue(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = start + text.length;
    textarea.selectionEnd = start + text.length;
  });
}

interface ImageUploadButtonProps {
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onInsert: (value: string) => void;
  "data-testid"?: string;
}

function ImageUploadButton({ textareaRef, onInsert, "data-testid": testId }: ImageUploadButtonProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPG, PNG, GIF, and WebP images are allowed.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      const markdown = `![image](${publicUrl})`;

      if (textareaRef.current) {
        insertAtCursor(textareaRef.current, markdown, onInsert);
      } else {
        onInsert((prev: any) => prev + markdown);
      }

      toast({ title: "Image uploaded", description: "Image inserted into content." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload image.", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [textareaRef, onInsert, toast]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
        data-testid={testId ? `${testId}-file-input` : "upload-image-file-input"}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        data-testid={testId ?? "button-upload-image"}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <ImagePlus className="w-4 h-4 mr-1.5" />
        )}
        {uploading ? "Uploading..." : "Upload Image"}
      </Button>
    </>
  );
}

export default function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const allSortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return allSortedReports;
    const q = searchQuery.toLowerCase();
    return allSortedReports.filter((r) => r.title.toLowerCase().includes(q));
  }, [allSortedReports, searchQuery]);

  const visibleReports = useMemo(() => {
    return filteredReports.slice(0, visibleCount);
  }, [filteredReports, visibleCount]);

  const hasMore = visibleCount < filteredReports.length;

  const form = useForm<CreateReportForm>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: "",
      content: "",
      reportType: "free",
    },
  });

  const createContentRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: rhfCreateRef, ...createContentRegister } = form.register("content");
  const mergedCreateRef = useCallback((el: HTMLTextAreaElement | null) => {
    rhfCreateRef(el);
    createContentRef.current = el;
  }, [rhfCreateRef]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateReportForm) => {
      const res = await apiRequest("POST", "/api/reports", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      form.reset({ title: "", content: "", reportType: "free" });
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

  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const editForm = useForm<CreateReportForm>({
    resolver: zodResolver(createReportSchema),
    defaultValues: { title: "", content: "", reportType: "free" },
  });

  const editContentRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: rhfEditRef, ...editContentRegister } = editForm.register("content");
  const mergedEditRef = useCallback((el: HTMLTextAreaElement | null) => {
    rhfEditRef(el);
    editContentRef.current = el;
  }, [rhfEditRef]);

  const updateMutation = useMutation({
    mutationFn: async (data: CreateReportForm & { id: string }) => {
      const { id, ...body } = data;
      const res = await apiRequest("PUT", `/api/reports/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setEditingReport(null);
      toast({ title: "Report updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update report", description: err.message, variant: "destructive" });
    },
  });

  function openEditModal(report: Report) {
    editForm.reset({ title: report.title, content: report.content, reportType: report.reportType });
    setEditingReport(report);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !checkIsAdmin(user)) {
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
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content (Markdown)</Label>
                <ImageUploadButton
                  textareaRef={createContentRef}
                  onInsert={(val: string) => form.setValue("content", val)}
                  data-testid="button-upload-image-create"
                />
              </div>
              <Textarea
                id="content"
                placeholder={"## Summary\n\nWrite your report content in Markdown format...\n\n### Key Points\n- Point 1\n- Point 2"}
                className="min-h-[300px] font-mono text-sm"
                ref={mergedCreateRef}
                {...createContentRegister}
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
            Reports ({filteredReports.length})
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports by title..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(10); }}
              className="pl-9"
              data-testid="input-search-reports"
            />
          </div>

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
          ) : visibleReports.length > 0 ? (
            <div className="space-y-3">
              {visibleReports.map((report) => (
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(report)}
                        data-testid={`button-edit-report-${report.id}`}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
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
                  </div>
                </Card>
              ))}
              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setVisibleCount((c) => c + 10)}
                  data-testid="button-load-more"
                >
                  Load More
                </Button>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No reports matching your search." : "No reports published yet."}
              </p>
              {!searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">Use the form above to publish your first report.</p>
              )}
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          GMR &middot; Global Market Radar
        </p>
      </footer>

      <Dialog open={!!editingReport} onOpenChange={(open) => { if (!open) setEditingReport(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-report">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-report-title">Edit Report</DialogTitle>
            <DialogDescription>Update the report details below.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) => {
              if (editingReport) updateMutation.mutate({ ...data, id: editingReport.id });
            })}
            className="space-y-4"
            data-testid="form-edit-report"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" {...editForm.register("title")} data-testid="input-edit-title" />
              {editForm.formState.errors.title && (
                <p className="text-xs text-destructive">{editForm.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Report Type</Label>
              <Select
                value={editForm.watch("reportType")}
                onValueChange={(val) => editForm.setValue("reportType", val)}
              >
                <SelectTrigger data-testid="select-edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-content">Content (Markdown)</Label>
                <ImageUploadButton
                  textareaRef={editContentRef}
                  onInsert={(val: string) => editForm.setValue("content", val)}
                  data-testid="button-upload-image-edit"
                />
              </div>
              <Textarea
                id="edit-content"
                ref={mergedEditRef}
                {...editContentRegister}
                rows={12}
                className="font-mono text-sm"
                data-testid="input-edit-content"
              />
              {editForm.formState.errors.content && (
                <p className="text-xs text-destructive">{editForm.formState.errors.content.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingReport(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
