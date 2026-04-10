import { describe, it, expect, afterAll, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const { tmpDir } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const os = require("node:os");
  return { tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-config-tool-test-")) };
});

vi.mock("../../src/utils/paths.js", () => ({
  DOBBE_DIR: tmpDir,
  STATE_DIR: path.join(tmpDir, "state"),
  CACHE_DIR: path.join(tmpDir, "cache"),
  SESSION_DIR: path.join(tmpDir, "sessions"),
  CONFIG_PATH: path.join(tmpDir, "config.toml"),
}));

import { configRead, configWrite, _createConfigManager } from "../../src/tools/config.js";

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Config tool handlers", () => {
  it("creates a config manager with custom path", async () => {
    const manager = _createConfigManager(path.join(tmpDir, "custom-config.toml"));
    expect(manager).toBeDefined();
    expect(await manager.exists()).toBe(false);
  });

  it("configRead returns defaults when no config exists", async () => {
    const result = await configRead();
    expect(result.exists).toBe(false);
    expect(result.config).toBeDefined();
  });

  it("configWrite persists a value and configRead retrieves it", async () => {
    const writeResult = await configWrite({
      key: "general.default_org",
      value: "test-org",
    });
    expect(writeResult.ok).toBe(true);
    expect(writeResult.key).toBe("general.default_org");

    const readResult = await configRead();
    expect(readResult.exists).toBe(true);
    const general = readResult.config.general as Record<string, unknown>;
    expect(general.default_org).toBe("test-org");
  });

  it("configWrite handles nested keys", async () => {
    await configWrite({ key: "timeouts.scan", value: 300 });
    const result = await configRead();
    const timeouts = result.config.timeouts as Record<string, unknown>;
    expect(timeouts.scan).toBe(300);
  });
});
