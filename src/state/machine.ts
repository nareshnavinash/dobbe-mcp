import { z } from "zod";

/**
 * Generic finite state machine for pipeline orchestration.
 *
 * Each pipeline defines its own states, transitions, and per-step
 * instructions/schemas. The machine enforces valid transitions and
 * validates step results against Zod schemas before advancing.
 */

export interface StepDefinition {
  /** Instruction text returned to Claude for this step. */
  instruction: string;
  /** Zod schema for validating the result Claude submits for this step. */
  schema: z.ZodType;
  /** Which states this step can transition to (keyed by outcome). */
  transitions: Record<string, string>;
}

export interface PipelineDefinition {
  /** Unique pipeline name (e.g., "vuln-scan", "vuln-resolve"). */
  name: string;
  /** The initial state when the pipeline starts. */
  initialState: string;
  /** Terminal states — pipeline is done when it reaches one of these. */
  terminalStates: string[];
  /** Maximum iterations for retry loops (0 = no limit). */
  maxIterations: number;
  /** State definitions keyed by state name. */
  states: Record<string, StepDefinition>;
}

export interface PipelineSession {
  /** Unique session identifier. */
  id: string;
  /** Pipeline definition name. */
  pipeline: string;
  /** Current state in the state machine. */
  currentState: string;
  /** Current iteration count (for retry loops). */
  iteration: number;
  /** Accumulated results from each completed step. */
  stepResults: Record<string, unknown>;
  /** Feedback from failed attempts (used in retry instructions). */
  feedback: string[];
  /** Pipeline parameters (repo, severity, etc.). */
  params: Record<string, unknown>;
  /** Timestamp when the session was created. */
  createdAt: string;
  /** Timestamp of the last state transition. */
  updatedAt: string;
  /** Whether the pipeline has reached a terminal state. */
  done: boolean;
}

