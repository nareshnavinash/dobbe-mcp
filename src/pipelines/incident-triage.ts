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
 *   - Batch triage: fetch all Sentry issues → triage → report
 *   - Single issue: fetch one issue → deep RCA → optional resolve
 *
 * States (batch):
 *   fetch    → Get unresolved Sentry issues
 *   triage   → Analyze and triage each issue
 *   done     → Terminal
 *
 * States (single + resolve):
 *   fetch    → Get one Sentry issue details
 *   rca      → Deep root cause analysis with source code
 *   resolve  → Apply fix, run tests
 *   done     → Terminal
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
  const projectClause = params.project ? ` in project "${params.project}"` : "";
  const severityFilter = params.severity || "critical,high,medium,low";
  const sinceClause = params.since ? ` from the last ${params.since}` : "";

  if (isSingle) {
    return createSingleIssuePipeline(params, projectClause, shouldResolve);
  }

  return createBatchTriagePipeline(params, projectClause, severityFilter, sinceClause);
}

function createBatchTriagePipeline(
  params: { org: string; project?: string },
  projectClause: string,
  severityFilter: string,
  sinceClause: string,
): PipelineDefinition {
  return {
    name: "incident-triage",
    initialState: "fetch",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      fetch: {
        instruction: [
          `Triage Sentry incidents for organization "${params.org}"${projectClause}${sinceClause}.`,
          "",
          "Steps:",
          "1. Search for unresolved issues using Sentry MCP:",
          "   mcp__claude_ai_Sentry__search_issues or equivalent",
          `   Filter by severity: ${severityFilter}`,
          "",
          "2. For each issue found:",
          "   a. Get the stack trace and error details",
          "   b. Analyze to identify root cause",
          "   c. Search the codebase for affected code (if available)",
          "   d. Determine severity, fixability, and recommendation",
          "",
          "3. Return the triaged issues as structured JSON.",
          "",
          "If Sentry MCP is not available, report this as an error.",
        ].join("\n"),
        schema: IncidentTriageResultSchema,
        transitions: {
          default: "done",
        },
      },

      done: {
        instruction: "Incident triage complete. Present the results to the user.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}

function createSingleIssuePipeline(
  params: { org: string; project?: string; issueId?: string; cwd?: string; resolve?: boolean },
  projectClause: string,
  shouldResolve: boolean | undefined,
): PipelineDefinition {
  const states: PipelineDefinition["states"] = {
    fetch: {
      instruction: [
        `Analyze Sentry issue ${params.issueId} in organization "${params.org}"${projectClause}.`,
        "",
        "Step 1: Fetch issue details using Sentry MCP:",
        "  - Get full stack trace, error message, event count, timestamps",
        "  - Get recent events for additional context",
        "",
        "Step 2: Locate source code",
        ...(params.cwd
          ? [
              `  Repository available at: ${params.cwd}`,
              "  Use Glob, Read, Grep to find files mentioned in the stack trace.",
            ]
          : [
              "  If a local repository is available, search for affected files.",
            ]),
        "",
        "Step 3: Root cause analysis",
        "  With stack trace AND source code:",
        "  1. Identify the exact root cause",
        "  2. Trace the error path through the code",
        "  3. Identify related issues that may share the same root cause",
        "  4. Assess blast radius (users affected, data at risk)",
        "",
        "Step 4: Recommendation",
        "  - What code needs to change and where (file + line numbers)",
        "  - Whether safe to deploy immediately",
        "  - Tests that should be added",
        "  - Whether the issue will recur without the fix",
        "",
        "Return your deep analysis as structured JSON.",
      ].join("\n"),
      schema: IncidentRcaSchema,
      transitions: shouldResolve
        ? { default: "resolve" }
        : { default: "done" },
    },

    done: {
      instruction: "Incident analysis complete. Present the results to the user.",
      schema: z.object({}),
      transitions: {},
    },
  };

  if (shouldResolve) {
    states.resolve = {
      instruction: [
        `Fix the root cause of Sentry issue ${params.issueId}.`,
        "",
        "Based on your RCA analysis:",
        "1. Apply the recommended fix (edit source files)",
        "2. Add or update tests to cover the fix",
        "3. Run the test suite to verify",
        "",
        "Rules:",
        "- Fix the root cause, not the symptom",
        "- Add proper error handling",
        "- Keep changes minimal and focused",
        "",
        "Return what was changed, whether tests pass, and PR templates.",
      ].join("\n"),
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
