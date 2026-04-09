# dobbe

**Scan. Fix. Test. Retry. Ship. — All from Claude Code.**

AI-powered MCP server that orchestrates Claude Code to scan vulnerabilities, fix dependencies,
review PRs, generate tests, triage incidents, and track DORA metrics.

## How It Works

dobbe is an **instruction-returning MCP server** that controls multi-step pipelines as state machines.
Claude Code is the executor — it follows instructions, submits results, and gets the next step.

```
You: /dobbe-vuln-resolve

Claude → mcp__dobbe__pipeline_start("vuln-resolve", {repo: "acme/web-app"})
  MCP: {step: "scan", instruction: "Fetch Dependabot alerts...", next: "pipeline_step"}

Claude scans, then → mcp__dobbe__pipeline_step(session, {groups: [...]})
  MCP: {step: "fix", instruction: "Upgrade lodash 4.17.20 → 4.17.21...", next: "pipeline_step"}

Claude fixes, then → mcp__dobbe__pipeline_step(session, {fixes: [...]})
  MCP: {step: "verify", instruction: "Run tests...", next: "pipeline_step"}

Claude runs tests, verify fails → MCP automatically retries:
  MCP: {step: "fix", iteration: 2, feedback: "Tests failed: TypeError...", next: "pipeline_step"}

...until tests pass or max iterations reached...

  MCP: {step: "done", summary: "PR #142 created. 2 iterations.", done: true}
```

**Key innovation:** The MCP server controls the state machine — Claude can't skip steps.
Retry loops are deterministic, not prompt-dependent.

## Installation

```bash
npx dobbe install
```

This copies skills to `~/.claude/skills/` and configures the MCP server in `~/.claude/settings.json`.
Restart Claude Code after installing.

```bash
# Uninstall
npx dobbe uninstall

# Update skills
npx dobbe update
```

## Commands

16 skills available as `/dobbe-*` slash commands in Claude Code:

### AI-Powered Pipelines

| Skill | Pipeline | Retry Loop |
|---|---|---|
| `/dobbe-vuln-scan` | Scan + triage Dependabot alerts | No |
| `/dobbe-vuln-resolve` | Scan → fix → test → retry → PR | Yes (3x) |
| `/dobbe-review-digest` | Fetch PRs → deep review → digest | No |
| `/dobbe-review-post` | Review PRs → post comments to GitHub | No |
| `/dobbe-audit-report` | Security audit (vuln, license, secrets, quality) | No |
| `/dobbe-deps-analyze` | Dependency health, licensing, usage | No |
| `/dobbe-test-gen` | Find coverage gaps → generate → verify → PR | Yes (3x) |
| `/dobbe-changelog-gen` | Git history → categorized release notes | No |
| `/dobbe-migration-plan` | Plan + optionally execute dependency migration | Yes (3x) |
| `/dobbe-incident-triage` | Sentry issue triage with AI RCA | No |

### Metrics & Scanning

| Skill | Description |
|---|---|
| `/dobbe-metrics-dora` | DORA metrics (deploy frequency, lead time, failure rate, MTTR) |
| `/dobbe-metrics-velocity` | PR velocity and cycle time metrics |
| `/dobbe-scan-secrets` | Secrets and credentials scanner |

### Utilities

| Skill | Description |
|---|---|
| `/dobbe-setup` | Interactive configuration wizard |
| `/dobbe-doctor` | Environment health check |
| `/dobbe-config` | View and manage configuration |

## Architecture

```
Claude Code (AI worker + orchestrator)
    |
    v
dobbe MCP Server (state machine controller)
    |
    +-- Pipeline definitions (13 pipelines)
    |   +-- vuln-scan, vuln-resolve (retry), review-digest, review-post
    |   +-- audit-report, deps-analyze, test-gen (retry), changelog-gen
    |   +-- migration-plan (retry), incident-triage
    |   +-- metrics-dora, metrics-velocity, scan-secrets
    |
    +-- State machine engine (generic FSM)
    |   +-- States, transitions, Zod validation per step
    |   +-- Retry logic with feedback injection
    |   +-- Persistent sessions (crash recovery)
    |
    +-- MCP Tools (12 tools)
    |   +-- pipeline_start, pipeline_step, pipeline_complete, pipeline_status
    |   +-- config_read, config_write
    |   +-- cache_get, cache_set
    |   +-- session_load, session_save
    |   +-- pipeline_list
    |
    +-- Utilities
        +-- Config (~/.dobbe/config.toml)
        +-- Cache (file-based, 4hr TTL)
        +-- Framework detection (Django, React, Angular, Node.js, etc.)
        +-- Report formatter (table, JSON, Markdown)
```

## Configuration

dobbe stores config in `~/.dobbe/config.toml`. Run `/dobbe-setup` in Claude Code to configure.

```toml
[general]
default_org = "acme"
default_format = "table"
default_severity = "critical,high,medium,low"

[notifications]
slack_channel = "#security-alerts"

[timeouts]
scan = 300
resolve = 600
review = 300
```

## Prerequisites

- **Claude Code** — installed and authenticated (Claude Max subscription)
- **Node.js 18+** — for the MCP server
- **gh CLI** — for GitHub API access
- **MCP servers** (optional) — GitHub, Sentry, Slack for enhanced capabilities

## Development

```bash
git clone https://github.com/nareshnavinash/dobbe-mcp.git
cd dobbe-mcp
npm install
npm test              # 257 tests
npm run test:coverage # 98%+ coverage
npm run build         # TypeScript compile
```

## License

MIT
