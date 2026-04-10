import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Installer: copies skills to ~/.claude/skills/ and configures MCP in ~/.claude.json.
 */

import { DOBBE_DIR } from "./utils/paths.js";

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? ".";
const CLAUDE_DIR = path.join(HOME, ".claude");
// MCP servers must be in ~/.claude.json (NOT ~/.claude/settings.json)
const CLAUDE_CONFIG = path.join(HOME, ".claude.json");

// Resolve the skills directory relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In dist/: dist/src/installer.js → project root is ../../
// In src/: src/installer.ts → project root is ../
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const BUNDLED_SKILLS_DIR = path.join(PROJECT_ROOT, "skills");

function getMcpServerConfig(): { command: string; args: string[] } {
  // Use npx so the package is resolved at runtime from the user's PATH.
  // This avoids hardcoding absolute paths to node or the package location,
  // which break when the user switches Node versions (nvm/fnm) or when
  // npx cleans its cache.
  // The "start" subcommand explicitly starts the MCP stdio server,
  // while bare "npx dobbe" now shows help text.
  return {
    command: "npx",
    args: ["dobbe", "start"],
  };
}

const SKILL_PREFIX = "dobbe-";

export interface InstallOptions {
  quiet?: boolean;
  claudeDir?: string;
  claudeConfigPath?: string;
  skillsSource?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Install dobbe: copy skills + configure MCP server.
 */
export async function install(options: InstallOptions = {}): Promise<{
  skillsInstalled: number;
  mcpConfigured: boolean;
  configCreated: boolean;
}> {
  const claudeDir = options.claudeDir ?? CLAUDE_DIR;
  const skillsDir = path.join(claudeDir, "skills");
  const claudeConfigPath = options.claudeConfigPath ?? CLAUDE_CONFIG;
  const skillsSource = options.skillsSource ?? BUNDLED_SKILLS_DIR;
  const log = options.quiet ? () => {} : console.log;

  log("Installing dobbe...\n");

  // 1. Copy skills
  const skillsInstalled = await copySkills(skillsSource, skillsDir, log);

  // 2. Configure MCP server in ~/.claude.json (where Claude Code reads mcpServers)
  const mcpConfigured = await configureMcp(claudeConfigPath, log);

  // 3. Create ~/.dobbe/ directory structure
  const configCreated = await ensureDobbe(log);

  // 4. Clean up stale config from settings.json if present
  await cleanupStaleMcpConfig(path.join(claudeDir, "settings.json"), log);

  log("\n✓ dobbe installed successfully!");
  log(`  ${skillsInstalled} skills installed to ${skillsDir}`);
  if (mcpConfigured) {
    log(`  MCP server configured in ${claudeConfigPath}`);
  }
  log("\n  Restart Claude Code, then try /dobbe-vuln-scan");

  return { skillsInstalled, mcpConfigured, configCreated };
}

/**
 * Uninstall dobbe: remove skills + MCP config.
 */
export async function uninstall(
  options: InstallOptions = {},
): Promise<{ skillsRemoved: number; mcpRemoved: boolean }> {
  const claudeDir = options.claudeDir ?? CLAUDE_DIR;
  const skillsDir = path.join(claudeDir, "skills");
  const claudeConfigPath = options.claudeConfigPath ?? CLAUDE_CONFIG;
  const log = options.quiet ? () => {} : console.log;

  log("Uninstalling dobbe...\n");

  // 1. Remove skills
  const skillsRemoved = await removeSkills(skillsDir, log);

  // 2. Remove MCP config from ~/.claude.json
  const mcpRemoved = await removeMcp(claudeConfigPath, log);

  // 3. Also clean up stale config from settings.json (legacy)
  await cleanupStaleMcpConfig(path.join(claudeDir, "settings.json"), log);

  if (!options.quiet) {
    log("\n✓ dobbe uninstalled.");
    log(`  ${skillsRemoved} skills removed`);
    if (mcpRemoved) log("  MCP server config removed");
    log("\n  Note: ~/.dobbe/ config and cache preserved.");
  }

  return { skillsRemoved, mcpRemoved };
}

// ─── Internal helpers ───

async function copySkills(
  sourceDir: string,
  targetDir: string,
  log: (...args: unknown[]) => void,
): Promise<number> {
  if (!(await fileExists(sourceDir))) {
    log("  Warning: Skills source not found at", sourceDir);
    return 0;
  }

  await fs.mkdir(targetDir, { recursive: true });

  let count = 0;
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(SKILL_PREFIX)) continue;

    const src = path.join(sourceDir, entry.name);
    const dst = path.join(targetDir, entry.name);

    // Copy directory recursively
    await copyDir(src, dst);
    count++;
    log(`  ✓ ${entry.name}`);
  }

  return count;
}

async function copyDir(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath);
    } else {
      await fs.copyFile(srcPath, dstPath);
    }
  }
}

async function removeSkills(
  skillsDir: string,
  log: (...args: unknown[]) => void,
): Promise<number> {
  if (!(await fileExists(skillsDir))) return 0;

  let count = 0;
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(SKILL_PREFIX)) continue;

    const skillPath = path.join(skillsDir, entry.name);
    await fs.rm(skillPath, { recursive: true, force: true });
    count++;
    log(`  ✗ ${entry.name}`);
  }

  return count;
}

async function configureMcp(
  configPath: string,
  log: (...args: unknown[]) => void,
): Promise<boolean> {
  let config: Record<string, unknown> = {};

  // Read existing ~/.claude.json
  if (await fileExists(configPath)) {
    try {
      config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    } catch {
      log("  Warning: Could not parse existing", configPath);
    }
  }

  // Add MCP server config
  const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;

  if (mcpServers.dobbe) {
    log("  MCP server 'dobbe' already configured, updating...");
  }

  mcpServers.dobbe = getMcpServerConfig();
  config.mcpServers = mcpServers;

  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  log("  ✓ MCP server configured");

  return true;
}

/**
 * Remove stale dobbe MCP config from settings.json (legacy location).
 */
async function cleanupStaleMcpConfig(
  settingsPath: string,
  log: (...args: unknown[]) => void,
): Promise<void> {
  if (!(await fileExists(settingsPath))) return;

  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf-8"));
    const mcpServers = settings.mcpServers as Record<string, unknown> | undefined;

    if (mcpServers?.dobbe) {
      delete mcpServers.dobbe;
      settings.mcpServers = mcpServers;
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
      log("  ✓ Removed stale MCP config from settings.json");
    }
  } catch {
    // Non-critical — ignore
  }
}

async function removeMcp(
  configPath: string,
  log: (...args: unknown[]) => void,
): Promise<boolean> {
  if (!(await fileExists(configPath))) return false;

  try {
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
    const mcpServers = config.mcpServers as Record<string, unknown> | undefined;

    if (!mcpServers?.dobbe) return false;

    delete mcpServers.dobbe;
    config.mcpServers = mcpServers;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
    log("  ✗ MCP server config removed");
    return true;
  } catch {
    return false;
  }
}

async function ensureDobbe(log: (...args: unknown[]) => void): Promise<boolean> {
  const created = !(await fileExists(DOBBE_DIR));

  await fs.mkdir(path.join(DOBBE_DIR, "cache"), { recursive: true });
  await fs.mkdir(path.join(DOBBE_DIR, "state"), { recursive: true });
  await fs.mkdir(path.join(DOBBE_DIR, "sessions"), { recursive: true });

  if (created) {
    log("  ✓ Created ~/.dobbe/ directory");
  }

  return created;
}
