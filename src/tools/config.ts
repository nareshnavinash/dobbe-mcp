import { ConfigManager } from "../utils/config.js";

/**
 * Config tool handlers for MCP.
 */

const configManager = new ConfigManager();

export async function configRead(): Promise<{ config: Record<string, unknown>; exists: boolean }> {
  return {
    config: (await configManager.read()) as unknown as Record<string, unknown>,
    exists: await configManager.exists(),
  };
}

export async function configWrite(args: {
  key: string;
  value: unknown;
}): Promise<{ ok: boolean; key: string }> {
  await configManager.set(args.key, args.value);
  return { ok: true, key: args.key };
}

/**
 * Exported for testing: create with custom path.
 */
export function _createConfigManager(path: string): ConfigManager {
  return new ConfigManager(path);
}
