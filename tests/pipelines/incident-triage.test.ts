import { describe, it, expect, beforeEach } from "vitest";
import { StateMachine } from "../../src/state/machine.js";
import { createIncidentTriagePipeline } from "../../src/pipelines/incident-triage.js";

describe("incident-triage pipeline", () => {
  let machine: StateMachine;

  beforeEach(() => {
    machine = new StateMachine();
  });

  describe("batch triage mode", () => {
    it("creates a batch pipeline without issueId", () => {
      const def = createIncidentTriagePipeline({ org: "my-org" });
      expect(def.name).toBe("incident-triage");
      expect(def.initialState).toBe("fetch");
      expect(def.terminalStates).toEqual(["done"]);
      expect(Object.keys(def.states)).toEqual(["fetch", "done"]);
    });

    it("includes org in context", () => {
      const def = createIncidentTriagePipeline({ org: "acme-corp" });
      const ctx = def.states.fetch.context as Record<string, unknown>;
      expect(ctx.org).toBe("acme-corp");
    });

    it("includes project filter", () => {
      const def = createIncidentTriagePipeline({ org: "acme", project: "web-app" });
      const ctx = def.states.fetch.context as Record<string, unknown>;
      expect(ctx.project).toBe("web-app");
    });

    it("includes severity filter", () => {
      const def = createIncidentTriagePipeline({ org: "acme", severity: "critical,high" });
      const ctx = def.states.fetch.context as Record<string, unknown>;
      expect(ctx.severity).toBe("critical,high");
    });

    it("includes since filter", () => {
      const def = createIncidentTriagePipeline({ org: "acme", since: "7 days" });
      const ctx = def.states.fetch.context as Record<string, unknown>;
      expect(ctx.since).toBe("7 days");
    });

    it("walks through fetch → done", () => {
      const def = createIncidentTriagePipeline({ org: "acme" });
      machine.registerPipeline(def);
      const session = machine.createSession("incident-triage", "s1", {});

      const done = machine.advance(session, {
        triaged: [
          {
            issue_id: "123",
            title: "TypeError in handler",
            severity: "high",
            root_cause: "Missing null check",
            recommendation: "Add null guard",
            fixable: true,
          },
        ],
        total_issues: 1,
        summary: "1 issue triaged.",
      });
      expect(done.done).toBe(true);
    });
  });

  describe("single issue mode", () => {
    it("creates a single-issue pipeline with issueId", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
      });
      expect(def.initialState).toBe("fetch");
      const ctx = def.states.fetch.context as Record<string, unknown>;
      expect(ctx.issue_id).toBe("12345");
    });

    it("includes cwd in context when provided", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
        cwd: "/home/user/project",
      });
      const ctx = def.states.fetch.context as Record<string, unknown>;
      expect(ctx.cwd).toBe("/home/user/project");
    });

    it("handles missing cwd gracefully", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
      });
      const ctx = def.states.fetch.context as Record<string, unknown>;
      expect(ctx.cwd).toBeUndefined();
    });

    it("transitions to done without resolve", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
      });
      expect(def.states.fetch.transitions.default).toBe("done");
    });

    it("walks through fetch(rca) → done", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
      });
      machine.registerPipeline(def);
      const session = machine.createSession("incident-triage", "s1", {});

      const done = machine.advance(session, {
        issue_id: "12345",
        root_cause: "Unhandled promise rejection in async handler",
        affected_file: "src/handlers/user.ts",
        affected_function: "getUserById",
        fix_recommendation: "Add try/catch around database query",
      });
      expect(done.done).toBe(true);
    });
  });

  describe("single issue + resolve mode", () => {
    it("includes resolve state when resolve=true", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
        resolve: true,
      });
      expect(Object.keys(def.states)).toContain("resolve");
      expect(def.states.fetch.transitions.default).toBe("resolve");
    });

    it("resolve transitions to done", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
        resolve: true,
      });
      expect(def.states.resolve.transitions.default).toBe("done");
    });

    it("walks through fetch → resolve → done", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
        resolve: true,
      });
      machine.registerPipeline(def);
      const session = machine.createSession("incident-triage", "s1", {});

      // RCA
      machine.advance(session, {
        issue_id: "12345",
        root_cause: "Null pointer in handler",
        fix_recommendation: "Add null check",
      });
      expect(session.currentState).toBe("resolve");

      // Resolve
      const done = machine.advance(session, {
        root_cause: "Null pointer in handler",
        fix_description: "Added null check before accessing property",
        files_modified: ["src/handlers/user.ts"],
        tests_added: ["tests/handlers/user.test.ts"],
        verified: true,
        pr_title: "fix: null check in getUserById",
        pr_body: "Fixes Sentry issue 12345",
      });
      expect(done.done).toBe(true);
    });

    it("does not include resolve when resolve=false", () => {
      const def = createIncidentTriagePipeline({
        org: "acme",
        issueId: "12345",
        resolve: false,
      });
      expect(Object.keys(def.states)).not.toContain("resolve");
    });
  });
});
