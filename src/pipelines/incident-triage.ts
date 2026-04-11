import type { PipelineDefinition } from "../state/machine.js";
import {
  IncidentTriageResultSchema,
  IncidentRcaSchema,
  IncidentResolveResultSchema,
} from "../utils/schema.js";
import { z } from "zod";

/**
 * Incident Triage pipeline.
 *
 * Two variants:
 *   - Batch triage: fetch all Sentry issues → triage → done
 *   - Single issue: fetch one issue → deep RCA → optional resolve → done
 */

export function createIncidentTriagePipeline(params: {
  org: string;
  project?: string;
  issueId?: string;
  severity?: string;
  since?: string;
  resolve?: boolean;
  cwd?: string;
}): PipelineDefinition {
  const isSingle = !!params.issueId;
  const shouldResolve = params.resolve && isSingle;

  if (isSingle) {
    return createSingleIssuePipeline(params, shouldResolve);
  }

  return createBatchTriagePipeline(params);
}

function createBatchTriagePipeline(
  params: { org: string; project?: string; severity?: string; since?: string },
): PipelineDefinition {
  return {
    name: "incident-triage",
    initialState: "fetch",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      fetch: {
        intent: "Triage unresolved Sentry incidents by severity and fixability",
        mode: "act",
        context: {
          org: params.org,
          ...(params.project ? { project: params.project } : {}),
          severity: params.severity || "critical,high,medium,low",
          ...(params.since ? { since: params.since } : {}),
        },
        hints: [
          "Use Sentry MCP tools to search for unresolved issues",
          "For each issue: get stack trace, identify root cause, assess fixability",
          "If Sentry MCP is not available, report this as an error",
        ],
        schema: IncidentTriageResultSchema,
        transitions: {
          default: "done",
        },
      },

      done: {
        intent: "Incident triage complete. Present the results to the user.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}

function createSingleIssuePipeline(
  params: { org: string; project?: string; issueId?: string; cwd?: string; resolve?: boolean },
  shouldResolve: boolean | undefined,
): PipelineDefinition {
  const states: PipelineDefinition["states"] = {
    fetch: {
      intent: `Perform deep root cause analysis of Sentry issue ${params.issueId}`,
      mode: "plan",
      context: {
        org: params.org,
        issue_id: params.issueId,
        ...(params.project ? { project: params.project } : {}),
        ...(params.cwd ? { cwd: params.cwd } : {}),
      },
      hints: [
        "Fetch full stack trace and recent events via Sentry MCP",
        "Locate affected source files and trace the error path through the code",
        "Assess blast radius and whether the issue will recur without a fix",
        "Recommend specific code changes with file paths and line numbers",
      ],
      schema: IncidentRcaSchema,
      transitions: shouldResolve
        ? { default: "resolve" }
        : { default: "done" },
    },

    done: {
      intent: "Incident analysis complete. Present the results to the user.",
      schema: z.object({}),
      transitions: {},
    },
  };

  if (shouldResolve) {
    states.resolve = {
      intent: `Fix the root cause of Sentry issue ${params.issueId}`,
      mode: "act",
      context: {
        issue_id: params.issueId,
      },
      hints: [
        "Fix the root cause, not the symptom",
        "Add or update tests to cover the fix",
        "Keep changes minimal and focused",
      ],
      schema: IncidentResolveResultSchema,
      transitions: {
        default: "done",
      },
    };
  }

  return {
    name: "incident-triage",
    initialState: "fetch",
    terminalStates: ["done"],
    maxIterations: 0,
    states,
  };
}
