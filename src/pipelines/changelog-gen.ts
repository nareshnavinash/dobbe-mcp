import type { PipelineDefinition } from "../state/machine.js";
import { ChangelogSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Changelog Gen pipeline: analyze → done
 *
 * Single-pass commit analysis and release note generation.
 */
export function createChangelogGenPipeline(params: {
  repo: string;
  fromRef: string;
  toRef?: string;
  includePrs?: boolean;
}): PipelineDefinition {
  const toRef = params.toRef || "HEAD";

  return {
    name: "changelog-gen",
    initialState: "analyze",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      analyze: {
        intent: "Generate categorized release notes from commit history",
        mode: "act",
        context: {
          repo: params.repo,
          from_ref: params.fromRef,
          to_ref: toRef,
          include_prs: params.includePrs ?? false,
        },
        hints: [
          "Categorize into: feature, fix, breaking, deprecation, performance, documentation, chore, security",
          "Include a concise summary paragraph",
          "If include_prs is true, find associated PRs for each commit",
        ],
        schema: ChangelogSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Changelog generation complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
