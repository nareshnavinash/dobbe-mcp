import type { PipelineDefinition } from "../state/machine.js";
import {
  VulnScanResultSchema,
  FullFixResultSchema,
  CommitResultSchema,
  FullVerifyResultSchema,
  ResolveReportSchema,
  PrResultSchema,
} from "../utils/schema.js";
import { z } from "zod";

/**
 * Vuln Resolve pipeline: scan → fix → commit → verify → [retry] → report → pr → done
 *
 * This is the flagship pipeline with the retry loop.
 * If verify fails, the pipeline loops back to fix with feedback,
 * up to maxIterations times.
 */

export function createVulnResolvePipeline(params: {
  repo: string;
  severity: string;
  maxIterations?: number;
  baseBranch?: string;
}): PipelineDefinition {
  const severity = params.severity || "critical,high,medium,low";
  const maxIter = params.maxIterations ?? 3;
  const baseBranch = params.baseBranch || "main";

  return {
    name: "vuln-resolve",
    initialState: "scan",
    terminalStates: ["done", "failed"],
    maxIterations: maxIter,
    states: {
      scan: {
        intent: "Scan repository for Dependabot vulnerability alerts and triage by actual risk",
        mode: "act",
        context: {
          repo: params.repo,
          severity,
        },
        hints: [
          "Prefer GitHub MCP tools over CLI when available",
          "Assess whether vulnerable code paths are actually used",
          "Group alerts by package and recommend: fix, skip, or manual",
        ],
        schema: VulnScanResultSchema,
        transitions: {
          default: "fix",
        },
      },

      fix: {
        intent: "Apply vulnerability fixes by upgrading dependencies",
        mode: "act",
        context: {
          repo: params.repo,
        },
        hints: [
          "Only bump to PATCH or MINOR versions when possible",
          "Run the package manager install/lock command to regenerate lockfiles",
          "If no safe upgrade exists, skip and explain why",
        ],
        schema: FullFixResultSchema,
        transitions: {
          default: "commit",
        },
      },

      commit: {
        intent: "Commit the dependency fixes to a new branch",
        mode: "act",
        context: {
          branch_pattern: "fix/dobbe-security-{date}",
          commit_message: "fix: resolve vulnerable dependencies",
        },
        hints: [
          "If there are no changes to commit, set committed to false",
        ],
        schema: CommitResultSchema,
        transitions: {
          default: "verify",
        },
      },

      verify: {
        intent: "Verify dependency fixes pass all tests and introduce no breaking changes",
        mode: "act",
        context: {
          base_branch: baseBranch,
          pass_criteria: [
            "All tests pass",
            "No breaking changes detected",
            "Lockfile consistent with dependency files",
          ],
        },
        hints: [
          "Set passed=true ONLY if ALL criteria are met",
          "Provide detailed feedback in 'feedback' field for next fix iteration if any check fails",
        ],
        schema: FullVerifyResultSchema,
        transitions: {
          pass: "report",
          fail: "fix",
          default: "report",
        },
      },

      report: {
        intent: "Write an executive summary of vulnerability fixes for the PR description",
        mode: "report",
        hints: [
          "Cover: what was fixed, what was skipped, verification results, risk assessment, next steps",
          "Keep it concise but informative",
        ],
        schema: ResolveReportSchema,
        transitions: {
          default: "pr",
        },
      },

      pr: {
        intent: "Create a pull request with the vulnerability fixes",
        mode: "act",
        context: {
          base_branch: baseBranch,
          pr_title: "fix: resolve vulnerable dependencies",
        },
        schema: PrResultSchema,
        transitions: {
          default: "done",
        },
      },

      done: {
        intent: "Pipeline complete. All vulnerabilities resolved and PR created.",
        schema: z.object({}),
        transitions: {},
      },

      failed: {
        intent: "Pipeline reached maximum iterations without all tests passing. Manual intervention required.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
