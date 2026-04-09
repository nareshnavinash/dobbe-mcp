import type { PipelineDefinition } from "../state/machine.js";
import {
  PrListSchema,
  ReviewDigestSchema,
} from "../utils/schema.js";
import { z } from "zod";

/**
 * Review Digest pipeline: fetch → review → digest → done
 *
 * Supports both batch mode (all open PRs) and single PR mode.
 *
 * States:
 *   fetch    → Discover open PRs for the repo(s)
 *   review   → Analyze PRs with deep code review
 *   digest   → Prioritize and format the final digest
 *   done     → Terminal state
 */

export function createReviewDigestPipeline(params: {
  repo: string;
  prNumber?: number;
  skipDrafts?: boolean;
  skipLabels?: string[];
  skipAuthors?: string[];
}): PipelineDefinition {
  const skipDrafts = params.skipDrafts ?? true;
  const isSinglePr = params.prNumber !== undefined;

  const fetchInstruction = isSinglePr
    ? [
        `Fetch PR #${params.prNumber} from "${params.repo}".`,
        "",
        "Use GitHub MCP tools if available, otherwise:",
        `  gh pr view ${params.prNumber} --repo ${params.repo} --json number,title,author,body,labels,createdAt,isDraft`,
        "",
        "Also fetch the PR diff:",
        `  gh pr diff ${params.prNumber} --repo ${params.repo}`,
        "",
        "Return the PR info in the expected schema format.",
        "Set total to 1.",
      ].join("\n")
    : [
        `Fetch all open pull requests from "${params.repo}".`,
        "",
        "Use GitHub MCP tools if available, otherwise:",
        `  gh pr list --repo ${params.repo} --state open --json number,title,author,body,labels,createdAt,isDraft --limit 50`,
        "",
        "Filter out:",
        ...(skipDrafts ? ["- Draft PRs"] : []),
        ...(params.skipLabels?.length
          ? [`- PRs with labels: ${params.skipLabels.join(", ")}`]
          : []),
        ...(params.skipAuthors?.length
          ? [`- PRs by authors: ${params.skipAuthors.join(", ")}`]
          : []),
        "",
        "Return the filtered list of PRs.",
      ].join("\n");

  return {
    name: "review-digest",
    initialState: "fetch",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      fetch: {
        instruction: fetchInstruction,
        schema: PrListSchema,
        transitions: {
          default: "review",
        },
      },

      review: {
        instruction: [
          "Perform a deep code review of each PR from the previous step.",
          "",
          "For each PR:",
          "1. Fetch the full diff (if not already available)",
          `   gh pr diff <number> --repo ${params.repo}`,
          "2. Read related source files for context (use Read/Grep tools)",
          "3. Analyze for:",
          "   - **Security**: injection, auth flaws, secrets, unsafe operations",
          "   - **Testing**: missing test coverage, broken tests",
          "   - **Breaking changes**: API changes, schema changes, config changes",
          "   - **Code quality**: complexity, duplication, naming, patterns",
          "4. Assign a risk level and approval recommendation",
          "",
          "Prioritize results by:",
          "  1. Risk level (critical > high > medium > low)",
          "  2. PR age (oldest first within same risk level)",
          "",
          "Include an overall digest summary.",
        ].join("\n"),
        schema: ReviewDigestSchema,
        transitions: {
          default: "done",
        },
      },

      done: {
        instruction: "Review digest complete. Present the results to the user.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
