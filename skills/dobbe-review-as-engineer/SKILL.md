# dobbe -- Review as Staff Engineer

Review the current project from a Staff Engineer's perspective, assessing
architecture quality, scalability, technical debt, and code maintainability.

## When to use

When the user asks for an architecture review, engineering assessment, tech
debt analysis, code quality review, scalability assessment, or wants a senior
engineer's perspective on their codebase.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-engineer"`
   - params: `{}`

2. The tool returns an instruction. **Follow it exactly.**
   - The first step is a **discovery phase**: scan the codebase and ask the
     user 3-5 targeted questions from an engineering perspective.

3. After the user answers your questions, synthesize your findings and call
   `mcp__dobbe__pipeline_step` with your structured discovery result.

4. The next step is **analysis**: use the discovery context to produce
   structured architecture recommendations with a markdown summary.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** -- you MUST ask the user questions and wait for real answers.
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific code, files, or architecture patterns you found when asking questions.
- Present all questions in a single numbered list, then wait for the user to respond.
- Assess both what is done well (positive patterns) and what needs improvement.
- Include specific file paths and line numbers in your recommendations.
