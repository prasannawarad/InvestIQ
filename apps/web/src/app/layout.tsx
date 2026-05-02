import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { colors, typography } from "@investiq/ui/tokens";
import { AppShell } from "./components/auth/AppShell";
import { AuthProvider } from "./components/auth/AuthProvider";
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
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full"
        style={
          {
            "--investiq-bg": colors.background,
            "--investiq-bg-panic": colors.backgroundPanic,
            "--investiq-text": colors.text,
            "--investiq-text-muted": colors.textMuted,
            "--investiq-accent": colors.accent,
            "--investiq-coral": colors.coral,
            "--investiq-green": colors.green,
            "--investiq-amber": colors.amber,
            "--investiq-border": colors.border,
            "--investiq-card-bg": colors.cardBg,
            "--investiq-card-border": colors.cardBorder,
            "--investiq-font-sans": typography.sans,
            "--investiq-font-serif": typography.serif,
          } as CSSProperties
        }
      >
        <div className="min-h-screen bg-[var(--investiq-bg)] text-[var(--investiq-text)]">
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
