"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { colors, radii, typography } from "@investiq/ui/tokens";

const glossary = [
  { term: "P/E Ratio", def: "How much investors pay for each dollar of company earnings." },
  { term: "Dividend Yield", def: "Annual dividend as a percentage of current price." },
  { term: "Expense Ratio", def: "The fund management fee charged each year." },
  { term: "Beta", def: "How much a holding moves compared with the market." },
  { term: "Market Cap", def: "Total market value of a company&apos;s shares." },
];

const faqs = [
  { q: "How often should I rebalance?", a: "Usually once or twice a year, or when drift exceeds 5%." },
  { q: "What if markets crash?", a: "Volatility is normal. Scenario mode helps you evaluate actions before you trade." },
  { q: "Can I change my risk profile?", a: "Yes, update it in Settings and re-check suggested allocation." },
];

export default function HelpPage() {
  const [gOpen, setGOpen] = useState<number | null>(null);
  const [fOpen, setFOpen] = useState<number | null>(null);

  return (
    <main className="ml-60 px-8 py-12">
      <div className="mx-auto max-w-[800px]">
        <h1 className="mb-8 text-4xl" style={{ color: colors.text, fontFamily: typography.serif }}>
          Help Center
        </h1>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl" style={{ color: colors.text }}>Quick glossary</h2>
          <div className="space-y-3">
            {glossary.map((item, idx) => (
              <article key={item.term} style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
                <button
                  type="button"
                  onClick={() => setGOpen(gOpen === idx ? null : idx)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span style={{ color: colors.text }}>{item.term}</span>
                  <ChevronDown className={`h-5 w-5 ${gOpen === idx ? "rotate-180" : ""}`} style={{ color: colors.accent }} />
                </button>
                {gOpen === idx ? <div className="px-6 pb-4 text-sm" style={{ color: colors.textMuted }}>{item.def}</div> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl" style={{ color: colors.text }}>Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <article key={item.q} style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
                <button
                  type="button"
                  onClick={() => setFOpen(fOpen === idx ? null : idx)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span style={{ color: colors.text }}>{item.q}</span>
                  <ChevronDown className={`h-5 w-5 ${fOpen === idx ? "rotate-180" : ""}`} style={{ color: colors.accent }} />
                </button>
                {fOpen === idx ? <div className="px-6 pb-4 text-sm" style={{ color: colors.textMuted }}>{item.a}</div> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="p-8" style={{ borderRadius: radii.lg, border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg }}>
          <h2 className="mb-4 text-2xl" style={{ color: colors.text }}>Contact us</h2>
          <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>Need help with the demo flow? Reach out to support.</p>
          <button type="button" className="px-6 py-3 text-sm" style={{ borderRadius: radii.md, backgroundColor: colors.accent, color: colors.cardBg }}>
            Get in touch
          </button>
        </section>
      </div>
    </main>
  );
}
