# dobbe -- Metrics Velocity

Measures PR velocity and cycle time metrics for the team.

## When to use
When user asks about PR throughput, cycle time, review speed, or team velocity.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `metrics-velocity` and params `{repo, period?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- Uses gh CLI for data collection -- no AI analysis needed
- Present metrics with trends when historical data is available
