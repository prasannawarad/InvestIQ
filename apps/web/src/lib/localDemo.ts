import type { Session, User } from "@supabase/supabase-js";
import { DEMO_USER } from "./demoUser";

const DEMO_ANON_KEY = "demo-anon-key";
const PLACEHOLDER_URL_MARKERS = ["your-project-ref.supabase.co", "placeholder.supabase.co", "example-investiq.supabase.co"];
const STORAGE_KEY = "investiq-local-demo-session";

function looksLikeRealSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !PLACEHOLDER_URL_MARKERS.some((marker) => url.includes(marker));
}

function looksLikeRealSupabaseKey(key: string | undefined): boolean {
  if (!key) return false;
  return key !== "your-public-anon-key" && key !== DEMO_ANON_KEY;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = looksLikeRealSupabaseUrl(supabaseUrl) && looksLikeRealSupabaseKey(supabaseAnonKey);
export const isLocalDemoMode = !isSupabaseConfigured;

export function isDemoUserId(userId: string | null | undefined): boolean {
  return userId === DEMO_USER.uuid;
}

export function readDemoSessionFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDemoSessionFlag(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures in restrictive browser contexts.
  }
}

export function createDemoUser(): User {
  return {
    id: DEMO_USER.uuid,
    aud: "authenticated",
    role: "authenticated",
    email: DEMO_USER.email,
    email_confirmed_at: "2026-05-01T09:00:00Z",
    confirmed_at: "2026-05-01T09:00:00Z",
    last_sign_in_at: "2026-05-01T09:00:00Z",
    phone: "",
    created_at: "2026-05-01T09:00:00Z",
    updated_at: "2026-05-01T09:00:00Z",
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {
      first_name: DEMO_USER.firstName,
      last_name: DEMO_USER.lastName,
      full_name: DEMO_USER.name,
    },
    identities: [],
  } as User;
}

export function createDemoSession(): Session {
  return {
    access_token: "investiq-local-demo-access-token",
    refresh_token: "investiq-local-demo-refresh-token",
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: "bearer",
    user: createDemoUser(),
  } as Session;
}
