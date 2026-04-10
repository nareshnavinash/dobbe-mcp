import type { PipelineDefinition, StepDefinition } from "../state/machine.js";
import {
  DiscoveryResultSchema,
  ProjectReviewSummarySchema,
} from "../utils/schema.js";
import { z } from "zod";
import {
  ROLE_CONFIGS,
  ALL_ROLE_KEYS,
  buildDiscoverInstruction,
  buildAnalyzeInstruction,
} from "./review-roles.js";

/**
 * Master project review pipeline.
 *
 * Dynamically chains selected role-based reviews into a single pipeline.
 * For each role, generates discover + analyze states, then a final
 * synthesize step that produces a cross-cutting executive summary.
 *
 * Example with roles=["pm", "engineer"]:
 *   pm_discover -> pm_analyze -> engineer_discover -> engineer_analyze -> synthesize -> done
 */

export function createProjectReviewPipeline(params: {
  roles?: string[];
}): PipelineDefinition {
  const selectedRoles = params.roles?.length
    ? params.roles.filter((r) => ALL_ROLE_KEYS.includes(r))
    : ALL_ROLE_KEYS;

  if (selectedRoles.length === 0) {
    throw new Error(
      `No valid roles selected. Available: ${ALL_ROLE_KEYS.join(", ")}`,
    );
  }

  const states: Record<string, StepDefinition> = {};

  // Build chained discover -> analyze states for each role
  for (let i = 0; i < selectedRoles.length; i++) {
    const roleKey = selectedRoles[i];
    const config = ROLE_CONFIGS[roleKey];
    const nextRole = selectedRoles[i + 1];

    const discoverKey = `${roleKey}_discover`;
    const analyzeKey = `${roleKey}_analyze`;
    const nextState = nextRole ? `${nextRole}_discover` : "synthesize";

    states[discoverKey] = {
      instruction: buildDiscoverInstruction(config),
      schema: DiscoveryResultSchema,
      transitions: { default: analyzeKey },
    };

    states[analyzeKey] = {
      instruction: buildAnalyzeInstruction(config),
      schema: config.analysisSchema,
      transitions: { default: nextState },
    };
  }

  // Synthesize step: produce executive summary across all roles
  const roleList = selectedRoles
    .map((r) => ROLE_CONFIGS[r].title)
    .join(", ");

  states.synthesize = {
    instruction: [
      "Synthesize all completed role-based reviews into an executive summary.",
      "",
      `Roles completed: ${roleList}`,
      "",
      "Draw from each role's analysis to:",
      "1. Identify cross-cutting themes that multiple roles flagged",
      "2. Highlight the top 3-5 priorities across all perspectives",
      "3. Note any conflicting recommendations between roles and suggest resolution",
      "4. Identify quick wins that multiple roles agree on",
      "",
      "Produce a comprehensive executive summary in markdown that a team lead",
      "could use to prioritize the next sprint.",
      "",
      "Return the structured summary matching the schema.",
    ].join("\n"),
    schema: ProjectReviewSummarySchema,
    transitions: { default: "done" },
  };

  states.done = {
    instruction: "Project review complete. Present the executive summary to the user.",
    schema: z.object({}),
    transitions: {},
  };

  return {
    name: "project-review",
    initialState: `${selectedRoles[0]}_discover`,
    terminalStates: ["done"],
    maxIterations: 0,
    states,
  };
}
