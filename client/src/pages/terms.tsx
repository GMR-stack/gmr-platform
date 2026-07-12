import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { NavyLogo } from "@/components/navy-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { LegalBlockView } from "@/components/legal-blocks";
import { useLang } from "@/lib/i18n";
import { translations } from "@/lib/translations";

const LAST_UPDATED = "July 2, 2026";
const NAVY = "#0A1F44";

export default function TermsPage() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <div className="min-h-screen text-white" style={{ background: `linear-gradient(180deg, ${NAVY} 0%, #071531 100%)` }}>
      <Helmet>
        <title>{t.terms.title} — The Navy</title>
        <meta name="description" content="The terms that govern your use of The Navy's apps and websites, including Cardlogue." />
        <link rel="canonical" href="https://www.globalmarketradar.com/terms" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A1F44]/90 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <NavyLogo linkTo="/" size="sm" variant="light" />
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" data-testid="link-terms-home">
                {t.legal.home}
              </Button>
            </Link>
            <LanguageToggle variant="light" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-14 space-y-6" data-testid="text-terms-title">
        <div>
          <h1 className="font-brand text-3xl sm:text-4xl font-black text-white">{t.terms.title}</h1>
          <p className="text-white/40 text-sm mt-2">
            {t.legal.lastUpdated}: {LAST_UPDATED}
          </p>
        </div>

        {t.terms.blocks.map((block, i) => (
          <LegalBlockView key={i} block={block} />
        ))}

        {t.terms.closingNote && <p className="text-white/40 text-sm pt-6 border-t border-white/10">{t.terms.closingNote}</p>}
      </main>
    </div>
  );
}
