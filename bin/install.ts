#!/usr/bin/env node

/**
 * dobbe installer CLI.
 *
 * Usage:
 *   npx dobbe install     — Install skills + configure MCP server
 *   npx dobbe uninstall   — Remove skills + MCP config
 *   npx dobbe update      — Re-install skills (update to latest)
 *
 * This is the bin entry point registered in package.json.
 */

import { install, uninstall } from "../src/installer.js";

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    case "install":
      await install();
      break;
    case "uninstall":
      await uninstall();
      break;
    case "update":
      console.log("Updating dobbe skills...");
      await uninstall({ quiet: true });
      await install();
      break;
    default:
      // If no command, start the MCP server (default behavior for npx)
      if (!command || command === "start") {
        const { createServer } = await import("../src/server.js");
        const { StdioServerTransport } = await import(
          "@modelcontextprotocol/sdk/server/stdio.js"
        );
        const server = createServer();
        const transport = new StdioServerTransport();
        await server.connect(transport);
      } else {
        console.log("dobbe — AI-powered MCP server for Claude Code\n");
        console.log("Commands:");
        console.log("  npx dobbe install     Install skills + configure MCP");
        console.log("  npx dobbe uninstall   Remove skills + MCP config");
        console.log("  npx dobbe update      Update skills to latest version");
        console.log("  npx dobbe             Start MCP server (used by Claude Code)");
        process.exit(command === "help" || command === "--help" ? 0 : 1);
      }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
