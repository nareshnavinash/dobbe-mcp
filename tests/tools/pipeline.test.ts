import { describe, it, expect, beforeEach } from "vitest";
import { PipelineService } from "../../src/tools/pipeline.js";

describe("Pipeline tool handlers", () => {
  let svc: PipelineService;

  beforeEach(() => {
    svc = new PipelineService();
  });

  describe("pipelineStart", () => {
    it("starts a vuln-scan pipeline and returns first instruction", async () => {
      const result = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app", severity: "critical,high" },
      });

      expect(result.session_id).toBeTruthy();
      expect(result.step).toBe("scan");
      expect(result.instruction).toContain("acme/web-app");
      expect(result.next).toBe("pipeline_step");
    });

    it("returns a unique session ID each time", async () => {
      const r1 = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web" },
      });
      const r2 = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web" },
      });

      expect(r1.session_id).not.toBe(r2.session_id);
    });

    it("throws for unknown command", async () => {
      await expect(
        svc.pipelineStart({ command: "nonexistent", params: {} }),
      ).rejects.toThrow(/Unknown pipeline command/);
    });
  });

  describe("pipelineStep", () => {
    it("advances pipeline with valid results", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      const result = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          groups: [],
          total_alerts: 0,
          fixable: 0,
          skipped: 0,
          summary: "No alerts found.",
        },
      });

      expect(result.step).toBe("report");
      expect(result.session_id).toBe(start.session_id);
    });

    it("returns validation error for invalid results", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      const result = await svc.pipelineStep({
        session_id: start.session_id,
        result: { invalid: true },
      });

      expect(result.instruction).toContain("didn't match");
      expect(result.step).toBe("scan");
    });

    it("throws for unknown session", async () => {
      await expect(
        svc.pipelineStep({ session_id: "nonexistent", result: {} }),
      ).rejects.toThrow(/not found/);
    });

    it("completes full pipeline: scan → report → done", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      const reportStep = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          groups: [
            {
              package_name: "lodash",
              ecosystem: "npm",
              current_version: "4.17.20",
              target_version: "4.17.21",
              alerts: [
                {
                  number: 1,
                  package_name: "lodash",
                  current_version: "4.17.20",
                  severity: "critical",
                  title: "Prototype Pollution",
                },
              ],
              risk_assessment: "Active code path",
              action: "fix",
              reason: "Critical, in use",
            },
          ],
          total_alerts: 1,
          fixable: 1,
          skipped: 0,
          summary: "1 alert found.",
        },
      });
      expect(reportStep.step).toBe("report");

      const doneStep = await svc.pipelineStep({
        session_id: start.session_id,
        result: { report: "# Report\n1 vulnerability found." },
      });
      expect(doneStep.done).toBe(true);
    });
  });

  describe("pipelineComplete", () => {
    it("finalizes a completed pipeline", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          groups: [],
          total_alerts: 0,
          fixable: 0,
          skipped: 0,
          summary: "Clean.",
        },
      });
      await svc.pipelineStep({
        session_id: start.session_id,
        result: { report: "Clean scan." },
      });

      const complete = await svc.pipelineComplete({
        session_id: start.session_id,
        result: { summary: "All clear." },
      });

      expect(complete.done).toBe(true);
      expect(complete.summary).toContain("completed");
      expect(complete.session_id).toBe(start.session_id);
    });

    it("works without a result object", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      const complete = await svc.pipelineComplete({
        session_id: start.session_id,
      });

      expect(complete.done).toBe(true);
      expect(complete.summary).toContain("completed");
    });

    it("includes pr_url in summary when present", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      const complete = await svc.pipelineComplete({
        session_id: start.session_id,
        result: { pr_url: "https://github.com/acme/web-app/pull/42" },
      });

      expect(complete.summary).toContain("https://github.com/acme/web-app/pull/42");
    });

    it("throws for unknown session", async () => {
      await expect(
        svc.pipelineComplete({ session_id: "nonexistent" }),
      ).rejects.toThrow(/not found/);
    });
  });

  describe("pipelineStatus", () => {
    it("returns current pipeline state", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      const status = await svc.pipelineStatus({ session_id: start.session_id });
      expect(status.currentState).toBe("scan");
      expect(status.done).toBe(false);
      expect(status.iteration).toBe(1);
      expect(status.stepsCompleted).toEqual([]);
    });

    it("reflects state after advancing", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          groups: [],
          total_alerts: 0,
          fixable: 0,
          skipped: 0,
          summary: "Clean.",
        },
      });

      const status = await svc.pipelineStatus({ session_id: start.session_id });
      expect(status.currentState).toBe("report");
      expect(status.stepsCompleted).toContain("scan");
    });
  });

  describe("pipelineList", () => {
    it("lists available commands", () => {
      const result = svc.pipelineList();
      expect(result.commands).toContain("vuln-scan");
    });
  });

  describe("pipelineStep edge cases", () => {
    it("handles outcome parameter", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      const result = await svc.pipelineStep({
        session_id: start.session_id,
        result: {
          groups: [],
          total_alerts: 0,
          fixable: 0,
          skipped: 0,
          summary: "Clean.",
        },
        outcome: "default",
      });

      expect(result.step).toBe("report");
    });
  });

  describe("pipelineStatus edge cases", () => {
    it("shows done after complete", async () => {
      const start = await svc.pipelineStart({
        command: "vuln-scan",
        params: { repo: "acme/web-app" },
      });

      await svc.pipelineComplete({ session_id: start.session_id });

      const status = await svc.pipelineStatus({ session_id: start.session_id });
      expect(status.done).toBe(true);
    });
  });
});
