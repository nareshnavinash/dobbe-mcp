# dobbe -- Review as UX/UI Designer

Review the current project from a UX/UI Designer's perspective, assessing
user experience, accessibility, design consistency, and interaction patterns.

## When to use

When the user asks for a UX review, UI assessment, accessibility audit,
design feedback, interaction design review, or wants a designer's perspective
on their project.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-designer"`
   - params: `{}`

2. The tool returns an instruction. **Follow it exactly.**
   - The first step is a **discovery phase**: scan the codebase and ask the
     user 3-5 targeted questions from a design perspective.

3. After the user answers your questions, synthesize your findings and call
   `mcp__dobbe__pipeline_step` with your structured discovery result.

4. The next step is **analysis**: use the discovery context to produce
   structured UX/UI recommendations with a markdown summary.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** -- you MUST ask the user questions and wait for real answers.
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific UI components, templates, or styling files you found when asking questions.
- Present all questions in a single numbered list, then wait for the user to respond.
- Consider accessibility (WCAG) in all recommendations.
- Include specific file references for UI components that need improvement.
