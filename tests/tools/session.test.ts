import { describe, it, expect, afterAll, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const { tmpDir } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const os = require("node:os");
  return { tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-session-tool-test-")) };
});

vi.mock("../../src/utils/paths.js", () => ({
  DOBBE_DIR: tmpDir,
  STATE_DIR: path.join(tmpDir, "state"),
  CACHE_DIR: path.join(tmpDir, "cache"),
  SESSION_DIR: path.join(tmpDir, "sessions"),
  CONFIG_PATH: path.join(tmpDir, "config.toml"),
}));

import { sessionLoad, sessionSave } from "../../src/tools/session.js";

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Session tool handlers", () => {
  it("sessionSave writes and sessionLoad retrieves context", async () => {
    const scope = "owner/repo:vuln-scan";
    const context = { scan_results: [1, 2, 3], severity: "critical" };

    const saveResult = await sessionSave({ scope, context });
    expect(saveResult.ok).toBe(true);
    expect(saveResult.scope).toBe(scope);

    const loadResult = await sessionLoad({ scope });
    expect(loadResult.found).toBe(true);
    expect(loadResult.context).toEqual(context);
  });

  it("sessionLoad returns found=false for missing scope", async () => {
    const result = await sessionLoad({ scope: "nonexistent/scope" });
    expect(result.found).toBe(false);
    expect(result.context).toBeNull();
  });

  it("sessionLoad expires entries older than 4 hours", async () => {
    const scope = "expired-scope";
    await sessionSave({ scope, context: { old: true } });

    // Manually backdate the entry
    const sessDir = path.join(tmpDir, "sessions");
    const files = fs.readdirSync(sessDir);
    for (const file of files) {
      const filePath = path.join(sessDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const entry = JSON.parse(raw);
      if (entry.scope === scope) {
        entry.updatedAt = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
        fs.writeFileSync(filePath, JSON.stringify(entry));
        break;
      }
    }

    const result = await sessionLoad({ scope });
    expect(result.found).toBe(false);
    expect(result.context).toBeNull();
  });

  it("sessionSave creates the sessions directory if missing", async () => {
    const scope = "new-scope";
    const result = await sessionSave({ scope, context: { test: true } });
    expect(result.ok).toBe(true);
  });

  it("sessionSave overwrites existing context for same scope", async () => {
    const scope = "overwrite-scope";
    await sessionSave({ scope, context: { version: 1 } });
    await sessionSave({ scope, context: { version: 2 } });

    const result = await sessionLoad({ scope });
    expect(result.found).toBe(true);
    expect(result.context).toEqual({ version: 2 });
  });
});
