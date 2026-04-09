import * as crypto from "node:crypto";
import {
  StateMachine,
  PipelineError,
  type PipelineSession,
  type StepResponse,
} from "../state/machine.js";
import { SessionStorage } from "../state/storage.js";
import { createPipeline, listCommands } from "../pipelines/registry.js";

/**
 * Pipeline tool handlers.
 *
 * These are the MCP tool implementations for:
 *   - pipeline_start:    Initialize a pipeline and return the first instruction
 *   - pipeline_step:     Accept step results, advance state, return next instruction
 *   - pipeline_complete: Finalize a pipeline
 *   - pipeline_status:   Check current pipeline state
 */

const machine = new StateMachine();
const storage = new SessionStorage();
const activeSessions: Map<string, PipelineSession> = new Map();

/**
 * Start a new pipeline.
 */
export function pipelineStart(args: {
  command: string;
  params: Record<string, unknown>;
}): StepResponse & { session_id: string } {
  const { command, params } = args;

  // Create the pipeline definition and register it (idempotent key)
  const definition = createPipeline(command, params);
  const pipelineKey = `${command}-${crypto.randomUUID().slice(0, 8)}`;
  definition.name = pipelineKey;

  try {
    machine.registerPipeline(definition);
  } catch (e) {
    if (e instanceof PipelineError && e.code === "DUPLICATE_PIPELINE") {
      // Already registered — fine
    } else {
      throw e;
    }
  }

  // Create a session
  const sessionId = crypto.randomUUID();
  const session = machine.createSession(pipelineKey, sessionId, params);

  // Persist and cache
  activeSessions.set(sessionId, session);
  storage.save(session);

  // Return the first step
  const step = machine.getCurrentStep(session);
  return { session_id: sessionId, ...step };
}

/**
 * Submit step results and advance the pipeline.
 *
 * For verify steps with retry loops: automatically detects pass/fail from
 * the result and handles retry logic (increment iteration, inject feedback,
 * revert to fix state) when tests fail.
 */
export function pipelineStep(args: {
  session_id: string;
  result: unknown;
  outcome?: string;
}): StepResponse & { session_id: string } {
  const { session_id, result } = args;

  const session = getSession(session_id);
  const definition = machine.getPipeline(session.pipeline);

  const currentState = definition.states[session.currentState];
  if (!currentState) {
    throw new PipelineError(
      `Invalid state: ${session.currentState}`,
      "INVALID_STATE",
    );
  }

  // Auto-detect outcome for verify steps with pass/fail branching
  const resolvedOutcome = resolveOutcome(args.outcome, result, currentState);

  // Handle retry logic for verify failures in pipelines with iteration limits
  if (resolvedOutcome === "fail" && definition.maxIterations > 0) {
    const feedback = extractFeedback(result);
    const retryTarget = currentState.transitions["fail"];

    if (retryTarget) {
      // Validate the result first
      const validation = currentState.schema.safeParse(result);
      if (validation.success) {
        session.stepResults[session.currentState] = validation.data;
      }

      const canRetry = machine.retry(session, feedback, retryTarget);
      if (!canRetry) {
        // Max iterations reached — transition to failure terminal
        const failTerminal = definition.terminalStates.find(s => s === "failed");
        if (failTerminal) {
          session.currentState = failTerminal;
          session.done = true;
          session.updatedAt = new Date().toISOString();
          activeSessions.set(session_id, session);
          storage.save(session);

          return {
            session_id,
            step: failTerminal,
            instruction: definition.states[failTerminal]?.instruction ??
              `Maximum iterations (${definition.maxIterations}) reached. Manual intervention required.`,
            next: "pipeline_complete",
            done: true,
            iteration: session.iteration,
            feedback,
          };
        }
      }

      // Retry: return the fix instruction with injected feedback
      activeSessions.set(session_id, session);
      storage.save(session);

      const retryStep = machine.getCurrentStep(session);
      return {
        session_id,
        ...retryStep,
        iteration: session.iteration,
        feedback,
      };
    }
  }

  try {
    const step = machine.advance(session, result, resolvedOutcome);

    // Persist updated state
    activeSessions.set(session_id, session);
    storage.save(session);

    return { session_id, ...step };
  } catch (e) {
    if (e instanceof PipelineError && e.code === "VALIDATION_ERROR") {
      return {
        session_id,
        step: session.currentState,
        instruction: [
          `Your result didn't match the expected format. Error: ${e.message}`,
          "",
          "Please try again with the correct format.",
          `Current step: ${session.currentState}`,
          `Original instruction: ${currentState.instruction}`,
        ].join("\n"),
        next: "pipeline_step",
      };
    }
    throw e;
  }
}

