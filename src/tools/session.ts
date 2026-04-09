import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Session context tool handlers.
 * Manages cross-command context (e.g., scan results available to resolve).
 */

const DOBBE_DIR = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".dobbe",
);
const SESSION_DIR = path.join(DOBBE_DIR, "sessions");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function sessionLoad(args: {
  scope: string;
}): { found: boolean; context: unknown } {
  const filePath = path.join(SESSION_DIR, `${sanitize(args.scope)}.json`);
  if (!fs.existsSync(filePath)) {
    return { found: false, context: null };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const entry = JSON.parse(raw) as { context: unknown; updatedAt: string };

  // Check TTL (4 hours)
  const age = Date.now() - new Date(entry.updatedAt).getTime();
  if (age > 4 * 60 * 60 * 1000) {
    fs.unlinkSync(filePath);
    return { found: false, context: null };
  }

  return { found: true, context: entry.context };
}

export function sessionSave(args: {
  scope: string;
  context: unknown;
}): { ok: boolean; scope: string } {
  ensureDir(SESSION_DIR);
  const filePath = path.join(SESSION_DIR, `${sanitize(args.scope)}.json`);
  const entry = {
    context: args.context,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), "utf-8");
  return { ok: true, scope: args.scope };
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Exported for testing.
 */
export const _SESSION_DIR = SESSION_DIR;
