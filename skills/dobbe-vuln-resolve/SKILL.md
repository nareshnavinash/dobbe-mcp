# dobbe -- Vulnerability Resolution

Resolve vulnerabilities in a GitHub repository with an automated
scan → fix → verify → report pipeline that retries up to 3 times.

## When to use

When the user asks to resolve, fix, or patch vulnerabilities, upgrade
insecure dependencies, or run the security fix pipeline.

## Instructions

1. Determine the target repository:
   - If the user specified a repo, use that (format: `owner/repo`)
   - Otherwise, detect from the current git remote: `git remote get-url origin`
   - Extract `owner/repo` from the remote URL

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"vuln-resolve"`
   - params: `{repo: "owner/repo", severity: "critical,high,medium,low"}`
   - Optional params: `maxIterations` (default 3), `baseBranch` (default "main")

3. The tool returns an instruction. **Follow it exactly.**

4. After completing each step, call `mcp__dobbe__pipeline_step` with
   your results as structured JSON matching the provided schema.

5. Continue following instructions until the tool returns `{done: true}`.

6. The pipeline will automatically handle retries:
   - If tests fail, the pipeline will give you feedback and ask you to try again
   - It will revert changes and provide the error details
   - Up to 3 iterations before giving up

## Rules

- **NEVER skip steps** -- always call back to get the next instruction.
- When fixing dependencies, prefer PATCH or MINOR version bumps.
- Always run lockfile regeneration after modifying dependency files.
- In the verify step, report ALL test output -- the pipeline uses it for retry feedback.
- If the GitHub MCP is available, prefer it over `gh` CLI commands.
- If you can't access the repo, report the error to `pipeline_step`.
