import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { install, uninstall } from "../src/installer.js";

describe("Installer", () => {
  let tmpDir: string;
  let claudeDir: string;
  let skillsDir: string;
  let claudeConfigPath: string;
  let settingsPath: string;

  // Create a fake skills source that mimics the project's skills/ directory
  let skillsSource: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-installer-test-"));
    claudeDir = path.join(tmpDir, ".claude");
    skillsDir = path.join(claudeDir, "skills");
    claudeConfigPath = path.join(tmpDir, ".claude.json");
    settingsPath = path.join(claudeDir, "settings.json");

    // Create fake bundled skills
    skillsSource = path.join(tmpDir, "skills");
    fs.mkdirSync(path.join(skillsSource, "dobbe-vuln-scan"), { recursive: true });
    fs.writeFileSync(
      path.join(skillsSource, "dobbe-vuln-scan", "SKILL.md"),
      "# dobbe -- Vulnerability Scan\nTest skill.",
    );
    fs.mkdirSync(path.join(skillsSource, "dobbe-vuln-resolve"), { recursive: true });
    fs.writeFileSync(
      path.join(skillsSource, "dobbe-vuln-resolve", "SKILL.md"),
      "# dobbe -- Vulnerability Resolution\nTest skill.",
    );
    // Non-dobbe directory should be ignored
    fs.mkdirSync(path.join(skillsSource, "other-skill"), { recursive: true });
    fs.writeFileSync(
      path.join(skillsSource, "other-skill", "SKILL.md"),
      "# Other\nShould be ignored.",
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("install", () => {
    it("copies skills to claude skills directory", async () => {
      const result = await install({
        quiet: true,
        claudeDir,
        claudeConfigPath,
        skillsSource,
      });

      expect(result.skillsInstalled).toBe(2);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-scan", "SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-resolve", "SKILL.md"))).toBe(true);
    });

    it("does not copy non-dobbe directories", async () => {
      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });
      expect(fs.existsSync(path.join(skillsDir, "other-skill"))).toBe(false);
    });

    it("configures MCP server in ~/.claude.json", async () => {
      const result = await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });

      expect(result.mcpConfigured).toBe(true);
      const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
      expect(config.mcpServers.dobbe).toBeDefined();
      expect(config.mcpServers.dobbe.command).toBe("npx");
      expect(config.mcpServers.dobbe.args).toEqual(["dobbe", "start"]);
    });

    it("preserves existing ~/.claude.json content", async () => {
      fs.writeFileSync(
        claudeConfigPath,
        JSON.stringify({ existingKey: "value", mcpServers: { other: { command: "test" } } }),
      );

      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });

      const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
      expect(config.existingKey).toBe("value");
      expect(config.mcpServers.other).toBeDefined();
      expect(config.mcpServers.dobbe).toBeDefined();
    });

    it("updates existing dobbe MCP config", async () => {
      fs.writeFileSync(
        claudeConfigPath,
        JSON.stringify({ mcpServers: { dobbe: { command: "old" } } }),
      );

      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });

      const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
      expect(config.mcpServers.dobbe.command).toBe("npx"); // Updated from old config
    });

    it("creates claude directory if missing", async () => {
      expect(fs.existsSync(claudeDir)).toBe(false);
      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });
      expect(fs.existsSync(claudeDir)).toBe(true);
    });

    it("handles missing skills source gracefully", async () => {
      const result = await install({
        quiet: true,
        claudeDir,
        claudeConfigPath,
        skillsSource: path.join(tmpDir, "nonexistent"),
      });
      expect(result.skillsInstalled).toBe(0);
    });

    it("overwrites existing skills", async () => {
      // Install once
      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });

      // Modify a skill
      fs.writeFileSync(
        path.join(skillsSource, "dobbe-vuln-scan", "SKILL.md"),
        "# Updated content",
      );

      // Install again
      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });

      const content = fs.readFileSync(
        path.join(skillsDir, "dobbe-vuln-scan", "SKILL.md"),
        "utf-8",
      );
      expect(content).toBe("# Updated content");
    });

    it("cleans up stale MCP config from settings.json", async () => {
      // Simulate legacy config in settings.json
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        settingsPath,
        JSON.stringify({ mcpServers: { dobbe: { command: "old" } }, other: true }),
      );

      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });

      // MCP config should be in ~/.claude.json, not settings.json
      const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
      expect(config.mcpServers.dobbe).toBeDefined();

      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      expect(settings.mcpServers.dobbe).toBeUndefined();
      expect(settings.other).toBe(true); // other settings preserved
    });
  });

  describe("uninstall", () => {
    it("removes dobbe skills", async () => {
      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });
      const result = await uninstall({ quiet: true, claudeDir, claudeConfigPath });

      expect(result.skillsRemoved).toBe(2);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-scan"))).toBe(false);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-resolve"))).toBe(false);
    });

    it("does not remove non-dobbe skills", async () => {
      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });
      // Manually add a non-dobbe skill
      fs.mkdirSync(path.join(skillsDir, "other-thing"), { recursive: true });
      fs.writeFileSync(path.join(skillsDir, "other-thing", "SKILL.md"), "keep me");

      await uninstall({ quiet: true, claudeDir, claudeConfigPath });

      expect(fs.existsSync(path.join(skillsDir, "other-thing", "SKILL.md"))).toBe(true);
    });

    it("removes MCP config from ~/.claude.json", async () => {
      await install({ quiet: true, claudeDir, claudeConfigPath, skillsSource });
      const result = await uninstall({ quiet: true, claudeDir, claudeConfigPath });

      expect(result.mcpRemoved).toBe(true);
      const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
      expect(config.mcpServers.dobbe).toBeUndefined();
    });

    it("preserves other MCP configs", async () => {
      fs.writeFileSync(
        claudeConfigPath,
        JSON.stringify({ mcpServers: { dobbe: { command: "npx" }, other: { command: "test" } } }),
      );

      await uninstall({ quiet: true, claudeDir, claudeConfigPath });

      const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
      expect(config.mcpServers.other).toBeDefined();
      expect(config.mcpServers.dobbe).toBeUndefined();
    });

    it("handles missing skills directory", async () => {
      const result = await uninstall({ quiet: true, claudeDir, claudeConfigPath });
      expect(result.skillsRemoved).toBe(0);
    });

    it("handles missing ~/.claude.json", async () => {
      const result = await uninstall({ quiet: true, claudeDir, claudeConfigPath });
      expect(result.mcpRemoved).toBe(false);
    });

    it("handles corrupt ~/.claude.json", async () => {
      fs.writeFileSync(claudeConfigPath, "not json");

      const result = await uninstall({ quiet: true, claudeDir, claudeConfigPath });
      expect(result.mcpRemoved).toBe(false);
    });
  });
});
