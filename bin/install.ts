#!/usr/bin/env node

/**
 * dobbe installer CLI.
 *
 * Usage:
 *   npx dobbe install     -- Install skills + configure MCP server
 *   npx dobbe uninstall   -- Remove skills + MCP config
 *   npx dobbe update      -- Re-install skills (update to latest)
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
    case "start": {
      if (process.stdin.isTTY) {
        process.stderr.write(
          "dobbe MCP server running on stdio. Waiting for JSON-RPC messages...\n" +
          "  (This is normally started by Claude Code, not run manually.)\n" +
          "  Press Ctrl+C to stop.\n\n"
        );
      }
      const { startServer } = await import("../src/index.js");
      await startServer();
      break;
    }
    default:
      console.log("dobbe -- AI-powered MCP server for Claude Code\n");
      console.log("Commands:");
      console.log("  npx dobbe install     Install skills + configure MCP");
      console.log("  npx dobbe uninstall   Remove skills + MCP config");
      console.log("  npx dobbe update      Update skills to latest version");
      console.log("  npx dobbe start       Start MCP server (used by Claude Code)");
      if (!command || command === "help" || command === "--help") {
        process.exit(0);
      } else {
        console.error(`\nUnknown command: ${command}`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
