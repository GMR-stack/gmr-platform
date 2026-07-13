import { useState, useEffect, Suspense, lazy, type ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { NavyLogo } from "@/components/navy-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { OceanBackground } from "@/components/ocean-background";
import { DigitalGlobe } from "@/components/digital-globe";
import { Reveal } from "@/components/reveal";
import { Magnetic } from "@/components/magnetic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { translations } from "@/lib/translations";

const DigitalGlobe3D = lazy(() => import("@/components/digital-globe-3d").then((m) => ({ default: m.DigitalGlobe3D })));
import {
  ArrowRight,
  ChevronDown,
  Compass,
  Mail,
  ScanLine,
  Code2,
  Smartphone,
  Sparkles,
} from "lucide-react";

const NAVY = "#03045E";
const CYAN = "#00D4FF";
const SITE_URL = "https://www.globalmarketradar.com";

function Seo() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <Helmet>
      <html lang={lang} />
      <title>{t.meta.title}</title>
      <meta name="description" content={t.meta.description} />
      <link rel="canonical" href={SITE_URL} />
      <meta property="og:title" content={t.meta.title} />
      <meta property="og:description" content={t.meta.description} />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={lang === "ko" ? "ko_KR" : "en_US"} />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "The Navy",
          alternateName: "더네이비",
          url: SITE_URL,
          logo: `${SITE_URL}/navy-icon.png`,
          email: "globalmarketradar@gmail.com",
          description: t.meta.description,
        })}
      </script>
    </Helmet>
  );
}

function NavLink({ href, children, testId }: { href: string; children: ReactNode; testId: string }) {
  const content = (
    <>
      <span className="font-brand text-sm text-white/75 group-hover:text-white transition-colors">{children}</span>
      <span
        className="absolute left-3 right-3 bottom-1 h-[1.5px] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"
        style={{ background: CYAN }}
      />
    </>
  );
  const className = "group relative flex items-center px-3 py-2";

  // In-page hash anchors use a plain <a>; internal routes use wouter's Link
  // so navigation stays client-side (no full page reload).
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} data-testid={testId}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className} data-testid={testId}>
      {content}
    </Link>
  );
}

function Header() {
  const { lang } = useLang();
  const t = translations[lang];
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-colors duration-300"
      style={{
        background: scrolled ? "rgba(10, 31, 68, 0.85)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-2 sm:px-4 h-14">
        <div className="flex items-center">
          <NavyLogo showTagline linkTo="/" size="sm" variant="light" />
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <div className="hidden sm:flex items-center">
            <NavLink href="#about" testId="link-nav-about">{t.nav.about}</NavLink>
            <NavLink href="/cardlogue" testId="link-nav-cardlogue">{t.nav.cardlogue}</NavLink>
          </div>
          <a href="#contact">
            <Button
              size="sm"
              className="font-brand text-xs sm:text-sm font-semibold px-2 sm:px-3"
              style={{ background: CYAN, color: NAVY }}
              data-testid="link-nav-contact"
            >
              {t.nav.contact}
            </Button>
          </a>
          <div className="flex items-center">
            <LanguageToggle variant="light" />
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <section
      className="relative overflow-hidden px-4 py-28 sm:py-40 min-h-[92vh] flex items-center"
      data-testid="section-hero"
    >
      <div className="relative max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/[0.05]"
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: CYAN }} />
          <span className="text-xs text-white/70 font-brand font-medium tracking-widest uppercase">{t.hero.badge}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-brand text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-white mb-6 text-balance break-keep"
          data-testid="text-hero-headline"
        >
          {t.hero.headlinePrefix} <span style={{ color: CYAN }}>{t.hero.headlineHighlight}</span> {t.hero.headlineSuffix}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="font-brand text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed text-center text-balance break-keep"
          data-testid="text-hero-subtitle"
        >
          {t.hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex items-center justify-center"
        >
          <Magnetic>
            <Link href="/cardlogue">
              <Button
                size="lg"
                className="font-brand text-lg px-10 py-6 font-bold gap-2 shadow-lg"
                style={{ background: CYAN, color: NAVY, boxShadow: `0 10px 40px -10px ${CYAN}66` }}
                data-testid="button-hero-explore"
              >
                {t.hero.cta} <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </Magnetic>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="w-5 h-5" />
      </motion.div>
    </section>
  );
}

