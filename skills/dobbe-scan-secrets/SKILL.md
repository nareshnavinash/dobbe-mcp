# dobbe -- Scan Secrets

Scans the codebase for exposed secrets and credentials with AI-powered assessment.

## When to use
When user asks to scan for secrets, find leaked credentials, or check for exposed API keys.

## Instructions

1. Determine target repo (from user or git remote).

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"scan-secrets"`
   - params: `{repo, path?}`

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
- NEVER output actual secret values in results -- redact or mask them.
- Report file path, line number, and secret type without revealing the value.
