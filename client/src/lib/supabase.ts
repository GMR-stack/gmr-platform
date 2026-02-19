import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let supabaseInstance: SupabaseClient | null = null;

function isValidUrl(url: string): boolean {
  try {
    if (!url || url === "placeholder" || url === "https://placeholder.supabase.co") return false;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

if (isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey !== "placeholder") {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

const notConfiguredError = { message: "Supabase not configured" };
const mockClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => ({ data: null, error: notConfiguredError }),
    signInWithPassword: async () => ({ data: null, error: notConfiguredError }),
    resetPasswordForEmail: async () => ({ data: null, error: notConfiguredError }),
    signOut: async () => ({ error: null }),
  },
} as unknown as SupabaseClient;

export const supabase = supabaseInstance || mockClient;
export const isSupabaseConfigured = !!supabaseInstance;
