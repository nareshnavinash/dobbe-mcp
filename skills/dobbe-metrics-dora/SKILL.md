# dobbe -- Metrics DORA

Calculates DORA metrics: deployment frequency, lead time for changes, change failure rate, and mean time to recovery.

## When to use
When user asks about DORA metrics, deployment performance, engineering health, or team delivery stats.

## Instructions

1. Determine target repo (from user or git remote).

2. Call `mcp__dobbe__pipeline_start` with:
   - command: `"metrics-dora"`
   - params: `{repo, period?}`

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
- Uses gh CLI for data collection -- no AI analysis needed.
- Report raw numbers with DORA benchmark ratings (Elite/High/Medium/Low).
