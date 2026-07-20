import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { NavyLogo } from "@/components/navy-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalBlockView } from "@/components/legal-blocks";
import { PageGlow } from "@/components/page-glow";
import { useLang } from "@/lib/i18n";
import { translations } from "@/lib/translations";

const NAVY = "#03045E";
const GOLD = "#D4AF37";

// Required by Google Play's account-deletion policy: a web page that lets
// users request deletion of their Cardlogue account without needing the app
// installed. Submits to /api/cardlogue/account-deletion-request, which just
// emails the request for manual processing (same pattern as refund
// requests) rather than deleting anything automatically from here.
export default function AccountDeletionPage() {
  const { lang } = useLang();
  const t = translations[lang];
  const d = t.accountDeletion;

  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const formT = {
    emailLabel: lang === "ko" ? "카드로그 계정 이메일" : "Cardlogue account email",
    noteLabel: lang === "ko" ? "메모 (선택)" : "Note (optional)",
    submit: lang === "ko" ? "삭제 요청 보내기" : "Submit deletion request",
    submitting: lang === "ko" ? "전송 중..." : "Submitting...",
    done: lang === "ko" ? "요청이 접수되었습니다. 처리 완료 시 이메일로 안내드릴게요." : "Request received. We'll email you once it's done.",
    failed: lang === "ko" ? "요청 전송에 실패했습니다" : "Failed to submit request",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/cardlogue/account-deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "request failed");
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "unknown error");
    }
  }

  return (
    <div className="min-h-screen text-white" style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}>
      <PageGlow />
      <Helmet>
        <title>{d.title} — The Navy</title>
        <meta name="description" content="How to delete your Cardlogue account and what happens to your data." />
        <link rel="canonical" href="https://www.globalmarketradar.com/account-deletion" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#03045E]/90 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <NavyLogo linkTo="/" size="sm" variant="light" />
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" data-testid="link-account-deletion-home">
                {t.legal.home}
              </Button>
            </Link>
            <Link href="/cardlogue">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" data-testid="link-account-deletion-cardlogue">
                {t.legal.cardlogue}
              </Button>
            </Link>
            <LanguageToggle variant="light" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-14 space-y-6" data-testid="text-account-deletion-title">
        <div>
          <h1 className="font-brand text-3xl sm:text-4xl font-black text-white">{d.title}</h1>
        </div>

        <p className="text-white/70 leading-relaxed">{d.intro}</p>

        {d.blocks.map((block, i) => (
          <LegalBlockView key={i} block={block} />
        ))}

        <form
          onSubmit={handleSubmit}
          className="border border-white/15 bg-white/[0.04] backdrop-blur-sm rounded-2xl p-6 space-y-4"
        >
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder={formT.emailLabel}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            data-testid="input-account-deletion-email"
          />
          <Input
            placeholder={formT.noteLabel}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            data-testid="input-account-deletion-note"
          />

          {status === "done" ? (
            <p className="text-sm text-white/80" data-testid="text-account-deletion-done">
              {formT.done}
            </p>
          ) : (
            <>
              <Button
                type="submit"
                className="w-full font-brand font-semibold"
                style={{ background: GOLD, color: NAVY }}
                disabled={status === "submitting"}
                data-testid="button-account-deletion-submit"
              >
                {status === "submitting" ? formT.submitting : formT.submit}
              </Button>
              {status === "error" && (
                <p className="text-sm text-red-300" data-testid="text-account-deletion-error">
                  {formT.failed}: {errorMessage}
                </p>
              )}
            </>
          )}
        </form>
      </main>
    </div>
  );
}
