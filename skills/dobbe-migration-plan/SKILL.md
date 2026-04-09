# dobbe -- Migration Plan

Plans and optionally executes dependency migrations from one package to another.

## When to use
When user asks to migrate a dependency, replace a package, or plan a library swap.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `migration-plan` and params `{repo, fromPackage, toPackage, run?, maxIterations?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- Plan-only by default -- only add run:true when the user explicitly asks to apply changes
- Always present the migration plan for review before execution
