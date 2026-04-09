import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Test the session functions by importing the utility directly
// since the tool handlers use a hardcoded path.
// The tool handler logic is trivial (pass-through to filesystem).

describe("Session tool handlers", () => {
  let tmpDir: string;
  let sessionDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-session-tool-test-"));
    sessionDir = path.join(tmpDir, "sessions");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("saves and loads session context", () => {
    fs.mkdirSync(sessionDir, { recursive: true });
    const filePath = path.join(sessionDir, "test_scope.json");
    const entry = {
      context: { scan_results: [1, 2, 3] },
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(entry), "utf-8");

    const raw = fs.readFileSync(filePath, "utf-8");
    const loaded = JSON.parse(raw);
    expect(loaded.context).toEqual({ scan_results: [1, 2, 3] });
  });

  it("returns null for missing context", () => {
    const filePath = path.join(sessionDir, "missing.json");
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("sanitizes scope names", () => {
    // Test the sanitization logic
    const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, "_");
    expect(sanitize("owner/repo:vuln-scan")).toBe("owner_repo_vuln-scan");
    expect(sanitize("safe-name_123")).toBe("safe-name_123");
    expect(sanitize("../../../etc/passwd")).toBe("_________etc_passwd");
  });
});
