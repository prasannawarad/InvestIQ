# InvestIQ Chrome extension (Kuber)

Plasmo + React content script + browser-action popup. Kuber renders as a **persistent teal bubble** (shadow DOM); opening it shows the contextual chat panel.

## Dev setup

From the repo root:

```bash
pnpm install
pnpm --filter @investiq/extension dev
```

Load **unpacked** `apps/extension/build/chrome-mv3-dev` at `chrome://extensions` (Developer mode → Load unpacked).

Copy `apps/extension/.env.example` to `apps/extension/.env.local` if you need a non-default app URL (`PLASMO_PUBLIC_APP_URL`).

Live answers:

1. Start the Next app: `pnpm --filter @investiq/web dev` (or workspace `pnpm dev` and include web).
2. Add `GROQ_API_KEY` (and optionally `GROQ_MODEL`) in `apps/web/.env`.

The overlay POSTs JSON to `[PLASMO_PUBLIC_APP_URL]/api/kuber/chat` from the injected script (needs `apps/web` running with that route).

## Behaviour

- **Bubble**: draggable bottom-right (“K”). **Unread dot** when the page context fingerprint changes while the panel is collapsed.
- **SPA**: listens for DOM changes + `history` navigation and refreshes context for greetings and `/api/kuber/chat` payloads.
- **Popup**: Toggle panel, hide bubble for this hostname, show bubble again, toggle **Speak** (`chrome.storage`), links to app. Uses `investiq:ping` so it can warn if injection is missing.
- **Restricted pages**: Chrome internal URLs and the Web Store have no overlay (expected).

## Production build test

```bash
pnpm --filter @investiq/extension build
```

Load `apps/extension/build/chrome-mv3-prod`.

After installing or upgrading, **reload normal tabs** once so the content script attaches.

Day-1 scripted **rates/RBI** demo copy still routes via page classification (`lib/classify.ts`) inside the panel as before.
