#!/usr/bin/env bash
# Bootstrap apps/extension as a Plasmo Chrome extension.
# Run from repo root: pnpm setup:extension

set -e

EXT_DIR="apps/extension"

if [ -f "$EXT_DIR/package.json" ]; then
  echo "apps/extension already initialized. Skipping."
  exit 0
fi

echo "Creating Plasmo extension in $EXT_DIR ..."
pnpm create plasmo "$EXT_DIR" --no-install

# Patch package.json
node -e "
  const fs = require('fs');
  const path = '$EXT_DIR/package.json';
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.name = '@investiq/extension';
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['@investiq/ui'] = 'workspace:*';
  pkg.dependencies['@investiq/data'] = 'workspace:*';
  pkg.dependencies['@investiq/kuber'] = 'workspace:*';
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
"

echo ""
echo "Done. apps/extension is ready."
echo ""
echo "Next steps for Person 4:"
echo "  1. cd to repo root and run: pnpm install"
echo "  2. cd apps/extension && pnpm dev"
echo "  3. Load unpacked at chrome://extensions from apps/extension/build/chrome-mv3-dev"
echo "  4. Build the Kuber overlay content script"
echo "  5. Wire it to the Kuber API at NEXT_PUBLIC_APP_URL/api/kuber"
