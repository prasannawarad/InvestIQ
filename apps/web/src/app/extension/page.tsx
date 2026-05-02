import Link from "next/link";
import { colors, typography } from "@investiq/ui/tokens";
import {
  investiqButtonStyle,
  investiqCardStyle,
  investiqFilterChipStyle,
  investiqOutlineCtaStyle,
} from "../../lib/investiqUi";

const demoFlows = ["Apple-style product page", "Rates & macro article", "Gmail inbox (coming soon)"] as const;

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
  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[980px]">
        <Link href="/home" className="text-sm hover:underline" style={{ color: colors.textMuted, fontFamily: typography.sans }}>
          ← Back to Home
        </Link>

        <h1
          className="mt-6 text-6xl tracking-tight"
          style={{ color: colors.text, fontFamily: typography.serif, lineHeight: 1.05 }}
        >
          Chrome Extension
        </h1>
        <p
          className="mt-4 max-w-xl text-lg"
          style={{ color: colors.textMuted, fontFamily: typography.sans, lineHeight: 1.5 }}
        >
          Kuber follows you on the wider web while your full guided experience stays in InvestIQ — no duplicate tutor on this
          page.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {demoFlows.map((label, idx) => (
            <span
              key={label}
              className="select-none px-4 py-2 text-sm"
              style={{ ...investiqFilterChipStyle(idx === 1), fontFamily: typography.sans }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="p-8 md:min-h-[280px]" style={investiqCardStyle()}>
            <h2 className="text-xl font-semibold" style={{ color: colors.text, fontFamily: typography.sans }}>
              Getting started
            </h2>
            <ul
              className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed"
              style={{ color: colors.textMuted, fontFamily: typography.sans }}
            >
              <li>
                Install the unpacked build from this repo (<code style={{ color: colors.text }}>pnpm build:extension</code>
                ).
              </li>
              <li>Reload tabs after updates so the content script attaches.</li>
              <li>Ask relies on InvestIQ APIs — mirror the sidebar Kuber tone, answers just travel with browsing context.</li>
            </ul>
          </section>

          <section className="p-8 md:min-h-[280px]" style={investiqCardStyle()}>
            <h2 className="text-xl font-semibold" style={{ color: colors.text, fontFamily: typography.sans }}>
              What stays in the browser
            </h2>
            <ul
              className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed"
              style={{ color: colors.textMuted, fontFamily: typography.sans }}
            >
              <li>
                Bubble position, mute-per-site, Ask thread snapshot, and Speak toggle (<code style={{ color: colors.text }}>
                  chrome.storage.local
                </code>
                ), keyed roughly by hostname.
              </li>
              <li>ElevenLabs and portfolio truth live server-side inside the InvestIQ web app.</li>
              <li className="italic" style={{ color: `${colors.textMuted}` }}>
                {deployedAppHint()}
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button type="button" style={{ ...investiqButtonStyle("primary", { size: "lg" }) }} disabled>
            Chrome Web Store — soon
          </button>
          <Link href="/settings" prefetch={false} style={{ ...investiqOutlineCtaStyle("lg") }}>
            Voicing & notifications in Settings
          </Link>
          <Link href="/home" prefetch={false} style={{ ...investiqOutlineCtaStyle("lg") }}>
            Continue in InvestIQ →
          </Link>
        </div>
      </div>
    </main>
  );
}
