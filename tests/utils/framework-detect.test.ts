import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectFrameworks } from "../../src/utils/framework-detect.js";

describe("framework-detect", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-framework-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects Django from manage.py", () => {
    fs.writeFileSync(path.join(tmpDir, "manage.py"), "");
    expect(detectFrameworks(tmpDir)).toContain("django");
  });

  it("detects Angular from angular.json", () => {
    fs.writeFileSync(path.join(tmpDir, "angular.json"), "{}");
    expect(detectFrameworks(tmpDir)).toContain("angular");
  });

  it("detects React from package.json", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0" } }),
    );
    const result = detectFrameworks(tmpDir);
    expect(result).toContain("react");
    expect(result).toContain("nodejs"); // Also detected from package.json
  });

  it("detects Next.js from next.config.mjs", () => {
    fs.writeFileSync(path.join(tmpDir, "next.config.mjs"), "");
    expect(detectFrameworks(tmpDir)).toContain("nextjs");
  });

  it("detects Express from package.json", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { express: "^4.21.0" } }),
    );
    expect(detectFrameworks(tmpDir)).toContain("express");
  });

  it("detects Flask from requirements.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask==3.0.0\nrequests\n");
    expect(detectFrameworks(tmpDir)).toContain("flask");
  });

  it("detects FastAPI from pyproject.toml", () => {
    fs.writeFileSync(
      path.join(tmpDir, "pyproject.toml"),
      '[project]\ndependencies = ["fastapi>=0.100"]\n',
    );
    expect(detectFrameworks(tmpDir)).toContain("fastapi");
  });

  it("detects Node.js from package.json presence", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    expect(detectFrameworks(tmpDir)).toContain("nodejs");
  });

  it("returns empty for unknown project", () => {
    expect(detectFrameworks(tmpDir)).toEqual([]);
  });

  it("detects multiple frameworks", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18", express: "^4" } }),
    );
    const result = detectFrameworks(tmpDir);
    expect(result).toContain("react");
    expect(result).toContain("express");
    expect(result).toContain("nodejs");
  });

  it("handles corrupt package.json", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "not json");
    // Should not throw, just not detect
    expect(() => detectFrameworks(tmpDir)).not.toThrow();
  });

  it("handles corrupt requirements.txt", () => {
    // Even with weird content, should not throw
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "\x00\x01\x02");
    expect(() => detectFrameworks(tmpDir)).not.toThrow();
  });
});
