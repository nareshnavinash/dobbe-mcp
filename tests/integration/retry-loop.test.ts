import { describe, it, expect, beforeEach } from "vitest";
import {
  pipelineStart,
  pipelineStep,
  pipelineComplete,
  pipelineStatus,
  _resetForTesting,
} from "../../src/tools/pipeline.js";

/**
 * Integration tests for the vuln-resolve retry loop.
 * These test the full pipeline_start → pipeline_step → pipeline_complete flow
 * with verify failures triggering automatic retries.
 */

describe("vuln-resolve retry loop (integration)", () => {
  beforeEach(() => {
    _resetForTesting();
  });

  function startResolvePipeline() {
    return pipelineStart({
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
    it("completes scan → fix → commit → verify(pass) → report → pr → done", () => {
      const start = startResolvePipeline();
      expect(start.step).toBe("scan");

      // Scan
      const fix = pipelineStep({ session_id: start.session_id, result: validScanResult });
      expect(fix.step).toBe("fix");

      // Fix
      const commit = pipelineStep({ session_id: start.session_id, result: validFixResult });
      expect(commit.step).toBe("commit");

      // Commit
      const verify = pipelineStep({ session_id: start.session_id, result: validCommitResult });
      expect(verify.step).toBe("verify");

      // Verify — passes
      const report = pipelineStep({
        session_id: start.session_id,
        result: { passed: true, issues: [], test_output: "42 passed", feedback: "" },
      });
      expect(report.step).toBe("report");

      // Report
      const pr = pipelineStep({
        session_id: start.session_id,
        result: { summary: "Fixed 1 vulnerability." },
      });
      expect(pr.step).toBe("pr");

      // PR
      const done = pipelineStep({
        session_id: start.session_id,
        result: { pr_url: "https://github.com/acme/web-app/pull/42",
          pr_number: 42, branch: "fix/dobbe-security" },
      });
      expect(done.done).toBe(true);
    });
  });

  describe("retry path (verify fails, then passes)", () => {
    it("loops back to fix when verify fails", () => {
      const start = startResolvePipeline();

      // Get to verify
      pipelineStep({ session_id: start.session_id, result: validScanResult });
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });

      // Verify fails
      const retry = pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [{ category: "test_failure", severity: "high",
            description: "TypeError in utils.js", suggestion: "Fix import" }],
          test_output: "FAIL: TypeError: Cannot read property 'foo'",
          feedback: "The lodash upgrade broke the import in utils.js. Try pinning to 4.17.21.",
        },
      });

      // Should loop back to fix with feedback
      expect(retry.step).toBe("fix");
      expect(retry.iteration).toBe(2);
      expect(retry.feedback).toContain("lodash upgrade broke");

      // Check status
      const status = pipelineStatus({ session_id: start.session_id });
      expect(status.currentState).toBe("fix");
      expect(status.iteration).toBe(2);
    });

    it("succeeds on second iteration", () => {
      const start = startResolvePipeline();

      // First iteration: scan → fix → commit → verify(fail)
      pipelineStep({ session_id: start.session_id, result: validScanResult });
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });
      pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [{ category: "test_failure", severity: "high",
            description: "Import error", suggestion: "Fix import" }],
          test_output: "FAIL", feedback: "Fix the import",
        },
      });

      // Second iteration: fix → commit → verify(pass)
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });
      const report = pipelineStep({
        session_id: start.session_id,
        result: { passed: true, issues: [], test_output: "42 passed", feedback: "" },
      });

      expect(report.step).toBe("report");
    });
  });

  describe("max iterations reached", () => {
    it("transitions to failed after max iterations", () => {
      const start = pipelineStart({
        command: "vuln-resolve",
        params: { repo: "acme/web-app", maxIterations: 2 },
      });

      // First iteration
      pipelineStep({ session_id: start.session_id, result: validScanResult });
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });
      pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false, issues: [], test_output: "FAIL",
          feedback: "Still broken",
        },
      });

      // Second iteration
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });

      // This verify fail should hit max iterations
      const failed = pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false, issues: [], test_output: "FAIL again",
          feedback: "Still broken after 2 tries",
        },
      });

      expect(failed.done).toBe(true);
      expect(failed.step).toBe("failed");
      expect(failed.instruction).toContain("maximum iterations");
    });
  });

  describe("feedback extraction", () => {
    it("extracts feedback from verify result", () => {
      const start = startResolvePipeline();

      pipelineStep({ session_id: start.session_id, result: validScanResult });
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const retry = pipelineStep({
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

    it("handles missing feedback gracefully", () => {
      const start = startResolvePipeline();

      pipelineStep({ session_id: start.session_id, result: validScanResult });
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });

      const retry = pipelineStep({
        session_id: start.session_id,
        result: {
          passed: false,
          issues: [],
          test_output: "",
          feedback: "",
        },
      });

      // Should still retry even without detailed feedback
      expect(retry.step).toBe("fix");
      expect(retry.iteration).toBe(2);
    });
  });

  describe("auto-outcome detection", () => {
    it("auto-detects pass outcome from passed=true", () => {
      const start = startResolvePipeline();

      pipelineStep({ session_id: start.session_id, result: validScanResult });
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });

      // Don't pass explicit outcome — should auto-detect from passed=true
      const report = pipelineStep({
        session_id: start.session_id,
        result: { passed: true, issues: [], test_output: "ok", feedback: "" },
        // No outcome specified
      });

      expect(report.step).toBe("report");
    });

    it("auto-detects fail outcome from passed=false", () => {
      const start = startResolvePipeline();

      pipelineStep({ session_id: start.session_id, result: validScanResult });
      pipelineStep({ session_id: start.session_id, result: validFixResult });
      pipelineStep({ session_id: start.session_id, result: validCommitResult });

      // Don't pass explicit outcome — should auto-detect from passed=false
      const retry = pipelineStep({
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
