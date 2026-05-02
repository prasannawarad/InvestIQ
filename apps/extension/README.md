# apps/extension

This folder is intentionally empty in the boilerplate.

To bootstrap, run from the repo root:

```bash
pnpm setup:extension
```

This creates a fresh Plasmo Chrome extension here.

## What the extension does

When the user is browsing any web page (apple.com, CNBC, etc.) and clicks the InvestIQ extension icon in the Chrome toolbar, an overlay slides in from the right side of the page with the Kuber chat. The overlay reads the page's content (article title, main text) and passes it to Kuber as context, so Kuber can give responses tied to what the user is reading.

## Demo flow (Day 1 of the Priya narrative)

1. Priya is on a CNBC article about RBI rates
2. Clicks the InvestIQ extension icon
3. Kuber overlay appears, voice-greets her, ties the article to her bond fund
4. She closes the overlay

## Implementation notes

- Use Plasmo's content script feature to inject the overlay DOM
- The overlay is a React component using `@investiq/ui` tokens
- Audio playback uses the browser's standard Audio API with a stream from the Kuber API
- For the demo, hardcode the response if Groq is being slow — judges won't know

Owner: Person 4.

For the current demo-run checklist, see `DEMO_CHECKLIST.md`.

## Phase 1 test path

Chrome cannot load `apps/extension` directly because Plasmo generates the
Manifest V3 files into `build/`.

From the repo root:

```bash
pnpm --filter @investiq/extension build
```

Then in `chrome://extensions`:

1. Turn on Developer mode.
2. Click "Load unpacked".
3. Select `apps/extension/build/chrome-mv3-prod`.
4. Open a normal webpage, not `chrome://extensions`.
5. Reload that webpage once if it was open before the extension was loaded.
6. Click the InvestIQ toolbar icon.

Expected result: the Kuber overlay opens on the right side of the page. Pages
mentioning RBI or rates show the hardcoded Day 1 demo message.

Click "Yes, explain" to advance the scripted Day 1 flow. Kuber adds Priya's
affirmation and a second explanation, then "Close" exits the overlay.

Important:

- The overlay will not open on Chrome internal pages like `chrome://extensions`.
- The "service worker (Inactive)" label is normal. Chrome wakes it when needed.
- This phase uses an injected overlay, not a browser-action popup. Clicking the
  toolbar icon should open the right-side overlay directly.
- Current Day 1 responses are scripted for reliability. The extension reads the
  page title/text to choose the RBI/rates path, but it does not call Groq yet.

## Phase 3 app connection

The overlay uses `PLASMO_PUBLIC_APP_URL` to find the InvestIQ web app. If it is
not set, it defaults to:

```text
http://localhost:3000
```

Create `apps/extension/.env.local` when the web app URL is known:

```bash
PLASMO_PUBLIC_APP_URL=http://localhost:3000
```

`apps/extension/.env.example` contains the same default.

The "Ask about this page" box POSTs to:

```text
${PLASMO_PUBLIC_APP_URL}/api/kuber/chat
```

Until Person 2's `/api/kuber/chat` route exists and the web app is running, the
extension shows a graceful fallback message. The scripted Day 1 RBI flow does
not depend on this API.

## Stable local demo page

If live CNBC pages are noisy or blocked, use:

```text
apps/extension/demo/rbi-rates-demo.html
```

Open it in Chrome. If the overlay does not appear on the `file://` page, go to
the InvestIQ extension details in `chrome://extensions` and turn on "Allow
access to file URLs", then reload the file page and click the toolbar icon.

For active development, run:

```bash
pnpm --filter @investiq/extension dev
```

Then load `apps/extension/build/chrome-mv3-dev` instead.
