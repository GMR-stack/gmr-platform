import { Link } from "wouter";
import { useState, useEffect } from "react";
import { GmrLogo } from "@/components/gmr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Globe, TrendingUp, Check, ShieldCheck } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

const sampleReport = `## Weekly Macro Overview — Feb 27, 2026

### US Economy
The Federal Reserve held rates steady at 4.25–4.50% as expected, signaling patience amid mixed inflation data. January CPI came in at 3.1% YoY, slightly above consensus, while core PCE moderated to 2.7%. Labor markets remain resilient with NFP at +187K, though wage growth decelerated to 3.8% annualized.

### Key Takeaways
- **USD**: Dollar Index (DXY) testing 104.5 resistance. Bias remains bullish near-term on rate differential support.
- **US Equities**: S&P 500 consolidated around 5,850–5,920 range. Tech leadership narrowing — watch for rotation signals.
- **Treasuries**: 10Y yield hovering at 4.35%. Curve steepening trend intact as front-end reprices fewer cuts.

### Europe & UK
ECB delivered a 25bp cut to 3.50%, citing weaker growth outlook. Eurozone PMI composite slipped to 48.2, dragged by German manufacturing. Sterling weakened after BoE's dovish hold, with markets pricing 75bp of cuts through year-end.

### Asia-Pacific
China's January credit data surprised to the upside (CNY 6.2T new loans), but property sector headwinds persist. PBoC maintained accommodative stance with targeted RRR cuts. Japan's Q4 GDP contracted -0.1% QoQ, complicating BoJ's normalization path.`;

function PayPalSubscribeButton({ planId }: { planId: string }) {
  const { session } = useAuth();
  const { toast } = useToast();

  if (!planId) return null;

  return (
    <PayPalButtons
      style={{ shape: "rect", color: "gold", layout: "vertical", label: "subscribe" }}
      createSubscription={(_data, actions) => {
        return actions.subscription.create({
          plan_id: planId,
        });
      }}
      onApprove={async (data) => {
        try {
          const token = session?.access_token;
          if (!token) {
            toast({ title: "Please log in first to subscribe", variant: "destructive" });
            return;
          }
          const res = await fetch("/api/paypal/create-subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
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
      onError={() => {
        toast({ title: "PayPal error occurred", variant: "destructive" });
      }}
      data-testid="paypal-subscribe-button"
    />
  );
}

export default function LandingPage() {
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paypalPlanId] = useState(import.meta.env.VITE_PAYPAL_PLAN_ID || "");

  useEffect(() => {
    fetch("/api/paypal/client-id")
      .then((r) => r.json())
      .then((data) => setPaypalClientId(data.clientId))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <GmrLogo showTagline linkTo="" size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" size="sm" data-testid="link-login">
                Log In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" data-testid="link-signup-header">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-24 px-4" data-testid="section-hero">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-headline">
            Financial Intelligence,{" "}
            <span className="text-primary">Delivered Daily</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Concise macro analysis and market insights from seasoned professionals.
            Stay ahead of global markets with GMR's daily reports.
          </p>
          <div className="pt-4">
            <Link href="/login">
              <Button size="lg" className="text-base px-8" data-testid="button-hero-signup">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/40" data-testid="section-features">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12" data-testid="text-features-title">
            Why Subscribe to GMR?
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-sm bg-background">
              <CardContent className="pt-8 pb-6 px-6 space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg" data-testid="text-feature-daily">Daily Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Monday through Friday market briefings covering equities, FX, rates, commodities, and geopolitical analysis with market impact assessment.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center border-0 shadow-sm bg-background">
              <CardContent className="pt-8 pb-6 px-6 space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg" data-testid="text-feature-macro">Global Macro</h3>
                <p className="text-sm text-muted-foreground">
                  Cross-asset, cross-region perspective spanning US, Europe, and Asia-Pacific markets.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center border-0 shadow-sm bg-background">
              <CardContent className="pt-8 pb-6 px-6 space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg" data-testid="text-feature-analysis">Expert Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Actionable insights backed by institutional-grade research and years of market experience.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-4" data-testid="section-sample">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4" data-testid="text-sample-title">
            See What You'll Get
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            A glimpse of our daily macro briefing
          </p>
          <div className="relative">
            <Card className="overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-sample-report">
                  {sampleReport}
                </div>
              </CardContent>
            </Card>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" style={{ top: "40%" }} />
            <div className="absolute bottom-0 left-0 right-0 backdrop-blur-sm bg-background/60 py-8 flex flex-col items-center gap-4 rounded-b-lg">
              <p className="font-medium text-base" data-testid="text-sample-cta">Subscribe to read full reports</p>
              <Link href="/login">
                <Button data-testid="button-sample-signup">Sign Up Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
              <div>
                <span className="text-4xl font-bold" data-testid="text-price">$12</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="text-left space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Daily market briefings (Mon-Fri)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Full archive access</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Global macro coverage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Free weekly report included</span>
                </li>
              </ul>
              {paypalClientId && paypalPlanId ? (
                <PayPalScriptProvider options={{ clientId: paypalClientId, vault: true, intent: "subscription" }}>
                  <PayPalSubscribeButton planId={paypalPlanId} />
                </PayPalScriptProvider>
              ) : (
                <Link href="/login">
                  <Button className="w-full" size="lg" data-testid="button-subscribe">
                    Subscribe Now
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

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

      <section className="py-24 px-4" data-testid="section-cta">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold" data-testid="text-cta-title">
            Start Reading Today
          </h2>
          <p className="text-muted-foreground text-lg">
            Join investors and analysts who rely on GMR for their daily market edge.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-base px-8 mt-4" data-testid="button-cta-signup">
              Sign Up Free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span data-testid="text-footer">GMR · Global Market Radar</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
