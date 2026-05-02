"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  signInDemo: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_EMAIL = "priya@investiq.demo";
const DEMO_PASSWORD = "Priya123!";
const DEMO_AUTH_KEY = "investiq_demo_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demoAuthed, setDemoAuthed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DEMO_AUTH_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthenticated: Boolean(session) || demoAuthed,
      loading,
      signInDemo: async (email: string, password: string) => {
        if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          return { error: "Invalid demo credentials" };
        }
        setDemoAuthed(true);
        try {
          window.localStorage.setItem(DEMO_AUTH_KEY, "1");
        } catch {
          // no-op
        }
        return { error: null };
      },
      signInWithGoogle: async () => {
        const redirectTo = `${window.location.origin}/home`;
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
      },
      signInWithPassword: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUpWithPassword: async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        setDemoAuthed(false);
        try {
          window.localStorage.removeItem(DEMO_AUTH_KEY);
        } catch {
          // no-op
        }
        await supabase.auth.signOut();
      },
    }),
    [session, demoAuthed, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
