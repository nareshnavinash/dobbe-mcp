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
  return { tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-cache-tool-test-")) };
});

vi.mock("../../src/utils/paths.js", () => ({
  DOBBE_DIR: tmpDir,
  STATE_DIR: path.join(tmpDir, "state"),
  CACHE_DIR: path.join(tmpDir, "cache"),
  SESSION_DIR: path.join(tmpDir, "sessions"),
  CONFIG_PATH: path.join(tmpDir, "config.toml"),
}));

import { cacheGet, cacheSet, _createCacheManager } from "../../src/tools/cache.js";

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Cache tool handlers", () => {
  it("creates a cache manager with custom path", () => {
    const manager = _createCacheManager(path.join(tmpDir, "custom-cache"));
    expect(manager).toBeDefined();
  });

  it("cacheSet stores data and cacheGet retrieves it", async () => {
    const setResult = await cacheSet({ key: "test-key", data: { value: 42 } });
    expect(setResult.ok).toBe(true);
    expect(setResult.key).toBe("test-key");

    const getResult = await cacheGet({ key: "test-key" });
    expect(getResult.hit).toBe(true);
    expect(getResult.data).toEqual({ value: 42 });
  });

  it("cacheGet returns hit=false for missing keys", async () => {
    const result = await cacheGet({ key: "nonexistent-key" });
    expect(result.hit).toBe(false);
    expect(result.data).toBeNull();
  });

  it("cacheSet respects custom ttl_hours parameter", async () => {
    const result = await cacheSet({
      key: "ttl-key",
      data: "short-lived",
      ttl_hours: 1,
    });
    expect(result.ok).toBe(true);

    const loaded = await cacheGet({ key: "ttl-key" });
    expect(loaded.hit).toBe(true);
    expect(loaded.data).toBe("short-lived");
  });

  it("cacheSet uses default 4-hour TTL when not specified", async () => {
    const result = await cacheSet({ key: "default-ttl", data: "test" });
    expect(result.ok).toBe(true);

    const loaded = await cacheGet({ key: "default-ttl" });
    expect(loaded.hit).toBe(true);
  });
});
