#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

/**
 * dobbe MCP server entry point.
 * Connects via stdio transport for Claude Code integration.
 */

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("dobbe MCP server failed to start:", error);
  process.exit(1);
});
