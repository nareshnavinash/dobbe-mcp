import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { SessionStorage } from "../../src/state/storage.js";
import type { PipelineSession } from "../../src/state/machine.js";

function createTestSession(overrides: Partial<PipelineSession> = {}): PipelineSession {
  return {
    id: "test-session-1",
    pipeline: "vuln-scan",
    command: "vuln-scan",
    currentState: "scan",
    iteration: 1,
    stepResults: {},
    feedback: [],
    params: { repo: "acme/web" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    done: false,
    ...overrides,
  };
}

describe("SessionStorage", () => {
  let tmpDir: string;
  let storage: SessionStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dobbe-storage-test-"));
    storage = new SessionStorage(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("save and load", () => {
    it("saves and loads a session", async () => {
      const session = createTestSession();
      await storage.save(session);

      const loaded = await storage.load("test-session-1");
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe("test-session-1");
      expect(loaded!.pipeline).toBe("vuln-scan");
      expect(loaded!.params).toEqual({ repo: "acme/web" });
    });

    it("returns null for missing session", async () => {
      expect(await storage.load("nonexistent")).toBeNull();
    });

    it("overwrites existing session on save", async () => {
      const session = createTestSession();
      await storage.save(session);

      session.currentState = "report";
      session.iteration = 2;
      await storage.save(session);

      const loaded = await storage.load("test-session-1");
      expect(loaded!.currentState).toBe("report");
      expect(loaded!.iteration).toBe(2);
    });

    it("preserves all session fields", async () => {
      const session = createTestSession({
        iteration: 3,
        stepResults: { scan: { groups: [] } },
        feedback: ["error 1", "error 2"],
        done: true,
      });
      await storage.save(session);

      const loaded = await storage.load("test-session-1");
      expect(loaded!.iteration).toBe(3);
      expect(loaded!.stepResults).toEqual({ scan: { groups: [] } });
      expect(loaded!.feedback).toEqual(["error 1", "error 2"]);
      expect(loaded!.done).toBe(true);
    });
  });

  describe("delete", () => {
    it("deletes an existing session", async () => {
      await storage.save(createTestSession());
      expect(await storage.delete("test-session-1")).toBe(true);
      expect(await storage.load("test-session-1")).toBeNull();
    });

    it("returns false for missing session", async () => {
      expect(await storage.delete("nonexistent")).toBe(false);
    });
  });

  describe("list", () => {
    it("returns empty array when no sessions", async () => {
      expect(await storage.list()).toEqual([]);
    });

    it("lists all session IDs", async () => {
      await storage.save(createTestSession({ id: "sess-1" }));
      await storage.save(createTestSession({ id: "sess-2" }));
      await storage.save(createTestSession({ id: "sess-3" }));

      const ids = (await storage.list()).sort();
      expect(ids).toEqual(["sess-1", "sess-2", "sess-3"]);
    });
  });

  describe("listByPipeline", () => {
    it("filters sessions by pipeline name", async () => {
      await storage.save(createTestSession({ id: "s1", pipeline: "vuln-scan" }));
      await storage.save(createTestSession({ id: "s2", pipeline: "vuln-resolve" }));
      await storage.save(createTestSession({ id: "s3", pipeline: "vuln-scan" }));

      const vulnScans = await storage.listByPipeline("vuln-scan");
      expect(vulnScans).toHaveLength(2);
      expect(vulnScans.map((s) => s.id).sort()).toEqual(["s1", "s3"]);
    });

    it("returns empty array when no matches", async () => {
      await storage.save(createTestSession({ id: "s1", pipeline: "vuln-scan" }));
      expect(await storage.listByPipeline("review-digest")).toEqual([]);
    });
  });

  describe("cleanup", () => {
    it("removes completed sessions older than maxAge", async () => {
      const old = createTestSession({
        id: "old",
        done: true,
        updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      });
      const recent = createTestSession({
        id: "recent",
        done: true,
        updatedAt: new Date().toISOString(),
      });
      const inProgress = createTestSession({
        id: "running",
        done: false,
        updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      });

      await storage.save(old);
      await storage.save(recent);
      await storage.save(inProgress);

      const removed = await storage.cleanup(24 * 60 * 60 * 1000);
      expect(removed).toBe(1);
      expect(await storage.load("old")).toBeNull();
      expect(await storage.load("recent")).not.toBeNull();
      expect(await storage.load("running")).not.toBeNull(); // Not done, so not cleaned
    });

    it("returns 0 when nothing to clean", async () => {
      await storage.save(createTestSession({ done: false }));
      expect(await storage.cleanup()).toBe(0);
    });
  });
});
