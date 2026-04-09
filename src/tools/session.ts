import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { SESSION_DIR } from "../utils/paths.js";
import { atomicWriteFile, ensureDir } from "../utils/fs.js";

/**
 * Session context tool handlers.
 * Manages cross-command context (e.g., scan results available to resolve).
 */

/**
 * Generate a deterministic filename for a scope.
 * Uses SHA256 hash to avoid collisions from different scopes.
 */
function scopeToFilename(scope: string): string {
  const hash = crypto.createHash("sha256").update(scope).digest("hex").slice(0, 32);
  return `${hash}.json`;
}

export async function sessionLoad(args: {
  scope: string;
}): Promise<{ found: boolean; context: unknown }> {
  const filePath = path.join(SESSION_DIR, scopeToFilename(args.scope));
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const entry = JSON.parse(raw) as { context: unknown; updatedAt: string; scope: string };

    // Check TTL (4 hours)
    const age = Date.now() - new Date(entry.updatedAt).getTime();
    if (age > 4 * 60 * 60 * 1000) {
      await fs.unlink(filePath);
      return { found: false, context: null };
    }

    return { found: true, context: entry.context };
  } catch {
    return { found: false, context: null };
  }
}

export async function sessionSave(args: {
  scope: string;
  context: unknown;
}): Promise<{ ok: boolean; scope: string }> {
  await ensureDir(SESSION_DIR);
  const filePath = path.join(SESSION_DIR, scopeToFilename(args.scope));
  const entry = {
    scope: args.scope,
    context: args.context,
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteFile(filePath, JSON.stringify(entry, null, 2));
  return { ok: true, scope: args.scope };
}

/**
 * Exported for testing.
 */
export const _SESSION_DIR = SESSION_DIR;
