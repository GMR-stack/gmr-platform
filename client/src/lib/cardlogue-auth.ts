// Cardlogue session handling shared by the team payment/management pages.
//
// Two ways a Cardlogue session token reaches these pages:
//  1. The Cardlogue RN app loads them in a WebView and injects the token as
//     window.__CARDLOGUE_TOKEN via injectedJavaScriptBeforeContentLoaded
//     (never via the URL, so it can't leak through server logs or Referer).
//  2. The browser flow (built for PG/card-issuer review): the user logs in
//     at /team/login with their Cardlogue account, and the token from the
//     server's password-grant proxy is kept in sessionStorage here.
// The injected token always wins so the in-app flow behaves exactly as
// before.

const SESSION_KEY = "cardlogue-web-session";

export type CardlogueWebSession = {
  accessToken: string;
  // Unix seconds, as returned by Supabase's token endpoint. Null if unknown.
  expiresAt: number | null;
  user: { id: string; email: string | null; name: string | null };
};

export function isInAppWebView(): boolean {
  return !!(window as any).ReactNativeWebView;
}

// The Cardlogue RN app listens for postMessage on every WebView page built
// here (team-payment, team-cards) to know when a flow is done. No-op in the
// browser flow — there's no app to receive it.
export function notifyApp(payload: Record<string, unknown>) {
  (window as any).ReactNativeWebView?.postMessage(JSON.stringify(payload));
}

export function getWebSession(): CardlogueWebSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as CardlogueWebSession;
    if (!session?.accessToken) return null;
    if (session.expiresAt && session.expiresAt * 1000 < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setWebSession(session: CardlogueWebSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearWebSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getCardlogueToken(): string | undefined {
  const injected = (window as any).__CARDLOGUE_TOKEN;
  if (injected) return injected;
  return getWebSession()?.accessToken;
}

// Sends the browser user to /team/login and back to where they were.
// No-op inside the app WebView — there the app owns the session, and a
// missing token is an app bug the login page can't fix.
export function loginUrlFor(returnTo: string): string {
  return `/team/login?redirect=${encodeURIComponent(returnTo)}`;
}
