import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PipelineSession } from "./machine.js";
import { STATE_DIR } from "../utils/paths.js";
import { atomicWriteFile, ensureDir } from "../utils/fs.js";

/**
 * File-based session storage. Persists pipeline sessions to
 * ~/.dobbe/state/ as JSON files for crash recovery and cross-session context.
 */

export class SessionStorage {
  private stateDir: string;

  constructor(stateDir?: string) {
    this.stateDir = stateDir ?? STATE_DIR;
  }

  /**
   * Ensure the state directory exists.
   */
  private async ensureStateDir(): Promise<void> {
    await ensureDir(this.stateDir);
  }

  /**
   * Validate that a session ID is safe for use as a filename.
   * Rejects path traversal attempts and unsafe characters.
   */
  private validateId(sessionId: string): void {
    // eslint-disable-next-line no-control-regex
    if (!sessionId || /[/\\.\x00]/.test(sessionId) || sessionId.startsWith("-")) {
      throw new Error(`Invalid session ID format: "${sessionId}"`);
    }
  }

  /**
   * Save a session to disk.
   */
  async save(session: PipelineSession): Promise<void> {
    this.validateId(session.id);
    await this.ensureStateDir();
    const filePath = path.join(this.stateDir, `${session.id}.json`);
    await atomicWriteFile(filePath, JSON.stringify(session, null, 2));
  }

  /**
   * Load a session from disk.
   * Returns null if not found.
   */
  async load(sessionId: string): Promise<PipelineSession | null> {
    this.validateId(sessionId);
    const filePath = path.join(this.stateDir, `${sessionId}.json`);
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as PipelineSession;
    } catch {
      return null;
    }
  }

  /**
   * Delete a session from disk.
   */
  async delete(sessionId: string): Promise<boolean> {
    this.validateId(sessionId);
    const filePath = path.join(this.stateDir, `${sessionId}.json`);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all stored session IDs.
   */
  async list(): Promise<string[]> {
    await this.ensureStateDir();
    const files = await fs.readdir(this.stateDir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  }

  /**
   * List sessions for a specific pipeline.
   */
  async listByPipeline(pipelineName: string): Promise<PipelineSession[]> {
    const ids = await this.list();
    const sessions: PipelineSession[] = [];
    for (const id of ids) {
      const session = await this.load(id);
      if (session && session.pipeline === pipelineName) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Clean up completed sessions older than maxAge milliseconds.
   */
  async cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    const ids = await this.list();
    for (const id of ids) {
      const session = await this.load(id);
      if (session && session.done) {
        const updatedAt = new Date(session.updatedAt).getTime();
        if (updatedAt < cutoff) {
          await this.delete(id);
          removed++;
        }
      }
    }
    return removed;
  }
}
