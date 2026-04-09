import * as crypto from "node:crypto";
import {
  StateMachine,
  PipelineError,
  type PipelineSession,
  type StepResponse,
} from "../state/machine.js";
import { SessionStorage } from "../state/storage.js";
import { createPipeline, listCommands } from "../pipelines/registry.js";
import { logger } from "../utils/logger.js";

/**
 * PipelineService encapsulates the state machine, storage, and active sessions.
 * Created per server instance to avoid global mutable state.
 */
export class PipelineService {
  private machine = new StateMachine();
  private storage: SessionStorage;
  private activeSessions: Map<string, PipelineSession> = new Map();

  constructor(storage?: SessionStorage) {
    this.storage = storage ?? new SessionStorage();
  }

  /**
   * Start a new pipeline.
   */
  async pipelineStart(args: {
    command: string;
    params: Record<string, unknown>;
  }): Promise<StepResponse & { session_id: string }> {
    const { command, params } = args;

    // Create the pipeline definition and register it (idempotent key)
    const definition = createPipeline(command, params);
    const pipelineKey = `${command}-${crypto.randomUUID().slice(0, 8)}`;
    definition.name = pipelineKey;

    try {
      this.machine.registerPipeline(definition);
    } catch (e) {
      if (e instanceof PipelineError && e.code === "DUPLICATE_PIPELINE") {
        // Already registered -- fine
      } else {
        throw e;
      }
    }

    // Create a session
    const sessionId = crypto.randomUUID();
    const session = this.machine.createSession(pipelineKey, sessionId, params, command);

    // Persist and cache
    this.activeSessions.set(sessionId, session);
    await this.storage.save(session);

    // Return the first step
    const step = this.machine.getCurrentStep(session);
    logger.info("Pipeline started", { command, session_id: sessionId, step: step.step });
    return { session_id: sessionId, ...step };
  }

