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

3. The tool returns an instruction. **Follow it exactly.**

4. After completing the scan and triage, call `mcp__dobbe__pipeline_step` with
   your results as structured JSON matching the provided schema.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip steps** -- always call back to get the next instruction.
- **Include ALL details** when submitting results: alert numbers, versions,
  severity, your risk assessment, and recommended action for each.
- If the GitHub MCP is available, prefer it over `gh` CLI commands.
- If you can't access the repo's alerts, report the error to `pipeline_step`
  instead of guessing.
