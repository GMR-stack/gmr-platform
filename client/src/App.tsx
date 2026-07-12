import { Switch, Route } from "wouter";
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
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ArchivePage from "@/pages/archive";
import AdminPage from "@/pages/admin";
import OAuthConsentPage from "@/pages/oauth-consent";
import LandingPage from "@/pages/landing";
import CardloguePage from "@/pages/cardlogue";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import RefundPage from "@/pages/refund";
import ResetPasswordPage from "@/pages/reset-password";
import ReportPage from "@/pages/report";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/cardlogue" component={CardloguePage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/refund" component={RefundPage} />
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
                <Router />
              </TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
