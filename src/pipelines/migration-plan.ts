import type { PipelineDefinition } from "../state/machine.js";
import {
  MigrationPlanSchema,
  MigrationApplySchema,
  MigrationVerifySchema,
  CommitResultSchema,
  PrResultSchema,
} from "../utils/schema.js";
import { z } from "zod";

/**
 * Migration Plan pipeline.
 *
 * Two modes:
 *   - Plan only: plan → done
 *   - Run (plan + apply + verify with retry): plan → apply → verify → [retry] → commit → pr → done
 */
export function createMigrationPlanPipeline(params: {
  repo: string;
  fromPackage: string;
  toPackage: string;
  run?: boolean;
  maxIterations?: number;
}): PipelineDefinition {
  const shouldRun = params.run ?? false;
  const maxIter = params.maxIterations ?? 3;

  const planInstruction = [
    `Plan the migration from "${params.fromPackage}" to "${params.toPackage}" in "${params.repo}".`,
    "",
    "Steps:",
    `1. Grep for all usages of "${params.fromPackage}" in the codebase`,
    "2. Read affected files to understand usage patterns",
    `3. Identify breaking changes between "${params.fromPackage}" and "${params.toPackage}"`,
    "4. Plan step-by-step migration with file-level changes",
    "5. Assess complexity and risks",
    "",
    "Return the migration plan.",
  ].join("\n");

  if (!shouldRun) {
    return {
      name: "migration-plan",
      initialState: "plan",
      terminalStates: ["done"],
      maxIterations: 0,
      states: {
        plan: {
          instruction: planInstruction,
          schema: MigrationPlanSchema,
          transitions: { default: "done" },
        },
        done: {
          instruction: "Migration planning complete.",
          schema: z.object({}),
          transitions: {},
        },
      },
    };
  }

  return {
    name: "migration-plan",
    initialState: "plan",
    terminalStates: ["done", "failed"],
    maxIterations: maxIter,
    states: {
      plan: {
        instruction: planInstruction,
        schema: MigrationPlanSchema,
        transitions: { default: "apply" },
      },
      apply: {
        instruction: [
          "Apply the migration plan by editing files.",
          "",
          "Follow the plan from the previous step:",
          `- Replace all usages of "${params.fromPackage}" with "${params.toPackage}"`,
          "- Update imports, configuration, and dependency files",
          "- Run package manager install to update lockfiles",
          "",
          "Return the list of modified files.",
        ].join("\n"),
        schema: MigrationApplySchema,
        transitions: { default: "verify" },
      },
      verify: {
        instruction: [
          "Verify the migration by running the test suite.",
          "",
          "1. Run the project's test command",
          "2. Check for import errors, type errors, or runtime failures",
          "3. Verify lockfile consistency",
          "",
          "Set passed=true ONLY if all tests pass.",
          "If any fail, provide feedback for the next apply attempt.",
        ].join("\n"),
        schema: MigrationVerifySchema,
        transitions: {
          pass: "commit",
          fail: "apply",
          default: "commit",
        },
      },
      commit: {
        instruction: [
          "Commit the migration changes.",
          `  git checkout -b migrate/${params.fromPackage}-to-${params.toPackage}`,
          "  git add -A",
          `  git commit -m "refactor: migrate from ${params.fromPackage} to ${params.toPackage}"`,
        ].join("\n"),
        schema: CommitResultSchema,
        transitions: { default: "pr" },
      },
      pr: {
        instruction: [
          "Create a pull request for the migration.",
          "  git push -u origin HEAD",
          `  gh pr create --title "refactor: migrate ${params.fromPackage} → ${params.toPackage}" --body "<migration summary>"`,
          "Report the PR URL.",
        ].join("\n"),
        schema: PrResultSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Migration complete.",
        schema: z.object({}),
        transitions: {},
      },
      failed: {
        instruction: "Migration failed after maximum iterations. Tests could not pass after applying changes.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
