# dobbe — Setup

Interactive configuration wizard for dobbe. Auto-detects settings
from the current environment and walks you through manual configuration.

## When to use

When the user asks to set up dobbe, configure dobbe, or run first-time setup.

## Instructions

1. **Auto-detect settings:**
   - Organization: `git remote get-url origin` → extract owner
   - Default format: check `mcp__dobbe__config_read` for existing config
   - Available MCPs: check which MCP tools are available (GitHub, Sentry, Slack)

2. Call `mcp__dobbe__config_read` to check for existing configuration.

3. Present detected settings to the user and ask for confirmation:
   - Default organization (auto-detected or ask)
   - Default output format: table, json, or markdown
   - Default severity filter: critical,high,medium,low
   - Slack notification channel (optional)

4. For each setting the user confirms or changes, call `mcp__dobbe__config_write` with:
   - key: the dot-separated config path (e.g., "general.default_org")
   - value: the chosen value

5. Summarize the final configuration.

## Rules

- Always show auto-detected values before asking for input.
- Don't overwrite existing values without confirmation.
- Skip Slack/Jira setup if those MCPs aren't available.
