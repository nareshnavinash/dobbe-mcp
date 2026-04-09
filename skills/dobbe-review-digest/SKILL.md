# dobbe -- PR Review Digest

Generate an AI-powered code review digest for open pull requests
in a GitHub repository. Supports single PR or batch review.

## When to use

When the user asks to review PRs, generate a review digest,
check open pull requests, or review a specific PR.

## Instructions

1. Determine the target repository and optional PR number:
   - If the user specified a repo, use that (format: `owner/repo`)
   - Otherwise, detect from the current git remote
   - If reviewing a single PR: note the PR number

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-digest"`
   - params: `{repo: "owner/repo"}`
   - For single PR: add `prNumber: 42`
   - Optional: `skipDrafts: true`, `skipLabels: ["wontfix"]`, `skipAuthors: ["dependabot"]`

3. Follow the returned instruction exactly.

4. After completing each step, call `mcp__dobbe__pipeline_step` with results.

5. Continue until the tool returns `{done: true}`.

## Rules

- **NEVER skip steps** -- always call back for the next instruction.
- Fetch and read the full PR diff before reviewing.
- Read related source files for context -- don't review in isolation.
- Prioritize security and breaking changes over style issues.
- Be specific: include file paths and line numbers in concerns.
- If the GitHub MCP is available, prefer it over `gh` CLI commands.
