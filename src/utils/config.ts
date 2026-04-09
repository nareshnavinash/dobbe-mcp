import * as fs from "node:fs";
import * as path from "node:path";
import TOML from "@iarna/toml";

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

const DOBBE_DIR = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".dobbe",
);
const CONFIG_PATH = path.join(DOBBE_DIR, "config.toml");

export class ConfigManager {
  private configPath: string;
  private cache: DobbeConfig | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath ?? CONFIG_PATH;
  }

  /**
   * Read the config file. Returns defaults if file doesn't exist.
   */
  read(): DobbeConfig {
    if (this.cache) return this.cache;

    if (!fs.existsSync(this.configPath)) {
      this.cache = this.defaults();
      return this.cache;
    }

    const raw = fs.readFileSync(this.configPath, "utf-8");
    this.cache = TOML.parse(raw) as unknown as DobbeConfig;
    return this.cache;
  }

  /**
   * Write the config file.
   */
  write(config: DobbeConfig): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // TOML.stringify expects JsonMap which is compatible with our config
    fs.writeFileSync(
      this.configPath,
      TOML.stringify(config as unknown as TOML.JsonMap),
      "utf-8",
    );
    this.cache = config;
  }

  /**
   * Get a specific config value by dot-separated path.
   * e.g., "general.default_org" → config.general.default_org
   */
  get(keyPath: string): unknown {
    const config = this.read();
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
  set(keyPath: string, value: unknown): void {
    const config = this.read();
    const parts = keyPath.split(".");
    let current: Record<string, unknown> = config as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
    this.write(config);
  }

  /**
   * Check if the config file exists.
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
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
