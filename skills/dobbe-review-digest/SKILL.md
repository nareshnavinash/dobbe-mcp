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
- Fetch and read the full PR diff before reviewing.
- Read related source files for context -- don't review in isolation.
- Prioritize security and breaking changes over style issues.
- Be specific: include file paths and line numbers in concerns.
- If the GitHub MCP is available, prefer it over `gh` CLI commands.
