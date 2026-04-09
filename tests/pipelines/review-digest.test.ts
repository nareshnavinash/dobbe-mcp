import { describe, it, expect, beforeEach } from "vitest";
import { StateMachine } from "../../src/state/machine.js";
import { createReviewDigestPipeline } from "../../src/pipelines/review-digest.js";

describe("review-digest pipeline", () => {
  let machine: StateMachine;

  beforeEach(() => {
    machine = new StateMachine();
  });

  describe("createReviewDigestPipeline", () => {
    it("creates a batch mode pipeline", () => {
      const def = createReviewDigestPipeline({
        repo: "acme/web-app",
      });

      expect(def.name).toBe("review-digest");
      expect(def.initialState).toBe("fetch");
      expect(def.terminalStates).toEqual(["done"]);
      expect(def.maxIterations).toBe(0);
    });

    it("has fetch, review, and done states", () => {
      const def = createReviewDigestPipeline({ repo: "acme/web-app" });
      expect(Object.keys(def.states)).toEqual(["fetch", "review", "done"]);
    });

    it("batch mode mentions 'all open pull requests'", () => {
      const def = createReviewDigestPipeline({ repo: "acme/web-app" });
      expect(def.states.fetch.instruction).toContain("all open pull requests");
    });

    it("single PR mode mentions the PR number", () => {
      const def = createReviewDigestPipeline({
        repo: "acme/web-app",
        prNumber: 42,
      });
      expect(def.states.fetch.instruction).toContain("#42");
    });

    it("includes skip filters in batch mode", () => {
      const def = createReviewDigestPipeline({
        repo: "acme/web-app",
        skipDrafts: true,
        skipLabels: ["wontfix", "docs"],
        skipAuthors: ["dependabot"],
      });
      expect(def.states.fetch.instruction).toContain("Draft PRs");
      expect(def.states.fetch.instruction).toContain("wontfix");
      expect(def.states.fetch.instruction).toContain("dependabot");
    });

    it("omits skip filters when not provided", () => {
      const def = createReviewDigestPipeline({
        repo: "acme/web-app",
        skipDrafts: false,
      });
      expect(def.states.fetch.instruction).not.toContain("Draft PRs");
    });

    it("includes repo in review instruction", () => {
      const def = createReviewDigestPipeline({ repo: "acme/web-app" });
      expect(def.states.review.instruction).toContain("acme/web-app");
    });
  });

  describe("pipeline execution", () => {
    it("walks through fetch → review → done", () => {
      const def = createReviewDigestPipeline({ repo: "acme/web-app" });
      machine.registerPipeline(def);
      const session = machine.createSession("review-digest", "s1", {});

      // Fetch
      machine.advance(session, {
        prs: [
          { number: 42, title: "Add feature", author: "dev1", repo: "acme/web-app" },
          { number: 43, title: "Fix bug", author: "dev2", repo: "acme/web-app" },
        ],
        total: 2,
      });
      expect(session.currentState).toBe("review");

      // Review
      const done = machine.advance(session, {
        reviews: [
          {
            pr: { number: 42, title: "Add feature", author: "dev1", repo: "acme/web-app" },
            review: {
              risk_level: "medium",
              summary: "Adds user authentication",
              concerns: [{ category: "security", severity: "medium",
                description: "No rate limiting", suggestion: "Add rate limit", file_path: "auth.js" }],
              recommendations: ["Add rate limiting"],
              approval_recommendation: "request_changes",
            },
          },
          {
            pr: { number: 43, title: "Fix bug", author: "dev2", repo: "acme/web-app" },
            review: {
              risk_level: "low",
              summary: "Simple bug fix",
              concerns: [],
              recommendations: ["Approve"],
              approval_recommendation: "approve",
            },
          },
        ],
        summary: "2 PRs reviewed. 1 needs changes.",
      });
      expect(session.currentState).toBe("done");
      expect(done.done).toBe(true);
    });

    it("handles single PR mode", () => {
      const def = createReviewDigestPipeline({ repo: "acme/web-app", prNumber: 42 });
      machine.registerPipeline(def);
      const session = machine.createSession("review-digest", "s1", {});

      // Fetch single PR
      machine.advance(session, {
        prs: [{ number: 42, title: "Add feature", author: "dev1", repo: "acme/web-app" }],
        total: 1,
      });
      expect(session.currentState).toBe("review");
    });

    it("handles empty PR list", () => {
      const def = createReviewDigestPipeline({ repo: "acme/web-app" });
      machine.registerPipeline(def);
      const session = machine.createSession("review-digest", "s1", {});

      machine.advance(session, { prs: [], total: 0 });
      expect(session.currentState).toBe("review");

      const done = machine.advance(session, {
        reviews: [],
        summary: "No open PRs found.",
      });
      expect(done.done).toBe(true);
    });
  });
});
