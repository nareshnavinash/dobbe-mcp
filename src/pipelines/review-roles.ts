import type { PipelineDefinition, StepDefinition } from "../state/machine.js";
import {
  DiscoveryResultSchema,
  PmAnalysisSchema,
  EngineerAnalysisSchema,
  MarketingAnalysisSchema,
  DesignerAnalysisSchema,
  QaAnalysisSchema,
  TestArchitectAnalysisSchema,
  SalesAnalysisSchema,
} from "../utils/schema.js";
import { z } from "zod";

/**
 * Role-based review pipelines.
 *
 * Each role follows the same 3-state pattern:
 *   discover  -> Gather project context from this role's perspective
 *   analyze   -> Deep analysis using discovery context + codebase inspection
 *   done      -> Terminal
 *
 * A shared helper generates the pipeline from a RoleConfig, eliminating
 * duplication across the 7 roles.
 */

interface RoleConfig {
  /** Short key used in state names and registry (e.g., "pm", "engineer"). */
  key: string;
  /** Human-readable title (e.g., "Product Manager"). */
  title: string;
  /** Role-specific fields to gather during discovery (key → description). */
  discoverFields: Record<string, string>;
  /** Role-specific focus areas for the analysis step. */
  analyzeFocus: string[];
  /** Zod schema for the analysis step result. */
  analysisSchema: z.ZodType;
}

// ─── Role Configs ───

const PM_CONFIG: RoleConfig = {
  key: "pm",
  title: "Product Manager",
  discoverFields: {
    target_users: "Who are the target users and what problems does this solve for them?",
    success_metrics: "What are the core product metrics or KPIs?",
    roadmap_priority: "What is the product roadmap priority right now?",
    user_feedback: "Are there known feature requests or pain points from users?",
    product_goals: "How is success measured for this project?",
  },
  analyzeFocus: [
    "Feature completeness: are there obvious gaps in functionality?",
    "User experience friction: where would users struggle?",
    "Prioritization opportunities: what would deliver the most value soonest?",
    "Growth potential: what features could attract new users?",
    "Product-market fit: does the codebase support the stated product goals?",
  ],
  analysisSchema: PmAnalysisSchema,
};

const ENGINEER_CONFIG: RoleConfig = {
  key: "engineer",
  title: "Staff Engineer",
  discoverFields: {
    arch_decisions: "What are the key architectural decisions and their rationale?",
    perf_bottlenecks: "Are there known performance bottlenecks or scaling concerns?",
    testing_strategy: "What is the testing strategy and CI/CD setup?",
    deploy_env: "What is the deployment environment and infrastructure?",
    tech_debt: "What are the top technical debt priorities?",
  },
  analyzeFocus: [
    "Architecture quality: separation of concerns, coupling, cohesion",
    "Scalability: can this handle 10x load without major rewrites?",
    "Error handling: are failures handled gracefully?",
    "Security: are there obvious vulnerabilities (injection, auth, secrets)?",
    "Code maintainability: is it easy for new engineers to contribute?",
    "Technical debt: what shortcuts will cause pain later?",
    "Positive patterns: what is done well and should be preserved?",
  ],
  analysisSchema: EngineerAnalysisSchema,
};

const MARKETING_CONFIG: RoleConfig = {
  key: "marketing",
  title: "Marketing Manager",
  discoverFields: {
    target_audience: "Who is the target audience and what market segment?",
    positioning: "What is the current positioning and value proposition?",
    launches: "Are there upcoming launches or announcements planned?",
    channels: "What marketing channels are currently being used?",
    benefits: "How do technical capabilities translate to user benefits?",
  },
  analyzeFocus: [
    "Promotion strategies: what channels and tactics would reach the target audience?",
    "Messaging: how should the product be described to maximize appeal?",
    "Content opportunities: what blog posts, demos, or case studies could be created?",
    "Developer relations: how can the project attract contributors or advocates?",
    "Positioning: how does this differentiate in the market?",
  ],
  analysisSchema: MarketingAnalysisSchema,
};

const DESIGNER_CONFIG: RoleConfig = {
  key: "designer",
  title: "UX/UI Designer",
  discoverFields: {
    design_system: "Is there a design system or component library in use?",
    accessibility: "What are the accessibility requirements and compliance targets?",
    user_research: "Are there any user research findings or usability pain points?",
    platforms: "What platforms and devices must be supported?",
    brand_guidelines: "Are there brand guidelines or visual identity constraints?",
  },
  analyzeFocus: [
    "UX improvements: where is the user experience confusing or inefficient?",
    "Accessibility: are WCAG guidelines followed? Are there a11y issues?",
    "Design consistency: are UI patterns used consistently across the app?",
    "Information architecture: is content organized logically?",
    "Interaction patterns: are affordances clear? Is feedback timely?",
    "Visual hierarchy: does the layout guide the user's attention correctly?",
  ],
  analysisSchema: DesignerAnalysisSchema,
};

const QA_CONFIG: RoleConfig = {
  key: "qa",
  title: "Quality Engineer",
  discoverFields: {
    critical_journeys: "What are the critical user journeys that must never break?",
    flaky_areas: "Are there known flaky or unreliable areas of the application?",
    release_cadence: "What is the release cadence and what quality gates exist?",
    recent_incidents: "Have there been recent incidents or regressions?",
    test_environments: "What environments are used for testing vs production?",
  },
  analyzeFocus: [
    "Bug hunting: identify potential bugs, race conditions, and error-prone code",
    "Edge cases: what inputs or states could cause unexpected behavior?",
    "Quality risks: which areas of the codebase are most fragile?",
    "Error handling: are error paths tested and handled correctly?",
    "Data validation: is user input validated at system boundaries?",
    "Concurrency issues: are there shared state or race condition risks?",
  ],
  analysisSchema: QaAnalysisSchema,
};

