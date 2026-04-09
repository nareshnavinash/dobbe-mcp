# dobbe — Config

View and manage dobbe configuration stored in ~/.dobbe/config.toml.

## When to use

When the user asks to view dobbe config, change a setting,
set the default org, change output format, or manage configuration.

## Instructions

**To view config:**
1. Call `mcp__dobbe__config_read`
2. Display the configuration in a readable format

**To change a setting:**
1. Call `mcp__dobbe__config_write` with:
   - key: dot-separated path (e.g., "general.default_org")
   - value: the new value

**Common config keys:**
- `general.default_org` — Default GitHub organization
- `general.default_format` — Output format: table, json, markdown
- `general.default_severity` — Severity filter: critical,high,medium,low
- `notifications.slack_channel` — Slack channel for notifications
- `timeouts.scan` — Scan timeout in seconds (default: 300)
- `timeouts.resolve` — Resolve timeout in seconds (default: 600)
- `timeouts.review` — Review timeout in seconds (default: 300)

## Rules

- Always show the current value before changing it.
- Validate format choices: only table, json, or markdown.
- Don't delete config keys — only set new values.
