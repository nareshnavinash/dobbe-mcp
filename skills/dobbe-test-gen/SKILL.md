# dobbe -- Test Gen

Generates tests for coverage gaps with a verify-retry loop until targets are met.

## When to use
When user asks to generate tests, improve test coverage, or fill coverage gaps.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `test-gen` and params `{repo, targetFiles?, maxIterations?, createPr?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- Write complete test files, not partial snippets
- Match the project's existing test conventions (framework, file naming, structure)
