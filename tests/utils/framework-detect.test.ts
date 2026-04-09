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

  it("detects Django from manage.py", async () => {
    fs.writeFileSync(path.join(tmpDir, "manage.py"), "");
    expect(await detectFrameworks(tmpDir)).toContain("django");
  });

  it("detects Angular from angular.json", async () => {
    fs.writeFileSync(path.join(tmpDir, "angular.json"), "{}");
    expect(await detectFrameworks(tmpDir)).toContain("angular");
  });

  it("detects React from package.json", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0" } }),
    );
    const result = await detectFrameworks(tmpDir);
    expect(result).toContain("react");
    expect(result).toContain("nodejs"); // Also detected from package.json
  });

  it("detects Next.js from next.config.mjs", async () => {
    fs.writeFileSync(path.join(tmpDir, "next.config.mjs"), "");
    expect(await detectFrameworks(tmpDir)).toContain("nextjs");
  });

  it("detects Express from package.json", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { express: "^4.21.0" } }),
    );
    expect(await detectFrameworks(tmpDir)).toContain("express");
  });

  it("detects Flask from requirements.txt", async () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask==3.0.0\nrequests\n");
    expect(await detectFrameworks(tmpDir)).toContain("flask");
  });

  it("detects FastAPI from pyproject.toml", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "pyproject.toml"),
      '[project]\ndependencies = ["fastapi>=0.100"]\n',
    );
    expect(await detectFrameworks(tmpDir)).toContain("fastapi");
  });

  it("detects Node.js from package.json presence", async () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    expect(await detectFrameworks(tmpDir)).toContain("nodejs");
  });

  it("returns empty for unknown project", async () => {
    expect(await detectFrameworks(tmpDir)).toEqual([]);
  });

  it("detects multiple frameworks", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18", express: "^4" } }),
    );
    const result = await detectFrameworks(tmpDir);
    expect(result).toContain("react");
    expect(result).toContain("express");
    expect(result).toContain("nodejs");
  });

  it("handles corrupt package.json", async () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "not json");
    // Should not throw, just return results (possibly empty)
    const result = await detectFrameworks(tmpDir);
    expect(Array.isArray(result)).toBe(true);
  });

  it("handles corrupt requirements.txt", async () => {
    // Even with weird content, should not throw
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "\x00\x01\x02");
    const result = await detectFrameworks(tmpDir);
    expect(Array.isArray(result)).toBe(true);
  });
});
