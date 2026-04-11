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
        intent: "Analyze test coverage gaps and detect the test framework in use",
        mode: "act",
        context: {
          repo: params.repo,
          ...(params.targetFiles?.length ? { target_files: params.targetFiles } : {}),
        },
        hints: [
          "Identify source files with no corresponding test file",
          "For files with tests, identify untested functions/methods",
          "Detect the test framework (pytest, jest, mocha, go test, etc.)",
        ],
        schema: TestGenAnalyzeSchema,
        transitions: { default: "generate" },
      },
      generate: {
        intent: "Generate complete, runnable tests for the identified coverage gaps",
        mode: "act",
        hints: [
          "Write complete test files, not snippets",
          "Match the project's existing test style and conventions",
          "Cover happy paths, edge cases, and error paths",
          "Place test files in the project's test directory",
        ],
        schema: TestGenResultSchema,
        transitions: { default: "verify" },
      },
      verify: {
        intent: "Run the test suite to verify all generated tests pass",
        mode: "act",
        hints: [
          "Set passed=true ONLY if all tests pass (both new and existing)",
          "If any fail, provide detailed feedback for the next generation attempt",
        ],
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
              intent: "Commit the generated tests to a new branch",
              mode: "act",
              context: {
                branch_pattern: "test/dobbe-coverage-{date}",
                commit_message: "test: add generated tests for coverage gaps",
              },
              schema: CommitResultSchema,
              transitions: { default: "pr" },
            },
            pr: {
              intent: "Create a pull request with the generated tests",
              mode: "act",
              context: {
                pr_title: "test: improve coverage",
              },
              schema: PrResultSchema,
              transitions: { default: "done" },
            },
          }
        : {}),
      done: {
        intent: "Test generation complete.",
        schema: z.object({}),
        transitions: {},
      },
      failed: {
        intent: "Test generation failed after maximum iterations. Generated tests could not pass verification.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
