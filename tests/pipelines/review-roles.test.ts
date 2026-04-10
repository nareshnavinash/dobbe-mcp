import { describe, it, expect } from "vitest";
import { StateMachine } from "../../src/state/machine.js";
import {
  createReviewAsPmPipeline,
  createReviewAsEngineerPipeline,
  createReviewAsMarketingPipeline,
  createReviewAsDesignerPipeline,
  createReviewAsQaPipeline,
  createReviewAsTestArchitectPipeline,
  createReviewAsSalesPipeline,
} from "../../src/pipelines/review-roles.js";
import {
  DiscoveryResultSchema,
  PmAnalysisSchema,
  EngineerAnalysisSchema,
  MarketingAnalysisSchema,
  DesignerAnalysisSchema,
  QaAnalysisSchema,
  TestArchitectAnalysisSchema,
  SalesAnalysisSchema,
} from "../../src/utils/schema.js";

// ─── Test Fixtures ───

function validDiscovery(role: string) {
  return {
    role,
    codebase_summary: "A TypeScript MCP server project with 13 pipeline commands",
    questions_and_answers: [
      { question: "Who are the target users?", answer: "DevOps engineers" },
      { question: "What is the priority?", answer: "Reliability" },
    ],
    key_observations: ["Uses Zod for validation", "FSM-based pipeline architecture"],
    focus_areas: ["Error handling", "Test coverage"],
  };
}

const validPmAnalysis = {
  improvements: [{
    area: "Onboarding",
    suggestion: "Add an interactive setup wizard",
    impact: "high" as const,
    effort: "medium" as const,
    rationale: "Reduces time-to-value for new users",
  }],
  product_gaps: ["No dashboard for pipeline status"],
  user_experience_concerns: ["CLI-only interface may limit adoption"],
  summary: "## PM Review\nThe product has strong DevOps value...",
};

const validEngineerAnalysis = {
  architecture_concerns: [{
    component: "StateMachine",
    concern: "No timeout handling for stuck sessions",
    severity: "medium" as const,
    recommendation: "Add session TTL with automatic cleanup",
  }],
  scalability_issues: ["Single-process architecture"],
  tech_debt: [{
    description: "Duplicated validation logic",
    location: "src/tools/pipeline.ts",
    priority: "low" as const,
  }],
  positive_patterns: ["Clean FSM abstraction", "Atomic file writes"],
  summary: "## Engineering Review\nArchitecture is solid...",
};

const validMarketingAnalysis = {
  promotion_strategies: [{
    strategy: "Write a blog post about FSM-based DevOps",
    channel: "Dev.to",
    target_audience: "DevOps engineers",
    expected_impact: "Awareness among target users",
  }],
  messaging_suggestions: ["Position as AI-powered DevOps autopilot"],
  positioning_analysis: "Unique in combining MCP with pipeline orchestration",
  content_opportunities: ["Tutorial: automating vulnerability resolution"],
  summary: "## Marketing Review\nStrong differentiation...",
};

const validDesignerAnalysis = {
  ux_improvements: [{
    area: "Pipeline output",
    current_issue: "Raw JSON output is hard to read",
    suggestion: "Add formatted table output",
    impact: "high" as const,
  }],
  accessibility_issues: [{
    issue: "No color-blind friendly output mode",
    severity: "medium" as const,
    recommendation: "Support NO_COLOR environment variable",
  }],
  design_consistency_notes: ["Consistent error message format across tools"],
  summary: "## Design Review\nCLI output needs formatting improvements...",
};

const validQaAnalysis = {
  bugs_found: [{
    description: "Race condition in concurrent session writes",
    severity: "high" as const,
    reproduction_steps: "Start two pipelines simultaneously",
    affected_file: "src/state/storage.ts",
  }],
  quality_risks: ["No integration tests for MCP transport layer"],
  edge_cases: ["Empty pipeline params", "Unicode in session IDs"],
  summary: "## QA Review\nFound potential concurrency issue...",
};

