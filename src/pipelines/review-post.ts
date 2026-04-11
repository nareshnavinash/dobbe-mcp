import type { PipelineDefinition } from "../state/machine.js";
import { PrListSchema, ReviewDigestSchema, PostResultSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Review Post pipeline: fetch → review → post → done
 *
 * Like review-digest but actually posts comments to GitHub PRs.
 */
export function createReviewPostPipeline(params: {
  repo: string;
  prNumber?: number;
  dryRun?: boolean;
}): PipelineDefinition {
  const isSingle = params.prNumber !== undefined;
  const dryRun = params.dryRun ?? false;

  return {
    name: "review-post",
    initialState: "fetch",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      fetch: {
        intent: isSingle
          ? `Fetch PR #${params.prNumber} details and diff`
          : "Fetch all open pull requests",
        mode: "act",
        context: {
          repo: params.repo,
          ...(isSingle ? { pr_number: params.prNumber } : {}),
        },
        hints: [
          "Prefer GitHub MCP tools over CLI when available",
        ],
        schema: PrListSchema,
        transitions: { default: "review" },
      },
      review: {
        intent: "Perform deep code review of each PR analyzing security, testing, breaking changes, and quality",
        mode: "plan",
        context: { repo: params.repo },
        hints: [
          "Assign risk level and approval recommendation for each PR",
          "Prioritize by risk level, then age",
        ],
        schema: ReviewDigestSchema,
        transitions: { default: "post" },
      },
      post: {
        intent: dryRun
          ? "Summarize what review comments would be posted (dry run -- do NOT post)"
          : "Post review comments to each PR on GitHub",
        mode: "act",
        context: {
          repo: params.repo,
          dry_run: dryRun,
        },
        hints: [
          ...(dryRun ? [] : [
            "Format reviews as markdown with concerns, recommendations, and risk level",
            "Skip any PRs that already have a dobbe review comment",
          ]),
        ],
        schema: PostResultSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Review posting complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
