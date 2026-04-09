import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { _createConfigManager } from "../../src/tools/config.js";

describe("Config tool handlers", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-config-tool-test-"));
    configPath = path.join(tmpDir, "config.toml");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Note: We test the ConfigManager directly here since the tool handlers
  // (configRead/configWrite) use a singleton with the default path.
  // The actual config logic is fully tested in utils/config.test.ts.
  // This tests the factory helper used for testing.

  it("creates a config manager with custom path", () => {
    const manager = _createConfigManager(configPath);
    expect(manager).toBeDefined();
    expect(manager.exists()).toBe(false);
  });

  it("reads and writes through custom manager", () => {
    const manager = _createConfigManager(configPath);
    manager.set("general.default_org", "test-org");
    expect(manager.get("general.default_org")).toBe("test-org");
    expect(manager.exists()).toBe(true);
  });
});
