import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { colors, typography } from "@investiq/ui/tokens";
import { AppShell } from "./components/auth/AppShell";
import { AuthProvider } from "./components/auth/AuthProvider";
import { InvestiqToaster } from "./components/investiq/InvestiqToaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestIQ",
  description: "Portfolio management for beginner investors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" style={{ colorScheme: "dark" }}>
      <body
        className="min-h-full text-[color:var(--investiq-text)]"
        style={
          {
            colorScheme: "dark",
            "--investiq-bg": colors.background,
            "--investiq-bg-panic": colors.backgroundPanic,
            "--investiq-surface": colors.surface,
            "--investiq-surface-elevated": colors.surfaceElevated,
            "--investiq-text": colors.text,
            "--investiq-text-muted": colors.textMuted,
            "--investiq-accent": colors.accent,
            "--investiq-coral": colors.coral,
            "--investiq-green": colors.green,
            "--investiq-amber": colors.amber,
            "--investiq-border": colors.border,
            "--investiq-border-subtle": colors.borderSubtle,
            "--investiq-card-bg": colors.cardBg,
            "--investiq-card-border": colors.cardBorder,
            "--investiq-input-bg": colors.inputBg,
            "--investiq-on-accent": colors.onAccent,
            "--investiq-font-sans": typography.sans,
            "--investiq-font-serif": typography.serif,
          } as CSSProperties
        }
      >
        <div className="investiq-shell min-h-screen bg-[color:var(--investiq-bg)] text-[color:var(--investiq-text)]">
          <AuthProvider>
            <InvestiqToaster />
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
