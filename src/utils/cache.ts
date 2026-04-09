import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

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

const DOBBE_DIR = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".dobbe",
);
const CACHE_DIR = path.join(DOBBE_DIR, "cache");

const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir ?? CACHE_DIR;
  }

  /**
   * Ensure the cache directory exists.
   */
  private ensureDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a deterministic file path for a cache key.
   */
  private keyToPath(key: string): string {
    const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * Get a cached value. Returns null if not found or expired.
   */
  get(key: string): unknown | null {
    const filePath = this.keyToPath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const entry = JSON.parse(raw) as CacheEntry;

    // Check TTL
    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > entry.ttlMs) {
      // Expired — delete and return null
      fs.unlinkSync(filePath);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a cached value with optional TTL.
   */
  set(key: string, data: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
    this.ensureDir();
    const filePath = this.keyToPath(key);
    const entry: CacheEntry = {
      data,
      createdAt: new Date().toISOString(),
      ttlMs,
      key,
    };
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), "utf-8");
  }

  /**
   * Delete a specific cache entry.
   */
  delete(key: string): boolean {
    const filePath = this.keyToPath(key);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * Clear all expired entries.
   */
  evict(): number {
    this.ensureDir();
    let removed = 0;
    const files = fs.readdirSync(this.cacheDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const entry = JSON.parse(raw) as CacheEntry;
        const age = Date.now() - new Date(entry.createdAt).getTime();
        if (age > entry.ttlMs) {
          fs.unlinkSync(filePath);
          removed++;
        }
      } catch {
        // Corrupt file — remove it
        fs.unlinkSync(filePath);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clear the entire cache.
   */
  clear(): number {
    this.ensureDir();
    const files = fs.readdirSync(this.cacheDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      fs.unlinkSync(path.join(this.cacheDir, file));
    }
    return files.length;
  }
}
