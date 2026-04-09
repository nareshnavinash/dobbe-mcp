<p align="center">
  <h1 align="center">dobbe</h1>
  <p align="center"><strong>DevOps autopilot for Claude Code</strong></p>
  <p align="center">Scan vulns. Fix deps. Review PRs. Gen tests. Track DORA metrics.<br/>16 commands. Zero config. Deterministic retry loops.</p>
</p>

<p align="center">
  <a href="https://github.com/nareshnavinash/dobbe-mcp/actions"><img src="https://github.com/nareshnavinash/dobbe-mcp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/dobbe"><img src="https://img.shields.io/npm/v/dobbe.svg" alt="npm"></a>
  <a href="https://github.com/nareshnavinash/dobbe-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node.js"></a>
</p>

---

## Why dobbe?

- **State machine, not prompts** -- Claude can't skip steps. Retry loops are deterministic, not prompt-dependent. The MCP server controls the workflow.
- **Fix, test, retry, ship** -- Vulnerability resolve pipeline: scan alerts, upgrade packages, run tests, retry on failure (up to 3x with feedback injection), create PR. Fully automated.
- **One command to install** -- `npx dobbe install`, restart Claude Code, done. No YAML, no config files, no dashboard.

> **Without dobbe:** 45 min of manual Dependabot triage, copy-pasting `gh` commands, running tests, making PRs.
> **With dobbe:** `/dobbe-vuln-resolve` -- scan, fix, test, retry, PR. 3 minutes.

## Quick Start

```bash
npx dobbe install
```

Restart Claude Code, then try:

```
/dobbe-vuln-scan
/dobbe-review-digest
/dobbe-metrics-dora
```

```bash
# Uninstall
npx dobbe uninstall
```

## How It Works

```
You: /dobbe-vuln-resolve

Claude --> pipeline_start("vuln-resolve", {repo: "acme/web-app"})
  MCP:  {step: "scan", instruction: "Fetch Dependabot alerts..."}

Claude scans, submits results -->
  MCP:  {step: "fix", instruction: "Upgrade lodash 4.17.20 -> 4.17.21..."}

Claude fixes, submits -->
  MCP:  {step: "verify", instruction: "Run tests..."}

Tests fail --> MCP automatically retries with feedback:
  MCP:  {step: "fix", iteration: 2, feedback: "TypeError in utils.js..."}

Tests pass -->
  MCP:  {step: "done", summary: "PR #142 created. 2 iterations.", done: true}
```

The MCP server controls the state machine. Claude executes instructions and submits results. If verification fails, the server loops back with injected feedback -- no prompt engineering needed.

## Commands

### AI-Powered Pipelines

| Command | What it does | Retry |
|---|---|---|
| `/dobbe-vuln-scan` | Scan + triage Dependabot alerts | -- |
| `/dobbe-vuln-resolve` | Scan, fix, test, retry, create PR | 3x |
| `/dobbe-review-digest` | Fetch PRs, deep review, generate digest | -- |
| `/dobbe-review-post` | Review PRs, post comments to GitHub | -- |
| `/dobbe-audit-report` | Security audit (vulns, licenses, secrets, quality) | -- |
| `/dobbe-deps-analyze` | Dependency health, licensing, usage analysis | -- |
| `/dobbe-test-gen` | Find coverage gaps, generate tests, verify, PR | 3x |
| `/dobbe-changelog-gen` | Git history to categorized release notes | -- |
| `/dobbe-migration-plan` | Plan + execute dependency migrations | 3x |
| `/dobbe-incident-triage` | Sentry issue triage with AI root cause analysis | -- |

### Metrics & Scanning

| Command | What it does |
|---|---|
| `/dobbe-metrics-dora` | DORA metrics (deploy frequency, lead time, failure rate, MTTR) |
| `/dobbe-metrics-velocity` | PR velocity and cycle time metrics |
| `/dobbe-scan-secrets` | Secrets and credentials scanner |

### Utilities

| Command | What it does |
|---|---|
| `/dobbe-setup` | Interactive configuration wizard |
| `/dobbe-doctor` | Environment health check |
| `/dobbe-config` | View and manage configuration |

## Prerequisites

- **Claude Code** -- installed and authenticated
- **Node.js 18+** -- for the MCP server
- **gh CLI** -- for GitHub API access (`brew install gh`)
- **MCP servers** (optional) -- GitHub, Sentry, Slack for enhanced capabilities

<details>
<summary><strong>Architecture</strong></summary>

```
Claude Code (executor)
    |
    v
dobbe MCP Server (state machine controller)
    |
    +-- 13 Pipeline definitions
    |   +-- Each pipeline: states, transitions, Zod schemas, instructions
    |   +-- 3 pipelines with retry loops (vuln-resolve, test-gen, migration-plan)
    |
    +-- State machine engine (generic FSM)
    |   +-- Zod validation per step
    |   +-- Retry logic with feedback injection
    |   +-- Persistent sessions (crash recovery)
    |
    +-- 14 MCP Tools
    |   +-- pipeline_start, pipeline_step, pipeline_complete, pipeline_status
    |   +-- pipeline_list, pipeline_list_sessions, pipeline_abort
    |   +-- config_read, config_write
    |   +-- cache_get, cache_set
    |   +-- session_load, session_save
    |
    +-- Utilities
        +-- Atomic file writes (crash-safe)
        +-- Structured logging (JSON + pretty mode)
        +-- Framework detection (Django, React, Angular, Express, etc.)
        +-- File-based cache with TTL
```

</details>

<details>
<summary><strong>Configuration</strong></summary>

Config is stored in `~/.dobbe/config.toml`. Run `/dobbe-setup` in Claude Code to configure.

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

**Environment variables:**

| Variable | Description | Default |
|---|---|---|
| `DOBBE_HOME` | Override ~/.dobbe directory | `~/.dobbe` |
| `DOBBE_LOG_LEVEL` | `debug` / `info` / `warn` / `error` | `info` |
| `DOBBE_LOG_FORMAT` | `json` / `pretty` | `json` |

</details>

## Development

```bash
git clone https://github.com/nareshnavinash/dobbe-mcp.git
cd dobbe-mcp
npm install
npm test              # 266 tests
npm run test:coverage # 94%+ coverage
npm run build
npm run lint
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT
