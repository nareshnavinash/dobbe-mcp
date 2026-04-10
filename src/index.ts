#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { SessionStorage } from "./state/storage.js";
import { CacheManager } from "./utils/cache.js";
import { logger } from "./utils/logger.js";

/**
 * dobbe MCP server entry point.
 * Connects via stdio transport for Claude Code integration.
 */

export async function startServer(): Promise<void> {
  // Clean up stale sessions and expired cache entries on startup
  const storage = new SessionStorage();
  const cache = new CacheManager();
  await Promise.all([
    storage.cleanup().catch(() => {}),
    cache.evict().catch(() => {}),
  ]);

  const server = createServer();
  const transport = new StdioServerTransport();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down dobbe MCP server");
    try {
      await server.close();
    } catch {
      // Server may already be closed
    }
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await server.connect(transport);
  logger.info("dobbe MCP server started");
}

async function main(): Promise<void> {
  await startServer();
}

main().catch((error) => {
  console.error("dobbe MCP server failed to start:", error);
  process.exit(1);
});
