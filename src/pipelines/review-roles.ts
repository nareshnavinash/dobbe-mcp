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
 *   discover  -> Ask user targeted questions from this role's perspective
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
  /** Role-specific guidance for what to ask during discovery. */
  discoverFocus: string[];
  /** Role-specific criteria for the analysis step. */
  analyzeFocus: string[];
  /** Zod schema for the analysis step result. */
  analysisSchema: z.ZodType;
}

// ─── Role Configs ───

const PM_CONFIG: RoleConfig = {
  key: "pm",
  title: "Product Manager",
  discoverFocus: [
    "- Who are the target users and what problems does this solve for them?",
    "- What are the core product metrics or KPIs?",
    "- What is the product roadmap priority right now?",
    "- Are there known feature requests or pain points from users?",
    "- How is success measured for this project?",
  ],
  analyzeFocus: [
    "- Feature completeness: are there obvious gaps in functionality?",
    "- User experience friction: where would users struggle?",
    "- Prioritization opportunities: what would deliver the most value soonest?",
    "- Growth potential: what features could attract new users?",
    "- Product-market fit: does the codebase support the stated product goals?",
  ],
  analysisSchema: PmAnalysisSchema,
};

const ENGINEER_CONFIG: RoleConfig = {
  key: "engineer",
  title: "Staff Engineer",
  discoverFocus: [
    "- What are the key architectural decisions and their rationale?",
    "- Are there known performance bottlenecks or scaling concerns?",
    "- What is the testing strategy and CI/CD setup?",
    "- What is the deployment environment and infrastructure?",
    "- What are the top technical debt priorities?",
  ],
  analyzeFocus: [
    "- Architecture quality: separation of concerns, coupling, cohesion",
    "- Scalability: can this handle 10x load without major rewrites?",
    "- Error handling: are failures handled gracefully?",
    "- Security: are there obvious vulnerabilities (injection, auth, secrets)?",
    "- Code maintainability: is it easy for new engineers to contribute?",
    "- Technical debt: what shortcuts will cause pain later?",
    "- Positive patterns: what is done well and should be preserved?",
  ],
  analysisSchema: EngineerAnalysisSchema,
};

const MARKETING_CONFIG: RoleConfig = {
  key: "marketing",
  title: "Marketing Manager",
  discoverFocus: [
    "- Who is the target audience and what market segment?",
    "- What is the current positioning and value proposition?",
    "- Are there upcoming launches or announcements planned?",
    "- What marketing channels are currently being used?",
    "- How do technical capabilities translate to user benefits?",
  ],
  analyzeFocus: [
    "- Promotion strategies: what channels and tactics would reach the target audience?",
    "- Messaging: how should the product be described to maximize appeal?",
    "- Content opportunities: what blog posts, demos, or case studies could be created?",
    "- Developer relations: how can the project attract contributors or advocates?",
    "- Positioning: how does this differentiate in the market?",
  ],
  analysisSchema: MarketingAnalysisSchema,
};

const DESIGNER_CONFIG: RoleConfig = {
  key: "designer",
  title: "UX/UI Designer",
  discoverFocus: [
    "- Is there a design system or component library in use?",
    "- What are the accessibility requirements and compliance targets?",
    "- Are there any user research findings or usability pain points?",
    "- What platforms and devices must be supported?",
    "- Are there brand guidelines or visual identity constraints?",
  ],
  analyzeFocus: [
    "- UX improvements: where is the user experience confusing or inefficient?",
    "- Accessibility: are WCAG guidelines followed? Are there a11y issues?",
    "- Design consistency: are UI patterns used consistently across the app?",
    "- Information architecture: is content organized logically?",
    "- Interaction patterns: are affordances clear? Is feedback timely?",
    "- Visual hierarchy: does the layout guide the user's attention correctly?",
  ],
  analysisSchema: DesignerAnalysisSchema,
};

const QA_CONFIG: RoleConfig = {
  key: "qa",
  title: "Quality Engineer",
  discoverFocus: [
    "- What are the critical user journeys that must never break?",
    "- Are there known flaky or unreliable areas of the application?",
    "- What is the release cadence and what quality gates exist?",
    "- Have there been recent incidents or regressions?",
    "- What environments are used for testing vs production?",
  ],
  analyzeFocus: [
    "- Bug hunting: identify potential bugs, race conditions, and error-prone code",
    "- Edge cases: what inputs or states could cause unexpected behavior?",
    "- Quality risks: which areas of the codebase are most fragile?",
    "- Error handling: are error paths tested and handled correctly?",
    "- Data validation: is user input validated at system boundaries?",
    "- Concurrency issues: are there shared state or race condition risks?",
  ],
  analysisSchema: QaAnalysisSchema,
};

