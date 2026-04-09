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
  const includePrs = params.includePrs ?? false;

  return {
    name: "changelog-gen",
    initialState: "analyze",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      analyze: {
        instruction: [
          `Generate release notes for "${params.repo}" from ${params.fromRef} to ${toRef}.`,
          "",
          "Steps:",
          `1. Run: git log --format="%H|%s|%aN" ${params.fromRef}..${toRef}`,
          ...(includePrs
            ? [
                `2. For each commit, find associated PRs:`,
                `   gh pr list --repo ${params.repo} --state merged --search "<commit SHA>" --json number,title`,
              ]
            : []),
          "",
          "3. Categorize each commit/PR into:",
          "   - feature: new functionality",
          "   - fix: bug fixes",
          "   - breaking: backward-incompatible changes",
          "   - deprecation: deprecated features",
          "   - performance: performance improvements",
          "   - documentation: docs changes",
          "   - chore: maintenance, CI, tooling",
          "   - security: security fixes",
          "",
          "4. Write a concise summary paragraph",
          "",
          "Return the categorized changelog.",
        ].join("\n"),
        schema: ChangelogSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Changelog generation complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
