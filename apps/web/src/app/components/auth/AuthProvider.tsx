"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";
import { DEMO_USER } from "../../../lib/demoUser";
import { createDemoSession, isLocalDemoMode, readDemoSessionFlag, writeDemoSessionFlag } from "../../../lib/localDemo";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    if (!isLocalDemoMode) return null;
    return readDemoSessionFlag() ? createDemoSession() : null;
  });
  const [loading, setLoading] = useState(!isLocalDemoMode);

  useEffect(() => {
    if (isLocalDemoMode) {
      return;
    }

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
      isAuthenticated: Boolean(session),
      loading,
      signInWithGoogle: async () => {
        if (isLocalDemoMode) {
          writeDemoSessionFlag(true);
          setSession(createDemoSession());
          setLoading(false);
          return;
        }
        const redirectTo = `${window.location.origin}/home`;
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
      },
      signInWithPassword: async (email: string, password: string) => {
        if (isLocalDemoMode) {
          const matchesDemoUser =
            email.trim().toLowerCase() === DEMO_USER.email.toLowerCase() && password === DEMO_USER.password;
          if (!matchesDemoUser) {
            return { error: "Local demo mode only supports the seeded Priya Sharma credentials shown on this page." };
          }

          writeDemoSessionFlag(true);
          setSession(createDemoSession());
          setLoading(false);
          return { error: null };
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUpWithPassword: async (email: string, password: string) => {
        if (isLocalDemoMode) {
          const matchesDemoUser =
            email.trim().toLowerCase() === DEMO_USER.email.toLowerCase() && password === DEMO_USER.password;
          if (!matchesDemoUser) {
            return { error: "Local demo mode is read-only. Use the seeded Priya Sharma account to continue." };
          }

          writeDemoSessionFlag(true);
          setSession(createDemoSession());
          setLoading(false);
          return { error: null };
        }
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        if (isLocalDemoMode) {
          writeDemoSessionFlag(false);
          setSession(null);
          setLoading(false);
          return;
        }
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
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
