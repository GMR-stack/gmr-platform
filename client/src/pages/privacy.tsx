import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { NavyLogo } from "@/components/navy-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { LegalBlockView } from "@/components/legal-blocks";
import { PageGlow } from "@/components/page-glow";
import { useLang } from "@/lib/i18n";
import { translations } from "@/lib/translations";

const LAST_UPDATED = "July 8, 2026";
const NAVY = "#03045E";

export default function PrivacyPage() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <div className="min-h-screen text-white" style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}>
      <PageGlow />
      <Helmet>
        <title>{t.privacy.title} — The Navy</title>
        <meta name="description" content="How The Navy collects, uses, and protects your information across our apps, including Cardlogue." />
        <link rel="canonical" href="https://www.globalmarketradar.com/privacy" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#03045E]/90 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <NavyLogo linkTo="/" size="sm" variant="light" />
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" data-testid="link-privacy-home">
                {t.legal.home}
              </Button>
            </Link>
            <Link href="/cardlogue">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" data-testid="link-privacy-cardlogue">
                {t.legal.cardlogue}
              </Button>
            </Link>
            <LanguageToggle variant="light" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-14 space-y-6" data-testid="text-privacy-title">
        <div>
          <h1 className="font-brand text-3xl sm:text-4xl font-black text-white">{t.privacy.title}</h1>
          <p className="text-white/40 text-sm mt-2">
            {t.legal.lastUpdated}: {LAST_UPDATED}
          </p>
        </div>

        <p className="text-white/70 leading-relaxed">{t.privacy.intro}</p>

        {t.privacy.blocks.map((block, i) => (
          <LegalBlockView key={i} block={block} />
        ))}

        {t.privacy.closingNote && <p className="text-white/40 text-sm pt-6 border-t border-white/10">{t.privacy.closingNote}</p>}
      </main>
    </div>
  );
}
