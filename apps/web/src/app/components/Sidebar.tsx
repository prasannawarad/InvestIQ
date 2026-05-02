"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  HelpCircle,
  Home,
  LogOut,
  MessageCircle,
  PuzzleIcon,
  Scale,
  Settings,
  User,
} from "lucide-react";
import { colors, radii, typography } from "@investiq/ui/tokens";
import { useAuth } from "./auth/AuthProvider";

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

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const fullName = user?.user_metadata?.full_name ?? "Priya Sharma";
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("") || "PS";

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r"
      style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}
    >
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ backgroundColor: colors.accent, color: colors.cardBg }}
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
                className="relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{
                  color: active ? colors.accent : colors.text,
                  borderRadius: radii.sm,
                  backgroundColor: active ? `${colors.accent}14` : "transparent",
                }}
              >
                {active ? (
                  <div
                    className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r"
                    style={{ backgroundColor: colors.accent }}
                  />
                ) : null}
                <Icon className="h-5 w-5" />
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
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{
                  color: active ? colors.accent : colors.text,
                  borderRadius: radii.sm,
                  backgroundColor: active ? `${colors.accent}14` : "transparent",
                }}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.accent, color: colors.cardBg }}
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
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
