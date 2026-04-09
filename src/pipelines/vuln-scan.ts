import type { PipelineDefinition } from "../state/machine.js";
import { VulnScanResultSchema, VulnScanReportSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Vuln Scan pipeline: scan → triage → report.
 *
 * States:
 *   scan    → Claude fetches Dependabot alerts and triages them
 *   report  → Claude formats the results into a readable report
 *   done    → Terminal state
 */

export function createVulnScanPipeline(params: {
  repo: string;
  severity: string;
}): PipelineDefinition {
  const severityFilter = params.severity || "critical,high,medium,low";

  return {
    name: "vuln-scan",
    initialState: "scan",
    terminalStates: ["done"],
    maxIterations: 0, // No retry loop for scan-only
    states: {
      scan: {
        instruction: [
          `Scan the repository "${params.repo}" for Dependabot vulnerability alerts.`,
          "",
          "Steps:",
          `1. Fetch all Dependabot alerts with severity: ${severityFilter}.`,
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
          default: "report",
        },
      },
      report: {
        instruction: [
          "Format the scan results into a clear, readable report.",
          "",
          "The report should include:",
          "- Total alerts found and breakdown by severity",
          "- A table of alerts grouped by package with action recommendations",
          "- For each 'fix' recommendation: the upgrade path (from → to version)",
          "- For each 'skip': why it was skipped",
          "- A summary paragraph with the overall security posture assessment",
          "",
          "Format as Markdown text suitable for terminal display.",
        ].join("\n"),
        schema: VulnScanReportSchema,
        transitions: {
          default: "done",
        },
      },
      done: {
        instruction: "Scan complete. Present the report to the user.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
