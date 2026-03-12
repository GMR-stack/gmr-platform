import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { clearRecoveryFlag } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { GmrLogo } from "@/components/gmr-logo";
import { Loader2, AlertTriangle, KeyRound, CheckCircle2 } from "lucide-react";

type PageState = "loading" | "form" | "success" | "invalid";

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Give Supabase time to process the token from the URL before checking
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState("form");
      } else {
        setPageState("invalid");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setPageState("form");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    clearRecoveryFlag();
    setPageState("success");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <GmrLogo linkTo="/" />
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">

          {pageState === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verifying...</p>
            </div>
          )}

          {pageState === "invalid" && (
            <div className="rounded-xl border bg-card p-8 space-y-5 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-lg">Link Expired</h2>
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has expired.<br />Please request a new one.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/login")}
                data-testid="button-back-login"
              >
                Back to Login
              </Button>
            </div>
          )}

          {pageState === "success" && (
            <div className="rounded-xl border bg-card p-8 space-y-5 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-lg" data-testid="text-reset-success">Password updated successfully.</h2>
                <p className="text-sm text-muted-foreground">Please log in again.</p>
              </div>
              <Button
                className="w-full"
                onClick={() => (window.location.href = "/login")}
                data-testid="button-go-login"
              >
                Log In
              </Button>
            </div>
          )}

          {pageState === "form" && (
            <>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <KeyRound className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight" data-testid="text-reset-title">
                    Reset Your Password
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter a new password for your GMR account.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      data-testid="input-new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      data-testid="input-confirm-new-password"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive" data-testid="text-reset-error">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                    data-testid="button-set-password"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}

        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">GMR &middot; Global Market Radar</p>
      </footer>
    </div>
  );
}
