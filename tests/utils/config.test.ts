import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { ConfigManager } from "../../src/utils/config.js";

describe("ConfigManager", () => {
  let tmpDir: string;
  let configPath: string;
  let config: ConfigManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-config-test-"));
    configPath = path.join(tmpDir, "config.toml");
    config = new ConfigManager(configPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("read", () => {
    it("returns defaults when no config file exists", () => {
      const result = config.read();
      expect(result.general?.default_format).toBe("table");
      expect(result.general?.default_severity).toBe("critical,high,medium,low");
      expect(result.timeouts?.scan).toBe(300);
    });

    it("reads existing config file", () => {
      const toml = [
        "[general]",
        'default_org = "acme"',
        'default_format = "json"',
        "",
        "[timeouts]",
        "scan = 600",
      ].join("\n");
      fs.writeFileSync(configPath, toml, "utf-8");

      const result = config.read();
      expect(result.general?.default_org).toBe("acme");
      expect(result.general?.default_format).toBe("json");
      expect(result.timeouts?.scan).toBe(600);
    });

    it("caches config in memory", () => {
      const result1 = config.read();
      const result2 = config.read();
      expect(result1).toBe(result2); // Same reference
    });
  });

  describe("write", () => {
    it("writes config to file", () => {
      config.write({
        general: { default_org: "acme", default_format: "json" },
      });

      const raw = fs.readFileSync(configPath, "utf-8");
      expect(raw).toContain("acme");
      expect(raw).toContain("json");
    });

    it("creates parent directory if needed", () => {
      const nestedPath = path.join(tmpDir, "nested", "dir", "config.toml");
      const nestedConfig = new ConfigManager(nestedPath);

      nestedConfig.write({ general: { default_org: "test" } });
      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it("updates cache after write", () => {
      config.write({ general: { default_org: "acme" } });
      const result = config.read();
      expect(result.general?.default_org).toBe("acme");
    });
  });

  describe("get", () => {
    it("gets nested values by dot path", () => {
      config.write({
        general: { default_org: "acme", default_format: "table" },
        timeouts: { scan: 500 },
      });

      expect(config.get("general.default_org")).toBe("acme");
      expect(config.get("timeouts.scan")).toBe(500);
    });

    it("returns undefined for missing keys", () => {
      config.write({ general: { default_org: "acme" } });
      expect(config.get("general.nonexistent")).toBeUndefined();
      expect(config.get("missing.path")).toBeUndefined();
    });

    it("returns undefined for deeply missing paths", () => {
      config.write({});
      expect(config.get("a.b.c.d")).toBeUndefined();
    });
  });

  describe("set", () => {
    it("sets nested values by dot path", () => {
      config.set("general.default_org", "neworg");
      expect(config.get("general.default_org")).toBe("neworg");
    });

    it("creates intermediate objects", () => {
      config.set("notifications.slack_channel", "#alerts");
      expect(config.get("notifications.slack_channel")).toBe("#alerts");
    });

    it("persists to file", () => {
      config.set("general.default_org", "acme");

      // Read with a fresh instance
      const fresh = new ConfigManager(configPath);
      expect(fresh.get("general.default_org")).toBe("acme");
    });
  });

  describe("exists", () => {
    it("returns false when file does not exist", () => {
      expect(config.exists()).toBe(false);
    });

    it("returns true after writing", () => {
      config.write({ general: {} });
      expect(config.exists()).toBe(true);
    });
  });

  describe("invalidate", () => {
    it("clears the in-memory cache", () => {
      const result1 = config.read();
      config.invalidate();
      const result2 = config.read();
      expect(result1).not.toBe(result2); // Different references
    });
  });
});
