# dobbe -- Review as Marketing Manager

Review the current project from a Marketing Manager's perspective, identifying
promotion strategies, messaging opportunities, and market positioning.

## When to use

When the user asks for marketing ideas, promotion strategies, positioning
analysis, content planning, developer relations advice, or wants a marketing
perspective on their project.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-marketing"`
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
- Reference specific features, README content, or project capabilities you found when asking questions.
- Focus on actionable strategies Claude can help implement (blog posts, README improvements, demos).
- Translate technical capabilities into user-facing benefits in your recommendations.
