import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";

/**
 * Atomic file write: writes to a temp file then renames.
 * Prevents corruption if the process crashes mid-write.
 */
export async function atomicWriteFile(
  filePath: string,
  data: string,
  options?: { mode?: number },
): Promise<void> {
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${crypto.randomBytes(4).toString("hex")}.tmp`);

  await fs.writeFile(tmpPath, data, { encoding: "utf-8", mode: options?.mode ?? 0o600 });
  await fs.rename(tmpPath, filePath);
}

/**
 * Ensure a directory exists with restricted permissions.
 */
export async function ensureDir(dir: string, mode: number = 0o700): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode });
}
