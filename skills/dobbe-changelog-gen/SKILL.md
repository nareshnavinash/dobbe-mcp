# dobbe -- Changelog Gen

Generates AI-written release notes from git history and merged pull requests.

## When to use
When user asks to generate a changelog, release notes, or summarize changes between versions.

## Instructions

1. Determine target repo (from user or git remote).

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"changelog-gen"`
   - params: `{repo, fromRef, toRef?, includePrs?}`

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
- fromRef defaults to HEAD~10 if not provided -- ask the user for a starting tag or SHA for more precise results.
- Default toRef to HEAD when not specified.
