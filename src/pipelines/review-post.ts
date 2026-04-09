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
        instruction: isSingle
          ? [
              `Fetch PR #${params.prNumber} from "${params.repo}".`,
              `  gh pr view ${params.prNumber} --repo ${params.repo} --json number,title,author,body,labels,headRefOid`,
              `  gh pr diff ${params.prNumber} --repo ${params.repo}`,
              "Return the PR info.",
            ].join("\n")
          : [
              `Fetch all open PRs from "${params.repo}".`,
              `  gh pr list --repo ${params.repo} --state open --json number,title,author,body,labels,headRefOid --limit 20`,
              "Return the PR list.",
            ].join("\n"),
        schema: PrListSchema,
        transitions: { default: "review" },
      },
      review: {
        instruction: [
          "Perform a deep code review of each PR.",
          "For each PR: fetch diff, read source files, analyze for security/testing/breaking/quality.",
          "Assign risk level and approval recommendation.",
          "Prioritize by risk level, then age.",
        ].join("\n"),
        schema: ReviewDigestSchema,
        transitions: { default: "post" },
      },
      post: {
        instruction: dryRun
          ? "Dry run mode -- do NOT post to GitHub. Return a summary of what would be posted."
          : [
              "Post review comments to each PR on GitHub.",
              "For each PR review:",
              `  gh pr review <number> --repo ${params.repo} --comment --body "<formatted review>"`,
              "Format the review as markdown with concerns, recommendations, and risk level.",
              "Skip any PRs that already have a dobbe review comment.",
              "Return the list of posted and skipped PRs.",
            ].join("\n"),
        schema: PostResultSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Review posting complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
