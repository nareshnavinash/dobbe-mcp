# dobbe -- Review as Quality Engineer

Review the current project from a Quality Engineer's perspective, hunting for
bugs, identifying edge cases, and assessing quality risks.

## When to use

When the user asks for a QA review, bug hunt, quality assessment, edge case
analysis, regression risk analysis, or wants a quality engineer's perspective
on their codebase.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-qa"`
   - params: `{}`

2. The tool returns an instruction. **Follow it exactly.**
   - The first step is a **discovery phase**: scan the codebase and ask the
     user 3-5 targeted questions from a QA perspective.

3. After the user answers your questions, synthesize your findings and call
   `mcp__dobbe__pipeline_step` with your structured discovery result.

4. The next step is **analysis**: use the discovery context to produce
   structured bug findings and quality recommendations with a markdown summary.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** -- you MUST ask the user questions and wait for real answers.
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific code paths, error handling, and test files you found when asking questions.
- Present all questions in a single numbered list, then wait for the user to respond.
- Prioritize findings by severity (critical > high > medium > low).
- Include reproduction steps for bugs where possible.
- Focus on real issues you can identify from the code, not hypothetical ones.
