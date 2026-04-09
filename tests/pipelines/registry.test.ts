import { describe, it, expect } from "vitest";
import { createPipeline, listCommands } from "../../src/pipelines/registry.js";

describe("Pipeline Registry", () => {
  describe("listCommands", () => {
    it("includes all 13 registered pipelines", () => {
      const commands = listCommands();
      expect(commands).toContain("vuln-scan");
      expect(commands).toContain("vuln-resolve");
      expect(commands).toContain("review-digest");
      expect(commands).toContain("review-post");
      expect(commands).toContain("incident-triage");
      expect(commands).toContain("audit-report");
      expect(commands).toContain("deps-analyze");
      expect(commands).toContain("test-gen");
      expect(commands).toContain("changelog-gen");
      expect(commands).toContain("migration-plan");
      expect(commands).toContain("metrics-dora");
      expect(commands).toContain("metrics-velocity");
      expect(commands).toContain("scan-secrets");
      expect(commands).toHaveLength(13);
    });
  });

  describe("createPipeline", () => {
    it("creates vuln-scan", () => {
      const def = createPipeline("vuln-scan", { repo: "acme/web", severity: "critical" });
      expect(def.name).toBe("vuln-scan");
    });

    it("creates vuln-resolve", () => {
      const def = createPipeline("vuln-resolve", { repo: "acme/web", maxIterations: 5, baseBranch: "develop" });
      expect(def.name).toBe("vuln-resolve");
      expect(def.maxIterations).toBe(5);
    });

    it("creates review-digest", () => {
      const def = createPipeline("review-digest", { repo: "acme/web", prNumber: 42, skipDrafts: true, skipLabels: ["wontfix"], skipAuthors: ["bot"] });
      expect(def.name).toBe("review-digest");
    });

    it("creates review-post", () => {
      const def = createPipeline("review-post", { repo: "acme/web", prNumber: 42, dryRun: true });
      expect(def.name).toBe("review-post");
    });

    it("creates incident-triage", () => {
      const def = createPipeline("incident-triage", { org: "acme", project: "web", issueId: "123", resolve: true, cwd: "/tmp" });
      expect(def.name).toBe("incident-triage");
    });

    it("creates audit-report", () => {
      const def = createPipeline("audit-report", { repo: "acme/web", checks: ["vuln", "secrets"] });
      expect(def.name).toBe("audit-report");
    });

    it("creates deps-analyze", () => {
      const def = createPipeline("deps-analyze", { repo: "acme/web", ecosystem: "npm" });
      expect(def.name).toBe("deps-analyze");
    });

    it("creates test-gen", () => {
      const def = createPipeline("test-gen", { repo: "acme/web", targetFiles: ["src/a.ts"], maxIterations: 5, createPr: false });
      expect(def.name).toBe("test-gen");
    });

    it("creates changelog-gen", () => {
      const def = createPipeline("changelog-gen", { repo: "acme/web", fromRef: "v1.0.0", toRef: "v2.0.0", includePrs: true });
      expect(def.name).toBe("changelog-gen");
    });

    it("creates migration-plan", () => {
      const def = createPipeline("migration-plan", { repo: "acme/web", fromPackage: "a", toPackage: "b", run: true, maxIterations: 5 });
      expect(def.name).toBe("migration-plan");
    });

    it("creates metrics-dora", () => {
      const def = createPipeline("metrics-dora", { repo: "acme/web", period: "90d" });
      expect(def.name).toBe("metrics-dora");
    });

    it("creates metrics-velocity", () => {
      const def = createPipeline("metrics-velocity", { repo: "acme/web", period: "7d" });
      expect(def.name).toBe("metrics-velocity");
    });

    it("creates scan-secrets", () => {
      const def = createPipeline("scan-secrets", { repo: "acme/web", path: "src/" });
      expect(def.name).toBe("scan-secrets");
    });

    // Default params
    it("creates all pipelines with empty params", () => {
      for (const cmd of ["vuln-scan", "vuln-resolve", "review-digest", "review-post",
        "audit-report", "deps-analyze", "test-gen", "metrics-dora", "metrics-velocity", "scan-secrets"]) {
        expect(() => createPipeline(cmd, {})).not.toThrow();
      }
      // These need specific params
      expect(() => createPipeline("incident-triage", {})).not.toThrow();
      expect(() => createPipeline("changelog-gen", {})).not.toThrow();
      expect(() => createPipeline("migration-plan", {})).not.toThrow();
    });

    it("throws for unknown command", () => {
      expect(() => createPipeline("nonexistent", {})).toThrow(/Unknown pipeline command/);
    });
  });
});
