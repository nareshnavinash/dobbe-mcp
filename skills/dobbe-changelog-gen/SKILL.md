# dobbe -- Changelog Gen

Generates AI-written release notes from git history and merged pull requests.

## When to use
When user asks to generate a changelog, release notes, or summarize changes between versions.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `changelog-gen` and params `{repo, fromRef, toRef?, includePrs?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- fromRef defaults to HEAD~10 if not provided -- ask the user for a starting tag or SHA for more precise results
- Default toRef to HEAD when not specified
