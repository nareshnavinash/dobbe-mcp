# dobbe -- Review as UX/UI Designer

Review the current project from a UX/UI Designer's perspective, assessing
user experience, accessibility, design consistency, and interaction patterns.

## When to use

When the user asks for a UX review, UI assessment, accessibility audit,
design feedback, interaction design review, or wants a designer's perspective
on their project.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-designer"`
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
- Reference specific UI components, templates, or styling files you found when asking questions.
- Consider accessibility (WCAG) in all recommendations.
- Include specific file references for UI components that need improvement.
