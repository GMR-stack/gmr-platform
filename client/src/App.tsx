import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { HelmetProvider } from "react-helmet-async";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import CardloguePage from "@/pages/cardlogue";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import RefundPage from "@/pages/refund";
import AccountDeletionPage from "@/pages/account-deletion";

// Everything except the public/marketing pages is split out of the main
// bundle: visitors (and crawlers) landing on /cardlogue no longer download the
// dashboard, admin, team-payment or digital-card-template code.
const LoginPage = lazy(() => import("@/pages/login"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ArchivePage = lazy(() => import("@/pages/archive"));
const AdminPage = lazy(() => import("@/pages/admin"));
const OAuthConsentPage = lazy(() => import("@/pages/oauth-consent"));
const CardlogueCardPage = lazy(() => import("@/pages/cardlogue-card"));
const TeamPaymentPage = lazy(() => import("@/pages/team-payment"));
const TeamLoginPage = lazy(() => import("@/pages/team-login"));
const TeamManagePage = lazy(() => import("@/pages/team-manage"));
const TeamCardsPage = lazy(() => import("@/pages/team-cards"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const ReportPage = lazy(() => import("@/pages/report"));

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

// cardlogue.globalmarketradar.com exists so external reviewers (Paddle,
// Google OAuth branding) only ever see Cardlogue content — server/static.ts
// serves Cardlogue-tagged HTML for "/" on this host, but that only covers
// the initial (pre-JS) response. Once the client hydrates, wouter's router
// matches path "/" same as any other host and would render The Navy's own
// LandingPage, silently reverting everything the server-side fix did. This
// keeps the client route in sync with what the server actually sent.
const CARDLOGUE_ONLY_HOST = "cardlogue.globalmarketradar.com";
const isCardlogueOnlyHost = typeof window !== "undefined" && window.location.hostname === CARDLOGUE_ONLY_HOST;

function Router() {
  return (
    <Switch>
      <Route path="/" component={isCardlogueOnlyHost ? CardloguePage : LandingPage} />
      <Route path="/cardlogue" component={CardloguePage} />
      <Route path="/ko/cardlogue" component={CardloguePage} />
      <Route path="/cardlogue/card/:id" component={CardlogueCardPage} />
      <Route path="/team/payment" component={TeamPaymentPage} />
      <Route path="/team/login" component={TeamLoginPage} />
      <Route path="/team/manage" component={TeamManagePage} />
      <Route path="/team/cards" component={TeamCardsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/refund" component={RefundPage} />
      <Route path="/account-deletion" component={AccountDeletionPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/auth" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/report/:id" component={ReportPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/archive" component={ArchivePage} />
      <Route path="/admin">
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      </Route>
      <Route path="/oauth/consent" component={OAuthConsentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <ScrollToTop />
                <Suspense fallback={null}>
                  <Router />
                </Suspense>
              </TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
