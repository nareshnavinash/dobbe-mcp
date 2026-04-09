import { CacheManager } from "../utils/cache.js";

/**
 * Cache tool handlers for MCP.
 */

const cacheManager = new CacheManager();

export function cacheGet(args: { key: string }): { hit: boolean; data: unknown } {
  const data = cacheManager.get(args.key);
  return { hit: data !== null, data };
}

export function cacheSet(args: {
  key: string;
  data: unknown;
  ttl_hours?: number;
}): { ok: boolean; key: string } {
  const ttlMs = (args.ttl_hours ?? 4) * 60 * 60 * 1000;
  cacheManager.set(args.key, args.data, ttlMs);
  return { ok: true, key: args.key };
}

/**
 * Exported for testing: create with custom path.
 */
export function _createCacheManager(path: string): CacheManager {
  return new CacheManager(path);
}
