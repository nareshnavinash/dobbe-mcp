import { describe, it, expect, beforeEach } from "vitest";
import { StateMachine } from "../../src/state/machine.js";
import { createVulnScanPipeline } from "../../src/pipelines/vuln-scan.js";
import { VulnScanResultSchema, VulnScanReportSchema } from "../../src/utils/schema.js";

describe("vuln-scan pipeline", () => {
  let machine: StateMachine;

  beforeEach(() => {
    machine = new StateMachine();
  });

  describe("createVulnScanPipeline", () => {
    it("creates a valid pipeline definition", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });

      expect(def.name).toBe("vuln-scan");
      expect(def.initialState).toBe("scan");
      expect(def.terminalStates).toEqual(["done"]);
      expect(def.maxIterations).toBe(0);
    });

    it("includes repo in scan instruction", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });

      expect(def.states.scan.instruction).toContain("acme/web-app");
    });

    it("includes severity filter in instruction", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical",
      });

      expect(def.states.scan.instruction).toContain("critical");
    });

    it("defaults severity to all levels", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "",
      });

      expect(def.states.scan.instruction).toContain("critical,high,medium,low");
    });

    it("has scan, report, and done states", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });

      expect(Object.keys(def.states)).toEqual(["scan", "report", "done"]);
    });

    it("scan transitions to report", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });

      expect(def.states.scan.transitions.default).toBe("report");
    });

    it("report transitions to done", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });

      expect(def.states.report.transitions.default).toBe("done");
    });
  });

  describe("pipeline registration and execution", () => {
    it("registers successfully", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });

      expect(() => machine.registerPipeline(def)).not.toThrow();
    });

    it("walks through scan → report → done", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical,high",
      });
      machine.registerPipeline(def);

      const session = machine.createSession("vuln-scan", "test-1", {
        repo: "acme/web-app",
      });

      // Step 1: Get scan instruction
      const scanStep = machine.getCurrentStep(session);
      expect(scanStep.step).toBe("scan");
      expect(scanStep.next).toBe("pipeline_step");

      // Step 2: Submit scan results, advance to report
      const scanResult = {
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
                patched_version: "4.17.21",
                severity: "critical",
                cve: "CVE-2021-23337",
                title: "Prototype Pollution",
              },
            ],
            risk_assessment: "In use -- imported in src/utils.js",
            action: "fix",
            reason: "Critical severity, code path is active",
          },
        ],
        total_alerts: 1,
        fixable: 1,
        skipped: 0,
        summary: "1 critical alert found, all fixable.",
      };

      const reportStep = machine.advance(session, scanResult);
      expect(reportStep.step).toBe("report");
      expect(session.currentState).toBe("report");

      // Step 3: Submit report, advance to done
      const reportResult = {
        report: "# Vulnerability Scan Report\n\n1 critical alert found.",
      };

      const doneStep = machine.advance(session, reportResult);
      expect(doneStep.done).toBe(true);
      expect(session.done).toBe(true);
      expect(session.currentState).toBe("done");
    });

    it("rejects invalid scan results", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      machine.registerPipeline(def);
      const session = machine.createSession("vuln-scan", "test-1", {});

      // Missing required fields
      expect(() =>
        machine.advance(session, { invalid: true }),
      ).toThrow();
    });

    it("rejects invalid report results", () => {
      const def = createVulnScanPipeline({
        repo: "acme/web-app",
        severity: "critical",
      });
      machine.registerPipeline(def);
      const session = machine.createSession("vuln-scan", "test-1", {});

      // Advance past scan with valid data
      machine.advance(session, {
        groups: [],
        total_alerts: 0,
        fixable: 0,
        skipped: 0,
        summary: "No alerts.",
      });

      // Now submit invalid report
      expect(() =>
        machine.advance(session, { wrong: "field" }),
      ).toThrow();
    });
  });

  describe("schema validation", () => {
    it("VulnScanResultSchema validates correct data", () => {
      const valid = {
        groups: [],
        total_alerts: 0,
        fixable: 0,
        skipped: 0,
        summary: "Clean.",
      };
      expect(VulnScanResultSchema.safeParse(valid).success).toBe(true);
    });

    it("VulnScanResultSchema rejects missing fields", () => {
      expect(VulnScanResultSchema.safeParse({}).success).toBe(false);
      expect(VulnScanResultSchema.safeParse({ groups: [] }).success).toBe(false);
    });

    it("VulnScanReportSchema validates correct data", () => {
      const valid = { report: "# Report\nContent here." };
      expect(VulnScanReportSchema.safeParse(valid).success).toBe(true);
    });

    it("VulnScanReportSchema rejects missing report", () => {
      expect(VulnScanReportSchema.safeParse({}).success).toBe(false);
    });
  });
});
