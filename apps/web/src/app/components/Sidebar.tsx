"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Briefcase,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PuzzleIcon,
  Scale,
  Settings,
  User,
  X,
} from "lucide-react";
import { colors, radii, typography } from "@investiq/ui/tokens";
import { useAuth } from "./auth/AuthProvider";
import { DEMO_USER } from "../../lib/demoUser";

const mainLinks = [
  { name: "Home", path: "/home", icon: Home },
  { name: "Current", path: "/current", icon: Briefcase },
  { name: "Kuber", path: "/Kuber", icon: MessageCircle },
  { name: "Rebalance", path: "/rebalance", icon: Scale },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "Profile", path: "/profile", icon: User },
];

const secondaryLinks = [
  { name: "Extension", path: "/extension", icon: PuzzleIcon },
  { name: "Help", path: "/help", icon: HelpCircle },
];

function isActive(pathname: string, path: string): boolean {
  if (path === "/home") {
    return pathname === "/home";
  }
  return pathname.startsWith(path);
}

function SidebarNav({
  pathname,
  fullName,
  initials,
  onNavigate,
  onSignOut,
}: {
  pathname: string;
  fullName: string;
  initials: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
            style={{ backgroundColor: colors.accent, color: colors.onAccent }}
          >
            IQ
          </div>
          <span className="text-lg" style={{ fontFamily: typography.serif }}>
            InvestIQ
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.path);

            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => onNavigate?.()}
                className="relative flex items-center gap-3 px-3 py-2.5 text-sm transition-[background-color,color,transform] duration-150 hover:-translate-y-[0.5px]"
                style={{
                  color: active ? colors.accent : colors.text,
                  borderRadius: radii.pill,
                  backgroundColor: active
                    ? `color-mix(in srgb, ${colors.accent} 14%, ${colors.surfaceElevated})`
                    : "transparent",
                }}
              >
                {active ? (
                  <div
                    className="absolute left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                  />
                ) : null}
                <Icon className="h-5 w-5" style={{ opacity: active ? 1 : 0.92 }} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="my-4 border-t" style={{ borderColor: colors.border }} />

        <div className="space-y-1">
          {secondaryLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.path);
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => onNavigate?.()}
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-[background-color,color,transform] duration-150 hover:-translate-y-[0.5px]"
                style={{
                  color: active ? colors.accent : colors.text,
                  borderRadius: radii.pill,
                  backgroundColor: active
                    ? `color-mix(in srgb, ${colors.accent} 14%, ${colors.surfaceElevated})`
                    : "transparent",
                }}
              >
                <Icon className="h-5 w-5" style={{ opacity: active ? 1 : 0.92 }} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: colors.accent, color: colors.onAccent }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" style={{ color: colors.text }}>
              {fullName}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 text-sm"
          style={{ color: colors.textMuted }}
          onClick={() => {
            onSignOut();
            onNavigate?.();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const fullName = user?.user_metadata?.full_name ?? `${DEMO_USER.firstName} ${DEMO_USER.lastName}`;
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("") || "PS";

  const activeLabel = useMemo(() => {
    const all = [...mainLinks, ...secondaryLinks];
    const match = all.find((l) => isActive(pathname, l.path));
    return match?.name ?? "InvestIQ";
  }, [pathname]);

  return (
    <>
      {/* Mobile topbar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden"
        style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
            style={{ backgroundColor: colors.accent, color: colors.onAccent }}
          >
            IQ
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm" style={{ color: colors.text }}>
              {activeLabel}
            </div>
            <div className="truncate text-xs" style={{ color: colors.textMuted }}>
              InvestIQ
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg border px-3 py-2"
          style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 z-50 flex h-screen w-[78vw] max-w-[320px] flex-col border-r md:hidden"
            style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border }}
          >
            <SidebarNav
              pathname={pathname}
              fullName={fullName}
              initials={initials}
              onNavigate={() => setMobileOpen(false)}
              onSignOut={() => void signOut()}
            />
          </aside>
        </>
      ) : null}

      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r md:flex"
        style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border }}
      >
        <SidebarNav
          pathname={pathname}
          fullName={fullName}
          initials={initials}
          onSignOut={() => void signOut()}
        />
      </aside>
    </>
  );
}
