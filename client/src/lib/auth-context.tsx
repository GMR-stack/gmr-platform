import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@shared/schema";
import { apiRequest } from "./queryClient";

const RECOVERY_KEY = "gmr_password_recovery";

// Detect recovery link — covers ALL Supabase flows:
// 1. Implicit flow: #access_token=...&type=recovery (hash)
// 2. PKCE / OTP flow: ?token_hash=...&type=recovery  (query params)
// 3. Persisted from previous page load via sessionStorage
function detectRecovery(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(RECOVERY_KEY) === "1") return true;
  if (window.location.hash.includes("type=recovery")) return true;
  if (new URLSearchParams(window.location.search).get("type") === "recovery") return true;
  return false;
}

// Capture synchronously before any async processing can clear the URL params
const isRecoveryLink = detectRecovery();
if (isRecoveryLink && typeof window !== "undefined") {
  // Persist across the redirect to /reset-password
  sessionStorage.setItem(RECOVERY_KEY, "1");
}

export function clearRecoveryFlag() {
  sessionStorage.removeItem(RECOVERY_KEY);
}

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function syncUser(supaUser: SupabaseUser) {
    try {
      const res = await apiRequest("POST", "/api/auth/sync", {
        supabaseId: supaUser.id,
        email: supaUser.email,
        name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || null,
        avatarUrl: supaUser.user_metadata?.avatar_url || null,
      });
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    // If this is a password-reset link, bail out entirely.
    // Let the /reset-password page manage its own session.
    if (isRecoveryLink) {
      if (!window.location.pathname.startsWith("/reset-password")) {
        window.location.href = "/reset-password";
      }
      setLoading(false);
      return;
    }

    const isEmailConfirmation = () =>
      new URLSearchParams(window.location.search).get("confirmed") === "true";

    // Runtime fallback: if PASSWORD_RECOVERY fires (e.g. hash was cleared
    // before our module-level check ran), block all subsequent events.
    let recoveryActive = false;

    const isRecoverySession = () =>
      recoveryActive || sessionStorage.getItem(RECOVERY_KEY) === "1";

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (isRecoverySession()) {
        setLoading(false);
        return;
      }
      if (s?.user && isEmailConfirmation()) {
        await supabase.auth.signOut();
        window.history.replaceState(null, "", "/login?confirmed=true");
        setLoading(false);
        return;
      }
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      if (s?.user) {
        syncUser(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // PASSWORD_RECOVERY always wins — flag it and redirect
      if (event === "PASSWORD_RECOVERY") {
        recoveryActive = true;
        sessionStorage.setItem(RECOVERY_KEY, "1");
        if (!window.location.pathname.startsWith("/reset-password")) {
          window.location.href = "/reset-password";
        }
        return;
      }

      // Block INITIAL_SESSION and SIGNED_IN that follow a recovery event
      if (isRecoverySession()) return;

      if (event === "SIGNED_IN" && isEmailConfirmation()) {
        await supabase.auth.signOut();
        return;
      }

      setSession(s);
      setSupabaseUser(s?.user ?? null);
      if (s?.user) {
        syncUser(s.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/login?confirmed=true" },
    });
    if (error) return { error: error.message };
    return {};
  }

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function resetPassword(email: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
  }

  return (
    <AuthContext.Provider value={{ session, supabaseUser, user, loading, signUp, signIn, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
