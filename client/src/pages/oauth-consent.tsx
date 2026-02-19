import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { GmrLogo } from "@/components/gmr-logo";
import { supabase } from "@/lib/supabase";
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface AuthorizationDetails {
  client_name?: string;
  scope?: string;
  redirect_uri?: string;
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: "Verify your identity",
  email: "Access your email address",
  profile: "Access your profile information",
  phone: "Access your phone number",
};

function getScopeDescription(scope: string): string {
  return SCOPE_DESCRIPTIONS[scope] || scope;
}

export default function OAuthConsentPage() {
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const authorizationId = params.get("authorization_id");

  useEffect(() => {
    async function fetchDetails() {
      if (!authorizationId) {
        setError("Missing authorization_id parameter");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await (supabase.auth as any).oauth.getAuthorizationDetails(authorizationId);
        if (fetchError) {
          setError(fetchError.message || "Failed to load authorization details");
        } else {
          setDetails(data);
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      }
      setLoading(false);
    }

    fetchDetails();
  }, [authorizationId]);

  async function handleApprove() {
    if (!authorizationId) return;
    setProcessing(true);
    try {
      const { data, error: approveError } = await (supabase.auth as any).oauth.approveAuthorization(authorizationId);
      if (approveError) {
        setError(approveError.message || "Failed to approve authorization");
        setProcessing(false);
        return;
      }
      if (data?.redirect_to) {
        window.location.href = data.redirect_to;
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setProcessing(false);
    }
  }

  async function handleDeny() {
    if (!authorizationId) return;
    setProcessing(true);
    try {
      const { data, error: denyError } = await (supabase.auth as any).oauth.denyAuthorization(authorizationId);
      if (denyError) {
        setError(denyError.message || "Failed to deny authorization");
        setProcessing(false);
        return;
      }
      if (data?.redirect_to) {
        window.location.href = data.redirect_to;
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setProcessing(false);
    }
  }

  const scopes = details?.scope?.split(" ").filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between gap-4 flex-wrap px-6 py-4 border-b">
        <GmrLogo linkTo="" showTagline />
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {loading ? (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground" data-testid="text-consent-loading">Loading authorization details...</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <XCircle className="w-8 h-8 text-destructive" />
                <div className="space-y-1">
                  <p className="font-semibold" data-testid="text-consent-error">Authorization Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="text-center space-y-2">
                <Shield className="w-10 h-10 mx-auto text-muted-foreground" />
                <h1 className="text-2xl font-serif font-bold tracking-tight" data-testid="text-consent-title">
                  Authorization Request
                </h1>
                <p className="text-sm text-muted-foreground">
                  An application is requesting access to your account
                </p>
              </div>

              <Card className="p-6 space-y-5">
                <div className="text-center space-y-1">
                  <p className="font-semibold text-lg" data-testid="text-client-name">
                    {details?.client_name || "Unknown Application"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    wants to access your GMR account
                  </p>
                </div>

                {scopes.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">This application will be able to:</p>
                    <ul className="space-y-2" data-testid="list-scopes">
                      {scopes.map((scope) => (
                        <li key={scope} className="flex items-center gap-3 text-sm" data-testid={`scope-${scope}`}>
                          <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span>{getScopeDescription(scope)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDeny}
                    disabled={processing}
                    data-testid="button-deny"
                  >
                    Deny
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleApprove}
                    disabled={processing}
                    data-testid="button-approve"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Approve"
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  You can revoke access at any time from your account settings.
                </p>
              </Card>
            </>
          )}
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          GMR &middot; Global Market Radar
        </p>
      </footer>
    </div>
  );
}