export interface StepResponse {
  /** Current step name. */
  step: string;
  /** Instruction for Claude to follow. */
  instruction: string;
  /** Name of the next MCP tool Claude should call. */
  next: string;
  /** JSON schema hint for the expected result shape (serialized). */
  schema?: Record<string, unknown>;
  /** Current iteration number (for retry steps). */
  iteration?: number;
  /** Feedback from previous failed attempts. */
  feedback?: string;
  /** Whether the pipeline is complete. */
  done?: boolean;
  /** Final summary (only when done). */
  summary?: string;
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export class StateMachine {
  private definitions: Map<string, PipelineDefinition> = new Map();

  /**
   * Register a pipeline definition.
   */
  registerPipeline(definition: PipelineDefinition): void {
    if (this.definitions.has(definition.name)) {
      throw new PipelineError(
        `Pipeline "${definition.name}" is already registered`,
        "DUPLICATE_PIPELINE",
      );
    }
    this.validateDefinition(definition);
    this.definitions.set(definition.name, definition);
  }

  /**
   * Get a registered pipeline definition.
   */
  getPipeline(name: string): PipelineDefinition {
    const def = this.definitions.get(name);
    if (!def) {
      throw new PipelineError(
        `Pipeline "${name}" is not registered`,
        "UNKNOWN_PIPELINE",
      );
    }
    return def;
  }

  /**
   * List all registered pipeline names.
   */
  listPipelines(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Create a new pipeline session.
   */
  createSession(
    pipelineName: string,
    sessionId: string,
    params: Record<string, unknown>,
  ): PipelineSession {
    const def = this.getPipeline(pipelineName);
    const now = new Date().toISOString();
    return {
      id: sessionId,
      pipeline: pipelineName,
      currentState: def.initialState,
      iteration: 1,
      stepResults: {},
      feedback: [],
      params,
      createdAt: now,
      updatedAt: now,
      done: false,
    };
  }

  /**
   * Get the current step response (instruction) for a session.
   */
  getCurrentStep(session: PipelineSession): StepResponse {
    const def = this.getPipeline(session.pipeline);
    const state = def.states[session.currentState];

    if (!state) {
      throw new PipelineError(
        `State "${session.currentState}" not found in pipeline "${session.pipeline}"`,
        "INVALID_STATE",
      );
    }

    const isTerminal = def.terminalStates.includes(session.currentState);

    const response: StepResponse = {
      step: session.currentState,
      instruction: state.instruction,
      next: isTerminal ? "pipeline_complete" : "pipeline_step",
    };

    if (session.iteration > 1) {
      response.iteration = session.iteration;
    }

    if (session.feedback.length > 0) {
      response.feedback = session.feedback[session.feedback.length - 1];
    }

    // Provide a JSON schema hint for the expected result shape
    if (state.schema instanceof z.ZodObject) {
      response.schema = schemaToHint(state.schema);
    }

    return response;
  }

  /**
   * Advance the session to the next state based on the submitted result.
   *
   * Returns the next step response, or a completion response if done.
   */
  advance(
    session: PipelineSession,
    result: unknown,
    outcome: string = "default",
  ): StepResponse {
    const def = this.getPipeline(session.pipeline);
    const state = def.states[session.currentState];

    if (!state) {
      throw new PipelineError(
        `State "${session.currentState}" not found in pipeline "${session.pipeline}"`,
        "INVALID_STATE",
      );
    }

    // Validate the result against the step's schema
    const validation = state.schema.safeParse(result);
    if (!validation.success) {
      throw new PipelineError(
        `Validation failed for step "${session.currentState}": ${validation.error.message}`,
        "VALIDATION_ERROR",
      );
    }

    // Store the validated result
    session.stepResults[session.currentState] = validation.data;
    session.updatedAt = new Date().toISOString();

    // Determine next state
    const nextState =
      state.transitions[outcome] ?? state.transitions["default"];
    if (!nextState) {
      throw new PipelineError(
        `No transition for outcome "${outcome}" from state "${session.currentState}"`,
        "NO_TRANSITION",
      );
    }

    // Move to next state
    session.currentState = nextState;

    // Check if we've reached a terminal state
    if (def.terminalStates.includes(nextState)) {
      session.done = true;
      const terminalState = def.states[nextState];
      return {
        step: nextState,
        instruction: terminalState?.instruction ?? "Pipeline complete.",
        next: "pipeline_complete",
        done: true,
      };
    }

    return this.getCurrentStep(session);
  }

  /**
   * Handle a retry: increment iteration, add feedback, transition to retry state.
   *
   * Returns false if max iterations exceeded.
   */
  retry(session: PipelineSession, feedback: string, retryState: string): boolean {
    const def = this.getPipeline(session.pipeline);

    if (def.maxIterations > 0 && session.iteration >= def.maxIterations) {
      return false;
    }

    session.iteration += 1;
    session.feedback.push(feedback);
    session.currentState = retryState;
    session.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Validate a pipeline definition for correctness.
   */
  private validateDefinition(def: PipelineDefinition): void {
    // Initial state must exist
    if (!def.states[def.initialState]) {
      throw new PipelineError(
        `Initial state "${def.initialState}" not found in states`,
        "INVALID_DEFINITION",
      );
    }

    // Terminal states must exist
    for (const ts of def.terminalStates) {
      if (!def.states[ts]) {
        throw new PipelineError(
          `Terminal state "${ts}" not found in states`,
          "INVALID_DEFINITION",
        );
      }
    }

    // All transition targets must exist
    for (const [stateName, state] of Object.entries(def.states)) {
      for (const [outcome, target] of Object.entries(state.transitions)) {
        if (!def.states[target]) {
          throw new PipelineError(
            `Transition target "${target}" from "${stateName}" (outcome: "${outcome}") not found`,
            "INVALID_DEFINITION",
          );
        }
      }
    }
  }
}

/**
 * Convert a Zod schema to a simple JSON-like hint object for Claude.
 * This doesn't need to be a full JSON Schema — just enough for Claude
 * to understand the expected result shape.
 */
export function schemaToHint(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const hint: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(shape)) {
      hint[key] = describeZodType(value);
    }
    return hint;
  }
  return { type: "unknown" };
}

export function describeZodType(schema: z.ZodType): string {
  if (schema instanceof z.ZodString) return "string";
  if (schema instanceof z.ZodNumber) return "number";
  if (schema instanceof z.ZodBoolean) return "boolean";
  if (schema instanceof z.ZodArray) return "array";
  if (schema instanceof z.ZodObject) return "object";
  if (schema instanceof z.ZodOptional) {
    return describeZodType(schema.unwrap()) + "?";
  }
  if (schema instanceof z.ZodEnum) {
    return (schema.options as string[]).join(" | ");
  }
  return "unknown";
}
