import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import {
  StateMachine,
  PipelineError,
  schemaToHint,
  describeZodType,
  type PipelineDefinition,
  type StepMode,
} from "../../src/state/machine.js";

// ─── Test fixtures ───

function simplePipeline(): PipelineDefinition {
  return {
    name: "test-simple",
    initialState: "step1",
    terminalStates: ["done"],
    maxIterations: 3,
    states: {
      step1: {
        intent: "Do step 1",
        schema: z.object({ value: z.string() }),
        transitions: { default: "step2" },
      },
      step2: {
        intent: "Do step 2",
        schema: z.object({ count: z.number() }),
        transitions: { default: "done" },
      },
      done: {
        intent: "Pipeline complete.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}

function branchingPipeline(): PipelineDefinition {
  return {
    name: "test-branching",
    initialState: "check",
    terminalStates: ["success", "failure"],
    maxIterations: 3,
    states: {
      check: {
        intent: "Check something",
        schema: z.object({ passed: z.boolean() }),
        transitions: { pass: "success", fail: "retry", default: "retry" },
      },
      retry: {
        intent: "Retry the check",
        schema: z.object({ passed: z.boolean() }),
        transitions: { pass: "success", fail: "failure", default: "failure" },
      },
      success: {
        intent: "Success!",
        schema: z.object({}),
        transitions: {},
      },
      failure: {
        intent: "Failed.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}

function declarativePipeline(): PipelineDefinition {
  return {
    name: "test-declarative",
    initialState: "gather",
    terminalStates: ["done"],
    maxIterations: 0,
    states: {
      gather: {
        intent: "Understand the project context",
        mode: "gather" as StepMode,
        context: { role: "engineer" },
        gatherFields: {
          tech_stack: "Primary framework and language",
          deploy_target: "Where this runs in production",
        },
        hints: ["Scan the codebase first before asking questions"],
        schema: z.object({ tech_stack: z.string(), deploy_target: z.string() }),
        transitions: { default: "analyze" },
      },
      analyze: {
        intent: "Perform architecture analysis",
        mode: "plan" as StepMode,
        context: { focus: "scalability" },
        hints: ["Reference specific files and line numbers"],
        schema: z.object({ findings: z.array(z.string()), summary: z.string() }),
        transitions: { default: "done" },
      },
      done: {
        intent: "Analysis complete. Present findings to the user.",
        schema: z.object({}),
        transitions: {},
      },
    },
  };
}

describe("StateMachine", () => {
  let machine: StateMachine;

  beforeEach(() => {
    machine = new StateMachine();
  });

  describe("registerPipeline", () => {
    it("registers a valid pipeline", () => {
      machine.registerPipeline(simplePipeline());
      expect(machine.listPipelines()).toContain("test-simple");
    });

    it("rejects duplicate pipeline names", () => {
      machine.registerPipeline(simplePipeline());
      expect(() => machine.registerPipeline(simplePipeline())).toThrow(
        PipelineError,
      );
    });

    it("rejects pipeline with missing initial state", () => {
      const def = simplePipeline();
      def.initialState = "nonexistent";
      expect(() => machine.registerPipeline(def)).toThrow(PipelineError);
    });

    it("rejects pipeline with missing terminal state", () => {
      const def = simplePipeline();
      def.terminalStates = ["nonexistent"];
      expect(() => machine.registerPipeline(def)).toThrow(PipelineError);
    });

    it("rejects pipeline with invalid transition target", () => {
      const def = simplePipeline();
      def.states.step1.transitions.default = "nonexistent";
      expect(() => machine.registerPipeline(def)).toThrow(PipelineError);
    });
  });

  describe("getPipeline", () => {
    it("returns registered pipeline", () => {
      machine.registerPipeline(simplePipeline());
      const def = machine.getPipeline("test-simple");
      expect(def.name).toBe("test-simple");
    });

    it("throws for unknown pipeline", () => {
      expect(() => machine.getPipeline("unknown")).toThrow(PipelineError);
    });
  });

  describe("listPipelines", () => {
    it("returns empty array initially", () => {
      expect(machine.listPipelines()).toEqual([]);
    });

    it("returns all registered pipeline names", () => {
      machine.registerPipeline(simplePipeline());
      const branching = branchingPipeline();
      machine.registerPipeline(branching);
      expect(machine.listPipelines()).toEqual(["test-simple", "test-branching"]);
    });
  });

  describe("createSession", () => {
    it("creates a session with correct initial state", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {
        repo: "acme/web",
      });

      expect(session.id).toBe("sess-1");
      expect(session.pipeline).toBe("test-simple");
      expect(session.currentState).toBe("step1");
      expect(session.iteration).toBe(1);
      expect(session.stepResults).toEqual({});
      expect(session.feedback).toEqual([]);
      expect(session.params).toEqual({ repo: "acme/web" });
      expect(session.done).toBe(false);
    });

    it("sets timestamps", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      expect(session.createdAt).toBeTruthy();
      expect(session.updatedAt).toBeTruthy();
    });
  });

  describe("getCurrentStep", () => {
    it("returns intent for current state", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      const step = machine.getCurrentStep(session);
      expect(step.step).toBe("step1");
      expect(step.intent).toBe("Do step 1");
      expect(step.next).toBe("pipeline_step");
    });

    it("returns pipeline_complete for terminal states", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      session.currentState = "done";

      const step = machine.getCurrentStep(session);
      expect(step.next).toBe("pipeline_complete");
    });

    it("includes iteration when > 1", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      session.iteration = 2;

      const step = machine.getCurrentStep(session);
      expect(step.iteration).toBe(2);
    });

    it("includes feedback when present", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      session.feedback = ["error 1", "error 2"];

      const step = machine.getCurrentStep(session);
      expect(step.feedback).toBe("error 2");
    });

    it("does not include iteration when 1", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      const step = machine.getCurrentStep(session);
      expect(step.iteration).toBeUndefined();
    });

    it("does not include feedback when empty", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      const step = machine.getCurrentStep(session);
      expect(step.feedback).toBeUndefined();
    });

    it("throws for invalid state", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      session.currentState = "invalid";

      expect(() => machine.getCurrentStep(session)).toThrow(PipelineError);
    });

    it("includes schema hint for ZodObject schemas", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      const step = machine.getCurrentStep(session);
      expect(step.schema).toBeDefined();
      expect(step.schema).toHaveProperty("value");
    });
  });

  describe("getCurrentStep (declarative)", () => {
    it("returns intent and mode for declarative steps", () => {
      machine.registerPipeline(declarativePipeline());
      const session = machine.createSession("test-declarative", "sess-1", {});

      const step = machine.getCurrentStep(session);
      expect(step.intent).toBe("Understand the project context");
      expect(step.mode).toBe("gather");
      expect(step.context).toEqual({ role: "engineer" });
      expect(step.gatherFields).toEqual({
        tech_stack: "Primary framework and language",
        deploy_target: "Where this runs in production",
      });
      expect(step.hints).toEqual(["Scan the codebase first before asking questions"]);
      expect(step.instruction).toBeUndefined();
    });

    it("returns plan mode for analysis steps", () => {
      machine.registerPipeline(declarativePipeline());
      const session = machine.createSession("test-declarative", "sess-1", {});

      machine.advance(session, { tech_stack: "React", deploy_target: "AWS" });
      const step = machine.getCurrentStep(session);
      expect(step.intent).toBe("Perform architecture analysis");
      expect(step.mode).toBe("plan");
      expect(step.context).toEqual({ focus: "scalability" });
      expect(step.gatherFields).toBeUndefined();
    });

    it("omits empty hints array", () => {
      machine.registerPipeline(declarativePipeline());
      const session = machine.createSession("test-declarative", "sess-1", {});

      // Advance to analyze, then to done
      machine.advance(session, { tech_stack: "React", deploy_target: "AWS" });
      machine.advance(session, { findings: ["good"], summary: "ok" });

      const step = machine.getCurrentStep(session);
      expect(step.hints).toBeUndefined(); // done state has no hints
    });

    it("walks through gather → plan → done with declarative steps", () => {
      machine.registerPipeline(declarativePipeline());
      const session = machine.createSession("test-declarative", "sess-1", {});

      // Step 1: gather
      const gatherStep = machine.getCurrentStep(session);
      expect(gatherStep.mode).toBe("gather");
      expect(gatherStep.next).toBe("pipeline_step");

      // Step 2: advance to analyze
      const analyzeStep = machine.advance(session, { tech_stack: "React", deploy_target: "AWS" });
      expect(analyzeStep.mode).toBe("plan");
      expect(analyzeStep.next).toBe("pipeline_step");

      // Step 3: advance to done
      const doneStep = machine.advance(session, { findings: ["solid arch"], summary: "looks good" });
      expect(doneStep.done).toBe(true);
      expect(doneStep.intent).toBe("Analysis complete. Present findings to the user.");
    });
  });

  describe("validation (declarative)", () => {
    it("accepts steps with intent only (no instruction)", () => {
      expect(() => machine.registerPipeline(declarativePipeline())).not.toThrow();
    });

    it("rejects steps without intent", () => {
      const bad: PipelineDefinition = {
        name: "test-bad",
        initialState: "s1",
        terminalStates: ["done"],
        maxIterations: 0,
        states: {
          s1: {
            schema: z.object({}),
            transitions: { default: "done" },
          },
          done: {
            intent: "done",
            schema: z.object({}),
            transitions: {},
          },
        },
      };
      expect(() => machine.registerPipeline(bad)).toThrow(/intent/i);
    });
  });

  describe("advance", () => {
    it("advances to next state with valid result", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      const next = machine.advance(session, { value: "hello" });
      expect(session.currentState).toBe("step2");
      expect(next.step).toBe("step2");
      expect(next.intent).toBe("Do step 2");
    });

    it("stores step results", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      machine.advance(session, { value: "hello" });
      expect(session.stepResults.step1).toEqual({ value: "hello" });
    });

    it("reaches terminal state and sets done", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      machine.advance(session, { value: "hello" });
      const final = machine.advance(session, { count: 42 });

      expect(session.currentState).toBe("done");
      expect(session.done).toBe(true);
      expect(final.done).toBe(true);
      expect(final.next).toBe("pipeline_complete");
    });

    it("rejects invalid result schema", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      expect(() => machine.advance(session, { wrong: 123 })).toThrow(
        PipelineError,
      );
    });

    it("updates timestamp on advance", async () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      const before = session.updatedAt;

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 5));
      machine.advance(session, { value: "hello" });
      expect(session.updatedAt).not.toBe(before);
    });

    it("supports named outcomes for branching", () => {
      machine.registerPipeline(branchingPipeline());
      const session = machine.createSession("test-branching", "sess-1", {});

      const next = machine.advance(session, { passed: true }, "pass");
      expect(session.currentState).toBe("success");
      expect(next.done).toBe(true);
    });

    it("follows fail branch", () => {
      machine.registerPipeline(branchingPipeline());
      const session = machine.createSession("test-branching", "sess-1", {});

      const next = machine.advance(session, { passed: false }, "fail");
      expect(session.currentState).toBe("retry");
      expect(next.done).toBeUndefined();
    });

    it("falls back to default transition", () => {
      machine.registerPipeline(branchingPipeline());
      const session = machine.createSession("test-branching", "sess-1", {});

      // "unknown" outcome falls back to default → retry
      const next = machine.advance(session, { passed: false }, "unknown");
      expect(session.currentState).toBe("retry");
      expect(next.step).toBe("retry");
    });

    it("throws when no matching transition", () => {
      const def: PipelineDefinition = {
        name: "test-no-default",
        initialState: "start",
        terminalStates: ["end"],
        maxIterations: 0,
        states: {
          start: {
            intent: "Start",
            schema: z.object({ v: z.string() }),
            transitions: { specific: "end" },
          },
          end: {
            intent: "End",
            schema: z.object({}),
            transitions: {},
          },
        },
      };
      machine.registerPipeline(def);
      const session = machine.createSession("test-no-default", "sess-1", {});

      expect(() =>
        machine.advance(session, { v: "x" }, "nonexistent"),
      ).toThrow(PipelineError);
    });
  });

  describe("retry", () => {
    it("increments iteration and adds feedback", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      const canRetry = machine.retry(session, "test failed", "step1");
      expect(canRetry).toBe(true);
      expect(session.iteration).toBe(2);
      expect(session.feedback).toEqual(["test failed"]);
      expect(session.currentState).toBe("step1");
    });

    it("returns false when max iterations exceeded", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      session.iteration = 3; // maxIterations is 3

      const canRetry = machine.retry(session, "still failing", "step1");
      expect(canRetry).toBe(false);
      expect(session.iteration).toBe(3); // unchanged
    });

    it("allows unlimited retries when maxIterations is 0", () => {
      const def = simplePipeline();
      def.name = "test-unlimited";
      def.maxIterations = 0;
      machine.registerPipeline(def);
      const session = machine.createSession("test-unlimited", "sess-1", {});
      session.iteration = 100;

      const canRetry = machine.retry(session, "feedback", "step1");
      expect(canRetry).toBe(true);
      expect(session.iteration).toBe(101);
    });

    it("accumulates multiple feedbacks", () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});

      machine.retry(session, "error 1", "step1");
      machine.retry(session, "error 2", "step1");
      expect(session.feedback).toEqual(["error 1", "error 2"]);
      expect(session.iteration).toBe(3);
    });

    it("updates timestamp", async () => {
      machine.registerPipeline(simplePipeline());
      const session = machine.createSession("test-simple", "sess-1", {});
      const before = session.updatedAt;

      await new Promise((r) => setTimeout(r, 5));
      machine.retry(session, "feedback", "step1");
      expect(session.updatedAt).not.toBe(before);
    });
  });

  describe("schemaToHint", () => {
    it("converts ZodObject to hint", () => {
      const schema = z.object({
        name: z.string(),
        count: z.number(),
        active: z.boolean(),
      });
      const hint = schemaToHint(schema);
      expect(hint).toEqual({ name: "string", count: "number", active: "boolean" });
    });

    it("returns unknown for non-object schemas", () => {
      const hint = schemaToHint(z.string());
      expect(hint).toEqual({ type: "unknown" });
    });

    it("handles nested objects", () => {
      const schema = z.object({
        nested: z.object({ val: z.string() }),
      });
      const hint = schemaToHint(schema);
      expect(hint).toEqual({ nested: "{ val: string }" });
    });

    it("handles arrays", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });
      const hint = schemaToHint(schema);
      expect(hint).toEqual({ items: "string[]" });
    });

    it("handles optional fields", () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const hint = schemaToHint(schema);
      expect(hint).toEqual({ required: "string", optional: "string?" });
    });

    it("handles enums", () => {
      const schema = z.object({
        severity: z.enum(["critical", "high", "low"]),
      });
      const hint = schemaToHint(schema);
      expect(hint).toEqual({ severity: "critical | high | low" });
    });
  });

  describe("describeZodType", () => {
    it("describes string", () => {
      expect(describeZodType(z.string())).toBe("string");
    });

    it("describes number", () => {
      expect(describeZodType(z.number())).toBe("number");
    });

    it("describes boolean", () => {
      expect(describeZodType(z.boolean())).toBe("boolean");
    });

    it("describes array with element type", () => {
      expect(describeZodType(z.array(z.string()))).toBe("string[]");
    });

    it("describes object with shape", () => {
      expect(describeZodType(z.object({ x: z.number() }))).toBe("{ x: number }");
    });

    it("describes optional", () => {
      expect(describeZodType(z.string().optional())).toBe("string?");
    });

    it("describes enum", () => {
      expect(describeZodType(z.enum(["a", "b"]))).toBe("a | b");
    });

    it("describes nullable", () => {
      expect(describeZodType(z.string().nullable())).toBe("string | null");
    });

    it("describes default", () => {
      expect(describeZodType(z.string().default("hello"))).toBe("string");
    });

    it("describes literal", () => {
      expect(describeZodType(z.literal("fixed"))).toBe('"fixed"');
    });

    it("describes union", () => {
      expect(describeZodType(z.union([z.string(), z.number()]))).toBe("string | number");
    });

    it("describes record", () => {
      expect(describeZodType(z.record(z.string()))).toBe("Record<string, unknown>");
    });

    it("returns unknown for unrecognized types", () => {
      expect(describeZodType(z.date())).toBe("unknown");
    });
  });
});
