# apps/web

This folder is intentionally empty in the boilerplate.

To bootstrap, run from the repo root:

```bash
pnpm setup:web
```

This creates a fresh Next.js 16 project here, wires it into the workspace, and adds workspace dependencies on `@investiq/ui`, `@investiq/data`, `@investiq/engine`, `@investiq/kuber`.

After bootstrap, **Person 1** pastes the Figma Make exported code into `src/app/*` and replaces inline tokens with imports from `@investiq/ui/tokens`.

Owner: Person 1.
