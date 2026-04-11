import type { PipelineDefinition } from "../state/machine.js";
import {
  PrListSchema,
  ReviewDigestSchema,
} from "../utils/schema.js";
import { z } from "zod";

/**
 * Review Digest pipeline: fetch → review → done
 *
 * Supports both batch mode (all open PRs) and single PR mode.
 */

export function createReviewDigestPipeline(params: {
  repo: string;
  prNumber?: number;
  skipDrafts?: boolean;
  skipLabels?: string[];
  skipAuthors?: string[];
}): PipelineDefinition {
  const isSinglePr = params.prNumber !== undefined;

  return {
    name: "review-digest",
    initialState: "fetch",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      fetch: {
        intent: isSinglePr
          ? `Fetch PR #${params.prNumber} details and diff`
          : "Fetch all open pull requests",
        mode: "act",
        context: {
          repo: params.repo,
          ...(isSinglePr ? { pr_number: params.prNumber } : {}),
          skip_drafts: params.skipDrafts ?? true,
          ...(params.skipLabels?.length ? { skip_labels: params.skipLabels } : {}),
          ...(params.skipAuthors?.length ? { skip_authors: params.skipAuthors } : {}),
        },
        hints: [
          "Prefer GitHub MCP tools over CLI when available",
          ...(isSinglePr ? ["Also fetch the PR diff"] : ["Filter out drafts and skipped labels/authors"]),
        ],
        schema: PrListSchema,
        transitions: {
          default: "review",
        },
      },

      review: {
        intent: "Perform deep code review of each PR analyzing security, testing, breaking changes, and quality",
        mode: "plan",
        context: {
          repo: params.repo,
        },
        hints: [
          "Fetch full diff for each PR and read related source files for context",
          "Prioritize by risk level (critical > high > medium > low), then PR age",
        ],
        schema: ReviewDigestSchema,
        transitions: {
          default: "done",
        },
      },

      done: {
        intent: "Review digest complete. Present the results to the user.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
