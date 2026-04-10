import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { PipelineService } from "../../src/tools/pipeline.js";
import { SessionStorage } from "../../src/state/storage.js";

/**
 * Integration tests for pipeline recovery after server restart.
 * Verifies that a session saved to disk can be recovered by a fresh PipelineService.
 */

describe("pipeline recovery (integration)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-recovery-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("recovers a pipeline session from disk after restart", async () => {
    const storage = new SessionStorage(tmpDir);

    // Start a pipeline with the first service instance
    const svc1 = new PipelineService(storage);
    const start = await svc1.pipelineStart({
      command: "vuln-scan",
      params: { repo: "acme/web-app" },
    });
    expect(start.step).toBe("scan");

    // Advance one step
    await svc1.pipelineStep({
      session_id: start.session_id,
      result: {
        groups: [],
        total_alerts: 0,
        fixable: 0,
        skipped: 0,
        summary: "No alerts.",
      },
    });

    // Simulate server restart -- create a fresh PipelineService
    const svc2 = new PipelineService(storage);

    // The new service should be able to recover the session
    const status = await svc2.pipelineStatus({ session_id: start.session_id });
    expect(status.currentState).toBe("report");
    expect(status.pipeline).toContain("vuln-scan");

    // And continue the pipeline
    const done = await svc2.pipelineStep({
      session_id: start.session_id,
      result: { report: "Clean scan." },
    });
    expect(done.done).toBe(true);
  });

  it("recovers a vuln-resolve pipeline mid-retry", async () => {
    const storage = new SessionStorage(tmpDir);

    // Start and advance to verify step
    const svc1 = new PipelineService(storage);
    const start = await svc1.pipelineStart({
      command: "vuln-resolve",
      params: { repo: "acme/web-app", maxIterations: 3 },
    });

    await svc1.pipelineStep({
      session_id: start.session_id,
      result: {
        groups: [{ package_name: "lodash", ecosystem: "npm", current_version: "4.17.20",
          target_version: "4.17.21",
          alerts: [{ number: 1, package_name: "lodash", current_version: "4.17.20",
            severity: "critical" as const, title: "Prototype Pollution" }],
          risk_assessment: "Active", action: "fix" as const, reason: "Critical" }],
        total_alerts: 1, fixable: 1, skipped: 0, summary: "1 alert.",
      },
    });

    await svc1.pipelineStep({
      session_id: start.session_id,
      result: {
        fixes: [{ package_name: "lodash", file_modified: "package.json",
          old_version: "4.17.20", new_version: "4.17.21",
          alerts_addressed: [1], status: "applied" }],
        skipped: [], diff_summary: "Updated lodash.",
      },
    });

    // Simulate restart
    const svc2 = new PipelineService(storage);

    // Should recover and continue from commit step
    const status = await svc2.pipelineStatus({ session_id: start.session_id });
    expect(status.currentState).toBe("commit");
    expect(status.iteration).toBe(1);
  });

  it("throws PIPELINE_NOT_REGISTERED when session lacks command/params", async () => {
    const storage = new SessionStorage(tmpDir);

    // Manually write a session file with no command/params
    const sessionId = "orphan-session-id";
    const orphanSession = {
      id: sessionId,
      pipeline: "nonexistent-pipeline-xyz",
      command: "",
      currentState: "scan",
      iteration: 1,
      stepResults: {},
      feedback: [],
      params: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      done: false,
    };
    // Write directly to storage directory
    const filePath = path.join(tmpDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(orphanSession));

    const svc = new PipelineService(storage);

    await expect(
      svc.pipelineStatus({ session_id: sessionId }),
    ).rejects.toThrow(/not registered/);
  });
});
