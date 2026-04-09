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
 *
 * States:
 *   scan     → Fetch and triage Dependabot alerts
 *   fix      → Apply dependency upgrades
 *   commit   → Git commit the changes
 *   verify   → Run tests and check for breaking changes
 *   report   → Generate executive summary
 *   pr       → Create pull request
 *   done     → Terminal (success)
 *   failed   → Terminal (max iterations reached without convergence)
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
        instruction: [
          `Scan the repository "${params.repo}" for Dependabot vulnerability alerts.`,
          "",
          "Steps:",
          `1. Fetch all Dependabot alerts with severity: ${severity}.`,
          "   Use the GitHub MCP tools if available, otherwise use:",
          `   gh api /repos/${params.repo}/dependabot/alerts --paginate`,
          "",
          "2. For each alert, assess the actual risk:",
          "   - Is the vulnerable code path actually used in this project?",
          "   - Is the vulnerability reachable from external input?",
          "   - What is the blast radius if exploited?",
          "",
          "3. Group alerts by package and recommend an action for each:",
          '   - "fix" -- vulnerability is in a code path that is used',
          '   - "skip" -- vulnerability is in an unused code path or dev-only dependency',
          '   - "manual" -- requires manual assessment (complex upgrade, breaking changes)',
          "",
          "4. Return your findings as structured JSON matching the schema.",
        ].join("\n"),
        schema: VulnScanResultSchema,
        transitions: {
          default: "fix",
        },
      },

      fix: {
        instruction: [
          "Apply vulnerability fixes by modifying dependency files.",
          "",
          "Based on the scan results, upgrade the packages that were marked for fixing.",
          "",
          "Rules:",
          "- Only bump to PATCH or MINOR versions when possible",
          "- If no safe upgrade exists, skip and explain why",
          "- Run the package manager install/lock command to regenerate lockfiles",
          "  (e.g., npm install, pip install, bundle install)",
          "- Modify the actual dependency files (package.json, requirements.txt, pyproject.toml, etc.)",
          "",
          "Return the list of fixes applied and any packages skipped.",
        ].join("\n"),
        schema: FullFixResultSchema,
        transitions: {
          default: "commit",
        },
      },

      commit: {
        instruction: [
          "Commit the dependency fixes to a new branch.",
          "",
          "Run these git commands:",
          `  git checkout -b fix/dobbe-security-$(date +%Y-%m-%d) 2>/dev/null || git checkout fix/dobbe-security-$(date +%Y-%m-%d)`,
          "  git add -A",
          '  git commit -m "fix: resolve vulnerable dependencies"',
          "",
          "Report whether the commit succeeded. If there are no changes to commit,",
          "set committed to false.",
        ].join("\n"),
        schema: CommitResultSchema,
        transitions: {
          default: "verify",
        },
      },

      verify: {
        instruction: [
          `Verify the dependency fixes on the current branch against "${baseBranch}".`,
          "",
          "Steps:",
          `1. Run: git diff ${baseBranch}...HEAD (review what changed)`,
          "2. Check for breaking changes in the diff",
          "3. Run the project's test suite (npm test, pytest, etc.)",
          "4. Check lockfile consistency",
          "",
          "IMPORTANT: Set passed=true ONLY if ALL of these conditions are met:",
          "- All tests pass",
          "- No breaking changes detected",
          "- Lockfile is consistent with dependency files",
          "",
          "If any check fails, provide detailed feedback in the 'feedback' field",
          "explaining what went wrong and suggesting a different approach.",
          "This feedback will be used in the next fix iteration.",
        ].join("\n"),
        schema: FullVerifyResultSchema,
        transitions: {
          pass: "report",
          fail: "fix",
          default: "report",
        },
      },

      report: {
        instruction: [
          "Write an executive summary covering:",
          "",
          "1. What was fixed (packages, versions, CVE counts)",
          "2. What was skipped and why",
          "3. Verification results (tests passed/failed, iterations needed)",
          "4. Risk assessment",
          "5. Recommended next steps",
          "",
          "Keep it concise but informative -- this will be included in the PR description.",
        ].join("\n"),
        schema: ResolveReportSchema,
        transitions: {
          default: "pr",
        },
      },

      pr: {
        instruction: [
          "Create a pull request with the fixes.",
          "",
          "Run these commands:",
          "  git push -u origin HEAD",
          `  gh pr create --base ${baseBranch} --title "fix: resolve vulnerable dependencies" --body "<your report summary>"`,
          "",
          "Report the PR URL and branch name.",
        ].join("\n"),
        schema: PrResultSchema,
        transitions: {
          default: "done",
        },
      },

      done: {
        instruction: "Pipeline complete. All vulnerabilities resolved and PR created.",
        schema: z.object({}),
        transitions: {},
      },

      failed: {
        instruction: "Pipeline reached maximum iterations without all tests passing. Manual intervention required.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
