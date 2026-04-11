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
    target_users: "Target users and their pain points",
    success_metrics: "Core product metrics or KPIs",
    roadmap_priority: "Current roadmap priority",
    user_feedback: "Known feature requests or user pain points",
    product_goals: "Success criteria for this project",
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
    arch_decisions: "Key architectural decisions and rationale",
    perf_bottlenecks: "Known performance or scaling concerns",
    testing_strategy: "Testing strategy and CI/CD setup",
    deploy_env: "Deployment environment and infrastructure",
    tech_debt: "Top technical debt priorities",
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
    target_audience: "Target audience and market segment",
    positioning: "Current positioning and value proposition",
    launches: "Upcoming launches or announcements",
    channels: "Marketing channels in use",
    benefits: "User benefits from technical capabilities",
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
    design_system: "Design system or component library",
    accessibility: "Accessibility requirements and targets",
    user_research: "User research findings or usability pain points",
    platforms: "Supported platforms and devices",
    brand_guidelines: "Brand guidelines or visual constraints",
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
    critical_journeys: "Critical user journeys that must not break",
    flaky_areas: "Known flaky or unreliable areas",
    release_cadence: "Release cadence and quality gates",
    recent_incidents: "Recent incidents or regressions",
    test_environments: "Test vs production environments",
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
    test_frameworks: "Test frameworks and tools in use",
    ci_cd_config: "CI/CD configuration and test stages",
    test_execution: "Test execution strategy",
    flaky_tests: "Known flaky tests or infra issues",
    test_types: "Types of tests in the suite",
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
    selling_points: "Key selling points",
    objections: "Common customer objections",
    enterprise_reqs: "Enterprise requirements (SSO, compliance, SLAs)",
    integrations: "Available integrations or APIs",
    competitors: "Main competitors and differentiators",
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
    mode: "plan",
    context: {
      role: config.key,
      roleTitle: config.title,
      discoverTopics: config.discoverFields,
    },
    hints: [
      "Conduct a thorough codebase analysis — read key files, trace patterns, understand architecture",
      "Determine as much as you can from code alone before asking the user anything",
      "Use AskUserQuestion only for things the code genuinely cannot tell you",
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
