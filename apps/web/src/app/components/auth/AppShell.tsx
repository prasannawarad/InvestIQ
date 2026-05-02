"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { colors, typography } from "@investiq/ui/tokens";
import { Sidebar } from "../Sidebar";
import { FloatingKuber } from "../FloatingKuber";
import { useAuth } from "./AuthProvider";

const protectedPrefixes = [
  "/home",
  "/current",
  "/preview",
  "/Kuber",
  "/rebalance",
  "/settings",
  "/profile",
  "/extension",
  "/help",
  "/panic",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const isProtectedRoute = useMemo(() => {
    return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }, [pathname]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && isProtectedRoute) {
      router.replace("/");
      return;
    }

    if (isAuthenticated && pathname === "/") {
      router.replace("/home");
    }
  }, [loading, isAuthenticated, isProtectedRoute, pathname, router]);

  const showChrome = isAuthenticated && pathname !== "/" && pathname !== "/panic";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: colors.textMuted }}>
        <span style={{ fontFamily: typography.sans }}>Checking session...</span>
      </div>
    );
  }

  if (!isAuthenticated && isProtectedRoute) {
    return null;
  }

  return (
    <>
      {showChrome ? <Sidebar /> : null}
      {children}
      {showChrome ? <FloatingKuber /> : null}
    </>
  );
}
