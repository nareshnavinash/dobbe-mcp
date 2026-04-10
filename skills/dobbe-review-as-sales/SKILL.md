# dobbe -- Review as Sales Manager

Review the current project from a Sales Manager's perspective, analyzing
competitive positioning, identifying differentiators, and preparing
objection-handling strategies.

## When to use

When the user asks for competitive analysis, sales positioning, differentiator
identification, objection handling prep, market comparison, or wants a sales
perspective on their product.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-sales"`
   - params: `{}`

2. The tool returns an instruction. **Follow it exactly.**
   - The first step is a **discovery phase**: scan the codebase and ask the
     user 3-5 targeted questions from a sales perspective.

3. After the user answers your questions, synthesize your findings and call
   `mcp__dobbe__pipeline_step` with your structured discovery result.

4. The next step is **analysis**: use the discovery context to produce
   structured competitive analysis with a markdown summary.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** -- you MUST ask the user questions and wait for real answers.
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific features, integrations, or capabilities you found when asking questions.
- Present all questions in a single numbered list, then wait for the user to respond.
- Base competitor analysis on what you can infer from the codebase and user answers.
- Provide actionable talking points and objection handlers.
- Focus on value proposition and differentiation, not just feature comparison.
