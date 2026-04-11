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

  const planStep = {
    intent: `Plan the migration from "${params.fromPackage}" to "${params.toPackage}"`,
    mode: "plan" as const,
    context: {
      repo: params.repo,
      from_package: params.fromPackage,
      to_package: params.toPackage,
    },
    hints: [
      "Grep for all usages of the source package in the codebase",
      "Identify breaking changes between the two packages",
      "Plan step-by-step migration with file-level changes",
      "Assess complexity and risks",
    ],
    schema: MigrationPlanSchema,
  };

  if (!shouldRun) {
    return {
      name: "migration-plan",
      initialState: "plan",
      terminalStates: ["done"],
      maxIterations: 0,
      states: {
        plan: {
          ...planStep,
          transitions: { default: "done" },
        },
        done: {
          intent: "Migration planning complete.",
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
        ...planStep,
        transitions: { default: "apply" },
      },
      apply: {
        intent: "Apply the migration plan by editing files and updating dependencies",
        mode: "act",
        context: {
          from_package: params.fromPackage,
          to_package: params.toPackage,
        },
        hints: [
          "Replace all usages, update imports, configuration, and dependency files",
          "Run package manager install to update lockfiles",
        ],
        schema: MigrationApplySchema,
        transitions: { default: "verify" },
      },
      verify: {
        intent: "Verify the migration by running the test suite",
        mode: "act",
        hints: [
          "Set passed=true ONLY if all tests pass",
          "If any fail, provide feedback for the next apply attempt",
        ],
        schema: MigrationVerifySchema,
        transitions: {
          pass: "commit",
          fail: "apply",
          default: "commit",
        },
      },
      commit: {
        intent: "Commit the migration changes to a new branch",
        mode: "act",
        context: {
          branch_pattern: `migrate/${params.fromPackage}-to-${params.toPackage}`,
          commit_message: `refactor: migrate from ${params.fromPackage} to ${params.toPackage}`,
        },
        schema: CommitResultSchema,
        transitions: { default: "pr" },
      },
      pr: {
        intent: "Create a pull request for the migration",
        mode: "act",
        context: {
          pr_title: `refactor: migrate ${params.fromPackage} → ${params.toPackage}`,
        },
        schema: PrResultSchema,
        transitions: { default: "done" },
      },
      done: {
        intent: "Migration complete.",
        schema: z.object({}),
        transitions: {},
      },
      failed: {
        intent: "Migration failed after maximum iterations. Tests could not pass after applying changes.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
