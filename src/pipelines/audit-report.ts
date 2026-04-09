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
        instruction: [
          `Perform a security posture audit of "${params.repo}".`,
          "",
          `Checks to perform: ${checks.join(", ")}`,
          "",
          ...(checks.includes("vuln") ? [
            "**Vulnerability check:**",
            `- Fetch Dependabot alerts: gh api /repos/${params.repo}/dependabot/alerts`,
            "- Assess known CVEs in dependency files",
            "",
          ] : []),
          ...(checks.includes("license") ? [
            "**License check:**",
            "- Read dependency manifests (package.json, requirements.txt, etc.)",
            "- Identify copyleft/restrictive licenses (GPL, AGPL)",
            "- Flag packages with unknown or missing licenses",
            "",
          ] : []),
          ...(checks.includes("secrets") ? [
            "**Secrets check:**",
            "- Grep for hardcoded API keys, tokens, passwords, private keys",
            "- Check .env files, config files, CI/CD configs",
            "- Look for patterns: AWS keys, GitHub tokens, connection strings",
            "",
          ] : []),
          ...(checks.includes("quality") ? [
            "**Quality check:**",
            "- Search for security anti-patterns: eval(), pickle, yaml.load, subprocess(shell=True)",
            "- Check for raw SQL queries, XSS vectors, CSRF exemptions",
            "- Verify input validation on endpoints",
            "",
          ] : []),
          "Return a comprehensive audit report with findings and risk score.",
        ].join("\n"),
        schema: AuditReportSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Audit complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
