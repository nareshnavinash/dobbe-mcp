# dobbe -- Project Review

Run a comprehensive multi-perspective review of the current project. Chains
multiple role-based reviews (PM, Engineer, Designer, QA, Test Architect,
Marketing, Sales) with a synthesized executive summary.

## When to use

When the user asks for a full project review, comprehensive analysis,
multi-perspective review, team review, or wants to assess the project from
all angles. Also use when the user asks to "review as all roles" or
"run all reviews."

## Instructions

1. Determine which roles to include:
   - If the user specified specific roles, pass them as the `roles` array
   - Valid roles: `pm`, `engineer`, `designer`, `qa`, `test-architect`, `marketing`, `sales`
   - Default: all 7 roles

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"project-review"`
   - params: `{roles: ["pm", "engineer", "qa"]}` (or omit for all 7)

3. The tool returns a **declarative step** with `intent`, `mode`, `context`, and `hints`.

4. Respond based on the step's **mode**:
   - **`plan`**: Enter plan mode. Analyze the codebase, form a strategy, then execute.
   - **`act`**: Execute the intent directly using tools, code, commands as needed.
   - **`gather`**: Collect the requested data. Scan the codebase first, then ask the user
     only for information the code cannot provide. Use interactive prompts where appropriate.
   - **`report`**: Synthesize prior step results into a formatted output.

5. Call `mcp__dobbe__pipeline_step` with results matching the provided schema.

6. Continue until the tool returns `{done: true}`.

## Rules

- **Respect the intent** of each step -- never skip steps.
- **Use hints as guidance, not rigid steps.**
- **NEVER fabricate user answers** -- wait for real responses.
- Each role's analysis should be grounded in actual codebase inspection.
- The synthesis step should identify cross-cutting themes and top priorities.
- This pipeline involves many steps (2 per role + synthesis). Be thorough but efficient.
- Reference specific files and code in each role's analysis.