const TEST_ARCHITECT_CONFIG: RoleConfig = {
  key: "test-architect",
  title: "Test Architect (Staff SDET)",
  discoverFocus: [
    "- What test frameworks and tools are currently in use?",
    "- How is CI/CD configured and what are the test stages?",
    "- What is the test execution strategy (local vs CI, parallel vs serial)?",
    "- Are there known flaky tests or test infrastructure issues?",
    "- What types of tests exist (unit, integration, e2e, performance, contract)?",
  ],
  analyzeFocus: [
    "- Test pyramid balance: is the ratio of unit/integration/e2e tests healthy?",
    "- Automation coverage: what critical paths lack automated tests?",
    "- CI/CD pipeline efficiency: are test stages optimized for speed and reliability?",
    "- Test architecture: are test patterns consistent and maintainable?",
    "- Flaky test analysis: identify tests at risk of intermittent failure",
    "- Test data management: how is test data created and cleaned up?",
    "- Coverage analysis: where are the critical coverage gaps?",
    "- Test environment parity: how close are test environments to production?",
  ],
  analysisSchema: TestArchitectAnalysisSchema,
};

const SALES_CONFIG: RoleConfig = {
  key: "sales",
  title: "Sales Manager",
  discoverFocus: [
    "- What are the key selling points of this product?",
    "- What are common customer objections or concerns?",
    "- Are there enterprise requirements (SSO, compliance, SLAs)?",
    "- What integrations or APIs are available for customers?",
    "- Who are the main competitors and what differentiates this product?",
  ],
  analyzeFocus: [
    "- Differentiators: what unique features set this apart from competitors?",
    "- Competitive analysis: how does this compare to alternatives?",
    "- Objection handling: what concerns would prospects raise and how to address them?",
    "- Enterprise readiness: does the product meet enterprise buyer requirements?",
    "- Value proposition: what is the compelling reason to buy/adopt?",
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

// ─── Instruction Builders ───

export function buildDiscoverInstruction(config: RoleConfig): string {
  return [
    `You are reviewing this codebase as a **${config.title}**.`,
    `Your goal is to understand the project from a ${config.title}'s perspective before conducting a detailed analysis.`,
    "",
    "Complete these steps IN ORDER:",
    "",
    "**Step 1: Codebase Scan**",
    "Silently scan the local codebase to understand its structure:",
    "- Use Glob to discover project structure (source files, config, docs, tests)",
    "- Read key files: README, package.json/pyproject.toml, main entry points",
    "- Identify the tech stack, architecture patterns, and project maturity",
    "- Note anything relevant from your role's perspective",
    "",
    "DO NOT present findings yet. Use what you learn to inform your questions.",
    "",
    "**Step 2: Ask Discovery Questions**",
    `Based on your codebase scan, ask the user 3-5 targeted questions from a ${config.title}'s perspective.`,
    "",
    "Focus your questions on:",
    ...config.discoverFocus,
    "",
    "Rules for questions:",
    "- Reference specific things you found in the codebase (shows you did your homework)",
    "- Ask about things the CODE cannot tell you (intent, priorities, constraints, history)",
    "- Be specific, not generic",
    "- Present all questions at once in a numbered list",
    "- **Wait for the user to respond before proceeding**",
    "",
    "**Step 3: Synthesize**",
    "After the user answers, combine your codebase observations with their answers.",
    "Return the structured discovery result matching the schema.",
  ].join("\n");
}

export function buildAnalyzeInstruction(config: RoleConfig): string {
  return [
    `Using your discovery context, perform a thorough **${config.title}** analysis of this codebase.`,
    "",
    "Your analysis should be informed by:",
    "- Your codebase observations from the discovery step",
    "- The user's answers to your questions",
    "- The focus areas you identified",
    "",
    "Analyze the following from your role's perspective:",
    ...config.analyzeFocus,
    "",
    "Guidelines:",
    "- Reference specific files and line numbers where applicable",
    "- Prioritize findings by impact and actionability",
    "- Be constructive: note what is done well alongside areas for improvement",
    "- Include a comprehensive markdown summary",
    "",
    "Return your analysis as structured JSON matching the schema.",
  ].join("\n");
}

// ─── Shared Pipeline Factory ───

function createRoleReviewPipeline(
  config: RoleConfig,
): PipelineDefinition {
  const states: Record<string, StepDefinition> = {
    discover: {
      instruction: buildDiscoverInstruction(config),
      schema: DiscoveryResultSchema,
      transitions: { default: "analyze" },
    },
    analyze: {
      instruction: buildAnalyzeInstruction(config),
      schema: config.analysisSchema,
      transitions: { default: "done" },
    },
    done: {
      instruction: `${config.title} review complete. Present the findings and recommendations to the user.`,
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
