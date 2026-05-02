import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

function firstExistingDir(candidates: string[]): Promise<string | null> {
  return (async () => {
    for (const p of candidates) {
      try {
        const st = await fs.stat(p);
        if (st.isDirectory()) return p;
      } catch {
        // continue
      }
    }
    return null;
  })();
}

export async function GET() {
  const cwd = process.cwd();
  const fileCandidates = [
    path.resolve(cwd, "../extension/build/chrome-mv3-prod.zip"),
    path.resolve(cwd, "../extension/build/chrome-mv3-dev.zip"),
    path.resolve(cwd, "../../apps/extension/build/chrome-mv3-prod.zip"),
    path.resolve(cwd, "../../apps/extension/build/chrome-mv3-dev.zip"),
  ];

  let filePath = await firstExisting(fileCandidates);
  let isTempZip = false;

  if (!filePath) {
    const dirCandidates = [
      path.resolve(cwd, "../extension/build/chrome-mv3-prod"),
      path.resolve(cwd, "../extension/build/chrome-mv3-dev"),
      path.resolve(cwd, "../../apps/extension/build/chrome-mv3-prod"),
      path.resolve(cwd, "../../apps/extension/build/chrome-mv3-dev"),
    ];

    const buildDir = await firstExistingDir(dirCandidates);
    if (buildDir) {
      const zipName = `${path.basename(buildDir)}.zip`;
      const tempZip = path.join(os.tmpdir(), `investiq-${Date.now()}-${zipName}`);
      try {
        await execFileAsync("zip", ["-r", "-q", tempZip, "."], { cwd: buildDir });
        filePath = tempZip;
        isTempZip = true;
      } catch {
        return Response.json(
          {
            message:
              "Build folder exists but automatic zip failed. Please zip apps/extension/build/chrome-mv3-prod manually.",
          },
          { status: 500 },
        );
      }
    }
  }

  if (!filePath) {
    return Response.json(
      {
        message:
          "No extension build found. Run `pnpm build:extension` first, then retry download.",
      },
      { status: 404 },
    );
  }

  const buf = await fs.readFile(filePath);
  const filename = path.basename(filePath);

  if (isTempZip) {
    void fs.unlink(filePath).catch(() => {
      // best-effort cleanup
    });
  }

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

