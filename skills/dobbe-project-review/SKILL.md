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

3. The tool returns an instruction. **Follow it exactly.**
   - Each role has a **discovery phase** (Q&A) followed by an **analysis phase**.
   - After all roles complete, a **synthesis step** produces the executive summary.

4. After completing each step, call `mcp__dobbe__pipeline_step` with
   your results as structured JSON matching the provided schema.

5. Continue until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** in any role's discovery phase.
- **NEVER fabricate user answers** -- wait for real responses.
- Each role's analysis should be grounded in actual codebase inspection.
- The synthesis step should identify cross-cutting themes and top priorities.
- This pipeline involves many steps (2 per role + synthesis). Be thorough but efficient.
- Reference specific files and code in each role's analysis.
- Present all questions at once per role, then wait for the user to respond.
