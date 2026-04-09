import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { _createCacheManager } from "../../src/tools/cache.js";

describe("Cache tool handlers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-cache-tool-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a cache manager with custom path", () => {
    const manager = _createCacheManager(tmpDir);
    expect(manager).toBeDefined();
  });

  it("stores and retrieves through custom manager", () => {
    const manager = _createCacheManager(tmpDir);
    manager.set("test-key", { data: 42 });
    expect(manager.get("test-key")).toEqual({ data: 42 });
  });

  it("returns null for missing key", () => {
    const manager = _createCacheManager(tmpDir);
    expect(manager.get("missing")).toBeNull();
  });
});
