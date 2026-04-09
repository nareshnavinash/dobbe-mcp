# dobbe -- Deps Analyze

Analyzes dependency health, licensing, and actual usage across the codebase.

## When to use
When user asks about dependency health, outdated packages, license compliance, or unused dependencies.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `deps-analyze` and params `{repo, ecosystem?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- Check actual imports in source code, not just manifest declarations
- Report both declared-but-unused and imported-but-undeclared dependencies
