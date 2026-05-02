#!/usr/bin/env bash
# Bootstrap apps/web as a clean Next.js 16 + Tailwind + TypeScript project.
# Run from repo root: pnpm setup:web
#
# Person 1: after this runs, paste in the Figma Make export and adapt
# imports to use the workspace packages (@investiq/ui, @investiq/data, etc.)

set -e

WEB_DIR="apps/web"

if [ -f "$WEB_DIR/package.json" ]; then
  echo "apps/web already initialized. Skipping."
  echo "If you want to re-init, delete apps/web and run again."
  exit 0
fi

echo "Creating Next.js 16 app in $WEB_DIR ..."
pnpm dlx create-next-app@latest "$WEB_DIR" \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias \
  --use-pnpm

# Patch package.json name so it slots into the workspace
node -e "
  const fs = require('fs');
  const path = '$WEB_DIR/package.json';
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.name = '@investiq/web';
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['@investiq/ui'] = 'workspace:*';
  pkg.dependencies['@investiq/data'] = 'workspace:*';
  pkg.dependencies['@investiq/engine'] = 'workspace:*';
  pkg.dependencies['@investiq/kuber'] = 'workspace:*';
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
"

echo ""
echo "Done. apps/web is ready."
echo ""
echo "Next steps for Person 1:"
echo "  1. cd to repo root and run: pnpm install"
echo "  2. Add Clerk: cd apps/web && pnpm add @clerk/nextjs"
echo "  3. Add chart lib: pnpm add recharts"
echo "  4. Add shadcn primitives you need: pnpm dlx shadcn@latest add button card"
echo "  5. Paste Figma Make code into apps/web/src/app/* and adapt imports"
echo "  6. Copy /investiq/.env.example to apps/web/.env.local, fill in keys"
echo "  7. pnpm dev"
