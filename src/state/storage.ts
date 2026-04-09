import * as fs from "node:fs";
import * as path from "node:path";
import type { PipelineSession } from "./machine.js";

/**
 * File-based session storage. Persists pipeline sessions to
 * ~/.dobbe/state/ as JSON files for crash recovery and cross-session context.
 */

const DOBBE_DIR = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".dobbe",
);
const STATE_DIR = path.join(DOBBE_DIR, "state");

export class SessionStorage {
  private stateDir: string;

  constructor(stateDir?: string) {
    this.stateDir = stateDir ?? STATE_DIR;
  }

  /**
   * Ensure the state directory exists.
   */
  private ensureDir(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Save a session to disk.
   */
  save(session: PipelineSession): void {
    this.ensureDir();
    const filePath = path.join(this.stateDir, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  }

  /**
   * Load a session from disk.
   * Returns null if not found.
   */
  load(sessionId: string): PipelineSession | null {
    const filePath = path.join(this.stateDir, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as PipelineSession;
  }

  /**
   * Delete a session from disk.
   */
  delete(sessionId: string): boolean {
    const filePath = path.join(this.stateDir, `${sessionId}.json`);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * List all stored session IDs.
   */
  list(): string[] {
    this.ensureDir();
    return fs
      .readdirSync(this.stateDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  }

  /**
   * List sessions for a specific pipeline.
   */
  listByPipeline(pipelineName: string): PipelineSession[] {
    return this.list()
      .map((id) => this.load(id))
      .filter(
        (s): s is PipelineSession => s !== null && s.pipeline === pipelineName,
      );
  }

  /**
   * Clean up completed sessions older than maxAge milliseconds.
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const id of this.list()) {
      const session = this.load(id);
      if (session && session.done) {
        const updatedAt = new Date(session.updatedAt).getTime();
        if (updatedAt < cutoff) {
          this.delete(id);
          removed++;
        }
      }
    }
    return removed;
  }
}
