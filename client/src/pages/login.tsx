import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Redirect, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { GmrLogo } from "@/components/gmr-logo";
import { Shield, BarChart3, FileText, AlertTriangle, Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

type AuthView = "login" | "signup" | "forgot";

export default function LoginPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const modeParam = params.get("mode");
  const confirmedParam = params.get("confirmed");
  const passwordResetParam = params.get("passwordReset");
  const [view, setView] = useState<AuthView>(modeParam === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (confirmedParam === "true") {
      setSuccessMessage("Email confirmed! Please log in.");
      window.history.replaceState(null, "", "/login");
    } else if (passwordResetParam === "true") {
      setSuccessMessage("Password updated successfully. Please log in.");
      window.history.replaceState(null, "", "/login");
    }
  }, [confirmedParam, passwordResetParam]);

  if (!loading && user) {
    return <Redirect to="/dashboard" />;
  }

  function resetForm() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");
  }

  function switchView(v: AuthView) {
    resetForm();
    setView(v);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    const result = await signIn(email, password);
    if (result.error) setError(result.error);
    setSubmitting(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
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
    const result = await signUp(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMessage("Check your email for a confirmation link to complete your registration.");
    }
    setSubmitting(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    const result = await resetPassword(email);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMessage("If an account exists with this email, you'll receive a password reset link shortly.");
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-center px-6 py-4 border-b relative">
        <GmrLogo linkTo="/" showTagline />
        <div className="absolute right-6">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif font-bold tracking-tight" data-testid="text-login-title">
              Financial Intelligence,<br />Delivered.
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              Premium market analysis, research reports, and investment insights curated by industry professionals.
            </p>
          </div>

          <Card className="p-6 space-y-5">
            {!isSupabaseConfigured && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted text-sm">
                <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Supabase not configured</p>
                  <p className="text-xs text-muted-foreground">
                    Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable authentication.
                  </p>
                </div>
              </div>
            )}

            {successMessage ? (
              <div className="space-y-4 text-center py-2">
                <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-foreground" data-testid="text-success-message">{successMessage}</p>
                <Button variant="outline" className="w-full" onClick={() => switchView("login")} data-testid="button-back-login">
                  Back to login
                </Button>
              </div>
            ) : view === "login" ? (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="font-semibold text-lg" data-testid="text-form-title">Sign in to your account</h2>
                  <p className="text-xs text-muted-foreground">Access your subscription and exclusive reports</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isSupabaseConfigured || submitting}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => switchView("forgot")}
                        data-testid="link-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={!isSupabaseConfigured || submitting}
                      data-testid="input-password"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}
                  <Button type="submit" className="w-full gap-2" disabled={!isSupabaseConfigured || submitting} data-testid="button-login">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Sign in
                  </Button>
                </form>
                <p className="text-xs text-center text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-foreground font-medium hover:underline"
                    onClick={() => switchView("signup")}
                    data-testid="link-signup"
                  >
                    Sign up
                  </button>
                </p>
              </>
            ) : view === "signup" ? (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="font-semibold text-lg" data-testid="text-form-title">Create your account</h2>
                  <p className="text-xs text-muted-foreground">Get started with GMR today</p>
                </div>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isSupabaseConfigured || submitting}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={!isSupabaseConfigured || submitting}
                      data-testid="input-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={!isSupabaseConfigured || submitting}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}
                  <Button type="submit" className="w-full gap-2" disabled={!isSupabaseConfigured || submitting} data-testid="button-signup">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create account
                  </Button>
                </form>
                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-foreground font-medium hover:underline"
                    onClick={() => switchView("login")}
                    data-testid="link-login"
                  >
                    Sign in
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="font-semibold text-lg" data-testid="text-form-title">Reset your password</h2>
                  <p className="text-xs text-muted-foreground">We'll send a reset link to your email</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isSupabaseConfigured || submitting}
                      data-testid="input-email"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}
                  <Button type="submit" className="w-full gap-2" disabled={!isSupabaseConfigured || submitting} data-testid="button-reset">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send reset link
                  </Button>
                </form>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  onClick={() => switchView("login")}
                  data-testid="link-back-login"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to login
                </button>
              </>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-md bg-card flex items-center justify-center border border-card-border">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Market Analysis</p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-md bg-card flex items-center justify-center border border-card-border">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Research Reports</p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-md bg-card flex items-center justify-center border border-card-border">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Secure Access</p>
            </div>
          </div>
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
