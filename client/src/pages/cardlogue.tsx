import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { NavyLogo } from "@/components/navy-logo";
import { PageGlow } from "@/components/page-glow";
import { WaveDivider } from "@/components/wave-divider";
import { LanguageToggle } from "@/components/language-toggle";
import { Reveal } from "@/components/reveal";
import { Magnetic } from "@/components/magnetic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { translations } from "@/lib/translations";
import { ScanLine, QrCode, FolderKanban, Target, Users, Wallet, Download, ShieldCheck, Mail, CreditCard } from "lucide-react";

const NAVY = "#03045E";
// Gold/amber accent instead of the home page's cyan — reads as business
// cards & networking rather than the Navy brand's digital-ocean theme.
const GOLD = "#D4AF37";

function Header() {
  const { lang } = useLang();
  const t = translations[lang];
  // The dedicated cardlogue.globalmarketradar.com subdomain exists so Paddle's
  // website review only ever sees Cardlogue content (see server/static.ts) —
  // a "home" link back to The Navy's main site doesn't belong there, even
  // though it'd harmlessly redirect back to /cardlogue if clicked.
  const isCardlogueSubdomain = typeof window !== "undefined" && window.location.hostname === "cardlogue.globalmarketradar.com";
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#03045E]/90 backdrop-blur">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        <NavyLogo linkTo={isCardlogueSubdomain ? undefined : "/"} size="sm" variant="light" />
        <div className="flex items-center gap-4">
          {!isCardlogueSubdomain && (
            <Link href="/" className="text-sm text-white/70 hover:text-white font-brand" data-testid="link-cardlogue-home">
              {t.cardlogue.nav.home}
            </Link>
          )}
          <LanguageToggle variant="light" />
        </div>
      </div>
    </header>
  );
}

function DownloadButtons({ variant = "large" }: { variant?: "large" | "compact" }) {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <Magnetic>
        <a href="#">
          <Button
            size={variant === "large" ? "lg" : "default"}
            className="font-brand gap-2 font-semibold"
            style={{ background: GOLD, color: NAVY }}
            data-testid="button-download-appstore"
          >
            <Download className="w-4 h-4" /> {t.hero.ctaAppStore}
          </Button>
        </a>
      </Magnetic>
      <Magnetic>
        <a href="#">
          <Button
            size={variant === "large" ? "lg" : "default"}
            variant="outline"
            className="font-brand gap-2 font-semibold text-white border-white/20 hover:bg-white/10"
            data-testid="button-download-googleplay"
          >
            <Download className="w-4 h-4" /> {t.hero.ctaGooglePlay}
          </Button>
        </a>
      </Magnetic>
    </div>
  );
}

function TeamPaymentCta({ label, variant = "outline", testId }: { label: string; variant?: "outline" | "solid"; testId: string }) {
  return (
    <Magnetic>
      <Link href="/team/login">
        <Button
          size="lg"
          variant={variant === "solid" ? "default" : "outline"}
          className={
            variant === "solid"
              ? "font-brand gap-2 font-semibold"
              : "font-brand gap-2 font-semibold border-2 hover:bg-white/10"
          }
          style={
            variant === "solid"
              ? { background: GOLD, color: NAVY }
              : { borderColor: GOLD, color: GOLD, background: "rgba(212,175,55,0.08)" }
          }
          data-testid={testId}
        >
          <CreditCard className="w-4 h-4" /> {label}
        </Button>
      </Link>
    </Magnetic>
  );
}

function Hero() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="px-4 py-10 sm:py-14 text-center" data-testid="section-cardlogue-hero">
      <div className="max-w-2xl mx-auto">
        <motion.img
          src="/cardlogue-icon.png"
          alt="Cardlogue"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-[22%] mx-auto mb-6 shadow-2xl"
          style={{ boxShadow: "0 16px 40px -12px rgba(0,0,0,0.5)" }}
          data-testid="img-cardlogue-icon"
        />
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-brand text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white mb-4 text-balance break-keep"
          data-testid="text-cardlogue-hero-title"
        >
          {t.hero.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-white/70 text-lg leading-relaxed mb-4 text-balance break-keep"
          data-testid="text-cardlogue-hero-subtitle"
        >
          {t.hero.subtitle}
        </motion.p>
        <DownloadButtons />
        <div className="mt-4">
          <TeamPaymentCta label={t.hero.ctaTeamPayment} testId="button-hero-team-payment" />
        </div>
      </div>
    </section>
  );
}

