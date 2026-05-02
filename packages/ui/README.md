# @investiq/ui

Shared design tokens and components used by both `apps/web` and `apps/extension`.

## What goes here

- **Design tokens** — colors, typography, spacing in `src/tokens.ts`. Both web and extension import from here so palettes stay synced.
- **Shared components** — components used in BOTH surfaces. The Kuber chat bubble, for example, since both /Kuber on the web and the extension overlay use it.
- **NOT shared components** — page-level layouts, the home dashboard, the holdings grid. Those live in `apps/web/src/app/*` because the extension doesn't need them.

## Tokens

The design language is locked. Don't add colors without team consensus.

```ts
// Default palette (home, current, kuber, etc.)
background: '#FAF8F5'  // warm off-white
text:       '#1A2438'  // deep navy
accent:     '#3D7A6F'  // muted teal — primary CTAs, Kuber
coral:      '#E8836B'  // warm coral — "I'm freaking out" button only
green:      '#7BA888'  // soft green — healthy / positive states
amber:      '#D4A574'  // soft amber — caution states
muted:      '#6B7B8C'  // muted blue-gray — secondary text

// /panic palette override
background_panic: '#F5F2EC'  // cooler cream
// All other tokens unchanged on /panic
```

## Adding a shared component

If a component is used by BOTH web and extension, it goes here. If only web, it lives in `apps/web/src/components`. When in doubt, start in `apps/web` and move it here only when the extension actually needs it.