const TEST_ARCHITECT_CONFIG: RoleConfig = {
  key: "test-architect",
  title: "Test Architect (Staff SDET)",
  discoverFields: {
    test_frameworks: "What test frameworks and tools are currently in use?",
    ci_cd_config: "How is CI/CD configured and what are the test stages?",
    test_execution: "What is the test execution strategy (local vs CI, parallel vs serial)?",
    flaky_tests: "Are there known flaky tests or test infrastructure issues?",
    test_types: "What types of tests exist (unit, integration, e2e, performance, contract)?",
  },
  analyzeFocus: [
    "Test pyramid balance: is the ratio of unit/integration/e2e tests healthy?",
    "Automation coverage: what critical paths lack automated tests?",
    "CI/CD pipeline efficiency: are test stages optimized for speed and reliability?",
    "Test architecture: are test patterns consistent and maintainable?",
    "Flaky test analysis: identify tests at risk of intermittent failure",
    "Test data management: how is test data created and cleaned up?",
    "Coverage analysis: where are the critical coverage gaps?",
    "Test environment parity: how close are test environments to production?",
  ],
  analysisSchema: TestArchitectAnalysisSchema,
};

const SALES_CONFIG: RoleConfig = {
  key: "sales",
  title: "Sales Manager",
  discoverFields: {
    selling_points: "What are the key selling points of this product?",
    objections: "What are common customer objections or concerns?",
    enterprise_reqs: "Are there enterprise requirements (SSO, compliance, SLAs)?",
    integrations: "What integrations or APIs are available for customers?",
    competitors: "Who are the main competitors and what differentiates this product?",
  },
  analyzeFocus: [
    "Differentiators: what unique features set this apart from competitors?",
    "Competitive analysis: how does this compare to alternatives?",
    "Objection handling: what concerns would prospects raise and how to address them?",
    "Enterprise readiness: does the product meet enterprise buyer requirements?",
    "Value proposition: what is the compelling reason to buy/adopt?",
  ],
  analysisSchema: SalesAnalysisSchema,
};

/** All role configs, keyed by role key. Exported for the master pipeline. */
export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  pm: PM_CONFIG,
  engineer: ENGINEER_CONFIG,
  marketing: MARKETING_CONFIG,
  designer: DESIGNER_CONFIG,
  qa: QA_CONFIG,
  "test-architect": TEST_ARCHITECT_CONFIG,
  sales: SALES_CONFIG,
};

/** Ordered list of all valid role keys. */
export const ALL_ROLE_KEYS = ["pm", "engineer", "designer", "qa", "test-architect", "marketing", "sales"];

// ─── Declarative Step Builders ───

export function buildDiscoverStep(config: RoleConfig): Omit<StepDefinition, "transitions"> {
  return {
    intent: `Understand the project from a ${config.title}'s perspective`,
    mode: "gather",
    context: { role: config.key, roleTitle: config.title },
    gatherFields: config.discoverFields,
    hints: [
      "Scan the codebase first to inform your questions",
      "Only ask about things the code cannot tell you (intent, priorities, constraints, history)",
      "Reference specific things found in the codebase",
    ],
    schema: DiscoveryResultSchema,
  };
}

export function buildAnalyzeStep(config: RoleConfig): Omit<StepDefinition, "transitions"> {
  return {
    intent: `Perform a thorough ${config.title} analysis of this codebase`,
    mode: "plan",
    context: {
      role: config.key,
      roleTitle: config.title,
      focusAreas: config.analyzeFocus,
    },
    hints: [
      "Reference specific files and line numbers where applicable",
      "Prioritize findings by impact and actionability",
      "Note what is done well alongside areas for improvement",
    ],
    schema: config.analysisSchema,
  };
}

// ─── Shared Pipeline Factory ───

function createRoleReviewPipeline(
  config: RoleConfig,
): PipelineDefinition {
  const states: Record<string, StepDefinition> = {
    discover: {
      ...buildDiscoverStep(config),
      transitions: { default: "analyze" },
    },
    analyze: {
      ...buildAnalyzeStep(config),
      transitions: { default: "done" },
    },
    done: {
      intent: `${config.title} review complete. Present the findings and recommendations to the user.`,
      schema: z.object({}),
      transitions: {},
    },
  };

  return {
    name: `review-as-${config.key}`,
    initialState: "discover",
    terminalStates: ["done"],
    maxIterations: 0,
    states,
  };
}

// ─── Named Factory Exports ───

export function createReviewAsPmPipeline(): PipelineDefinition {
  return createRoleReviewPipeline(PM_CONFIG);
}

export function createReviewAsEngineerPipeline(): PipelineDefinition {
  return createRoleReviewPipeline(ENGINEER_CONFIG);
}

export function createReviewAsMarketingPipeline(): PipelineDefinition {
  return createRoleReviewPipeline(MARKETING_CONFIG);
}

export function createReviewAsDesignerPipeline(): PipelineDefinition {
  return createRoleReviewPipeline(DESIGNER_CONFIG);
}

export function createReviewAsQaPipeline(): PipelineDefinition {
  return createRoleReviewPipeline(QA_CONFIG);
}

export function createReviewAsTestArchitectPipeline(): PipelineDefinition {
  return createRoleReviewPipeline(TEST_ARCHITECT_CONFIG);
}

export function createReviewAsSalesPipeline(): PipelineDefinition {
  return createRoleReviewPipeline(SALES_CONFIG);
}