const validTestArchitectAnalysis = {
  test_strategy_assessment: {
    current_approach: "Unit tests with vitest, some integration tests",
    recommended_approach: "Add contract tests for MCP protocol compliance",
    gaps: ["No e2e tests", "No performance benchmarks"],
  },
  automation_findings: [{
    area: "Pipeline orchestration",
    framework: "vitest",
    current_coverage: "Good unit coverage, lacks integration scenarios",
    recommendation: "Add multi-step pipeline walk-through tests",
    priority: "high" as const,
  }],
  ci_cd_observations: [{
    pipeline_stage: "test",
    issue: "No parallel test execution configured",
    recommendation: "Enable vitest parallel mode",
  }],
  test_architecture_concerns: [{
    concern: "Test fixtures are duplicated across test files",
    severity: "medium" as const,
    affected_areas: ["tests/pipelines/", "tests/tools/"],
    suggestion: "Create shared fixture factory module",
  }],
  coverage_analysis: {
    unit_coverage_assessment: "98% line coverage, strong",
    integration_coverage_assessment: "Covers retry loops and recovery",
    e2e_coverage_assessment: "No e2e tests exist",
    missing_test_types: ["e2e", "performance", "contract"],
  },
  flaky_test_risks: [{
    area: "File I/O tests",
    symptom: "Occasional ENOENT on temp directories",
    root_cause: "Cleanup race with async operations",
    fix: "Use unique temp dirs per test with proper async cleanup",
  }],
  summary: "## Test Architecture Review\nGood unit coverage but gaps in e2e...",
};

const validSalesAnalysis = {
  differentiators: [{
    feature: "FSM-based pipeline orchestration",
    competitive_advantage: "Reproducible, auditable DevOps workflows",
    talking_point: "Unlike scripts, every step is validated and recoverable",
  }],
  competitor_insights: [{
    competitor: "GitHub Actions",
    strength_vs_us: "Massive ecosystem and marketplace",
    weakness_vs_us: "No AI-powered step validation or retry logic",
    opportunity: "Position as intelligent layer on top of CI/CD",
  }],
  objection_handlers: [{
    objection: "We already have CI/CD pipelines",
    response: "dobbe orchestrates AI-assisted analysis, not just builds",
  }],
  summary: "## Sales Review\nStrong differentiation from CI/CD tools...",
};

// ─── Factory Tests ───

const roleFactories = [
  { name: "review-as-pm", factory: createReviewAsPmPipeline, keyword: "Product Manager" },
  { name: "review-as-engineer", factory: createReviewAsEngineerPipeline, keyword: "Staff Engineer" },
  { name: "review-as-marketing", factory: createReviewAsMarketingPipeline, keyword: "Marketing Manager" },
  { name: "review-as-designer", factory: createReviewAsDesignerPipeline, keyword: "UX/UI Designer" },
  { name: "review-as-qa", factory: createReviewAsQaPipeline, keyword: "Quality Engineer" },
  { name: "review-as-test-architect", factory: createReviewAsTestArchitectPipeline, keyword: "Test Architect" },
  { name: "review-as-sales", factory: createReviewAsSalesPipeline, keyword: "Sales Manager" },
];

