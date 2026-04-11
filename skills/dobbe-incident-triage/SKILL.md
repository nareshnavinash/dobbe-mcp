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

3. The tool returns a **declarative step** with `intent`, `mode`, `context`, and `hints`.

4. Respond based on the step's **mode**:
   - **`plan`**: Enter plan mode. Analyze the codebase, form a strategy, then execute.
   - **`act`**: Execute the intent directly using tools, code, commands as needed.
   - **`gather`**: Collect the requested data. Scan the codebase first, then ask the user
     only for information the code cannot provide. Use interactive prompts where appropriate.
   - **`report`**: Synthesize prior step results into a formatted output.

5. Call `mcp__dobbe__pipeline_step` with results matching the provided schema.

6. Continue until the tool returns `{done: true}`.

## Rules

- **Respect the intent** of each step -- never skip steps.
- **Use hints as guidance, not rigid steps.**
- Sentry MCP is required -- if not available, report the error.
- For single issue analysis: always read the source code mentioned in stack traces.
- Provide specific file paths and line numbers in your analysis.
- When resolving: fix root causes, not symptoms. Add tests.
