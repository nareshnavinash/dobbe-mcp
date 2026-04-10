# dobbe -- Review as Test Architect (Staff SDET)

Review the current project from a Test Architect / Staff SDET perspective,
assessing test strategy, automation coverage, CI/CD pipeline health, test
architecture patterns, and identifying flaky test risks.

## When to use

When the user asks for a test review, test strategy assessment, test
architecture evaluation, CI/CD test pipeline review, automation coverage
analysis, or wants a Staff SDET's perspective on their testing infrastructure.

## Instructions

1. Call `mcp__dobbe__pipeline_start` with:
   - command: `"review-as-test-architect"`
   - params: `{}`

2. The tool returns an instruction. **Follow it exactly.**
   - The first step is a **discovery phase**: scan the codebase and ask the
     user 3-5 targeted questions about testing and CI/CD practices.

3. After the user answers your questions, synthesize your findings and call
   `mcp__dobbe__pipeline_step` with your structured discovery result.

4. The next step is **analysis**: use the discovery context to produce
   structured test architecture recommendations with a markdown summary.

5. Continue following instructions until the tool returns `{done: true}`.

## Rules

- **NEVER skip the Q&A** -- you MUST ask the user questions and wait for real answers.
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific test files, CI configs, and test patterns you found when asking questions.
- Present all questions in a single numbered list, then wait for the user to respond.
- Assess the full test pyramid: unit, integration, e2e, performance, contract tests.
- Evaluate CI/CD pipeline configuration for test efficiency and reliability.
- Identify specific flaky test risks with root cause analysis.
- Consider test data management and test environment parity.
