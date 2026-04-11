import type { PipelineDefinition } from "../state/machine.js";
import { DoraReportSchema, VelocityReportSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Metrics DORA pipeline: collect → done
 * Metrics Velocity pipeline: collect → done
 *
 * Both are single-pass data collection + computation.
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
        intent: "Compute DORA and velocity metrics from merged PRs and releases",
        mode: "act",
        context: {
          repo: params.repo,
          period,
        },
        hints: [
          "Fetch merged PRs and releases from GitHub",
          "Compute velocity: cycle time, review time, merge cadence",
          "Compute DORA: deploy frequency, lead time, change failure rate, MTTR",
        ],
        schema: DoraReportSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Metrics collection complete.",
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
        intent: "Compute PR velocity metrics from merged pull requests",
        mode: "act",
        context: {
          repo: params.repo,
          period,
        },
        hints: [
          "Fetch merged PRs from GitHub",
          "Compute: total merged, average/median cycle time, review time, merge cadence",
        ],
        schema: VelocityReportSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Velocity metrics collection complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
