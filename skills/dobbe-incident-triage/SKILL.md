# dobbe -- Incident Triage

Triage Sentry incidents with AI analysis. Supports batch triage
of all unresolved issues or deep analysis of a single issue.

## When to use

When the user asks to triage incidents, analyze Sentry errors,
investigate a specific error, or resolve a Sentry issue.

## Instructions

1. Determine the Sentry organization and optional parameters:
   - Organization name (required)
   - Project name (optional, narrows scope)
   - Issue ID (for single issue deep analysis)
   - Whether to auto-resolve (apply fix + create PR)

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"incident-triage"`
   - params: `{org: "my-org"}`
   - For single issue: add `issueId: "12345"`
   - For auto-resolve: add `resolve: true, cwd: "/path/to/repo"`
   - Optional: `project: "my-project"`, `severity: "critical,high"`, `since: "7 days"`

3. Follow the returned instruction exactly.

4. After completing each step, call `mcp__dobbe__pipeline_step` with results.

5. Continue until the tool returns `{done: true}`.

## Rules

- **NEVER skip steps** -- always call back for the next instruction.
- Sentry MCP is required -- if not available, report the error.
- For single issue analysis: always read the source code mentioned in stack traces.
- Provide specific file paths and line numbers in your analysis.
- When resolving: fix root causes, not symptoms. Add tests.
