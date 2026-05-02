"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mic, X } from "lucide-react";
import { colors, typography } from "@investiq/ui/tokens";
import {
  investiqButtonStyle,
  investiqFilterChipStyle,
  investiqOutlineCtaStyle,
} from "../../lib/investiqUi";

const demoFlows = ["Apple.com Demo", "CNBC Article Demo", "Gmail Demo"] as const;
type DemoTab = (typeof demoFlows)[number];

function deployedAppHint(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!url) {
    return "Point the unpacked extension at the same origin where this app runs (configure the extension build env)."
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)) {
    return "For shipping builds, rebuild the Chrome extension so its app URL targets your deployed InvestIQ domain — not shown here on purpose."
  }
  return `Packaged extensions should target your live app (${url}) via PLASMO_PUBLIC_APP_URL.`
}

export default function ExtensionPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>("Apple.com Demo");

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[1120px]">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm hover:underline"
          style={{ color: colors.textMuted, fontFamily: typography.sans }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1
          className="mt-6 text-6xl tracking-tight"
          style={{ color: colors.text, fontFamily: typography.serif, lineHeight: 1.05 }}
        >
          Chrome Extension
        </h1>
        <p
          className="mt-4 max-w-2xl text-lg"
          style={{ color: colors.textMuted, fontFamily: typography.sans, lineHeight: 1.5 }}
        >
          Kuber follows you across the web to answer money questions in context.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {demoFlows.map((label) => (
            <button
              key={label}
              type="button"
              className="px-4 py-2 text-sm"
              onClick={() => setActiveTab(label)}
              style={{ ...investiqFilterChipStyle(activeTab === label), fontFamily: typography.sans }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "Apple.com Demo" ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border p-0 shadow-sm" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
              <div className="flex items-center gap-2 rounded-t-2xl border-b px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceElevated }}>
                <Dots />
                <span className="rounded px-2 py-0.5 text-xs" style={{ color: colors.textMuted, backgroundColor: colors.cardBg }}>
                  apple.com
                </span>
              </div>
              <div className="relative p-10 text-center">
                <div className="text-6xl">🍎</div>
                <h2 className="mt-4 text-5xl" style={{ color: colors.text, fontFamily: typography.serif }}>
                  Apple
                </h2>
                <p className="mt-2" style={{ color: colors.textMuted }}>Think different.</p>
                <div className="absolute bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full border-4" style={{ borderColor: `${colors.green}66`, backgroundColor: colors.surfaceElevated }}>
                  K
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 p-0 shadow-sm" style={{ borderColor: `${colors.accent}88`, backgroundColor: colors.cardBg }}>
              <div className="flex items-center gap-2 rounded-t-2xl border-b px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceElevated }}>
                <Dots />
                <span className="rounded px-2 py-0.5 text-xs" style={{ color: colors.textMuted, backgroundColor: colors.cardBg }}>
                  apple.com
                </span>
              </div>
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KuberAvatar />
                    <span style={{ color: colors.text }}>Kuber</span>
                  </div>
                  <X className="h-4 w-4" style={{ color: colors.textMuted }} />
                </div>
                <ChatBubble text="Yeah" side="right" />
                <ChatBubble text="Opening it up." side="left" />
                <Link href="/Kuber" style={{ ...investiqButtonStyle("primary", { size: "sm", fullWidth: true }) }} className="mt-3 flex">
                  Open in Kuber app →
                </Link>
                <div className="mt-4 border-t pt-3" style={{ borderColor: colors.border }}>
                  <button type="button" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.accent}1A` }}>
                    <Mic className="h-5 w-5" style={{ color: colors.accent }} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "CNBC Article Demo" ? (
          <div className="mt-8 rounded-2xl border p-0 shadow-sm" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
            <div className="flex items-center gap-2 rounded-t-2xl border-b px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceElevated }}>
              <Dots />
              <span className="rounded px-2 py-0.5 text-xs" style={{ color: colors.textMuted, backgroundColor: colors.cardBg }}>
                cnbc.com/article/fed-rates
              </span>
            </div>
            <div className="relative p-8">
              <div className="max-w-[62%]">
                <p className="text-xs uppercase tracking-wide" style={{ color: colors.coral }}>Breaking News</p>
                <h2 className="mt-3 text-5xl leading-tight" style={{ color: colors.text, fontFamily: typography.serif }}>
                  Fed Signals Rates Will Stay Higher
                </h2>
                <p className="mt-3" style={{ color: colors.textMuted }}>
                  Federal Reserve officials indicated that rates may remain elevated, delaying expected near-term cuts.
                </p>
              </div>
              <div className="absolute bottom-6 right-6 w-[340px] rounded-2xl border-2 p-5" style={{ borderColor: `${colors.accent}88`, backgroundColor: colors.cardBg }}>
                <div className="mb-4 flex items-center gap-2">
                  <KuberAvatar />
                  <span style={{ color: colors.text }}>Kuber</span>
                </div>
                <ChatBubble text="What does this mean for my portfolio?" side="right" />
                <ChatBubble
                  text="Rates staying high may wobble two sensitive holdings, but your long timeline means this is noise more than a signal."
                  side="left"
                />
                <Link href="/current" style={{ ...investiqButtonStyle("primary", { size: "sm", fullWidth: true }) }} className="mt-3 flex">
                  Open affected holdings →
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "Gmail Demo" ? (
          <div className="mt-8 rounded-2xl border p-0 shadow-sm" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
            <div className="flex items-center gap-2 rounded-t-2xl border-b px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceElevated }}>
              <Dots />
              <span className="rounded px-2 py-0.5 text-xs" style={{ color: colors.textMuted, backgroundColor: colors.cardBg }}>
                mail.google.com
              </span>
            </div>
            <div className="relative p-8">
              <div className="rounded-xl border p-4" style={{ borderColor: colors.border }}>
                <p style={{ color: colors.text }}>Sarah Chen</p>
                <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                  Hey! Have you started investing yet? I just opened a Roth IRA and I&apos;m lost.
                </p>
              </div>
              <div className="mt-8 text-center text-sm italic" style={{ color: colors.textMuted }}>
                Kuber is inactive in Gmail — it only activates on financial and news pages.
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a href="/api/extension/download" style={{ ...investiqButtonStyle("primary", { size: "lg" }) }}>
            Download extension bundle
          </a>
          <Link href="/settings" prefetch={false} style={{ ...investiqOutlineCtaStyle("lg") }}>
            Voicing & notifications in Settings
          </Link>
          <Link href="/home" prefetch={false} style={{ ...investiqOutlineCtaStyle("lg") }}>
            Continue in InvestIQ →
          </Link>
        </div>
        <p className="mt-4 text-sm italic" style={{ color: colors.textMuted }}>
          {deployedAppHint()}
        </p>
      </div>
    </main>
  );
}

function Dots() {
  return (
    <div className="mr-1 flex gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `${colors.coral}66` }} />
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `${colors.amber}66` }} />
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `${colors.textMuted}66` }} />
    </div>
  );
}

function KuberAvatar() {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
      style={{ backgroundColor: `${colors.accent}22`, color: colors.accent, border: `1px solid ${colors.accent}44` }}
    >
      K
    </div>
  );
}

function ChatBubble({ text, side }: { text: string; side: "left" | "right" }) {
  const right = side === "right";
  return (
    <div className={`mb-3 flex ${right ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-2 text-sm"
        style={{
          color: colors.text,
          backgroundColor: right ? `${colors.accent}1C` : colors.surfaceElevated,
          border: `1px solid ${right ? `${colors.accent}44` : colors.border}`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