function About() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <section id="about" className="py-24 px-4" data-testid="section-about">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <span
              className="text-2xl sm:text-3xl font-brand font-semibold uppercase tracking-widest"
              style={{ color: "rgba(0, 212, 255, 0.6)" }}
            >
              {t.about.eyebrow}
            </span>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="max-w-[340px] mx-auto">
              <motion.div
                className="relative flex items-center justify-center aspect-square"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Ambient glow */}
                <div
                  className="absolute rounded-full blur-3xl"
                  style={{ inset: "-20%", background: `radial-gradient(circle, ${CYAN}85 0%, transparent 70%)` }}
                />
                <Suspense fallback={<DigitalGlobe size={320} />}>
                  <DigitalGlobe3D size={320} />
                </Suspense>

                {/* Vignette: brightens the rim so the globe reads as edge-lit */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, transparent 65%, ${CYAN}10 100%)` }}
                />

                {/* Compass badge, orbiting the globe */}
                <div
                  className="absolute rounded-full flex items-center justify-center border border-white/15 backdrop-blur-sm"
                  style={{
                    width: 56,
                    height: 56,
                    right: "6%",
                    bottom: "10%",
                    background: "rgba(10, 31, 68, 0.75)",
                    boxShadow: `0 0 20px ${CYAN}40`,
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  >
                    <Compass className="w-6 h-6" style={{ color: CYAN }} strokeWidth={1.5} />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="space-y-8 text-center md:text-left">
              <h2
                className="font-brand text-2xl sm:text-3xl font-black leading-tight text-balance break-keep max-w-md mx-auto md:mx-0 text-white"
                data-testid="text-about-title"
              >
                {t.about.title}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-3" data-testid="list-about-taglines">
                {t.about.taglines.map((tagline) => (
                  <span
                    key={tagline}
                    className="text-xs font-brand font-semibold uppercase tracking-wide rounded-full border px-3 py-1"
                    style={{ color: CYAN, borderColor: `${CYAN}40`, background: `${CYAN}0d` }}
                  >
                    {tagline}
                  </span>
                ))}
              </div>
              <p className="text-white/60 leading-relaxed text-base max-w-md mx-auto md:mx-0 text-balance break-keep" data-testid="text-about-body">
                {t.about.body}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const { lang } = useLang();
  const t = translations[lang];
  const icons = [Code2, Smartphone, ScanLine];

  return (
    <section id="services" className="py-24 px-4" data-testid="section-services">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <span className="text-xs font-brand font-semibold uppercase tracking-widest text-white/40">{t.services.eyebrow}</span>
            <h2 className="font-brand text-2xl sm:text-3xl font-bold mt-3 text-white" data-testid="text-services-title">
              {t.services.title}
            </h2>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-6">
          {t.services.items.map((item, i) => {
            const Icon = icons[i];
            const isCardlogue = i === 1; // "Mobile App Development" — links to the Cardlogue product page
            const card = (
              <Card
                className="h-full border border-white/15 bg-white/[0.04] backdrop-blur-sm shadow-sm hover-elevate transition-transform"
                data-testid={`card-service-${i}`}
              >
                <CardContent className="p-7 space-y-4 text-center sm:text-left flex flex-col items-center sm:items-start">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,212,255,0.12)" }}
                  >
                    <Icon className="w-6 h-6" style={{ color: CYAN }} strokeWidth={2} />
                  </div>
                  <h3 className="font-brand font-bold text-lg text-white">{item.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{item.body}</p>
                  {isCardlogue && (
                    <span className="text-xs font-brand font-semibold" style={{ color: CYAN }}>
                      →
                    </span>
                  )}
                </CardContent>
              </Card>
            );
            return (
              <Reveal key={item.title} delay={i * 0.1}>
                {isCardlogue ? (
                  <Link href="/cardlogue" className="block" data-testid="link-service-cardlogue">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <section
      id="contact"
      className="py-28 px-4 relative overflow-hidden"
      data-testid="section-contact"
    >
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 70%)` }}
      />
      <Reveal>
        <div className="relative max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-brand text-3xl sm:text-4xl font-bold text-white" data-testid="text-contact-title">
            {t.contact.title}
          </h2>
          <p className="text-white/60 text-base max-w-md mx-auto">
            {t.contact.body}
          </p>
          <div className="pt-2">
            <Magnetic>
              <a href="mailto:globalmarketradar@gmail.com">
                <Button
                  size="lg"
                  className="font-brand gap-2 font-semibold px-9 py-6 shadow-lg"
                  style={{ background: CYAN, color: NAVY, boxShadow: `0 10px 40px -10px ${CYAN}66` }}
                  data-testid="button-contact-cta"
                >
                  <Mail className="w-4 h-4" /> {t.contact.cta}
                </Button>
              </a>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <footer className="py-8 px-4 relative border-t border-white/10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <NavyLogo linkTo="/" size="sm" variant="light" />
          <span>© {new Date().getFullYear()} The Navy. {t.footer.rights}</span>
        </div>

        <div
          className="pt-5 border-t border-white/10 text-center sm:text-left text-[11px] text-white/30 leading-relaxed"
          data-testid="text-business-info"
        >
          <p>{t.footer.business}</p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white">
      <OceanBackground />
      <Seo />
      <Header />
      <Hero />
      <About />
      <Services />
      <Contact />
      <Footer />
    </div>
  );
}
