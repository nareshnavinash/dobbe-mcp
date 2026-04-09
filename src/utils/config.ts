import * as fs from "node:fs/promises";
import * as path from "node:path";
import TOML from "@iarna/toml";
import { CONFIG_PATH } from "./paths.js";
import { atomicWriteFile, ensureDir } from "./fs.js";

/**
 * Read and write ~/.dobbe/config.toml.
 * Backward compatible with the Python dobbe config format.
 */

export interface DobbeConfig {
  general?: {
    default_org?: string;
    default_format?: string;
    default_severity?: string;
  };
  notifications?: {
    slack_channel?: string;
  };
  tools?: {
    gh_path?: string;
    claude_path?: string;
    extra_allowed?: string[];
  };
  timeouts?: {
    scan?: number;
    resolve?: number;
    review?: number;
  };
  repos?: Record<string, { local_path?: string }>;
}

export class ConfigManager {
  private configPath: string;
  private cache: DobbeConfig | null = null;
  private cacheMtime: number = 0;

  constructor(configPath?: string) {
    this.configPath = configPath ?? CONFIG_PATH;
  }

  /**
   * Read the config file. Returns defaults if file doesn't exist.
   * Automatically invalidates cache when file changes on disk.
   */
  async read(): Promise<DobbeConfig> {
    if (this.cache) {
      // Check if file has been modified since we cached it
      const cached = this.cache;
      try {
        const stat = await fs.stat(this.configPath);
        if (stat.mtimeMs === this.cacheMtime) {
          return cached;
        }
        this.cache = null;
      } catch {
        // File may not exist — use cached defaults
        return cached;
      }
    }

    try {
      const stat = await fs.stat(this.configPath);
      this.cacheMtime = stat.mtimeMs;
      const raw = await fs.readFile(this.configPath, "utf-8");
      this.cache = TOML.parse(raw) as unknown as DobbeConfig;
      return this.cache;
    } catch {
      this.cache = this.defaults();
      return this.cache;
    }
  }

  /**
   * Write the config file.
   */
  async write(config: DobbeConfig): Promise<void> {
    const dir = path.dirname(this.configPath);
    await ensureDir(dir);
    await atomicWriteFile(
      this.configPath,
      TOML.stringify(config as unknown as TOML.JsonMap),
    );
    this.cache = config;
    // Update mtime cache after write
    try {
      const stat = await fs.stat(this.configPath);
      this.cacheMtime = stat.mtimeMs;
    } catch {
      // Ignore stat errors
    }
  }

  /**
   * Get a specific config value by dot-separated path.
   * e.g., "general.default_org" → config.general.default_org
   */
  async get(keyPath: string): Promise<unknown> {
    const config = await this.read();
    const parts = keyPath.split(".");
    let current: unknown = config;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  /**
   * Set a specific config value by dot-separated path.
   */
  async set(keyPath: string, value: unknown): Promise<void> {
    const config = await this.read();
    const parts = keyPath.split(".");
    let current: Record<string, unknown> = config as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
    await this.write(config);
  }

  /**
   * Check if the config file exists.
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Invalidate the in-memory cache.
   */
  invalidate(): void {
    this.cache = null;
  }

  /**
   * Default configuration.
   */
  private defaults(): DobbeConfig {
    return {
      general: {
        default_format: "table",
        default_severity: "critical,high,medium,low",
      },
      timeouts: {
        scan: 300,
        resolve: 600,
        review: 300,
      },
    };
  }
}
