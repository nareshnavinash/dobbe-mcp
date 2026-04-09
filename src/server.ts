import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PipelineService } from "./tools/pipeline.js";
import { configRead, configWrite } from "./tools/config.js";
import { cacheGet, cacheSet } from "./tools/cache.js";
import { sessionLoad, sessionSave } from "./tools/session.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

/**
 * Create and configure the dobbe MCP server with all tool registrations.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "dobbe",
    version,
  });

  const pipeline = new PipelineService();

  // ─── Pipeline Tools ───

  server.tool(
    "pipeline_start",
    "Start a new dobbe pipeline. Returns the first step instruction for Claude to follow.",
    {
      command: z
        .string()
        .describe(
          "Pipeline command name (e.g., 'vuln-scan', 'vuln-resolve', 'review-digest')",
        ),
      params: z
        .record(z.unknown())
        .describe(
          "Pipeline parameters (e.g., {repo: 'owner/name', severity: 'critical,high'})",
        ),
    },
    async (args) => {
      try {
        const result = await pipeline.pipelineStart({
          command: args.command,
          params: args.params as Record<string, unknown>,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "pipeline_step",
    "Submit results for the current pipeline step and get the next instruction.",
    {
      session_id: z.string().describe("Session ID from pipeline_start"),
      result: z.unknown().describe("Results from completing the current step"),
      outcome: z
        .string()
        .optional()
        .describe("Outcome key for branching transitions (default: 'default')"),
    },
    async (args) => {
      try {
        const result = await pipeline.pipelineStep({
          session_id: args.session_id,
          result: args.result,
          outcome: args.outcome,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "pipeline_complete",
    "Finalize a completed pipeline and get the summary.",
    {
      session_id: z.string().describe("Session ID"),
      result: z
        .record(z.unknown())
        .optional()
        .describe("Final results (e.g., {pr_url: '...', summary: '...'})"),
    },
    async (args) => {
      try {
        const result = await pipeline.pipelineComplete({
          session_id: args.session_id,
          result: args.result as Record<string, unknown> | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "pipeline_status",
    "Check the current state of a pipeline session.",
    {
      session_id: z.string().describe("Session ID"),
    },
    async (args) => {
      try {
        const result = await pipeline.pipelineStatus({ session_id: args.session_id });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "pipeline_list",
    "List all available pipeline commands.",
    {},
    async () => {
      const result = pipeline.pipelineList();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "pipeline_list_sessions",
    "List all pipeline sessions (active and completed).",
    {},
    async () => {
      const result = await pipeline.pipelineListSessions();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "pipeline_abort",
    "Abort an in-progress pipeline session.",
    {
      session_id: z.string().describe("Session ID to abort"),
    },
    async (args) => {
      try {
        const result = await pipeline.pipelineAbort({ session_id: args.session_id });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── Config Tools ───

  server.tool(
    "config_read",
    "Read the dobbe configuration from ~/.dobbe/config.toml.",
    {},
    async () => {
      const result = await configRead();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "config_write",
    "Set a configuration value in ~/.dobbe/config.toml.",
    {
      key: z
        .string()
        .describe("Dot-separated config key (e.g., 'general.default_org')"),
      value: z.unknown().describe("Value to set"),
    },
    async (args) => {
      try {
        const result = await configWrite({ key: args.key, value: args.value });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── Cache Tools ───

  server.tool(
    "cache_get",
    "Retrieve a cached result (e.g., previous scan results). Returns null if expired or missing.",
    {
      key: z.string().describe("Cache key (e.g., 'vuln-scan:owner/repo:critical,high')"),
    },
    async (args) => {
      const result = await cacheGet({ key: args.key });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "cache_set",
    "Cache a result for future use (default TTL: 4 hours).",
    {
      key: z.string().describe("Cache key"),
      data: z.unknown().describe("Data to cache"),
      ttl_hours: z.number().optional().describe("TTL in hours (default: 4)"),
    },
    async (args) => {
      const result = await cacheSet({
        key: args.key,
        data: args.data,
        ttl_hours: args.ttl_hours,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Session Context Tools ───

  server.tool(
    "session_load",
    "Load cross-command context (e.g., prior scan results for use in resolve).",
    {
      scope: z
        .string()
        .describe("Context scope (e.g., 'owner/repo:vuln-scan')"),
    },
    async (args) => {
      const result = await sessionLoad({ scope: args.scope });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "session_save",
    "Save cross-command context for future use.",
    {
      scope: z.string().describe("Context scope"),
      context: z.unknown().describe("Context data to persist"),
    },
    async (args) => {
      const result = await sessionSave({ scope: args.scope, context: args.context });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}
