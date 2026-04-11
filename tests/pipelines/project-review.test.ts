import { describe, it, expect } from "vitest";
import { StateMachine } from "../../src/state/machine.js";
import { createProjectReviewPipeline } from "../../src/pipelines/project-review.js";
import { ProjectReviewSummarySchema } from "../../src/utils/schema.js";
import { ALL_ROLE_KEYS } from "../../src/pipelines/review-roles.js";

// ─── Test Fixtures ───

function validDiscovery(role: string) {
  return {
    role,
    codebase_summary: "A TypeScript MCP server project",
    questions_and_answers: [
      { question: "What is the priority?", answer: "Reliability" },
    ],
    key_observations: ["Uses Zod for validation"],
    focus_areas: ["Error handling"],
  };
}

// Minimal valid analysis data for each role
const analysisFixtures: Record<string, Record<string, unknown>> = {
  pm: {
    improvements: [],
    product_gaps: [],
    user_experience_concerns: [],
    summary: "PM analysis complete",
  },
  engineer: {
    architecture_concerns: [],
    scalability_issues: [],
    tech_debt: [],
    positive_patterns: [],
    summary: "Engineer analysis complete",
  },
  marketing: {
    promotion_strategies: [],
    messaging_suggestions: [],
    positioning_analysis: "Strong positioning",
    content_opportunities: [],
    summary: "Marketing analysis complete",
  },
  designer: {
    ux_improvements: [],
    accessibility_issues: [],
    design_consistency_notes: [],
    summary: "Designer analysis complete",
  },
  qa: {
    bugs_found: [],
    quality_risks: [],
    edge_cases: [],
    summary: "QA analysis complete",
  },
  "test-architect": {
    test_strategy_assessment: {
      current_approach: "Unit tests",
      recommended_approach: "Add integration tests",
      gaps: [],
    },
    automation_findings: [],
    ci_cd_observations: [],
    test_architecture_concerns: [],
    coverage_analysis: {
      unit_coverage_assessment: "Good",
      integration_coverage_assessment: "Needs work",
      e2e_coverage_assessment: "Missing",
      missing_test_types: [],
    },
    flaky_test_risks: [],
    summary: "Test Architect analysis complete",
  },
  sales: {
    differentiators: [],
    competitor_insights: [],
    objection_handlers: [],
    summary: "Sales analysis complete",
  },
};

const validSummary = {
  roles_completed: ["pm", "engineer"],
  cross_cutting_themes: ["Need better error handling"],
  top_priorities: [{
    priority: "Improve test coverage",
    source_roles: ["pm", "engineer"],
  }],
  executive_summary: "## Executive Summary\nKey findings across all roles...",
};

