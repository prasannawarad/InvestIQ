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