  /**
   * Submit step results and advance the pipeline.
   */
  async pipelineStep(args: {
    session_id: string;
    result: unknown;
    outcome?: string;
  }): Promise<StepResponse & { session_id: string }> {
    const { session_id, result } = args;

    const session = await this.getSession(session_id);
    const definition = this.machine.getPipeline(session.pipeline);

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

        const canRetry = this.machine.retry(session, feedback, retryTarget);
        if (!canRetry) {
          // Max iterations reached -- transition to failure terminal
          const failTerminal = definition.terminalStates.find(s => s === "failed");
          session.done = true;
          session.updatedAt = new Date().toISOString();

          if (failTerminal) {
            session.currentState = failTerminal;
          }

          this.activeSessions.set(session_id, session);
          await this.storage.save(session);

          return {
            session_id,
            step: failTerminal ?? session.currentState,
            instruction: (failTerminal && definition.states[failTerminal]?.instruction) ??
              `Maximum iterations (${definition.maxIterations}) reached. Manual intervention required.`,
            next: "pipeline_complete",
            done: true,
            iteration: session.iteration,
            feedback,
          };
        }

        // Retry: return the fix instruction with injected feedback
        this.activeSessions.set(session_id, session);
        await this.storage.save(session);
        logger.info("Pipeline retrying", { session_id, iteration: session.iteration, max: definition.maxIterations });

        const retryStep = this.machine.getCurrentStep(session);
        const iterationContext = `[Retry attempt ${session.iteration} of ${definition.maxIterations}]\n\n`;
        return {
          session_id,
          ...retryStep,
          instruction: iterationContext + retryStep.instruction,
          iteration: session.iteration,
          feedback,
        };
      }
    }

    try {
      const step = this.machine.advance(session, result, resolvedOutcome);

      // Persist updated state
      this.activeSessions.set(session_id, session);
      await this.storage.save(session);

      return { session_id, ...step };
    } catch (e) {
      if (e instanceof PipelineError && e.code === "VALIDATION_ERROR") {
        logger.warn("Validation error", { session_id, state: session.currentState, error: e.message });
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
   * Complete a pipeline.
   */
  async pipelineComplete(args: {
    session_id: string;
    result?: Record<string, unknown>;
  }): Promise<{ summary: string; done: true; session_id: string }> {
    const { session_id, result } = args;
    const session = await this.getSession(session_id);

    // Mark as done
    session.done = true;
    session.updatedAt = new Date().toISOString();
    if (result) {
      session.stepResults["final"] = result;
    }

    // Persist
    this.activeSessions.set(session_id, session);
    await this.storage.save(session);

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
  async pipelineStatus(args: { session_id: string }): Promise<{
    session_id: string;
    pipeline: string;
    currentState: string;
    iteration: number;
    done: boolean;
    stepsCompleted: string[];
    createdAt: string;
    updatedAt: string;
  }> {
    const session = await this.getSession(args.session_id);
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
  pipelineList(): { commands: string[] } {
    return { commands: listCommands() };
  }

  /**
   * List all sessions (active and persisted).
   */
  async pipelineListSessions(): Promise<{
    sessions: Array<{
      session_id: string;
      pipeline: string;
      currentState: string;
      done: boolean;
      updatedAt: string;
    }>;
  }> {
    const ids = await this.storage.list();
    const sessions = [];
    for (const id of ids) {
      const session = this.activeSessions.get(id) ?? (await this.storage.load(id));
      if (session) {
        sessions.push({
          session_id: session.id,
          pipeline: session.pipeline,
          currentState: session.currentState,
          done: session.done,
          updatedAt: session.updatedAt,
        });
      }
    }
    return { sessions };
  }

  /**
   * Abort an in-progress pipeline.
   */
  async pipelineAbort(args: { session_id: string }): Promise<{
    session_id: string;
    aborted: boolean;
    message: string;
  }> {
    const session = await this.getSession(args.session_id);

    if (session.done) {
      return {
        session_id: session.id,
        aborted: false,
        message: `Session already completed (state: ${session.currentState}).`,
      };
    }

    session.done = true;
    session.updatedAt = new Date().toISOString();
    this.activeSessions.set(session.id, session);
    await this.storage.save(session);
    logger.info("Pipeline aborted", { session_id: session.id, state: session.currentState });

    return {
      session_id: session.id,
      aborted: true,
      message: `Pipeline aborted at state "${session.currentState}".`,
    };
  }

  /**
   * Reset all in-memory state. Used for testing.
   */
  _resetForTesting(): void {
    this.activeSessions.clear();
  }

  // ─── Internal helpers ───

  private async getSession(sessionId: string): Promise<PipelineSession> {
    // Try in-memory first
    let session = this.activeSessions.get(sessionId);
    if (session) return session;

    // Try disk
    session = (await this.storage.load(sessionId)) ?? undefined;
    if (session) {
      // Re-register the pipeline definition if needed
      try {
        this.machine.getPipeline(session.pipeline);
      } catch {
        // Pipeline definition lost (server restart) -- try to recover
        if (session.command && session.params) {
          try {
            const definition = createPipeline(session.command, session.params);
            definition.name = session.pipeline;
            this.machine.registerPipeline(definition);
          } catch {
            throw new PipelineError(
              `Session "${sessionId}" found but could not recover pipeline "${session.pipeline}". ` +
                "Please start a new pipeline.",
              "PIPELINE_NOT_REGISTERED",
            );
          }
        } else {
          throw new PipelineError(
            `Session "${sessionId}" found but pipeline "${session.pipeline}" is not registered. ` +
              "The MCP server may have restarted. Please start a new pipeline.",
            "PIPELINE_NOT_REGISTERED",
          );
        }
      }
      this.activeSessions.set(sessionId, session);
      return session;
    }

    throw new PipelineError(
      `Session "${sessionId}" not found`,
      "SESSION_NOT_FOUND",
    );
  }
}

// ─── Pure helper functions ───

function resolveOutcome(
  explicit: string | undefined,
  result: unknown,
  state: { transitions: Record<string, string> },
): string {
  if (explicit) return explicit;

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
    const output = r.test_output.length > 2000
      ? r.test_output.slice(0, 2000) + "\n... (truncated)"
      : r.test_output;
    parts.push(`Test output:\n${output}`);
  }

  return parts.length > 0 ? parts.join("\n\n") : "Verification failed. No detailed feedback provided.";
}
