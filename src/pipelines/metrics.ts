import type { PipelineDefinition } from "../state/machine.js";
import { MetricsReportSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Metrics DORA pipeline: collect → done
 * Metrics Velocity pipeline: collect → done
 *
 * Both are single-pass data collection + computation.
 * No AI needed — Claude runs gh commands and computes metrics.
 */

export function createMetricsDoraPipeline(params: {
  repo: string;
  period?: string;
}): PipelineDefinition {
  const period = params.period || "30d";

  return {
    name: "metrics-dora",
    initialState: "collect",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      collect: {
        instruction: [
          `Compute DORA and velocity metrics for "${params.repo}" over the last ${period}.`,
          "",
          "Data to collect:",
          `1. Merged PRs: gh pr list --repo ${params.repo} --state merged --json number,mergedAt,createdAt,additions,deletions,reviews --limit 200`,
          `2. Releases: gh api /repos/${params.repo}/releases --paginate`,
          "",
          "Compute velocity metrics:",
          "- Total PRs merged in period",
          "- Average cycle time (created → merged) in hours",
          "- Median cycle time in hours",
          "- Median review time (first review) in hours",
          "- Merge cadence (PRs per day)",
          "",
          "Compute DORA metrics:",
          "- Deploy frequency (releases per day)",
          "- Lead time for changes (commit → release) in hours",
          "- Change failure rate (PRs with 'revert' or 'hotfix' / total PRs)",
          "- MTTR (time between failure PR and its fix) in hours",
          "",
          `Period: ${period}`,
          "",
          "Return both velocity and DORA metrics with a summary.",
        ].join("\n"),
        schema: MetricsReportSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Metrics collection complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}

export function createMetricsVelocityPipeline(params: {
  repo: string;
  period?: string;
}): PipelineDefinition {
  const period = params.period || "30d";

  return {
    name: "metrics-velocity",
    initialState: "collect",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      collect: {
        instruction: [
          `Compute PR velocity metrics for "${params.repo}" over the last ${period}.`,
          "",
          `Fetch merged PRs: gh pr list --repo ${params.repo} --state merged --json number,mergedAt,createdAt,additions,deletions,reviews --limit 200`,
          "",
          "Compute:",
          "- Total PRs merged in period",
          "- Average cycle time (created → merged) in hours",
          "- Median cycle time in hours",
          "- Median review time in hours",
          "- Merge cadence (PRs per day)",
          "",
          `Period: ${period}`,
          "",
          "Return velocity metrics with a summary.",
        ].join("\n"),
        schema: MetricsReportSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Velocity metrics collection complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
