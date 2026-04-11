import type { PipelineDefinition } from "../state/machine.js";
import { SecretsResultSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Scan Secrets pipeline: scan → done
 *
 * Scans repository for hardcoded secrets, API keys, tokens.
 * Uses AI to assess severity and filter false positives.
 */
export function createScanSecretsPipeline(params: {
  repo: string;
  path?: string;
}): PipelineDefinition {
  return {
    name: "scan-secrets",
    initialState: "scan",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      scan: {
        intent: "Scan repository for hardcoded secrets, API keys, tokens, and credentials",
        mode: "act",
        context: {
          repo: params.repo,
          scan_path: params.path || ".",
        },
        hints: [
          "Look for API keys (AKIA*, sk-*, ghp_*, xoxb-*), passwords, private keys, and connection strings",
          "Check .env files, config files, CI/CD configs, and Dockerfiles",
          "Assess severity: critical for real secrets, low for test data/placeholders",
          "Filter false positives: example values, test fixtures, env var references",
        ],
        schema: SecretsResultSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Secrets scan complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
