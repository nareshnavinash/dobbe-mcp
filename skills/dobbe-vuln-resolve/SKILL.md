# dobbe -- Vulnerability Resolution

Resolve vulnerabilities in a GitHub repository with an automated
scan, fix, verify, report pipeline that retries up to 3 times.

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

3. The tool returns a **declarative step** with `intent`, `mode`, `context`, and `hints`.

4. Respond based on the step's **mode**:
   - **`plan`**: Enter plan mode. Analyze the codebase, form a strategy, then execute.
   - **`act`**: Execute the intent directly using tools, code, commands as needed.
   - **`gather`**: Collect the requested data. Scan the codebase first, then ask the user
     only for information the code cannot provide. Use interactive prompts where appropriate.
   - **`report`**: Synthesize prior step results into a formatted output.

5. Call `mcp__dobbe__pipeline_step` with results matching the provided schema.

6. Continue until the tool returns `{done: true}`.

7. The pipeline will automatically handle retries:
   - If tests fail, the pipeline will give you feedback and ask you to try again
   - It will revert changes and provide the error details
   - Up to 3 iterations before giving up

## Rules

- **Respect the intent** of each step -- never skip steps.
- **Use hints as guidance, not rigid steps.**
- When fixing dependencies, prefer PATCH or MINOR version bumps.
- Always run lockfile regeneration after modifying dependency files.
- In the verify step, report ALL test output -- the pipeline uses it for retry feedback.
- If the GitHub MCP is available, prefer it over `gh` CLI commands.
- If you can't access the repo, report the error to `pipeline_step`.
