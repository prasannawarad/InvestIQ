"use client";

import { FormEvent, useState } from "react";
import { colors, radii, shadows, typography } from "@investiq/ui/tokens";
import { useAuth } from "./components/auth/AuthProvider";

export default function LoginPage() {
  const { signInDemo, signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const demoEmail = "priya@investiq.demo";
  const demoPassword = "Priya123!";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    let result: { error: string | null };
    if (mode === "signin" && email.trim().toLowerCase() === demoEmail && password === demoPassword) {
      result = await signInDemo(email, password);
    } else {
      result =
        mode === "signin"
          ? await signInWithPassword(email.trim(), password)
          : await signUpWithPassword(email.trim(), password);
    }

    if (result.error) {
      setError(result.error);
    }

    setPending(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section
        className="w-full max-w-[440px] p-8"
        style={{
          borderRadius: radii.xl,
          backgroundColor: colors.cardBg,
          boxShadow: shadows.popover,
          border: `1px solid ${colors.border}`,
        }}
      >
        <h1 className="mb-2 text-4xl" style={{ fontFamily: typography.serif, color: colors.text }}>
          InvestIQ
        </h1>
        <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>
          Sign in to continue to your portfolio dashboard.
        </p>

        <div
          className="mb-4 rounded-lg p-3 text-xs"
          style={{ backgroundColor: colors.backgroundPanic, color: colors.text }}
        >
          <div className="mb-1" style={{ fontWeight: 600 }}>
            Demo credentials (Priya)
          </div>
          <div>Email: priya@investiq.demo</div>
          <div>Password: Priya123!</div>
          <button
            type="button"
            className="mt-2 underline"
            style={{ color: colors.accent }}
            onClick={() => {
              setMode("signin");
              setEmail(demoEmail);
              setPassword(demoPassword);
              setError(null);
            }}
          >
            Use demo credentials
          </button>
        </div>

        <button
          type="button"
          className="mb-4 w-full px-4 py-3 text-sm"
          style={{ borderRadius: radii.md, backgroundColor: colors.accent, color: colors.cardBg }}
          onClick={() => {
            void signInWithGoogle();
          }}
        >
          Continue with Google
        </button>

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
            className="w-full px-4 py-3 text-sm outline-none"
            style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, color: colors.text }}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 text-sm outline-none"
            style={{ borderRadius: radii.md, border: `1px solid ${colors.border}`, color: colors.text }}
          />

          {error ? (
            <div className="text-xs" style={{ color: colors.coral }}>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full px-4 py-3 text-sm disabled:opacity-60"
            style={{ borderRadius: radii.md, backgroundColor: colors.text, color: colors.cardBg }}
          >
            {pending ? "Please wait..." : mode === "signin" ? "Sign in with email" : "Create account"}
          </button>
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
