import { describe, it, expect } from "vitest";
import { createPipeline, listCommands } from "../../src/pipelines/registry.js";

describe("Pipeline Registry", () => {
  describe("listCommands", () => {
    it("includes all 21 registered pipelines", () => {
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
      expect(commands).toContain("review-as-pm");
      expect(commands).toContain("review-as-engineer");
      expect(commands).toContain("review-as-marketing");
      expect(commands).toContain("review-as-designer");
      expect(commands).toContain("review-as-qa");
      expect(commands).toContain("review-as-test-architect");
      expect(commands).toContain("review-as-sales");
      expect(commands).toContain("project-review");
      expect(commands).toHaveLength(21);
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

    // Role-based review pipelines
    it("creates review-as-pm", () => {
      const def = createPipeline("review-as-pm", {});
      expect(def.name).toBe("review-as-pm");
    });

    it("creates review-as-engineer", () => {
      const def = createPipeline("review-as-engineer", {});
      expect(def.name).toBe("review-as-engineer");
    });

    it("creates review-as-marketing", () => {
      const def = createPipeline("review-as-marketing", {});
      expect(def.name).toBe("review-as-marketing");
    });

    it("creates review-as-designer", () => {
      const def = createPipeline("review-as-designer", {});
      expect(def.name).toBe("review-as-designer");
    });

    it("creates review-as-qa", () => {
      const def = createPipeline("review-as-qa", {});
      expect(def.name).toBe("review-as-qa");
    });

    it("creates review-as-test-architect", () => {
      const def = createPipeline("review-as-test-architect", {});
      expect(def.name).toBe("review-as-test-architect");
    });

    it("creates review-as-sales", () => {
      const def = createPipeline("review-as-sales", {});
      expect(def.name).toBe("review-as-sales");
    });

    it("creates project-review with default roles", () => {
      const def = createPipeline("project-review", {});
      expect(def.name).toBe("project-review");
      expect(Object.keys(def.states)).toHaveLength(16);
    });

    it("creates project-review with custom roles", () => {
      const def = createPipeline("project-review", { roles: ["pm", "qa"] });
      expect(def.name).toBe("project-review");
      expect(Object.keys(def.states)).toHaveLength(6);
    });

    // Default params
    it("creates pipelines with minimal valid params", () => {
      for (const cmd of ["vuln-scan", "vuln-resolve", "review-digest", "review-post",
        "audit-report", "deps-analyze", "test-gen", "metrics-dora", "metrics-velocity", "scan-secrets"]) {
        expect(() => createPipeline(cmd, { repo: "acme/web" })).not.toThrow();
      }
      // These have different required params
      expect(() => createPipeline("incident-triage", {})).not.toThrow();
      expect(() => createPipeline("changelog-gen", { repo: "acme/web" })).not.toThrow();
      expect(() => createPipeline("migration-plan", { repo: "acme/web" })).not.toThrow();
      // Role-based reviews have no required params
      for (const cmd of ["review-as-pm", "review-as-engineer", "review-as-marketing",
        "review-as-designer", "review-as-qa", "review-as-test-architect", "review-as-sales",
        "project-review"]) {
        expect(() => createPipeline(cmd, {})).not.toThrow();
      }
    });

    it("rejects pipelines with missing required params", () => {
      expect(() => createPipeline("vuln-scan", {})).toThrow(/repo.*required/i);
      expect(() => createPipeline("vuln-scan", { repo: "" })).toThrow(/repo/i);
    });

    it("rejects invalid maxIterations", () => {
      expect(() => createPipeline("vuln-resolve", { repo: "acme/web", maxIterations: "invalid" })).toThrow(/maxIterations/);
      expect(() => createPipeline("vuln-resolve", { repo: "acme/web", maxIterations: -1 })).toThrow(/maxIterations/);
      expect(() => createPipeline("vuln-resolve", { repo: "acme/web", maxIterations: 1.5 })).toThrow(/maxIterations/);
    });

    it("throws for unknown command", () => {
      expect(() => createPipeline("nonexistent", {})).toThrow(/Unknown pipeline command/);
    });
  });
});
