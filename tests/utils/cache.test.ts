import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { CacheManager } from "../../src/utils/cache.js";

describe("CacheManager", () => {
  let tmpDir: string;
  let cache: CacheManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-cache-test-"));
    cache = new CacheManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("get and set", () => {
    it("stores and retrieves a value", async () => {
      await cache.set("key1", { data: "hello" });
      expect(await cache.get("key1")).toEqual({ data: "hello" });
    });

    it("returns null for missing key", async () => {
      expect(await cache.get("nonexistent")).toBeNull();
    });

    it("stores complex objects", async () => {
      const data = {
        groups: [{ name: "lodash", version: "4.17.21" }],
        total: 5,
        nested: { deep: { value: true } },
      };
      await cache.set("complex", data);
      expect(await cache.get("complex")).toEqual(data);
    });

    it("overwrites existing values", async () => {
      await cache.set("key1", "first");
      await cache.set("key1", "second");
      expect(await cache.get("key1")).toBe("second");
    });

    it("stores different keys independently", async () => {
      await cache.set("a", 1);
      await cache.set("b", 2);
      expect(await cache.get("a")).toBe(1);
      expect(await cache.get("b")).toBe(2);
    });
  });

  describe("TTL", () => {
    it("respects custom TTL", async () => {
      // Set with 1ms TTL
      await cache.set("short-lived", "data", 1);

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 10));

      expect(await cache.get("short-lived")).toBeNull();
    });

    it("returns value before TTL expires", async () => {
      // Set with 1 hour TTL
      await cache.set("long-lived", "data", 3600000);
      expect(await cache.get("long-lived")).toBe("data");
    });

    it("uses default 4-hour TTL", async () => {
      await cache.set("default-ttl", "data");
      // Should still be available immediately
      expect(await cache.get("default-ttl")).toBe("data");
    });
  });

  describe("delete", () => {
    it("deletes an existing entry", async () => {
      await cache.set("key1", "data");
      expect(await cache.delete("key1")).toBe(true);
      expect(await cache.get("key1")).toBeNull();
    });

    it("returns false for missing entry", async () => {
      expect(await cache.delete("nonexistent")).toBe(false);
    });
  });

  describe("evict", () => {
    it("removes expired entries", async () => {
      // Create an expired entry manually
      await cache.set("expired", "old-data", 1);

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 10));

      await cache.set("fresh", "new-data");

      const removed = await cache.evict();
      expect(removed).toBe(1);
      expect(await cache.get("expired")).toBeNull();
      expect(await cache.get("fresh")).toBe("new-data");
    });

    it("handles corrupt cache files", async () => {
      // Write a corrupt file
      const corruptPath = path.join(tmpDir, "corrupt.json");
      fs.writeFileSync(corruptPath, "not-json{{{", "utf-8");

      const removed = await cache.evict();
      expect(removed).toBe(1);
      expect(fs.existsSync(corruptPath)).toBe(false);
    });

    it("returns 0 when nothing to evict", async () => {
      await cache.set("fresh", "data");
      expect(await cache.evict()).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes all entries", async () => {
      await cache.set("a", 1);
      await cache.set("b", 2);
      await cache.set("c", 3);

      const removed = await cache.clear();
      expect(removed).toBe(3);
      expect(await cache.get("a")).toBeNull();
      expect(await cache.get("b")).toBeNull();
      expect(await cache.get("c")).toBeNull();
    });

    it("returns 0 for empty cache", async () => {
      expect(await cache.clear()).toBe(0);
    });
  });
});
