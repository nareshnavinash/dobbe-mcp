# dobbe -- Review as Quality Engineer

Review the current project from a Quality Engineer's perspective, hunting for
bugs, identifying edge cases, and assessing quality risks.

## When to use

When the user asks for a QA review, bug hunt, quality assessment, edge case
analysis, regression risk analysis, or wants a quality engineer's perspective
on their codebase.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-qa"`
   - params: `{}`

2. The tool returns a **declarative step** with `intent`, `mode`, `context`, and `hints`.

3. Respond based on the step's **mode**:
   - **`plan`**: Enter plan mode. Analyze the codebase, form a strategy, then execute.
   - **`act`**: Execute the intent directly using tools, code, commands as needed.
   - **`gather`**: Collect the requested data. Scan the codebase first, then ask the user
     only for information the code cannot provide. Use interactive prompts where appropriate.
   - **`report`**: Synthesize prior step results into a formatted output.

4. Call `mcp__dobbe__pipeline_step` with results matching the provided schema.

5. Continue until the tool returns `{done: true}`.

## Rules

- **Respect the intent** of each step -- never skip steps.
- **Use hints as guidance, not rigid steps.**
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific code paths, error handling, and test files you found when asking questions.
- Prioritize findings by severity (critical > high > medium > low).
- Include reproduction steps for bugs where possible.
- Focus on real issues you can identify from the code, not hypothetical ones.
