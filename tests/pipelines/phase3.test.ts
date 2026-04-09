import { describe, it, expect, beforeEach } from "vitest";
import { StateMachine } from "../../src/state/machine.js";
import { createReviewPostPipeline } from "../../src/pipelines/review-post.js";
import { createAuditReportPipeline } from "../../src/pipelines/audit-report.js";
import { createDepsAnalyzePipeline } from "../../src/pipelines/deps-analyze.js";
import { createTestGenPipeline } from "../../src/pipelines/test-gen.js";
import { createChangelogGenPipeline } from "../../src/pipelines/changelog-gen.js";
import { createMigrationPlanPipeline } from "../../src/pipelines/migration-plan.js";
import { createMetricsDoraPipeline, createMetricsVelocityPipeline } from "../../src/pipelines/metrics.js";
import { createScanSecretsPipeline } from "../../src/pipelines/scan-secrets.js";

describe("Phase 3 pipelines", () => {
  let machine: StateMachine;

  beforeEach(() => {
    machine = new StateMachine();
  });

  // ─── Review Post ───

  describe("review-post", () => {
    it("creates batch pipeline", () => {
      const def = createReviewPostPipeline({ repo: "acme/web" });
      expect(def.name).toBe("review-post");
      expect(def.initialState).toBe("fetch");
      expect(Object.keys(def.states)).toEqual(["fetch", "review", "post", "done"]);
    });

    it("creates single PR pipeline", () => {
      const def = createReviewPostPipeline({ repo: "acme/web", prNumber: 42 });
      expect(def.states.fetch.instruction).toContain("#42");
    });

    it("supports dry run", () => {
      const def = createReviewPostPipeline({ repo: "acme/web", dryRun: true });
      expect(def.states.post.instruction).toContain("Dry run");
    });

    it("walks through fetch → review → post → done", () => {
      const def = createReviewPostPipeline({ repo: "acme/web" });
      machine.registerPipeline(def);
      const session = machine.createSession("review-post", "s1", {});

      machine.advance(session, { prs: [{ number: 1, title: "Test", author: "dev", repo: "acme/web" }], total: 1 });
      expect(session.currentState).toBe("review");

      machine.advance(session, {
        reviews: [{ pr: { number: 1, title: "Test", author: "dev", repo: "acme/web" },
          review: { risk_level: "low", summary: "OK", concerns: [], recommendations: [], approval_recommendation: "approve" } }],
        summary: "1 PR reviewed.",
      });
      expect(session.currentState).toBe("post");

      machine.advance(session, { posted: [{ pr_number: 1, repo: "acme/web", risk_level: "low" }], skipped: [], summary: "1 posted." });
      expect(session.done).toBe(true);
    });
  });

  // ─── Audit Report ───

  describe("audit-report", () => {
    it("creates pipeline with all checks", () => {
      const def = createAuditReportPipeline({ repo: "acme/web" });
      expect(def.name).toBe("audit-report");
      expect(def.states.analyze.instruction).toContain("vuln");
      expect(def.states.analyze.instruction).toContain("license");
      expect(def.states.analyze.instruction).toContain("secrets");
      expect(def.states.analyze.instruction).toContain("quality");
    });

    it("respects custom checks", () => {
      const def = createAuditReportPipeline({ repo: "acme/web", checks: ["vuln", "secrets"] });
      expect(def.states.analyze.instruction).toContain("vuln");
      expect(def.states.analyze.instruction).toContain("secrets");
      expect(def.states.analyze.instruction).not.toContain("License check");
    });

    it("walks through analyze → done", () => {
      const def = createAuditReportPipeline({ repo: "acme/web" });
      machine.registerPipeline(def);
      const session = machine.createSession("audit-report", "s1", {});

      const done = machine.advance(session, {
        risk_score: "medium", findings: [], summary: "Clean audit.",
      });
      expect(done.done).toBe(true);
    });
  });

  // ─── Deps Analyze ───

  describe("deps-analyze", () => {
    it("creates pipeline", () => {
      const def = createDepsAnalyzePipeline({ repo: "acme/web" });
      expect(def.name).toBe("deps-analyze");
      expect(def.initialState).toBe("analyze");
    });

    it("includes ecosystem filter", () => {
      const def = createDepsAnalyzePipeline({ repo: "acme/web", ecosystem: "npm" });
      expect(def.states.analyze.instruction).toContain("npm");
    });

    it("walks through analyze → done", () => {
      const def = createDepsAnalyzePipeline({ repo: "acme/web" });
      machine.registerPipeline(def);
      const session = machine.createSession("deps-analyze", "s1", {});

      const done = machine.advance(session, { findings: [], summary: "All healthy." });
      expect(done.done).toBe(true);
    });
  });

  // ─── Test Gen ───

  describe("test-gen", () => {
    it("creates pipeline with retry", () => {
      const def = createTestGenPipeline({ repo: "acme/web" });
      expect(def.name).toBe("test-gen");
      expect(def.maxIterations).toBe(3);
      expect(def.terminalStates).toContain("failed");
    });

    it("includes commit+pr states when createPr=true", () => {
      const def = createTestGenPipeline({ repo: "acme/web", createPr: true });
      expect(Object.keys(def.states)).toContain("commit");
      expect(Object.keys(def.states)).toContain("pr");
    });

    it("excludes commit+pr when createPr=false", () => {
      const def = createTestGenPipeline({ repo: "acme/web", createPr: false });
      expect(Object.keys(def.states)).not.toContain("commit");
      expect(Object.keys(def.states)).not.toContain("pr");
    });

    it("includes target files in instruction", () => {
      const def = createTestGenPipeline({ repo: "acme/web", targetFiles: ["src/auth.ts", "src/db.ts"] });
      expect(def.states.analyze.instruction).toContain("src/auth.ts");
    });

    it("verify has pass/fail transitions", () => {
      const def = createTestGenPipeline({ repo: "acme/web" });
      expect(def.states.verify.transitions.pass).toBe("commit");
      expect(def.states.verify.transitions.fail).toBe("generate");
    });

    it("walks through happy path", () => {
      const def = createTestGenPipeline({ repo: "acme/web" });
      machine.registerPipeline(def);
      const session = machine.createSession("test-gen", "s1", {});

      // Analyze
      machine.advance(session, { coverage_gaps: [{ file_path: "src/auth.ts", reason: "No tests" }], framework: "jest" });
      expect(session.currentState).toBe("generate");

      // Generate
      machine.advance(session, { generated_tests: [{ test_file: "tests/auth.test.ts", target_file: "src/auth.ts", test_count: 5, description: "Auth tests" }], description: "Generated auth tests" });
      expect(session.currentState).toBe("verify");

      // Verify pass
      machine.advance(session, { passed: true, test_output: "5 passed", feedback: "" }, "pass");
      expect(session.currentState).toBe("commit");
    });
  });

  // ─── Changelog Gen ───

  describe("changelog-gen", () => {
    it("creates pipeline", () => {
      const def = createChangelogGenPipeline({ repo: "acme/web", fromRef: "v1.0.0" });
      expect(def.name).toBe("changelog-gen");
      expect(def.states.analyze.instruction).toContain("v1.0.0");
    });

    it("includes toRef", () => {
      const def = createChangelogGenPipeline({ repo: "acme/web", fromRef: "v1.0.0", toRef: "v2.0.0" });
      expect(def.states.analyze.instruction).toContain("v2.0.0");
    });

    it("includes PR fetching when requested", () => {
      const def = createChangelogGenPipeline({ repo: "acme/web", fromRef: "v1.0.0", includePrs: true });
      expect(def.states.analyze.instruction).toContain("gh pr list");
    });

    it("walks through analyze → done", () => {
      const def = createChangelogGenPipeline({ repo: "acme/web", fromRef: "v1.0.0" });
      machine.registerPipeline(def);
      const session = machine.createSession("changelog-gen", "s1", {});

      const done = machine.advance(session, {
        summary: "Release notes for v1.1.0",
        sections: [{ category: "feature", entries: [{ description: "Added auth" }] }],
      });
      expect(done.done).toBe(true);
    });
  });

  // ─── Migration Plan ───

  describe("migration-plan", () => {
    it("creates plan-only pipeline", () => {
      const def = createMigrationPlanPipeline({ repo: "acme/web", fromPackage: "lodash", toPackage: "radash" });
      expect(def.name).toBe("migration-plan");
      expect(Object.keys(def.states)).toEqual(["plan", "done"]);
      expect(def.maxIterations).toBe(0);
    });

    it("creates run pipeline with retry", () => {
      const def = createMigrationPlanPipeline({ repo: "acme/web", fromPackage: "lodash", toPackage: "radash", run: true });
      expect(Object.keys(def.states)).toContain("apply");
      expect(Object.keys(def.states)).toContain("verify");
      expect(def.maxIterations).toBe(3);
      expect(def.terminalStates).toContain("failed");
    });

    it("verify has pass/fail transitions in run mode", () => {
      const def = createMigrationPlanPipeline({ repo: "acme/web", fromPackage: "a", toPackage: "b", run: true });
      expect(def.states.verify.transitions.pass).toBe("commit");
      expect(def.states.verify.transitions.fail).toBe("apply");
    });

    it("includes package names in instructions", () => {
      const def = createMigrationPlanPipeline({ repo: "acme/web", fromPackage: "moment", toPackage: "dayjs" });
      expect(def.states.plan.instruction).toContain("moment");
      expect(def.states.plan.instruction).toContain("dayjs");
    });

    it("walks through plan-only path", () => {
      const def = createMigrationPlanPipeline({ repo: "acme/web", fromPackage: "a", toPackage: "b" });
      machine.registerPipeline(def);
      const session = machine.createSession("migration-plan", "s1", {});

      const done = machine.advance(session, {
        steps: [{ description: "Replace imports" }], estimated_complexity: "low", risks: [], summary: "Simple swap",
      });
      expect(done.done).toBe(true);
    });
  });

  // ─── Metrics DORA ───

  describe("metrics-dora", () => {
    it("creates pipeline", () => {
      const def = createMetricsDoraPipeline({ repo: "acme/web" });
      expect(def.name).toBe("metrics-dora");
      expect(def.states.collect.instruction).toContain("DORA");
    });

    it("respects custom period", () => {
      const def = createMetricsDoraPipeline({ repo: "acme/web", period: "90d" });
      expect(def.states.collect.instruction).toContain("90d");
    });

    it("walks through collect → done", () => {
      const def = createMetricsDoraPipeline({ repo: "acme/web" });
      machine.registerPipeline(def);
      const session = machine.createSession("metrics-dora", "s1", {});

      const done = machine.advance(session, {
        velocity: { period: "30d", total_prs_merged: 42, avg_cycle_time_hours: 24, merge_cadence_prs_per_day: 1.4 },
        dora: { period: "30d", deploy_frequency_per_day: 0.5, lead_time_for_changes_hours: 48, change_failure_rate: 0.05, mttr_hours: 4 },
        summary: "Healthy metrics.",
      });
      expect(done.done).toBe(true);
    });
  });

  // ─── Metrics Velocity ───

  describe("metrics-velocity", () => {
    it("creates pipeline", () => {
      const def = createMetricsVelocityPipeline({ repo: "acme/web" });
      expect(def.name).toBe("metrics-velocity");
      expect(def.states.collect.instruction).toContain("velocity");
    });

    it("walks through collect → done", () => {
      const def = createMetricsVelocityPipeline({ repo: "acme/web" });
      machine.registerPipeline(def);
      const session = machine.createSession("metrics-velocity", "s1", {});

      const done = machine.advance(session, {
        velocity: { period: "30d", total_prs_merged: 30, avg_cycle_time_hours: 18, merge_cadence_prs_per_day: 1.0 },
        summary: "Good velocity.",
      });
      expect(done.done).toBe(true);
    });
  });

  // ─── Scan Secrets ───

  describe("scan-secrets", () => {
    it("creates pipeline", () => {
      const def = createScanSecretsPipeline({ repo: "acme/web" });
      expect(def.name).toBe("scan-secrets");
      expect(def.states.scan.instruction).toContain("secrets");
    });

    it("includes custom path", () => {
      const def = createScanSecretsPipeline({ repo: "acme/web", path: "src/" });
      expect(def.states.scan.instruction).toContain("src/");
    });

    it("walks through scan → done", () => {
      const def = createScanSecretsPipeline({ repo: "acme/web" });
      machine.registerPipeline(def);
      const session = machine.createSession("scan-secrets", "s1", {});

      const done = machine.advance(session, {
        total_findings: 2, false_positives: 1,
        findings: [
          { file: ".env", severity: "critical", is_false_positive: false, description: "AWS key found" },
          { file: "test/fixtures.json", severity: "low", is_false_positive: true, description: "Test API key" },
        ],
        summary: "1 real secret found.",
      });
      expect(done.done).toBe(true);
    });
  });
});
