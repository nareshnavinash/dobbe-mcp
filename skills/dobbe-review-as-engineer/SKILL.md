# dobbe -- Review as Staff Engineer

Review the current project from a Staff Engineer's perspective, assessing
architecture quality, scalability, technical debt, and code maintainability.

## When to use

When the user asks for an architecture review, engineering assessment, tech
debt analysis, code quality review, scalability assessment, or wants a senior
engineer's perspective on their codebase.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-engineer"`
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
- Reference specific code, files, or architecture patterns you found when asking questions.
- Assess both what is done well (positive patterns) and what needs improvement.
- Include specific file paths and line numbers in your recommendations.