/**
 * Determine the outcome for a step based on explicit outcome or result content.
 * For verify steps, auto-detect pass/fail from the `passed` field.
 */
function resolveOutcome(
  explicit: string | undefined,
  result: unknown,
  state: { transitions: Record<string, string> },
): string {
  if (explicit) return explicit;

  // Auto-detect: if result has a `passed` boolean and state has pass/fail transitions
  if (
    result &&
    typeof result === "object" &&
    "passed" in result &&
    typeof (result as Record<string, unknown>).passed === "boolean" &&
    ("pass" in state.transitions || "fail" in state.transitions)
  ) {
    return (result as Record<string, unknown>).passed ? "pass" : "fail";
  }

  return "default";
}

/**
 * Extract feedback string from a verify result.
 */
function extractFeedback(result: unknown): string {
  if (!result || typeof result !== "object") return "No details provided.";

  const r = result as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof r.feedback === "string" && r.feedback) {
    parts.push(r.feedback);
  }
  if (typeof r.errors === "string" && r.errors) {
    parts.push(`Errors: ${r.errors}`);
  }
  if (typeof r.test_output === "string" && r.test_output) {
    // Truncate long test output
    const output = r.test_output.length > 2000
      ? r.test_output.slice(0, 2000) + "\n... (truncated)"
      : r.test_output;
    parts.push(`Test output:\n${output}`);
  }

  return parts.length > 0 ? parts.join("\n\n") : "Verification failed. No detailed feedback provided.";
}

/**
 * Complete a pipeline.
 */
export function pipelineComplete(args: {
  session_id: string;
  result?: Record<string, unknown>;
}): { summary: string; done: true; session_id: string } {
  const { session_id, result } = args;
  const session = getSession(session_id);

  // Mark as done
  session.done = true;
  session.updatedAt = new Date().toISOString();
  if (result) {
    session.stepResults["final"] = result;
  }

  // Persist
  activeSessions.set(session_id, session);
  storage.save(session);

  // Build summary
  const stepsCompleted = Object.keys(session.stepResults).length;
  const summary = [
    `Pipeline "${session.pipeline}" completed.`,
    `Steps completed: ${stepsCompleted}`,
    `Iterations: ${session.iteration}`,
    result?.summary ?? result?.pr_url ?? "",
  ]
    .filter(Boolean)
    .join(" | ");

  return { summary, done: true, session_id };
}

/**
 * Check the status of a pipeline session.
 */
export function pipelineStatus(args: { session_id: string }): {
  session_id: string;
  pipeline: string;
  currentState: string;
  iteration: number;
  done: boolean;
  stepsCompleted: string[];
  createdAt: string;
  updatedAt: string;
} {
  const session = getSession(args.session_id);
  return {
    session_id: session.id,
    pipeline: session.pipeline,
    currentState: session.currentState,
    iteration: session.iteration,
    done: session.done,
    stepsCompleted: Object.keys(session.stepResults),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * List available pipeline commands.
 */
export function pipelineList(): { commands: string[] } {
  return { commands: listCommands() };
}

// ─── Internal helpers ───

function getSession(sessionId: string): PipelineSession {
  // Try in-memory first
  let session = activeSessions.get(sessionId);
  if (session) return session;

  // Try disk
  session = storage.load(sessionId) ?? undefined;
  if (session) {
    // Re-register the pipeline definition if needed
    try {
      machine.getPipeline(session.pipeline);
    } catch {
      // Pipeline definition lost (server restart) — need to recreate
      // This is a limitation: we can't fully recover without the original params
      throw new PipelineError(
        `Session "${sessionId}" found but pipeline "${session.pipeline}" is not registered. ` +
          "The MCP server may have restarted. Please start a new pipeline.",
        "PIPELINE_NOT_REGISTERED",
      );
    }
    activeSessions.set(sessionId, session);
    return session;
  }

  throw new PipelineError(
    `Session "${sessionId}" not found`,
    "SESSION_NOT_FOUND",
  );
}

/**
 * Exported for testing: reset all state.
 */
export function _resetForTesting(): void {
  activeSessions.clear();
}
