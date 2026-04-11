import { describe, it, expect, beforeEach } from "vitest";
import { PipelineService } from "../../src/tools/pipeline.js";

/**
 * Integration tests for the vuln-resolve retry loop.
 * These test the full pipeline_start → pipeline_step → pipeline_complete flow
 * with verify failures triggering automatic retries.
 */

describe("vuln-resolve retry loop (integration)", () => {
  let svc: PipelineService;

  beforeEach(() => {
    svc = new PipelineService();
  });

  async function startResolvePipeline() {
    return svc.pipelineStart({
      command: "vuln-resolve",
      params: { repo: "acme/web-app", severity: "critical,high", maxIterations: 3 },
    });
  }

  const validScanResult = {
    groups: [{ package_name: "lodash", ecosystem: "npm", current_version: "4.17.20",
      target_version: "4.17.21",
      alerts: [{ number: 1, package_name: "lodash", current_version: "4.17.20",
        severity: "critical" as const, title: "Prototype Pollution" }],
      risk_assessment: "Active", action: "fix" as const, reason: "Critical" }],
    total_alerts: 1, fixable: 1, skipped: 0, summary: "1 alert.",
  };

  const validFixResult = {
    fixes: [{ package_name: "lodash", file_modified: "package.json",
      old_version: "4.17.20", new_version: "4.17.21",
      alerts_addressed: [1], status: "applied" }],
    skipped: [], diff_summary: "Updated lodash.",
  };

  const validCommitResult = { committed: true, message: "fix: upgrade lodash" };

  describe("happy path (no retries needed)", () => {
    it("completes scan → fix → commit → verify(pass) → report → pr → done", async () => {
      const start = await startResolvePipeline();
      expect(start.step).toBe("scan");

      const fix = await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      expect(fix.step).toBe("fix");

      const commit = await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      expect(commit.step).toBe("commit");

      const verify = await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });
      expect(verify.step).toBe("verify");

      const report = await svc.pipelineStep({
        session_id: start.session_id,
        result: { passed: true, issues: [], test_output: "42 passed", feedback: "" },
      });
      expect(report.step).toBe("report");

      const pr = await svc.pipelineStep({
        session_id: start.session_id,
        result: { summary: "Fixed 1 vulnerability." },
      });
      expect(pr.step).toBe("pr");

      const done = await svc.pipelineStep({
        session_id: start.session_id,
        result: { pr_url: "https://github.com/acme/web-app/pull/42",
          pr_number: 42, branch: "fix/dobbe-security" },
      });
      expect(done.done).toBe(true);
    });
  });

  describe("retry path (verify fails, then passes)", () => {
    it("loops back to fix when verify fails", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const retry = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [{ category: "test_failure", severity: "high",
            description: "TypeError in utils.js", suggestion: "Fix import" }],
          test_output: "FAIL: TypeError: Cannot read property 'foo'",
          feedback: "The lodash upgrade broke the import in utils.js. Try pinning to 4.17.21.",
        },
      });

      expect(retry.step).toBe("fix");
      expect(retry.iteration).toBe(2);
      expect(retry.feedback).toContain("lodash upgrade broke");

      const status = await svc.pipelineStatus({ session_id: start.session_id });
      expect(status.currentState).toBe("fix");
      expect(status.iteration).toBe(2);
    });

    it("succeeds on second iteration", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });
      await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [{ category: "test_failure", severity: "high",
            description: "Import error", suggestion: "Fix import" }],
          test_output: "FAIL", feedback: "Fix the import",
        },
      });

      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });
      const report = await svc.pipelineStep({
        session_id: start.session_id,
        result: { passed: true, issues: [], test_output: "42 passed", feedback: "" },
      });

      expect(report.step).toBe("report");
    });
  });

  describe("max iterations reached", () => {
    it("transitions to failed after max iterations", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-resolve",
        params: { repo: "acme/web-app", maxIterations: 2 },
      });

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });
      await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false, issues: [], test_output: "FAIL",
          feedback: "Still broken",
        },
      });

      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const failed = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false, issues: [], test_output: "FAIL again",
          feedback: "Still broken after 2 tries",
        },
      });

      expect(failed.done).toBe(true);
      expect(failed.step).toBe("failed");
      expect(failed.intent).toContain("maximum iterations");
    });
  });

  describe("feedback extraction", () => {
    it("extracts feedback from verify result", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const retry = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [],
          test_output: "ERROR: Module not found: lodash/fp",
          feedback: "The upgrade removed lodash/fp sub-module",
        },
      });

      expect(retry.feedback).toContain("lodash/fp sub-module");
      expect(retry.feedback).toContain("Module not found");
    });

    it("includes errors field in feedback", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const retry = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [],
          test_output: "",
          feedback: "",
          errors: "TypeError: Cannot read properties of undefined (reading 'map')",
        },
      });

      expect(retry.feedback).toContain("Errors:");
      expect(retry.feedback).toContain("TypeError");
    });

    it("truncates long test_output in feedback", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const longOutput = "FAIL ".repeat(500); // >2000 chars

      const retry = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [],
          test_output: longOutput,
          feedback: "Tests are failing",
        },
      });

      expect(retry.feedback).toContain("(truncated)");
      expect(retry.feedback).toContain("Tests are failing");
    });

    it("handles missing feedback gracefully", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const retry = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [],
          test_output: "",
          feedback: "",
        },
      });

      expect(retry.step).toBe("fix");
      expect(retry.iteration).toBe(2);
    });
  });

  describe("auto-outcome detection", () => {
    it("auto-detects pass outcome from passed=true", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const report = await svc.pipelineStep({
        session_id: start.session_id,
        result: { passed: true, issues: [], test_output: "ok", feedback: "" },
      });

      expect(report.step).toBe("report");
    });

    it("auto-detects fail outcome from passed=false", async () => {
      const start = await startResolvePipeline();

      await svc.pipelineStep({ session_id: start.session_id, result: validScanResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validFixResult });
      await svc.pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const retry = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false, issues: [], test_output: "FAIL", feedback: "broken",
        },
      });

      expect(retry.step).toBe("fix");
      expect(retry.iteration).toBe(2);
    });
  });
});
