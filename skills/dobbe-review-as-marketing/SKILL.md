# dobbe -- Review as Marketing Manager

Review the current project from a Marketing Manager's perspective, identifying
promotion strategies, messaging opportunities, and market positioning.

## When to use

When the user asks for marketing ideas, promotion strategies, positioning
analysis, content planning, developer relations advice, or wants a marketing
perspective on their project.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-marketing"`
   - params: `{}`

2. The tool returns an instruction. **Follow it exactly.**
   - The first step is a **discovery phase**: scan the codebase and ask the
     user 3-5 targeted questions from a marketing perspective.

3. After the user answers your questions, synthesize your findings and call
   `mcp__dobbe__pipeline_step` with your structured discovery result.

4. The next step is **analysis**: use the discovery context to produce
   structured promotion strategies with a markdown summary.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** -- you MUST ask the user questions and wait for real answers.
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific features, README content, or project capabilities you found when asking questions.
- Present all questions in a single numbered list, then wait for the user to respond.
- Focus on actionable strategies Claude can help implement (blog posts, README improvements, demos).
- Translate technical capabilities into user-facing benefits in your recommendations.
