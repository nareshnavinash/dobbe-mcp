# dobbe -- Vulnerability Scan

Scan a GitHub repository for Dependabot vulnerability alerts and triage them
with AI analysis of actual code path usage.

## When to use

When the user asks to scan for vulnerabilities, check security alerts, triage
Dependabot alerts, or assess the security posture of a repository.

## Instructions

1. Determine the target repository:
   - If the user specified a repo, use that (format: `owner/repo`)
   - Otherwise, detect from the current git remote: `git remote get-url origin`
   - Extract `owner/repo` from the remote URL

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"vuln-scan"`
   - params: `{repo: "owner/repo", severity: "critical,high,medium,low"}`

3. The tool returns a **declarative step** with `intent`, `mode`, `context`, and `hints`.

4. Respond based on the step's **mode**:
   - **`plan`**: Enter plan mode. Analyze the codebase, form a strategy, then execute.
   - **`act`**: Execute the intent directly using tools, code, commands as needed.
   - **`gather`**: Conduct a thorough codebase analysis first. Then use `AskUserQuestion`
     only for things the code genuinely cannot tell you, with contextual options from
     your analysis.
   - **`report`**: Synthesize prior step results into a formatted output.

5. Call `mcp__dobbe__pipeline_step` with results matching the provided schema.

6. Continue until the tool returns `{done: true}`.

## Rules

- **Respect the intent** of each step -- never skip steps.
- **Use hints as guidance, not rigid steps.**
- **Include ALL details** when submitting results: alert numbers, versions,
  severity, your risk assessment, and recommended action for each.
- If the GitHub MCP is available, prefer it over `gh` CLI commands.
- If you can't access the repo's alerts, report the error to `pipeline_step`
  instead of guessing.
