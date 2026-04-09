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
  const scanPath = params.path || ".";

  return {
    name: "scan-secrets",
    initialState: "scan",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      scan: {
        instruction: [
          `Scan "${params.repo}" for hardcoded secrets and credentials.`,
          "",
          `Scan path: ${scanPath}`,
          "",
          "Search for these patterns using Grep:",
          "- API keys: patterns like AKIA*, sk-*, ghp_*, xoxb-*, Bearer <token>",
          "- Passwords: password=, passwd=, pwd=, secret= with actual values",
          "- Private keys: BEGIN RSA PRIVATE KEY, BEGIN EC PRIVATE KEY",
          "- Connection strings: postgresql://, mongodb://, redis:// with credentials",
          "- AWS credentials: aws_access_key_id, aws_secret_access_key",
          "- Generic tokens: token=, auth=, apikey= with non-placeholder values",
          "",
          "Check these files specifically:",
          "- .env, .env.*, *.env",
          "- config files: *.yml, *.yaml, *.json, *.toml, *.ini",
          "- CI/CD: .github/workflows/*, .gitlab-ci.yml, Jenkinsfile",
          "- Docker: Dockerfile, docker-compose.yml",
          "",
          "For each finding:",
          "- Assess severity (critical for actual secrets, low for test data/placeholders)",
          "- Determine if it's a false positive (example values, test fixtures, env var references)",
          "",
          "Return all findings with severity and false positive assessment.",
        ].join("\n"),
        schema: SecretsResultSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Secrets scan complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
