import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { NavyLogo } from "@/components/navy-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { LegalBlockView } from "@/components/legal-blocks";
import { useLang } from "@/lib/i18n";
import { translations } from "@/lib/translations";

const LAST_UPDATED = "July 12, 2026";
const NAVY = "#0A1F44";

export default function RefundPage() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <div className="min-h-screen text-white" style={{ background: `linear-gradient(180deg, ${NAVY} 0%, #071531 100%)` }}>
      <Helmet>
        <title>{t.refund.title} — Cardlogue — The Navy</title>
        <meta name="description" content="Refund policy for Cardlogue's paid subscriptions, operated by The Navy." />
        <link rel="canonical" href="https://www.globalmarketradar.com/refund" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A1F44]/90 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <NavyLogo linkTo="/" size="sm" variant="light" />
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" data-testid="link-refund-home">
                {t.legal.home}
              </Button>
            </Link>
            <LanguageToggle variant="light" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-14 space-y-6" data-testid="text-refund-title">
        <div>
          <h1 className="font-brand text-3xl sm:text-4xl font-black text-white">{t.refund.title}</h1>
          <p className="text-white/40 text-sm mt-2">
            {t.legal.lastUpdated}: {LAST_UPDATED}
          </p>
        </div>

        {t.refund.blocks.map((block, i) => (
          <LegalBlockView key={i} block={block} />
        ))}

        {t.refund.closingNote && <p className="text-white/40 text-sm pt-6 border-t border-white/10">{t.refund.closingNote}</p>}
      </main>
    </div>
  );
}
