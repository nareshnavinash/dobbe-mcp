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
    it("stores and retrieves a value", () => {
      cache.set("key1", { data: "hello" });
      expect(cache.get("key1")).toEqual({ data: "hello" });
    });

    it("returns null for missing key", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("stores complex objects", () => {
      const data = {
        groups: [{ name: "lodash", version: "4.17.21" }],
        total: 5,
        nested: { deep: { value: true } },
      };
      cache.set("complex", data);
      expect(cache.get("complex")).toEqual(data);
    });

    it("overwrites existing values", () => {
      cache.set("key1", "first");
      cache.set("key1", "second");
      expect(cache.get("key1")).toBe("second");
    });

    it("stores different keys independently", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      expect(cache.get("a")).toBe(1);
      expect(cache.get("b")).toBe(2);
    });
  });

  describe("TTL", () => {
    it("respects custom TTL", async () => {
      // Set with 1ms TTL
      cache.set("short-lived", "data", 1);

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 10));

      expect(cache.get("short-lived")).toBeNull();
    });

    it("returns value before TTL expires", () => {
      // Set with 1 hour TTL
      cache.set("long-lived", "data", 3600000);
      expect(cache.get("long-lived")).toBe("data");
    });

    it("uses default 4-hour TTL", () => {
      cache.set("default-ttl", "data");
      // Should still be available immediately
      expect(cache.get("default-ttl")).toBe("data");
    });
  });

  describe("delete", () => {
    it("deletes an existing entry", () => {
      cache.set("key1", "data");
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeNull();
    });

    it("returns false for missing entry", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });
  });

  describe("evict", () => {
    it("removes expired entries", () => {
      // Create an expired entry manually
      cache.set("expired", "old-data", 1);

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }

      cache.set("fresh", "new-data");

      const removed = cache.evict();
      expect(removed).toBe(1);
      expect(cache.get("expired")).toBeNull();
      expect(cache.get("fresh")).toBe("new-data");
    });

    it("handles corrupt cache files", () => {
      // Write a corrupt file
      const corruptPath = path.join(tmpDir, "corrupt.json");
      fs.writeFileSync(corruptPath, "not-json{{{", "utf-8");

      const removed = cache.evict();
      expect(removed).toBe(1);
      expect(fs.existsSync(corruptPath)).toBe(false);
    });

    it("returns 0 when nothing to evict", () => {
      cache.set("fresh", "data");
      expect(cache.evict()).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);

      const removed = cache.clear();
      expect(removed).toBe(3);
      expect(cache.get("a")).toBeNull();
      expect(cache.get("b")).toBeNull();
      expect(cache.get("c")).toBeNull();
    });

    it("returns 0 for empty cache", () => {
      expect(cache.clear()).toBe(0);
    });
  });
});
