"use client";

import { FormEvent, useState } from "react";
import { colors, typography } from "@investiq/ui/tokens";
import { investiqCardStyle, investiqFieldStyle } from "../lib/investiqUi";
import { useAuth } from "./components/auth/AuthProvider";
import { InvestiqButton } from "./components/investiq/InvestiqButton";
import { DEMO_USER } from "../lib/demoUser";
import { isLocalDemoMode } from "../lib/localDemo";

export default function LoginPage() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result =
      mode === "signin"
        ? await signInWithPassword(email.trim(), password)
        : await signUpWithPassword(email.trim(), password);

    if (result.error) {
      setError(result.error);
    }

    setPending(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-[460px] p-8" style={{ ...investiqCardStyle(), boxSizing: "border-box" }}>
        <h1 className="mb-2 text-4xl" style={{ fontFamily: typography.serif, color: colors.text }}>
          InvestIQ
        </h1>
        <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>
          Sign in to continue to your portfolio dashboard.
        </p>

        <div
          className="mb-4 rounded-lg border p-3 text-xs"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
        >
          <div className="mb-1" style={{ fontWeight: 600 }}>
            {isLocalDemoMode ? "Demo account (local fallback mode)" : "Demo account (seeded in Supabase)"}
          </div>
          {isLocalDemoMode ? (
            <div className="mb-2" style={{ color: colors.textMuted }}>
              This local run is using the bundled demo portfolio because real Supabase credentials are not configured.
            </div>
          ) : null}
          <div>Email: {DEMO_USER.email}</div>
          <div>Password: {DEMO_USER.password}</div>
          <button
            type="button"
            className="mt-2 underline"
            style={{ color: colors.accent }}
            onClick={() => {
              setMode("signin");
              setEmail(DEMO_USER.email);
              setPassword(DEMO_USER.password);
              setError(null);
            }}
          >
            Use demo credentials
          </button>
        </div>

        <InvestiqButton variant="secondary" fullWidth className="mb-4" onClick={() => void signInWithGoogle()}>
          {isLocalDemoMode ? "Enter demo account" : "Continue with Google"}
        </InvestiqButton>

        <div className="mb-4 text-center text-xs" style={{ color: colors.textMuted }}>
          or
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--investiq-accent)]/35"
            style={investiqFieldStyle()}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="outline-none focus-visible:ring-2 focus-visible:ring-[var(--investiq-accent)]/35"
            style={investiqFieldStyle()}
          />

          {error ? (
            <div className="text-xs" style={{ color: colors.coral }}>
              {error}
            </div>
          ) : null}

          <InvestiqButton type="submit" variant="primary" fullWidth disabled={pending}>
            {pending ? "Please wait..." : mode === "signin" ? "Sign in with email" : "Create account"}
          </InvestiqButton>
        </form>

        <button
          type="button"
          className="mt-4 text-xs"
          style={{ color: colors.accent }}
          onClick={() => {
            setError(null);
            setMode((prev) => (prev === "signin" ? "signup" : "signin"));
          }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
