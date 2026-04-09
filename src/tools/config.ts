import { ConfigManager } from "../utils/config.js";

/**
 * Config tool handlers for MCP.
 */

const configManager = new ConfigManager();

export function configRead(): { config: Record<string, unknown>; exists: boolean } {
  return {
    config: configManager.read() as unknown as Record<string, unknown>,
    exists: configManager.exists(),
  };
}

export function configWrite(args: {
  key: string;
  value: unknown;
}): { ok: boolean; key: string } {
  configManager.set(args.key, args.value);
  return { ok: true, key: args.key };
}

/**
 * Exported for testing: create with custom path.
 */
export function _createConfigManager(path: string): ConfigManager {
  return new ConfigManager(path);
}
