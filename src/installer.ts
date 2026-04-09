import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Installer: copies skills to ~/.claude/skills/ and configures MCP in settings.json.
 */

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? ".";
const CLAUDE_DIR = path.join(HOME, ".claude");
const CLAUDE_SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
const CLAUDE_SETTINGS = path.join(CLAUDE_DIR, "settings.json");
const DOBBE_DIR = path.join(HOME, ".dobbe");

// Resolve the skills directory relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In dist/: dist/installer.js → project root is ../
// In src/: src/installer.ts → project root is ../
const PROJECT_ROOT = path.resolve(__dirname, "..");
const BUNDLED_SKILLS_DIR = path.join(PROJECT_ROOT, "skills");

const MCP_SERVER_CONFIG = {
  command: "npx",
  args: ["-y", "dobbe"],
};

const SKILL_PREFIX = "dobbe-";

export interface InstallOptions {
  quiet?: boolean;
  claudeDir?: string;
  skillsSource?: string;
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
  const skillsInstalled = copySkills(skillsSource, skillsDir, log);

  // 2. Configure MCP server in settings.json
  const mcpConfigured = configureMcp(settingsPath, log);

  // 3. Create ~/.dobbe/ directory structure
  const configCreated = ensureDobbe(log);

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
  const skillsRemoved = removeSkills(skillsDir, log);

  // 2. Remove MCP config
  const mcpRemoved = removeMcp(settingsPath, log);

  if (!options.quiet) {
    log("\n✓ dobbe uninstalled.");
    log(`  ${skillsRemoved} skills removed`);
    if (mcpRemoved) log("  MCP server config removed");
    log("\n  Note: ~/.dobbe/ config and cache preserved.");
  }

  return { skillsRemoved, mcpRemoved };
}

// ─── Internal helpers ───

function copySkills(
  sourceDir: string,
  targetDir: string,
  log: (...args: unknown[]) => void,
): number {
  if (!fs.existsSync(sourceDir)) {
    log("  Warning: Skills source not found at", sourceDir);
    return 0;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  let count = 0;
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(SKILL_PREFIX)) continue;

    const src = path.join(sourceDir, entry.name);
    const dst = path.join(targetDir, entry.name);

    // Copy directory recursively
    copyDir(src, dst);
    count++;
    log(`  ✓ ${entry.name}`);
  }

  return count;
}

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function removeSkills(
  skillsDir: string,
  log: (...args: unknown[]) => void,
): number {
  if (!fs.existsSync(skillsDir)) return 0;

  let count = 0;
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(SKILL_PREFIX)) continue;

    const skillPath = path.join(skillsDir, entry.name);
    fs.rmSync(skillPath, { recursive: true, force: true });
    count++;
    log(`  ✗ ${entry.name}`);
  }

  return count;
}

function configureMcp(
  settingsPath: string,
  log: (...args: unknown[]) => void,
): boolean {
  let settings: Record<string, unknown> = {};

  // Read existing settings
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    } catch {
      log("  Warning: Could not parse existing settings.json");
    }
  } else {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  }

  // Add MCP server config
  const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;

  if (mcpServers.dobbe) {
    log("  MCP server 'dobbe' already configured, updating...");
  }

  mcpServers.dobbe = MCP_SERVER_CONFIG;
  settings.mcpServers = mcpServers;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  log("  ✓ MCP server configured");

  return true;
}

function removeMcp(
  settingsPath: string,
  log: (...args: unknown[]) => void,
): boolean {
  if (!fs.existsSync(settingsPath)) return false;

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    const mcpServers = settings.mcpServers as Record<string, unknown> | undefined;

    if (!mcpServers?.dobbe) return false;

    delete mcpServers.dobbe;
    settings.mcpServers = mcpServers;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    log("  ✗ MCP server config removed");
    return true;
  } catch {
    return false;
  }
}

function ensureDobbe(log: (...args: unknown[]) => void): boolean {
  const created = !fs.existsSync(DOBBE_DIR);

  fs.mkdirSync(path.join(DOBBE_DIR, "cache"), { recursive: true });
  fs.mkdirSync(path.join(DOBBE_DIR, "state"), { recursive: true });
  fs.mkdirSync(path.join(DOBBE_DIR, "sessions"), { recursive: true });

  if (created) {
    log("  ✓ Created ~/.dobbe/ directory");
  }

  return created;
}
