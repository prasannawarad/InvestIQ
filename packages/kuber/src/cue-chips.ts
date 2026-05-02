/** Shared cue copy for Floating Kuber (web) + extension panel — keeps “Ask” chips in sync with the homepage patterns. */

export type KuberCueGroup = Readonly<{ label: string; chips: readonly string[] }>;

export const KUBER_CUE_GROUPS: readonly KuberCueGroup[] = [
  {
    label: "SCENARIOS",
    chips: [
      "What if markets drop 20%?",
      "What if I need $5,000 soon?",
      "What if inflation stays high?",
    ],
  },
  {
    label: "QUICK QUESTIONS",
    chips: ["Am I at risk?", "What should I know today?", "Why did my portfolio drop?", "Should I worry about the news?"],
  },
  {
    label: "JARGON",
    chips: ["Explain P/E ratio", "What's an expense ratio?"],
  },
] as const;

/** Extra chips that make sense when Kuber reads an arbitrary webpage. */
export const KUBER_EXTENSION_PAGE_CUES = {
  label: "THIS PAGE",
  chips: [
    "What's the takeaway for my money?",
    "Any red flags in this story?",
    "Explain the headline like I'm new to investing",
  ],
} as const satisfies KuberCueGroup;
