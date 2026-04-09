# dobbe -- Doctor

Environment health check for dobbe. Verifies that all required
tools and MCP servers are available and configured correctly.

## When to use

When the user asks to check dobbe health, diagnose issues,
or verify the environment is set up correctly.

## Instructions

Run these checks and report the results:

1. **dobbe MCP server:** Call `mcp__dobbe__pipeline_list` -- if it responds, the server is running.

2. **Configuration:** Call `mcp__dobbe__config_read` -- check if config exists and has required fields.

3. **GitHub CLI:**
   ```
   gh --version
   gh auth status
   ```
   Check that gh is installed and authenticated.

4. **Git:**
   ```
   git --version
   ```

5. **Available MCP servers:** Check which dobbe-relevant MCPs are available:
   - GitHub MCP (try listing tools with mcp__github__ prefix)
   - Sentry MCP (try mcp__claude_ai_Sentry__ prefix)
   - Slack MCP (try mcp__plugin_slack__ prefix)

6. **Skills installed:** Check if dobbe skills are loaded (you're using one right now!).

Present results as a checklist:
```
✓ dobbe MCP server: running (v0.1.0)
✓ Configuration: ~/.dobbe/config.toml found
✓ GitHub CLI: v2.x.x, authenticated as user
✓ Git: v2.x.x
✓ GitHub MCP: available
✗ Sentry MCP: not configured
✗ Slack MCP: not configured
✓ Skills: 16 installed
```

## Rules

- Report ALL checks even if some fail.
- For failed checks, suggest how to fix them.
- Don't attempt to fix anything -- just report.
