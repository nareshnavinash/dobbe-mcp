import { describe, it, expect, beforeEach } from "vitest";
import { StateMachine } from "../../src/state/machine.js";
import { createVulnResolvePipeline } from "../../src/pipelines/vuln-resolve.js";

describe("vuln-resolve pipeline", () => {
  let machine: StateMachine;

  beforeEach(() => {
    machine = new StateMachine();
  });

  describe("createVulnResolvePipeline", () => {
    it("creates a valid pipeline definition", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });

      expect(def.name).toBe("vuln-resolve");
      expect(def.initialState).toBe("scan");
      expect(def.terminalStates).toEqual(["done", "failed"]);
      expect(def.maxIterations).toBe(3);
    });

    it("respects custom maxIterations", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
        maxIterations: 5,
      });
      expect(def.maxIterations).toBe(5);
    });

    it("includes all required states", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      const states = Object.keys(def.states);
      expect(states).toContain("scan");
      expect(states).toContain("fix");
      expect(states).toContain("commit");
      expect(states).toContain("verify");
      expect(states).toContain("report");
      expect(states).toContain("pr");
      expect(states).toContain("done");
      expect(states).toContain("failed");
    });

    it("includes repo in scan instruction", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      expect(def.states.scan.instruction).toContain("acme/web-app");
    });

    it("includes baseBranch in verify instruction", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
        baseBranch: "develop",
      });
      expect(def.states.verify.instruction).toContain("develop");
    });

    it("defaults baseBranch to main", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      expect(def.states.verify.instruction).toContain("main");
      expect(def.states.pr.instruction).toContain("main");
    });

    it("verify has pass and fail transitions", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      expect(def.states.verify.transitions).toHaveProperty("pass");
      expect(def.states.verify.transitions).toHaveProperty("fail");
      expect(def.states.verify.transitions.pass).toBe("report");
      expect(def.states.verify.transitions.fail).toBe("fix");
    });

    it("registers and creates session", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      machine.registerPipeline(def);
      const session = machine.createSession("vuln-resolve", "s1", {});
      expect(session.currentState).toBe("scan");
    });
  });

  describe("happy path: scan → fix → commit → verify(pass) → report → pr → done", () => {
    it("walks through complete pipeline", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      machine.registerPipeline(def);
      const session = machine.createSession("vuln-resolve", "s1", {});

      // Scan
      machine.advance(session, {
        groups: [{ package_name: "lodash", ecosystem: "npm", current_version: "4.17.20",
          target_version: "4.17.21", alerts: [{ number: 1, package_name: "lodash",
          current_version: "4.17.20", severity: "critical", title: "Prototype Pollution" }],
          risk_assessment: "Active", action: "fix", reason: "Critical" }],
        total_alerts: 1, fixable: 1, skipped: 0, summary: "1 alert.",
      });
      expect(session.currentState).toBe("fix");

      // Fix
      machine.advance(session, {
        fixes: [{ package_name: "lodash", file_modified: "package.json",
          old_version: "4.17.20", new_version: "4.17.21", alerts_addressed: [1], status: "applied" }],
        skipped: [], diff_summary: "Updated lodash.",
      });
      expect(session.currentState).toBe("commit");

      // Commit
      machine.advance(session, { committed: true, message: "fix: upgrade lodash" });
      expect(session.currentState).toBe("verify");

      // Verify (pass)
      machine.advance(session, {
        passed: true, issues: [], test_output: "42 passed", feedback: "",
      }, "pass");
      expect(session.currentState).toBe("report");

      // Report
      machine.advance(session, { summary: "Fixed 1 vulnerability." });
      expect(session.currentState).toBe("pr");

      // PR
      const final = machine.advance(session, {
        pr_url: "https://github.com/acme/web-app/pull/42",
        pr_number: 42, branch: "fix/dobbe-security-2026-04-09",
      });
      expect(session.currentState).toBe("done");
      expect(session.done).toBe(true);
      expect(final.done).toBe(true);
    });
  });

  describe("retry path: verify(fail) → fix → verify(pass)", () => {
    it("supports retry via machine.retry", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      machine.registerPipeline(def);
      const session = machine.createSession("vuln-resolve", "s1", {});

      // Advance to verify
      machine.advance(session, { groups: [], total_alerts: 0, fixable: 0, skipped: 0, summary: "n/a" });
      machine.advance(session, { fixes: [], skipped: [], diff_summary: "none" });
      machine.advance(session, { committed: true });
      expect(session.currentState).toBe("verify");

      // Verify fails — use retry
      const canRetry = machine.retry(session, "Tests failed: TypeError", "fix");
      expect(canRetry).toBe(true);
      expect(session.currentState).toBe("fix");
      expect(session.iteration).toBe(2);
      expect(session.feedback).toContain("Tests failed: TypeError");
    });

    it("stops retrying at max iterations", () => {
      const def = createVulnResolvePipeline({
        repo: "acme/web-app",
        severity: "critical",
        maxIterations: 2,
      });
      machine.registerPipeline(def);
      const session = machine.createSession("vuln-resolve", "s1", {});

      // Set up at max iterations
      session.iteration = 2;
      const canRetry = machine.retry(session, "Still failing", "fix");
      expect(canRetry).toBe(false);
    });
  });
});
