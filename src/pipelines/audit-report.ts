import type { PipelineDefinition } from "../state/machine.js";
import { AuditReportSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Audit Report pipeline: analyze → done
 *
 * Single-pass security posture audit across 4 dimensions:
 * vuln, license, secrets, quality.
 */
export function createAuditReportPipeline(params: {
  repo: string;
  checks?: string[];
}): PipelineDefinition {
  const checks = params.checks ?? ["vuln", "license", "secrets", "quality"];

  return {
    name: "audit-report",
    initialState: "analyze",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      analyze: {
        intent: "Perform a comprehensive security posture audit",
        mode: "act",
        context: {
          repo: params.repo,
          checks,
        },
        hints: [
          ...(checks.includes("vuln") ? ["Check Dependabot alerts and known CVEs in dependencies"] : []),
          ...(checks.includes("license") ? ["Identify copyleft/restrictive licenses and missing license info"] : []),
          ...(checks.includes("secrets") ? ["Grep for hardcoded API keys, tokens, passwords, private keys"] : []),
          ...(checks.includes("quality") ? ["Search for security anti-patterns: eval(), raw SQL, XSS vectors, CSRF exemptions"] : []),
        ],
        schema: AuditReportSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Audit complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
