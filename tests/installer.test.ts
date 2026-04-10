import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { install, uninstall } from "../src/installer.js";

describe("Installer", () => {
  let tmpDir: string;
  let claudeDir: string;
  let skillsDir: string;
  let settingsPath: string;

  // Create a fake skills source that mimics the project's skills/ directory
  let skillsSource: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-installer-test-"));
    claudeDir = path.join(tmpDir, ".claude");
    skillsDir = path.join(claudeDir, "skills");
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
        skillsSource,
      });

      expect(result.skillsInstalled).toBe(2);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-scan", "SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-resolve", "SKILL.md"))).toBe(true);
    });

    it("does not copy non-dobbe directories", async () => {
      await install({ quiet: true, claudeDir, skillsSource });
      expect(fs.existsSync(path.join(skillsDir, "other-skill"))).toBe(false);
    });

    it("configures MCP server in settings.json", async () => {
      const result = await install({ quiet: true, claudeDir, skillsSource });

      expect(result.mcpConfigured).toBe(true);
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      expect(settings.mcpServers.dobbe).toBeDefined();
      expect(settings.mcpServers.dobbe.command).toBe("node");
      expect(settings.mcpServers.dobbe.args).toHaveLength(1);
      expect(settings.mcpServers.dobbe.args[0]).toContain("index.js");
    });

    it("preserves existing settings.json content", async () => {
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        settingsPath,
        JSON.stringify({ existingKey: "value", mcpServers: { other: { command: "test" } } }),
      );

      await install({ quiet: true, claudeDir, skillsSource });

      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      expect(settings.existingKey).toBe("value");
      expect(settings.mcpServers.other).toBeDefined();
      expect(settings.mcpServers.dobbe).toBeDefined();
    });

    it("updates existing dobbe MCP config", async () => {
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        settingsPath,
        JSON.stringify({ mcpServers: { dobbe: { command: "old" } } }),
      );

      await install({ quiet: true, claudeDir, skillsSource });

      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      expect(settings.mcpServers.dobbe.command).toBe("node"); // Updated
    });

    it("creates claude directory if missing", async () => {
      expect(fs.existsSync(claudeDir)).toBe(false);
      await install({ quiet: true, claudeDir, skillsSource });
      expect(fs.existsSync(claudeDir)).toBe(true);
    });

    it("handles missing skills source gracefully", async () => {
      const result = await install({
        quiet: true,
        claudeDir,
        skillsSource: path.join(tmpDir, "nonexistent"),
      });
      expect(result.skillsInstalled).toBe(0);
    });

    it("overwrites existing skills", async () => {
      // Install once
      await install({ quiet: true, claudeDir, skillsSource });

      // Modify a skill
      fs.writeFileSync(
        path.join(skillsSource, "dobbe-vuln-scan", "SKILL.md"),
        "# Updated content",
      );

      // Install again
      await install({ quiet: true, claudeDir, skillsSource });

      const content = fs.readFileSync(
        path.join(skillsDir, "dobbe-vuln-scan", "SKILL.md"),
        "utf-8",
      );
      expect(content).toBe("# Updated content");
    });
  });

  describe("uninstall", () => {
    it("removes dobbe skills", async () => {
      await install({ quiet: true, claudeDir, skillsSource });
      const result = await uninstall({ quiet: true, claudeDir });

      expect(result.skillsRemoved).toBe(2);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-scan"))).toBe(false);
      expect(fs.existsSync(path.join(skillsDir, "dobbe-vuln-resolve"))).toBe(false);
    });

    it("does not remove non-dobbe skills", async () => {
      await install({ quiet: true, claudeDir, skillsSource });
      // Manually add a non-dobbe skill
      fs.mkdirSync(path.join(skillsDir, "other-thing"), { recursive: true });
      fs.writeFileSync(path.join(skillsDir, "other-thing", "SKILL.md"), "keep me");

      await uninstall({ quiet: true, claudeDir });

      expect(fs.existsSync(path.join(skillsDir, "other-thing", "SKILL.md"))).toBe(true);
    });

    it("removes MCP config from settings.json", async () => {
      await install({ quiet: true, claudeDir, skillsSource });
      const result = await uninstall({ quiet: true, claudeDir });

      expect(result.mcpRemoved).toBe(true);
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      expect(settings.mcpServers.dobbe).toBeUndefined();
    });

    it("preserves other MCP configs", async () => {
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(
        settingsPath,
        JSON.stringify({ mcpServers: { dobbe: { command: "npx" }, other: { command: "test" } } }),
      );

      await uninstall({ quiet: true, claudeDir });

      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      expect(settings.mcpServers.other).toBeDefined();
      expect(settings.mcpServers.dobbe).toBeUndefined();
    });

    it("handles missing skills directory", async () => {
      const result = await uninstall({ quiet: true, claudeDir });
      expect(result.skillsRemoved).toBe(0);
    });

    it("handles missing settings.json", async () => {
      const result = await uninstall({ quiet: true, claudeDir });
      expect(result.mcpRemoved).toBe(false);
    });

    it("handles corrupt settings.json", async () => {
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(settingsPath, "not json");

      const result = await uninstall({ quiet: true, claudeDir });
      expect(result.mcpRemoved).toBe(false);
    });
  });
});
