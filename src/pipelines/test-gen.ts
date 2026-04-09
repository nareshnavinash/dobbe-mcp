import type { PipelineDefinition } from "../state/machine.js";
import {
  TestGenAnalyzeSchema,
  TestGenResultSchema,
  TestGenVerifySchema,
  CommitResultSchema,
  PrResultSchema,
} from "../utils/schema.js";
import { z } from "zod";

/**
 * Test Gen pipeline: analyze → generate → verify → [retry] → commit → pr → done
 *
 * Has a retry loop: if generated tests fail verification,
 * feedback is injected and generation is retried.
 */
export function createTestGenPipeline(params: {
  repo: string;
  targetFiles?: string[];
  maxIterations?: number;
  createPr?: boolean;
}): PipelineDefinition {
  const maxIter = params.maxIterations ?? 3;
  const createPr = params.createPr ?? true;

  return {
    name: "test-gen",
    initialState: "analyze",
    terminalStates: ["done", "failed"],
    maxIterations: maxIter,
    states: {
      analyze: {
        instruction: [
          `Analyze test coverage gaps for "${params.repo}".`,
          "",
          ...(params.targetFiles?.length
            ? [`Focus on these files: ${params.targetFiles.join(", ")}`]
            : [
                "Steps:",
                "1. Use Glob to find source files and test files",
                "2. Identify source files that have no corresponding test file",
                "3. For files with tests, identify untested functions/methods",
                "4. Detect the test framework in use (pytest, jest, mocha, go test, etc.)",
              ]),
          "",
          "Return the coverage gaps and detected test framework.",
        ].join("\n"),
        schema: TestGenAnalyzeSchema,
        transitions: { default: "generate" },
      },
      generate: {
        instruction: [
          "Generate tests for the identified coverage gaps.",
          "",
          "Rules:",
          "- Write complete, runnable test files (not snippets)",
          "- Match the project's existing test style and conventions",
          "- Include proper imports, setup/teardown, and fixtures",
          "- Cover happy paths, edge cases, and error paths",
          "- Use the detected test framework",
          "- Place test files in the project's test directory",
          "",
          "Return the list of generated test files.",
        ].join("\n"),
        schema: TestGenResultSchema,
        transitions: { default: "verify" },
      },
      verify: {
        instruction: [
          "Run the test suite to verify the generated tests.",
          "",
          "Steps:",
          "1. Run the project's test command (npm test, pytest, go test, etc.)",
          "2. Check that all new tests pass",
          "3. Check for syntax errors, import errors, or failures",
          "",
          "Set passed=true ONLY if all tests pass (both new and existing).",
          "If any fail, provide detailed feedback for the next generation attempt.",
        ].join("\n"),
        schema: TestGenVerifySchema,
        transitions: {
          pass: createPr ? "commit" : "done",
          fail: "generate",
          default: createPr ? "commit" : "done",
        },
      },
      ...(createPr
        ? {
            commit: {
              instruction: [
                "Commit the generated tests.",
                "  git checkout -b test/dobbe-coverage-$(date +%Y-%m-%d)",
                "  git add -A",
                '  git commit -m "test: add generated tests for coverage gaps"',
              ].join("\n"),
              schema: CommitResultSchema,
              transitions: { default: "pr" },
            },
            pr: {
              instruction: [
                "Create a pull request with the generated tests.",
                "  git push -u origin HEAD",
                '  gh pr create --title "test: improve coverage" --body "<summary of generated tests>"',
                "Report the PR URL.",
              ].join("\n"),
              schema: PrResultSchema,
              transitions: { default: "done" },
            },
          }
        : {}),
      done: {
        instruction: "Test generation complete.",
        schema: z.object({}),
        transitions: {},
      },
      failed: {
        instruction: "Test generation failed after maximum iterations. Generated tests could not pass verification.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
