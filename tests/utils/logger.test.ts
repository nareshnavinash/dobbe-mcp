import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Logger", () => {
  const originalWrite = process.stderr.write;
  let captured: string[];

  beforeEach(() => {
    captured = [];
    process.stderr.write = ((chunk: string) => {
      captured.push(chunk);
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("outputs JSON format by default", async () => {
    vi.stubEnv("DOBBE_LOG_FORMAT", "json");
    vi.stubEnv("DOBBE_LOG_LEVEL", "debug");
    const { logger } = await import("../../src/utils/logger.js");

    logger.info("test message", { key: "value" });

    expect(captured.length).toBe(1);
    const parsed = JSON.parse(captured[0]);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("test message");
    expect(parsed.key).toBe("value");
  });

  it("outputs pretty format with ANSI colors", async () => {
    vi.stubEnv("DOBBE_LOG_FORMAT", "pretty");
    vi.stubEnv("DOBBE_LOG_LEVEL", "debug");
    const { logger } = await import("../../src/utils/logger.js");

    logger.warn("warning message", { detail: "test" });

    expect(captured.length).toBe(1);
    // Pretty format contains ANSI color codes
    expect(captured[0]).toContain("\x1b[33m"); // yellow for warn
    expect(captured[0]).toContain("WARN");
    expect(captured[0]).toContain("warning message");
    expect(captured[0]).toContain('"detail":"test"');
  });

  it("pretty format without extra data", async () => {
    vi.stubEnv("DOBBE_LOG_FORMAT", "pretty");
    vi.stubEnv("DOBBE_LOG_LEVEL", "debug");
    const { logger } = await import("../../src/utils/logger.js");

    logger.error("error msg");

    expect(captured.length).toBe(1);
    expect(captured[0]).toContain("\x1b[31m"); // red for error
    expect(captured[0]).toContain("ERROR");
    expect(captured[0]).toContain("error msg");
  });

  it("respects log level filtering", async () => {
    vi.stubEnv("DOBBE_LOG_FORMAT", "json");
    vi.stubEnv("DOBBE_LOG_LEVEL", "warn");
    const { logger } = await import("../../src/utils/logger.js");

    logger.debug("should be filtered");
    logger.info("should be filtered");
    logger.warn("should appear");

    expect(captured.length).toBe(1);
    expect(captured[0]).toContain("should appear");
  });

  it("debug level outputs all messages", async () => {
    vi.stubEnv("DOBBE_LOG_FORMAT", "json");
    vi.stubEnv("DOBBE_LOG_LEVEL", "debug");
    const { logger } = await import("../../src/utils/logger.js");

    logger.debug("debug msg");
    expect(captured.length).toBe(1);
    expect(captured[0]).toContain("debug msg");
  });
});
