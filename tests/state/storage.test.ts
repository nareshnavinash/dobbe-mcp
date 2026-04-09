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
    it("saves and loads a session", () => {
      const session = createTestSession();
      storage.save(session);

      const loaded = storage.load("test-session-1");
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe("test-session-1");
      expect(loaded!.pipeline).toBe("vuln-scan");
      expect(loaded!.params).toEqual({ repo: "acme/web" });
    });

    it("returns null for missing session", () => {
      expect(storage.load("nonexistent")).toBeNull();
    });

    it("overwrites existing session on save", () => {
      const session = createTestSession();
      storage.save(session);

      session.currentState = "report";
      session.iteration = 2;
      storage.save(session);

      const loaded = storage.load("test-session-1");
      expect(loaded!.currentState).toBe("report");
      expect(loaded!.iteration).toBe(2);
    });

    it("preserves all session fields", () => {
      const session = createTestSession({
        iteration: 3,
        stepResults: { scan: { groups: [] } },
        feedback: ["error 1", "error 2"],
        done: true,
      });
      storage.save(session);

      const loaded = storage.load("test-session-1");
      expect(loaded!.iteration).toBe(3);
      expect(loaded!.stepResults).toEqual({ scan: { groups: [] } });
      expect(loaded!.feedback).toEqual(["error 1", "error 2"]);
      expect(loaded!.done).toBe(true);
    });
  });

  describe("delete", () => {
    it("deletes an existing session", () => {
      storage.save(createTestSession());
      expect(storage.delete("test-session-1")).toBe(true);
      expect(storage.load("test-session-1")).toBeNull();
    });

    it("returns false for missing session", () => {
      expect(storage.delete("nonexistent")).toBe(false);
    });
  });

  describe("list", () => {
    it("returns empty array when no sessions", () => {
      expect(storage.list()).toEqual([]);
    });

    it("lists all session IDs", () => {
      storage.save(createTestSession({ id: "sess-1" }));
      storage.save(createTestSession({ id: "sess-2" }));
      storage.save(createTestSession({ id: "sess-3" }));

      const ids = storage.list().sort();
      expect(ids).toEqual(["sess-1", "sess-2", "sess-3"]);
    });
  });

  describe("listByPipeline", () => {
    it("filters sessions by pipeline name", () => {
      storage.save(createTestSession({ id: "s1", pipeline: "vuln-scan" }));
      storage.save(createTestSession({ id: "s2", pipeline: "vuln-resolve" }));
      storage.save(createTestSession({ id: "s3", pipeline: "vuln-scan" }));

      const vulnScans = storage.listByPipeline("vuln-scan");
      expect(vulnScans).toHaveLength(2);
      expect(vulnScans.map((s) => s.id).sort()).toEqual(["s1", "s3"]);
    });

    it("returns empty array when no matches", () => {
      storage.save(createTestSession({ id: "s1", pipeline: "vuln-scan" }));
      expect(storage.listByPipeline("review-digest")).toEqual([]);
    });
  });

  describe("cleanup", () => {
    it("removes completed sessions older than maxAge", () => {
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

      storage.save(old);
      storage.save(recent);
      storage.save(inProgress);

      const removed = storage.cleanup(24 * 60 * 60 * 1000);
      expect(removed).toBe(1);
      expect(storage.load("old")).toBeNull();
      expect(storage.load("recent")).not.toBeNull();
      expect(storage.load("running")).not.toBeNull(); // Not done, so not cleaned
    });

    it("returns 0 when nothing to clean", () => {
      storage.save(createTestSession({ done: false }));
      expect(storage.cleanup()).toBe(0);
    });
  });
});