describe("Role-Based Review Pipelines", () => {
  describe("factory functions", () => {
    for (const { name, factory, keyword } of roleFactories) {
      describe(name, () => {
        it("creates a valid pipeline definition", () => {
          const def = factory();
          expect(def.name).toBe(name);
          expect(def.initialState).toBe("discover");
          expect(def.terminalStates).toEqual(["done"]);
          expect(def.maxIterations).toBe(0);
        });

        it("has discover, analyze, and done states", () => {
          const def = factory();
          expect(Object.keys(def.states)).toEqual(["discover", "analyze", "done"]);
        });

        it("has correct transitions", () => {
          const def = factory();
          expect(def.states.discover.transitions).toEqual({ default: "analyze" });
          expect(def.states.analyze.transitions).toEqual({ default: "done" });
          expect(def.states.done.transitions).toEqual({});
        });

        it(`discover instruction mentions ${keyword}`, () => {
          const def = factory();
          expect(def.states.discover.instruction).toContain(keyword);
        });

        it(`analyze instruction mentions ${keyword}`, () => {
          const def = factory();
          expect(def.states.analyze.instruction).toContain(keyword);
        });

        it("registers without error in StateMachine", () => {
          const machine = new StateMachine();
          const def = factory();
          expect(() => machine.registerPipeline(def)).not.toThrow();
        });
      });
    }
  });

  describe("schema validation", () => {
    it("DiscoveryResultSchema accepts valid data", () => {
      const result = DiscoveryResultSchema.safeParse(validDiscovery("pm"));
      expect(result.success).toBe(true);
    });

    it("DiscoveryResultSchema rejects empty questions", () => {
      const result = DiscoveryResultSchema.safeParse({
        ...validDiscovery("pm"),
        questions_and_answers: [],
      });
      expect(result.success).toBe(false);
    });

    it("DiscoveryResultSchema rejects missing fields", () => {
      const result = DiscoveryResultSchema.safeParse({ role: "pm" });
      expect(result.success).toBe(false);
    });

    it("PmAnalysisSchema accepts valid data", () => {
      expect(PmAnalysisSchema.safeParse(validPmAnalysis).success).toBe(true);
    });

    it("EngineerAnalysisSchema accepts valid data", () => {
      expect(EngineerAnalysisSchema.safeParse(validEngineerAnalysis).success).toBe(true);
    });

    it("MarketingAnalysisSchema accepts valid data", () => {
      expect(MarketingAnalysisSchema.safeParse(validMarketingAnalysis).success).toBe(true);
    });

    it("DesignerAnalysisSchema accepts valid data", () => {
      expect(DesignerAnalysisSchema.safeParse(validDesignerAnalysis).success).toBe(true);
    });

    it("QaAnalysisSchema accepts valid data", () => {
      expect(QaAnalysisSchema.safeParse(validQaAnalysis).success).toBe(true);
    });

    it("TestArchitectAnalysisSchema accepts valid data", () => {
      expect(TestArchitectAnalysisSchema.safeParse(validTestArchitectAnalysis).success).toBe(true);
    });

    it("SalesAnalysisSchema accepts valid data", () => {
      expect(SalesAnalysisSchema.safeParse(validSalesAnalysis).success).toBe(true);
    });
  });

  describe("full walk-through", () => {
    const walkThroughCases = [
      { name: "pm", factory: createReviewAsPmPipeline, analysis: validPmAnalysis },
      { name: "engineer", factory: createReviewAsEngineerPipeline, analysis: validEngineerAnalysis },
      { name: "marketing", factory: createReviewAsMarketingPipeline, analysis: validMarketingAnalysis },
      { name: "designer", factory: createReviewAsDesignerPipeline, analysis: validDesignerAnalysis },
      { name: "qa", factory: createReviewAsQaPipeline, analysis: validQaAnalysis },
      { name: "test-architect", factory: createReviewAsTestArchitectPipeline, analysis: validTestArchitectAnalysis },
      { name: "sales", factory: createReviewAsSalesPipeline, analysis: validSalesAnalysis },
    ];

    for (const { name, factory, analysis } of walkThroughCases) {
      it(`walks through review-as-${name}: discover -> analyze -> done`, () => {
        const machine = new StateMachine();
        const def = factory();
        machine.registerPipeline(def);

        const session = machine.createSession(def.name, `test-${name}`, {});

        // Step 1: discover -> analyze
        const step1 = machine.advance(session, validDiscovery(name));
        expect(step1.step).toBe("analyze");

        // Step 2: analyze -> done
        const step2 = machine.advance(session, analysis);
        expect(step2.step).toBe("done");
        expect(step2.done).toBe(true);
        expect(session.done).toBe(true);
      });
    }
  });
});
