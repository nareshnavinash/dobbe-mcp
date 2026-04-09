# dobbe -- Audit Report

Runs a security posture audit across four dimensions: vulnerabilities, licenses, secrets, and code quality.

## When to use
When user asks for a security audit, compliance check, or overall repo health assessment.

## Instructions
1. Determine target repo (from user or git remote)
2. Call `mcp__dobbe__pipeline_start` with command `audit-report` and params `{repo, checks?: ["vuln","license","secrets","quality"]}`
3. Follow returned instruction exactly
4. Call `mcp__dobbe__pipeline_step` with results
5. Continue until done

## Rules
- NEVER skip steps
- Check all four dimensions (vuln, license, secrets, quality) by default
- Only narrow the checks list when the user explicitly requests specific dimensions
