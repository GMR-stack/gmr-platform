import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageGlow } from "@/components/page-glow";
import { setWebSession } from "@/lib/cardlogue-auth";

const NAVY = "#03045E";
const GOLD = "#D4AF37";

// Browser login with a Cardlogue account (same accounts as the app — the
// server proxies Supabase's password grant, see /api/cardlogue/login). This
// exists so the team payment flow is reachable from a plain browser, which
// PG/card-issuer review requires; the app itself never comes here, it
// injects its own session token into the WebView instead.
export default function TeamLoginPage() {
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const redirect = new URLSearchParams(window.location.search).get("redirect") || "/team/manage";

  const t = {
    title: lang === "ko" ? "Cardlogue 로그인" : "Cardlogue Sign In",
    subtitle:
      lang === "ko"
        ? "앱에서 사용하는 Cardlogue 계정으로 로그인하세요."
        : "Sign in with the same Cardlogue account you use in the app.",
    email: lang === "ko" ? "이메일" : "Email",
    password: lang === "ko" ? "비밀번호" : "Password",
    submit: lang === "ko" ? "로그인" : "Sign in",
    submitting: lang === "ko" ? "로그인 중..." : "Signing in...",
    failed: lang === "ko" ? "로그인에 실패했습니다" : "Sign in failed",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/cardlogue/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "login failed");
      setWebSession({
        accessToken: data.accessToken,
        expiresAt: data.expiresAt ?? null,
        user: data.user,
      });
      // Full navigation (not wouter) so pages that read query params on
      // mount start fresh.
      window.location.href = redirect;
    } catch (err: any) {
      setSubmitting(false);
      setErrorMessage(err?.message || "unknown error");
    }
  }

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4"
      style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}
    >
      <PageGlow />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-white/15 bg-white/[0.04] backdrop-blur-sm rounded-2xl p-7 space-y-5 text-center"
      >
        <h1 className="font-brand text-2xl font-bold">{t.title}</h1>
        <p className="text-white/60 text-sm">{t.subtitle}</p>

        <Input
          type="email"
          required
          autoComplete="email"
          placeholder={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          data-testid="input-team-login-email"
        />
        <Input
          type="password"
          required
          autoComplete="current-password"
          placeholder={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          data-testid="input-team-login-password"
        />

        <Button
          type="submit"
          className="w-full font-brand font-semibold"
          style={{ background: GOLD, color: NAVY }}
          disabled={submitting}
          data-testid="button-team-login"
        >
          {submitting ? t.submitting : t.submit}
        </Button>

        {errorMessage && (
          <p className="text-sm text-red-300" data-testid="text-team-login-error">
            {t.failed}: {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
