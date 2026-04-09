# dobbe -- Review Post

Posts AI-generated review comments to GitHub pull requests.

## When to use
When user asks to review a PR, post review comments, or get AI feedback on a pull request.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `review-post` and params `{repo, prNumber?, dryRun?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- Use --dry-run to preview comments before posting to the PR
- Always confirm the PR number before posting live comments
