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

/**
 * Pipeline registry: maps command names to pipeline factory functions.
 * Each factory takes params and returns a PipelineDefinition.
 */

export type PipelineFactory = (
  params: Record<string, unknown>,
) => PipelineDefinition;

const registry: Map<string, PipelineFactory> = new Map();

/**
 * Register a pipeline factory.
 */
export function registerPipeline(
  command: string,
  factory: PipelineFactory,
): void {
  registry.set(command, factory);
}

/**
 * Create a pipeline definition from a command name and params.
 */
export function createPipeline(
  command: string,
  params: Record<string, unknown>,
): PipelineDefinition {
  const factory = registry.get(command);
  if (!factory) {
    throw new Error(
      `Unknown pipeline command: "${command}". Available: ${listCommands().join(", ")}`,
    );
  }
  return factory(params);
}

/**
 * List all available pipeline commands.
 */
export function listCommands(): string[] {
  return Array.from(registry.keys());
}

// ─── Register built-in pipelines ───

registerPipeline("vuln-scan", (params) =>
  createVulnScanPipeline({
    repo: (params.repo as string) ?? "",
    severity: (params.severity as string) ?? "critical,high,medium,low",
  }),
);

registerPipeline("vuln-resolve", (params) =>
  createVulnResolvePipeline({
    repo: (params.repo as string) ?? "",
    severity: (params.severity as string) ?? "critical,high,medium,low",
    maxIterations: (params.maxIterations as number) ?? 3,
    baseBranch: (params.baseBranch as string) ?? "main",
  }),
);

registerPipeline("review-digest", (params) =>
  createReviewDigestPipeline({
    repo: (params.repo as string) ?? "",
    prNumber: params.prNumber as number | undefined,
    skipDrafts: (params.skipDrafts as boolean) ?? true,
    skipLabels: params.skipLabels as string[] | undefined,
    skipAuthors: params.skipAuthors as string[] | undefined,
  }),
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
    repo: (params.repo as string) ?? "",
    prNumber: params.prNumber as number | undefined,
    dryRun: (params.dryRun as boolean) ?? false,
  }),
);

registerPipeline("audit-report", (params) =>
  createAuditReportPipeline({
    repo: (params.repo as string) ?? "",
    checks: params.checks as string[] | undefined,
  }),
);

registerPipeline("deps-analyze", (params) =>
  createDepsAnalyzePipeline({
    repo: (params.repo as string) ?? "",
    ecosystem: params.ecosystem as string | undefined,
  }),
);

registerPipeline("test-gen", (params) =>
  createTestGenPipeline({
    repo: (params.repo as string) ?? "",
    targetFiles: params.targetFiles as string[] | undefined,
    maxIterations: (params.maxIterations as number) ?? 3,
    createPr: (params.createPr as boolean) ?? true,
  }),
);

registerPipeline("changelog-gen", (params) =>
  createChangelogGenPipeline({
    repo: (params.repo as string) ?? "",
    fromRef: (params.fromRef as string) ?? "HEAD~10",
    toRef: params.toRef as string | undefined,
    includePrs: (params.includePrs as boolean) ?? false,
  }),
);

registerPipeline("migration-plan", (params) =>
  createMigrationPlanPipeline({
    repo: (params.repo as string) ?? "",
    fromPackage: (params.fromPackage as string) ?? "",
    toPackage: (params.toPackage as string) ?? "",
    run: (params.run as boolean) ?? false,
    maxIterations: (params.maxIterations as number) ?? 3,
  }),
);

registerPipeline("metrics-dora", (params) =>
  createMetricsDoraPipeline({
    repo: (params.repo as string) ?? "",
    period: params.period as string | undefined,
  }),
);

registerPipeline("metrics-velocity", (params) =>
  createMetricsVelocityPipeline({
    repo: (params.repo as string) ?? "",
    period: params.period as string | undefined,
  }),
);

registerPipeline("scan-secrets", (params) =>
  createScanSecretsPipeline({
    repo: (params.repo as string) ?? "",
    path: params.path as string | undefined,
  }),
);
