import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { GmrLogo } from "@/components/gmr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ShieldCheck } from "lucide-react";
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

// 최신 무료 보고서 샘플 컴포넌트
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
    <section className="py-20 px-4" data-testid="section-sample">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4" data-testid="text-sample-title">
          See What You'll Get
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Our latest free report
        </p>
        <div className="relative">
          <Card className="overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" style={{ top: "40%" }} />
          <div className="absolute bottom-0 left-0 right-0 backdrop-blur-sm bg-background/60 py-8 flex flex-col items-center gap-3 rounded-b-lg">
            <p className="font-medium text-base" data-testid="text-sample-cta">
              Subscribe to read full reports
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Link href="/login?mode=signup">
                <Button data-testid="button-sample-signup">Sign Up for Premium</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" data-testid="button-sample-dashboard">Read Free Reports</Button>
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
      <section className="py-24 px-4" data-testid="section-hero">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-headline">
            Markets price the headline.{" "}
            <span className="text-primary">We price what comes after.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Daily intelligence on geopolitics, central banks, and supply chains — the second and third-order effects markets aren't pricing yet.
          </p>
          <div className="pt-4 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login?mode=signup">
              <Button size="lg" className="text-base px-8" data-testid="button-hero-signup">
                Sign Up
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-base px-8" data-testid="button-hero-dashboard">
                View Reports Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sample Report (dynamic) ── */}
      <SampleReport />

      {/* ── Pricing ── */}
      <section className="py-20 px-4 bg-muted/40" data-testid="section-pricing">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" data-testid="text-pricing-title">
            Simple Pricing
          </h2>
          <p className="text-muted-foreground mb-10">
            One plan. Full access. Cancel anytime.
          </p>
          <Card className="border-2 border-primary shadow-lg">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-widest text-yellow-500">Founding Member Price</div>
                <div>
                  <span className="text-4xl font-bold" data-testid="text-price">$12</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="text-xs text-muted-foreground">Regular price $19 · Lock in now before May 1</div>
              </div>
              <ul className="text-left space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Daily reports on geopolitics, central banks & supply chains</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Second and third-order analysis markets aren't pricing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Full archive access</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Lock in $12 before May 1 — price goes to $19</span>
                </li>
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
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Refund ── */}
      <section className="py-16 px-4" data-testid="section-refund">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold" data-testid="text-refund-title">
            7-Day Money Back Guarantee
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto" data-testid="text-refund-description">
            Not satisfied? Request a full refund within 7 days of your subscription. No questions asked.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4" data-testid="section-cta">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold" data-testid="text-cta-title">
            Start Seeing What Markets Miss
          </h2>
          <p className="text-muted-foreground text-lg">
            Join investors and analysts who rely on GMR for their daily market edge.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap pt-4">
            <Link href="/login?mode=signup">
              <Button size="lg" className="text-base px-8" data-testid="button-cta-signup">
                Sign Up Free
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-base px-8" data-testid="button-cta-dashboard">
                View Reports Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span data-testid="text-footer">GMR · Global Market Radar</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}
