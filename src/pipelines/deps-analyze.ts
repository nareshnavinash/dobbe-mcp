import type { PipelineDefinition } from "../state/machine.js";
import { DepsReportSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Deps Analyze pipeline: analyze → done
 *
 * Single-pass dependency health analysis.
 */
export function createDepsAnalyzePipeline(params: {
  repo: string;
  ecosystem?: string;
}): PipelineDefinition {
  return {
    name: "deps-analyze",
    initialState: "analyze",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      analyze: {
        intent: "Analyze dependency health across all package manifests",
        mode: "act",
        context: {
          repo: params.repo,
          ...(params.ecosystem ? { ecosystem: params.ecosystem } : {}),
        },
        hints: [
          "Check if each dependency is actually imported in source code",
          "Flag unused, outdated (2+ major versions behind), and unmaintained (2+ years) packages",
          "Assess license compliance risk (copyleft in commercial projects)",
        ],
        schema: DepsReportSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Dependency analysis complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