function Screenshots() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="py-8 px-4" data-testid="section-cardlogue-screenshots">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-5">
            <span className="text-xs font-brand font-semibold uppercase tracking-widest text-white/40">
              {t.screenshots.eyebrow}
            </span>
            <h2 className="font-brand text-2xl sm:text-3xl font-bold mt-2 text-white">{t.screenshots.title}</h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {t.screenshots.items.map((item, i) => (
            <Reveal key={item.file} delay={i * 0.1}>
              <div className="space-y-3 max-w-[230px] mx-auto">
                <div
                  className="rounded-2xl border-2 overflow-hidden shadow-xl"
                  style={{ borderColor: "rgba(255,255,255,0.12)", boxShadow: "0 12px 30px -14px rgba(0,0,0,0.6)" }}
                >
                  <img
                    src={`/screenshots/${lang}/${item.file}.jpg`}
                    alt={item.caption}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-white/50 text-center leading-relaxed px-1">{item.caption}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const VALUE_ICONS = [Target, Users, FolderKanban];

function Values() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="py-8 px-4" data-testid="section-cardlogue-values">
      <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4">
        {t.values.map((value, i) => {
          const Icon = VALUE_ICONS[i];
          return (
            <Reveal key={value.title} delay={i * 0.1}>
              <Card className="h-full border border-white/15 bg-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20" data-testid={`card-value-${i}`}>
                <CardContent className="p-4 space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.14)" }}>
                    <Icon className="w-6 h-6" style={{ color: GOLD }} strokeWidth={2} />
                  </div>
                  <h3 className="font-brand font-bold text-lg text-white">{value.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{value.body}</p>
                </CardContent>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

const FEATURE_ICONS = [ScanLine, QrCode, Wallet];

function Features() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="py-8 px-4" data-testid="section-cardlogue-features">
      <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4">
        {t.features.map((feature, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <Reveal key={feature.title} delay={i * 0.1}>
              <Card className="h-full border border-white/15 bg-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20" data-testid={`card-feature-${i}`}>
                <CardContent className="p-4 space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.14)" }}>
                    <Icon className="w-6 h-6" style={{ color: GOLD }} strokeWidth={2} />
                  </div>
                  <h3 className="font-brand font-bold text-lg text-white">{feature.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{feature.body}</p>
                </CardContent>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Pricing() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="py-8 px-4" data-testid="section-cardlogue-pricing">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-5">
            <span className="text-xs font-brand font-semibold uppercase tracking-widest text-white/40">{t.pricing.eyebrow}</span>
            <h2 className="font-brand text-2xl sm:text-3xl font-bold mt-2 text-white">{t.pricing.title}</h2>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-4">
          {t.pricing.plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.1}>
              <Card className="h-full border border-white/15 bg-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20" data-testid={`card-plan-${i}`}>
                <CardContent className="p-4 space-y-2 text-center">
                  <h3 className="font-brand font-bold text-lg text-white">{plan.name}</h3>
                  <p className="font-brand text-2xl font-black" style={{ color: GOLD }}>
                    {plan.price}
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">{plan.audience}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <TeamPaymentCta label={t.pricing.ctaTeamPayment} variant="solid" testId="button-pricing-team-payment" />
        </div>
        <p className="text-center text-xs text-white/40 mt-4" data-testid="text-pricing-footnote">
          {t.pricing.footnote}
        </p>
      </div>
    </section>
  );
}

function Security() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="py-8 px-4" data-testid="section-cardlogue-security">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <div className="flex items-center gap-3 justify-center mb-4">
            <ShieldCheck className="w-6 h-6" style={{ color: GOLD }} />
            <h2 className="font-brand text-2xl sm:text-3xl font-bold text-white">{t.security.title}</h2>
          </div>
        </Reveal>
        <ul className="space-y-2">
          {t.security.items.map((item) => (
            <li key={item} className="text-white/70 leading-relaxed pl-4 relative before:absolute before:left-0 before:content-['—']">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="py-8 px-4" data-testid="section-cardlogue-faq">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <h2 className="font-brand text-2xl sm:text-3xl font-bold text-white text-center mb-4">{t.faq.title}</h2>
        </Reveal>
        <div className="space-y-2">
          {t.faq.items.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05}>
              <div className="border border-white/10 rounded-lg p-3 bg-white/[0.03]">
                <p className="font-brand font-semibold text-white mb-2">Q. {item.q}</p>
                <p className="text-white/60 leading-relaxed text-sm">A. {item.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCta() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;
  return (
    <section className="py-10 px-4 text-center" data-testid="section-cardlogue-bottom-cta">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <h2 className="font-brand text-2xl sm:text-3xl font-bold text-white mb-4 text-balance break-keep">
            {t.bottomCta.title}
          </h2>
        </Reveal>
        <DownloadButtons variant="compact" />
        <div className="flex items-center justify-center gap-4 text-xs text-white/40 mt-6">
          <Link href="/privacy" className="hover:text-white/70" data-testid="link-bottom-privacy">
            {t.bottomCta.linkPrivacy}
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-white/70" data-testid="link-bottom-terms">
            {t.bottomCta.linkTerms}
          </Link>
          <span>·</span>
          <Link href="/refund" className="hover:text-white/70" data-testid="link-bottom-refund">
            {t.bottomCta.linkRefund}
          </Link>
          <span>·</span>
          <Link href="/team/login" className="hover:text-white/70" data-testid="link-bottom-team-payment">
            {t.bottomCta.linkTeamPayment}
          </Link>
          <span>·</span>
          <Link href="/account-deletion" className="hover:text-white/70" data-testid="link-bottom-account-deletion">
            {t.bottomCta.linkAccountDeletion}
          </Link>
          <span>·</span>
          <a href="mailto:globalmarketradar@gmail.com" className="hover:text-white/70 inline-flex items-center gap-1" data-testid="link-bottom-contact">
            <Mail className="w-3 h-3" /> {t.bottomCta.linkContact}
          </a>
        </div>
        <p className="text-center text-[11px] text-white/30 leading-relaxed mt-3 pt-3 border-t border-white/10" data-testid="text-cardlogue-business-info">
          {t.bottomCta.businessInfo}
        </p>
      </div>
    </section>
  );
}

export default function CardloguePage() {
  const { lang } = useLang();
  const t = translations[lang].cardlogue;

  return (
    <div className="min-h-screen text-white" style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}>
      <PageGlow />
      <Helmet>
        <title>{t.meta.title}</title>
        <meta name="description" content={t.meta.description} />
        <link rel="canonical" href="https://www.globalmarketradar.com/cardlogue" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <Header />
      <Hero />
      <WaveDivider />
      <Screenshots />
      <Values />
      <WaveDivider />
      <Features />
      <WaveDivider />
      <Pricing />
      <WaveDivider />
      <Security />
      <WaveDivider />
      <Faq />
      <WaveDivider />
      <BottomCta />
    </div>
  );
}
