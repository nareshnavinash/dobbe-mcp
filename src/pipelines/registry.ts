import { z } from "zod";
import type { PipelineDefinition } from "../state/machine.js";
import { createVulnScanPipeline } from "./vuln-scan.js";
import { createVulnResolvePipeline } from "./vuln-resolve.js";
import { createReviewDigestPipeline } from "./review-digest.js";
import { createReviewPostPipeline } from "./review-post.js";
import { createIncidentTriagePipeline } from "./incident-triage.js";
import { createAuditReportPipeline } from "./audit-report.js";
import { createDepsAnalyzePipeline } from "./deps-analyze.js";
import { createTestGenPipeline } from "./test-gen.js";
import { createChangelogGenPipeline } from "./changelog-gen.js";
import { createMigrationPlanPipeline } from "./migration-plan.js";
import { createMetricsDoraPipeline, createMetricsVelocityPipeline } from "./metrics.js";
import { createScanSecretsPipeline } from "./scan-secrets.js";
import {
  createReviewAsPmPipeline,
  createReviewAsEngineerPipeline,
  createReviewAsMarketingPipeline,
  createReviewAsDesignerPipeline,
  createReviewAsQaPipeline,
  createReviewAsTestArchitectPipeline,
  createReviewAsSalesPipeline,
} from "./review-roles.js";
import { createProjectReviewPipeline } from "./project-review.js";

/**
 * Pipeline registry: maps command names to pipeline factory functions.
 * Each factory takes validated params and returns a PipelineDefinition.
 */

export type PipelineFactory = (
  params: Record<string, unknown>,
) => PipelineDefinition;

interface RegistryEntry {
  factory: PipelineFactory;
  schema?: z.ZodType;
}

const registry: Map<string, RegistryEntry> = new Map();

/**
 * Register a pipeline factory with optional parameter schema.
 */
export function registerPipeline(
  command: string,
  factory: PipelineFactory,
  schema?: z.ZodType,
): void {
  registry.set(command, { factory, schema });
}

/**
 * Create a pipeline definition from a command name and params.
 * Validates params against the registered schema if one exists.
 */
export function createPipeline(
  command: string,
  params: Record<string, unknown>,
): PipelineDefinition {
  const entry = registry.get(command);
  if (!entry) {
    throw new Error(
      `Unknown pipeline command: "${command}". Available: ${listCommands().join(", ")}`,
    );
  }

  if (entry.schema) {
    const validation = entry.schema.safeParse(params);
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(
        `Invalid parameters for "${command}": ${issues}`,
      );
    }
  }

  return entry.factory(params);
}

/**
 * List all available pipeline commands.
 */
export function listCommands(): string[] {
  return Array.from(registry.keys());
}

// ─── Parameter schemas ───

const repoParams = z.object({
  repo: z.string().min(1, "repo is required (e.g., 'owner/name')"),
});

const retryRepoParams = z.object({
  repo: z.string().min(1, "repo is required (e.g., 'owner/name')"),
  maxIterations: z.number().int().positive().optional(),
});

// ─── Register built-in pipelines ───

registerPipeline("vuln-scan", (params) =>
  createVulnScanPipeline({
    repo: params.repo as string,
    severity: (params.severity as string) ?? "critical,high,medium,low",
  }),
  repoParams,
);

registerPipeline("vuln-resolve", (params) =>
  createVulnResolvePipeline({
    repo: params.repo as string,
    severity: (params.severity as string) ?? "critical,high,medium,low",
    maxIterations: (params.maxIterations as number) ?? 3,
    baseBranch: (params.baseBranch as string) ?? "main",
  }),
  retryRepoParams,
);

registerPipeline("review-digest", (params) =>
  createReviewDigestPipeline({
    repo: params.repo as string,
    prNumber: params.prNumber as number | undefined,
    skipDrafts: (params.skipDrafts as boolean) ?? true,
    skipLabels: params.skipLabels as string[] | undefined,
    skipAuthors: params.skipAuthors as string[] | undefined,
  }),
  repoParams,
);

registerPipeline("incident-triage", (params) =>
  createIncidentTriagePipeline({
    org: (params.org as string) ?? "",
    project: params.project as string | undefined,
    issueId: params.issueId as string | undefined,
    severity: params.severity as string | undefined,
    since: params.since as string | undefined,
    resolve: params.resolve as boolean | undefined,
    cwd: params.cwd as string | undefined,
  }),
);

registerPipeline("review-post", (params) =>
  createReviewPostPipeline({
    repo: params.repo as string,
    prNumber: params.prNumber as number | undefined,
    dryRun: (params.dryRun as boolean) ?? false,
  }),
  repoParams,
);

registerPipeline("audit-report", (params) =>
  createAuditReportPipeline({
    repo: params.repo as string,
    checks: params.checks as string[] | undefined,
  }),
  repoParams,
);

registerPipeline("deps-analyze", (params) =>
  createDepsAnalyzePipeline({
    repo: params.repo as string,
    ecosystem: params.ecosystem as string | undefined,
  }),
  repoParams,
);

registerPipeline("test-gen", (params) =>
  createTestGenPipeline({
    repo: params.repo as string,
    targetFiles: params.targetFiles as string[] | undefined,
    maxIterations: (params.maxIterations as number) ?? 3,
    createPr: (params.createPr as boolean) ?? true,
  }),
  retryRepoParams,
);

registerPipeline("changelog-gen", (params) =>
  createChangelogGenPipeline({
    repo: params.repo as string,
    fromRef: (params.fromRef as string) ?? "HEAD~10",
    toRef: params.toRef as string | undefined,
    includePrs: (params.includePrs as boolean) ?? false,
  }),
  repoParams,
);

registerPipeline("migration-plan", (params) =>
  createMigrationPlanPipeline({
    repo: params.repo as string,
    fromPackage: (params.fromPackage as string) ?? "",
    toPackage: (params.toPackage as string) ?? "",
    run: (params.run as boolean) ?? false,
    maxIterations: (params.maxIterations as number) ?? 3,
  }),
  retryRepoParams,
);

registerPipeline("metrics-dora", (params) =>
  createMetricsDoraPipeline({
    repo: params.repo as string,
    period: params.period as string | undefined,
  }),
  repoParams,
);

registerPipeline("metrics-velocity", (params) =>
  createMetricsVelocityPipeline({
    repo: params.repo as string,
    period: params.period as string | undefined,
  }),
  repoParams,
);

registerPipeline("scan-secrets", (params) =>
  createScanSecretsPipeline({
    repo: params.repo as string,
    path: params.path as string | undefined,
  }),
  repoParams,
);

// ─── Role-Based Review Pipelines ───

registerPipeline("review-as-pm", () => createReviewAsPmPipeline());
registerPipeline("review-as-engineer", () => createReviewAsEngineerPipeline());
registerPipeline("review-as-marketing", () => createReviewAsMarketingPipeline());
registerPipeline("review-as-designer", () => createReviewAsDesignerPipeline());
registerPipeline("review-as-qa", () => createReviewAsQaPipeline());
registerPipeline("review-as-test-architect", () => createReviewAsTestArchitectPipeline());
registerPipeline("review-as-sales", () => createReviewAsSalesPipeline());

const projectReviewParams = z.object({
  roles: z.array(z.enum(["pm", "engineer", "designer", "qa", "test-architect", "marketing", "sales"])).optional(),
});

registerPipeline("project-review", (params) =>
  createProjectReviewPipeline({
    roles: params.roles as string[] | undefined,
  }),
  projectReviewParams,
);