describe("Project Review Pipeline", () => {
  describe("dynamic state construction", () => {
    it("creates 16 states with all 7 roles (default)", () => {
      const def = createProjectReviewPipeline({});
      // 7 roles x 2 states + synthesize + done = 16
      expect(Object.keys(def.states)).toHaveLength(16);
    });

    it("creates 6 states with 2 roles", () => {
      const def = createProjectReviewPipeline({ roles: ["pm", "engineer"] });
      // 2 roles x 2 states + synthesize + done = 6
      expect(Object.keys(def.states)).toHaveLength(6);
    });

    it("creates 4 states with 1 role", () => {
      const def = createProjectReviewPipeline({ roles: ["qa"] });
      // 1 role x 2 states + synthesize + done = 4
      expect(Object.keys(def.states)).toHaveLength(4);
    });

    it("defaults to all 7 roles when roles is empty", () => {
      const def = createProjectReviewPipeline({ roles: [] });
      expect(Object.keys(def.states)).toHaveLength(16);
    });

    it("filters out invalid role names", () => {
      const def = createProjectReviewPipeline({ roles: ["pm", "invalid", "qa"] });
      // 2 valid roles x 2 states + synthesize + done = 6
      expect(Object.keys(def.states)).toHaveLength(6);
    });

    it("throws when all provided roles are invalid", () => {
      expect(() => createProjectReviewPipeline({ roles: ["invalid", "fake"] }))
        .toThrow(/No valid roles selected/);
    });
  });

  describe("state chaining", () => {
    it("chains pm -> engineer correctly", () => {
      const def = createProjectReviewPipeline({ roles: ["pm", "engineer"] });

      expect(def.initialState).toBe("pm_discover");
      expect(def.states.pm_discover.transitions).toEqual({ default: "pm_analyze" });
      expect(def.states.pm_analyze.transitions).toEqual({ default: "engineer_discover" });
      expect(def.states.engineer_discover.transitions).toEqual({ default: "engineer_analyze" });
      expect(def.states.engineer_analyze.transitions).toEqual({ default: "synthesize" });
      expect(def.states.synthesize.transitions).toEqual({ default: "done" });
      expect(def.states.done.transitions).toEqual({});
    });

    it("single role chains directly to synthesize", () => {
      const def = createProjectReviewPipeline({ roles: ["designer"] });

      expect(def.initialState).toBe("designer_discover");
      expect(def.states.designer_analyze.transitions).toEqual({ default: "synthesize" });
    });

    it("all 7 roles chain in order", () => {
      const def = createProjectReviewPipeline({});

      // Verify first role starts
      expect(def.initialState).toBe(`${ALL_ROLE_KEYS[0]}_discover`);

      // Verify last role ends at synthesize
      const lastRole = ALL_ROLE_KEYS[ALL_ROLE_KEYS.length - 1];
      expect(def.states[`${lastRole}_analyze`].transitions).toEqual({ default: "synthesize" });
    });
  });

  describe("pipeline definition", () => {
    it("has correct name and terminal states", () => {
      const def = createProjectReviewPipeline({});
      expect(def.name).toBe("project-review");
      expect(def.terminalStates).toEqual(["done"]);
      expect(def.maxIterations).toBe(0);
    });

    it("registers without error in StateMachine", () => {
      const machine = new StateMachine();
      const def = createProjectReviewPipeline({ roles: ["pm", "qa"] });
      expect(() => machine.registerPipeline(def)).not.toThrow();
    });

    it("synthesize context lists the selected roles", () => {
      const def = createProjectReviewPipeline({ roles: ["pm", "qa"] });
      const ctx = def.states.synthesize.context as Record<string, unknown>;
      expect(ctx.roles_completed).toContain("Product Manager");
      expect(ctx.roles_completed).toContain("Quality Engineer");
    });
  });

  describe("schema validation", () => {
    it("ProjectReviewSummarySchema accepts valid data", () => {
      expect(ProjectReviewSummarySchema.safeParse(validSummary).success).toBe(true);
    });

    it("ProjectReviewSummarySchema rejects missing fields", () => {
      expect(ProjectReviewSummarySchema.safeParse({ roles_completed: ["pm"] }).success).toBe(false);
    });
  });

  describe("discover steps use plan mode", () => {
    it("all discover steps use plan mode, not gather", () => {
      const def = createProjectReviewPipeline({ roles: ["pm", "engineer"] });
      expect(def.states.pm_discover.mode).toBe("plan");
      expect(def.states.engineer_discover.mode).toBe("plan");
    });

    it("discover steps have discoverTopics in context, not gatherFields", () => {
      const def = createProjectReviewPipeline({ roles: ["pm"] });
      expect(def.states.pm_discover.gatherFields).toBeUndefined();
      const context = def.states.pm_discover.context as Record<string, unknown>;
      expect(context.discoverTopics).toBeDefined();
    });
  });

  describe("full walk-through with 2 roles", () => {
    it("walks through pm -> engineer -> synthesize -> done", () => {
      const machine = new StateMachine();
      const def = createProjectReviewPipeline({ roles: ["pm", "engineer"] });
      machine.registerPipeline(def);

      const session = machine.createSession(def.name, "test-project-review", {});
      expect(session.currentState).toBe("pm_discover");

      // PM discover -> PM analyze
      const step1 = machine.advance(session, validDiscovery("pm"));
      expect(step1.step).toBe("pm_analyze");

      // PM analyze -> Engineer discover
      const step2 = machine.advance(session, analysisFixtures.pm);
      expect(step2.step).toBe("engineer_discover");

      // Engineer discover -> Engineer analyze
      const step3 = machine.advance(session, validDiscovery("engineer"));
      expect(step3.step).toBe("engineer_analyze");

      // Engineer analyze -> Synthesize
      const step4 = machine.advance(session, analysisFixtures.engineer);
      expect(step4.step).toBe("synthesize");

      // Synthesize -> Done
      const step5 = machine.advance(session, validSummary);
      expect(step5.step).toBe("done");
      expect(step5.done).toBe(true);
      expect(session.done).toBe(true);
    });
  });
});
