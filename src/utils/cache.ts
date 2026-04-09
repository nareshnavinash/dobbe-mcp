import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { CACHE_DIR } from "./paths.js";
import { logger } from "./logger.js";
import { atomicWriteFile, ensureDir } from "./fs.js";

/**
 * File-based cache with TTL support.
 * Stores results in ~/.dobbe/cache/ to avoid duplicate Claude calls.
 */

interface CacheEntry {
  data: unknown;
  createdAt: string;
  ttlMs: number;
  key: string;
}

const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir ?? CACHE_DIR;
  }

  /**
   * Ensure the cache directory exists.
   */
  private async ensureCacheDir(): Promise<void> {
    await ensureDir(this.cacheDir);
  }

  /**
   * Generate a deterministic file path for a cache key.
   */
  private keyToPath(key: string): string {
    const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 32);
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * Get a cached value. Returns null if not found or expired.
   */
  async get(key: string): Promise<unknown | null> {
    const filePath = this.keyToPath(key);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const entry = JSON.parse(raw) as CacheEntry;

      // Check TTL
      const age = Date.now() - new Date(entry.createdAt).getTime();
      if (age > entry.ttlMs) {
        // Expired -- delete and return null
        await fs.unlink(filePath);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Set a cached value with optional TTL.
   */
  async set(key: string, data: unknown, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    await this.ensureCacheDir();
    const filePath = this.keyToPath(key);
    const entry: CacheEntry = {
      data,
      createdAt: new Date().toISOString(),
      ttlMs,
      key,
    };
    await atomicWriteFile(filePath, JSON.stringify(entry, null, 2));
  }

  /**
   * Delete a specific cache entry.
   */
  async delete(key: string): Promise<boolean> {
    const filePath = this.keyToPath(key);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all expired entries.
   */
  async evict(): Promise<number> {
    await this.ensureCacheDir();
    let removed = 0;
    const files = (await fs.readdir(this.cacheDir)).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const entry = JSON.parse(raw) as CacheEntry;
        const age = Date.now() - new Date(entry.createdAt).getTime();
        if (age > entry.ttlMs) {
          await fs.unlink(filePath);
          removed++;
        }
      } catch (e) {
        // Corrupt file -- remove it
        logger.warn("Removing corrupt cache file", { file, error: (e as Error).message });
        await fs.unlink(filePath).catch(() => {});
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clear the entire cache.
   */
  async clear(): Promise<number> {
    await this.ensureCacheDir();
    const files = (await fs.readdir(this.cacheDir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      await fs.unlink(path.join(this.cacheDir, file));
    }
    return files.length;
  }
}
