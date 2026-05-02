import { promises as fs } from "node:fs";
import path from "node:path";

function firstExisting(candidates: string[]): Promise<string | null> {
  return (async () => {
    for (const p of candidates) {
      try {
        const st = await fs.stat(p);
        if (st.isFile()) return p;
      } catch {
        // continue
      }
    }
    return null;
  })();
}

export async function GET() {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "../extension/build/chrome-mv3-prod.zip"),
    path.resolve(cwd, "../extension/build/chrome-mv3-dev.zip"),
    path.resolve(cwd, "../../apps/extension/build/chrome-mv3-prod.zip"),
    path.resolve(cwd, "../../apps/extension/build/chrome-mv3-dev.zip"),
  ];

  const filePath = await firstExisting(candidates);
  if (!filePath) {
    return Response.json(
      {
        message:
          "No extension zip found. Run `pnpm build:extension` first, then retry download.",
      },
      { status: 404 },
    );
  }

  const buf = await fs.readFile(filePath);
  const filename = path.basename(filePath);

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

