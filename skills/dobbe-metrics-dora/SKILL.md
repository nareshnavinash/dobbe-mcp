# dobbe -- Metrics DORA

Calculates DORA metrics: deployment frequency, lead time for changes, change failure rate, and mean time to recovery.

## When to use
When user asks about DORA metrics, deployment performance, engineering health, or team delivery stats.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `metrics-dora` and params `{repo, period?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- Uses gh CLI for data collection -- no AI analysis needed
- Report raw numbers with DORA benchmark ratings (Elite/High/Medium/Low)
