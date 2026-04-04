import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { GmrLogo } from "@/components/gmr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ShieldCheck, ArrowRight } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Report } from "@shared/schema";

function PayPalSubscribeButton({ planId }: { planId: string }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!planId) return null;

  return (
    <PayPalButtons
      style={{ shape: "rect", color: "gold", layout: "vertical", label: "subscribe" }}
      createSubscription={(_data, actions) => {
        if (!session?.access_token) {
          setLocation("/login?mode=signup");
          return Promise.reject(new Error("Login required"));
        }
        return actions.subscription.create({ plan_id: planId });
      }}
      onApprove={async (data) => {
        try {
          const token = session?.access_token;
          if (!token) { setLocation("/login?mode=signup"); return; }
          const res = await fetch("/api/paypal/create-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ subscriptionId: data.subscriptionID }),
          });
          if (res.ok) {
            toast({ title: "Subscription activated! Welcome to GMR." });
          } else {
            toast({ title: "Failed to activate subscription", variant: "destructive" });
          }
        } catch {
          toast({ title: "Something went wrong", variant: "destructive" });
        }
      }}
      onError={() => {}}
      data-testid="paypal-subscribe-button"
    />
  );
}

function SampleReport() {
  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      const res = await fetch("/api/reports");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const latestFree = reports
    ?.filter((r) => r.reportType === "free")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];

  const previewText = latestFree
    ? latestFree.content.replace(/[#*_`\[\]]/g, "").slice(0, 800)
    : "";

  return (
    <section className="py-16 px-4 bg-muted/30" data-testid="section-sample">
      <div className="max-w-4xl mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Latest Report</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="relative">
          <Card className="overflow-hidden border border-border/60 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : latestFree ? (
                <div className="space-y-2">
                  <h3 className="font-bold text-base mb-3">{latestFree.title}</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-sample-report">
                    {previewText}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading latest report...</p>
              )}
            </CardContent>
          </Card>

          {/* Blur overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/95" style={{ top: "40%" }} />
          <div className="absolute bottom-0 left-0 right-0 py-8 flex flex-col items-center gap-4 rounded-b-lg">
            <p className="text-sm font-medium text-muted-foreground" data-testid="text-sample-cta">
              Subscribe to read the full analysis
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Link href="/login?mode=signup">
                <Button className="gap-2" data-testid="button-sample-signup">
                  Get Full Access <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" data-testid="button-sample-dashboard">Browse Free Reports</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paypalPlanId] = useState(import.meta.env.VITE_PAYPAL_PLAN_ID || "");

  useEffect(() => {
    fetch("/api/paypal/client-id")
      .then((r) => r.json())
      .then((data) => setPaypalClientId(data.clientId))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (!loading && user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <GmrLogo showTagline linkTo="" size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" data-testid="link-dashboard-header">
                View Dashboard
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" data-testid="link-login">
                Log In
              </Button>
            </Link>
            <Link href="/login?mode=signup">
              <Button size="sm" data-testid="link-signup-header">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden px-4 py-20 sm:py-28"
        data-testid="section-hero"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(to right, #94a3b8 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Subtle glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Eyebrow label */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-white/10 bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60 font-medium tracking-wide">Global Macro Intelligence</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-white mb-6"
            data-testid="text-hero-headline"
          >
            Markets price the headline.{" "}
            <span className="text-blue-400">We price what comes after.</span>
          </h1>

          <p
            className="text-base sm:text-lg text-white/55 max-w-xl mx-auto mb-10 leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            Daily intelligence on geopolitics, central banks, and supply chains — the second and third-order effects markets aren't pricing yet.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login?mode=signup">
              <Button
                size="lg"
                className="text-sm px-7 bg-white text-slate-900 hover:bg-white/90 font-semibold"
                data-testid="button-hero-signup"
              >
                Start Reading — $12/mo
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="ghost"
                className="text-sm px-7 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                data-testid="button-hero-dashboard"
              >
                Read Free Reports
              </Button>
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-5 text-xs text-white/30">
            7-day money-back guarantee · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Signal strip ── */}
      <div className="border-y border-border bg-muted/20 py-4 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="text-primary">✦</span> Geopolitics & Central Banks</span>
          <span className="flex items-center gap-1.5"><span className="text-primary">✦</span> FX · Rates · Commodities</span>
          <span className="flex items-center gap-1.5"><span className="text-primary">✦</span> Supply Chain Disruptions</span>
          <span className="flex items-center gap-1.5"><span className="text-primary">✦</span> 2nd & 3rd Order Effects</span>
          <span className="flex items-center gap-1.5"><span className="text-primary">✦</span> Published 2–3× Weekly</span>
        </div>
      </div>

      {/* ── Sample Report ── */}
      <SampleReport />

      {/* ── Pricing ── */}
      <section className="py-16 px-4" data-testid="section-pricing">
        <div className="max-w-md mx-auto">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pricing</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Card className="border-2 border-primary shadow-xl overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600" />
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-widest text-yellow-500">Founding Member Price</div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold" data-testid="text-price">$12</span>
                  <span className="text-muted-foreground mb-1">/month</span>
                </div>
                <div className="text-xs text-muted-foreground">Regular price $19 · Lock in now before May 1</div>
              </div>

              <ul className="text-left space-y-3 text-sm">
                {[
                  "Daily reports on geopolitics, central banks & supply chains",
                  "Second and third-order analysis markets aren't pricing",
                  "Full archive access",
                  "Lock in $12 before May 1 — price goes to $19",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {paypalClientId && paypalPlanId ? (
                <PayPalScriptProvider options={{ clientId: paypalClientId, vault: true, intent: "subscription", locale: "en_US" }}>
                  <PayPalSubscribeButton planId={paypalPlanId} />
                </PayPalScriptProvider>
              ) : (
                <Link href="/login?mode=signup">
                  <Button className="w-full" size="lg" data-testid="button-subscribe">
                    Subscribe Now
                  </Button>
                </Link>
              )}

              {/* Guarantee inline */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>7-day money-back guarantee · No questions asked</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        className="py-16 px-4"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
        data-testid="section-cta"
      >
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-cta-title">
            Start Seeing What Markets Miss
          </h2>
          <p className="text-white/50 text-sm">
            Join investors and analysts who rely on GMR for their daily market edge.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <Link href="/login?mode=signup">
              <Button
                size="lg"
                className="text-sm px-7 bg-white text-slate-900 hover:bg-white/90 font-semibold"
                data-testid="button-cta-signup"
              >
                Sign Up Free
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="ghost"
                className="text-sm px-7 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                data-testid="button-cta-dashboard"
              >
                View Reports Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-6 px-4 bg-background">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span data-testid="text-footer">GMR · Global Market Radar</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
