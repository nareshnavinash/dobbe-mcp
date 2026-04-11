# dobbe -- Review as Sales Manager

Review the current project from a Sales Manager's perspective, analyzing
competitive positioning, identifying differentiators, and preparing
objection-handling strategies.

## When to use

When the user asks for competitive analysis, sales positioning, differentiator
identification, objection handling prep, market comparison, or wants a sales
perspective on their product.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-sales"`
   - params: `{}`

2. The tool returns a **declarative step** with `intent`, `mode`, `context`, and `hints`.

3. Respond based on the step's **mode**:
   - **`plan`**: Enter plan mode. Analyze the codebase, form a strategy, then execute.
   - **`act`**: Execute the intent directly using tools, code, commands as needed.
   - **`gather`**: Conduct a thorough codebase analysis first. Then use `AskUserQuestion`
     only for things the code genuinely cannot tell you, with contextual options from
     your analysis.
   - **`report`**: Synthesize prior step results into a formatted output.

4. Call `mcp__dobbe__pipeline_step` with results matching the provided schema.

5. Continue until the tool returns `{done: true}`.

## Rules

- **Respect the intent** of each step -- never skip steps.
- **Use hints as guidance, not rigid steps.**
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific features, integrations, or capabilities you found when asking questions.
- Base competitor analysis on what you can infer from the codebase and user answers.
- Provide actionable talking points and objection handlers.
- Focus on value proposition and differentiation, not just feature comparison.
