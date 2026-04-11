import type { PipelineDefinition } from "../state/machine.js";
import { VulnScanResultSchema, VulnScanReportSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Vuln Scan pipeline: scan → report → done.
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
    maxIterations: 0,
    states: {
      scan: {
        intent: "Scan repository for Dependabot vulnerability alerts and triage by actual risk",
        mode: "act",
        context: {
          repo: params.repo,
          severity: severityFilter,
        },
        hints: [
          "Prefer GitHub MCP tools over CLI when available",
          "Assess whether vulnerable code paths are actually used in this project",
          "Group alerts by package and recommend: fix, skip, or manual",
        ],
        schema: VulnScanResultSchema,
        transitions: {
          default: "report",
        },
      },
      report: {
        intent: "Format scan results into a clear, readable security report",
        mode: "report",
        hints: [
          "Include severity breakdown, upgrade paths, and overall security posture",
          "Format as Markdown suitable for terminal display",
        ],
        schema: VulnScanReportSchema,
        transitions: {
          default: "done",
        },
      },
      done: {
        intent: "Scan complete. Present the report to the user.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
