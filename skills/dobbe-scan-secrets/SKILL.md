# dobbe -- Scan Secrets

Scans the codebase for exposed secrets and credentials with AI-powered assessment.

## When to use
When user asks to scan for secrets, find leaked credentials, or check for exposed API keys.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `scan-secrets` and params `{repo, path?}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- NEVER output actual secret values in results -- redact or mask them
- Report file path, line number, and secret type without revealing the value
