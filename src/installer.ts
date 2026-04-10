import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Installer: copies skills to ~/.claude/skills/ and configures MCP in settings.json.
 */

import { DOBBE_DIR } from "./utils/paths.js";

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? ".";
const CLAUDE_DIR = path.join(HOME, ".claude");

// Resolve the skills directory relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In dist/: dist/src/installer.js → project root is ../../
// In src/: src/installer.ts → project root is ../
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const BUNDLED_SKILLS_DIR = path.join(PROJECT_ROOT, "skills");

// Resolve the MCP server entry point to use node directly (faster, more reliable than npx)
const MCP_ENTRY_POINT = path.join(PROJECT_ROOT, "dist", "src", "index.js");

function getMcpServerConfig(): { command: string; args: string[] } {
  // Use the absolute path to the current node binary (process.execPath)
  // so Claude Code can start the server without depending on PATH/nvm.
  return {
    command: process.execPath,
    args: [MCP_ENTRY_POINT],
  };
}

const SKILL_PREFIX = "dobbe-";

export interface InstallOptions {
  quiet?: boolean;
  claudeDir?: string;
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
  const settingsPath = path.join(claudeDir, "settings.json");
  const skillsSource = options.skillsSource ?? BUNDLED_SKILLS_DIR;
  const log = options.quiet ? () => {} : console.log;

  log("Installing dobbe...\n");

  // 1. Copy skills
  const skillsInstalled = await copySkills(skillsSource, skillsDir, log);

  // 2. Configure MCP server in settings.json
  const mcpConfigured = await configureMcp(settingsPath, log);

  // 3. Create ~/.dobbe/ directory structure
  const configCreated = await ensureDobbe(log);

  log("\n✓ dobbe installed successfully!");
  log(`  ${skillsInstalled} skills installed to ${skillsDir}`);
  if (mcpConfigured) {
    log(`  MCP server configured in ${settingsPath}`);
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
  const settingsPath = path.join(claudeDir, "settings.json");
  const log = options.quiet ? () => {} : console.log;

  log("Uninstalling dobbe...\n");

  // 1. Remove skills
  const skillsRemoved = await removeSkills(skillsDir, log);

  // 2. Remove MCP config
  const mcpRemoved = await removeMcp(settingsPath, log);

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
  settingsPath: string,
  log: (...args: unknown[]) => void,
): Promise<boolean> {
  let settings: Record<string, unknown> = {};

  // Read existing settings
  if (await fileExists(settingsPath)) {
    try {
      settings = JSON.parse(await fs.readFile(settingsPath, "utf-8"));
    } catch {
      log("  Warning: Could not parse existing settings.json");
    }
  } else {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  }

  // Add MCP server config
  const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;

  if (mcpServers.dobbe) {
    log("  MCP server 'dobbe' already configured, updating...");
  }

  mcpServers.dobbe = getMcpServerConfig();
  settings.mcpServers = mcpServers;

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  log("  ✓ MCP server configured");

  return true;
}

async function removeMcp(
  settingsPath: string,
  log: (...args: unknown[]) => void,
): Promise<boolean> {
  if (!(await fileExists(settingsPath))) return false;

  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf-8"));
    const mcpServers = settings.mcpServers as Record<string, unknown> | undefined;

    if (!mcpServers?.dobbe) return false;

    delete mcpServers.dobbe;
    settings.mcpServers = mcpServers;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
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
