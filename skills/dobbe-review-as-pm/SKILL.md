# dobbe -- Review as Product Manager

Review the current project from a Product Manager's perspective, identifying
product improvements, feature gaps, and prioritization opportunities.

## When to use

When the user asks for a product review, product management feedback, feature
gap analysis, product improvement suggestions, roadmap input, or wants a PM
perspective on their codebase.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-pm"`
   - params: `{}`

2. The tool returns an instruction. **Follow it exactly.**
   - The first step is a **discovery phase**: scan the codebase and ask the
     user 3-5 targeted questions from a PM perspective.

3. After the user answers your questions, synthesize your findings and call
   `mcp__dobbe__pipeline_step` with your structured discovery result.

4. The next step is **analysis**: use the discovery context to produce
   structured product recommendations with a markdown summary.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** -- you MUST ask the user questions and wait for real answers.
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific code, files, or features you found when asking questions.
- Present all questions in a single numbered list, then wait for the user to respond.
- Base your analysis on actual codebase inspection, not assumptions.
- Include specific file references where applicable in your recommendations.
