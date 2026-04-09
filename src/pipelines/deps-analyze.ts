import type { PipelineDefinition } from "../state/machine.js";
import { DepsReportSchema } from "../utils/schema.js";
import { z } from "zod";

/**
 * Deps Analyze pipeline: analyze → done
 *
 * Single-pass dependency health analysis.
 */
export function createDepsAnalyzePipeline(params: {
  repo: string;
  ecosystem?: string;
}): PipelineDefinition {
  const ecosystemFilter = params.ecosystem
    ? `\nFocus on ${params.ecosystem} ecosystem only.`
    : "";

  return {
    name: "deps-analyze",
    initialState: "analyze",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      analyze: {
        instruction: [
          `Analyze dependency health for "${params.repo}".${ecosystemFilter}`,
          "",
          "Steps:",
          "1. Find dependency manifests: package.json, requirements.txt, pyproject.toml,",
          "   go.mod, Cargo.toml, Gemfile, pom.xml, build.gradle",
          "",
          "2. For each declared dependency:",
          "   - Check if it's imported anywhere in source code (Grep for imports/requires)",
          "   - Determine current vs latest version (if possible)",
          "   - Assess maintenance health: actively maintained, outdated, unmaintained, deprecated",
          "   - Check license type and compliance risk",
          "",
          "3. Flag:",
          "   - Unused dependencies (declared but never imported)",
          "   - Outdated packages (more than 2 major versions behind)",
          "   - Unmaintained packages (no commits in 2+ years)",
          "   - License risks (copyleft in commercial projects)",
          "",
          "Return findings for all dependencies with recommendations.",
        ].join("\n"),
        schema: DepsReportSchema,
        transitions: { default: "done" },
      },
      done: {
        instruction: "Dependency analysis complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}
