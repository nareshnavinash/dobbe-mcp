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

2. The tool returns a **declarative step** with `intent`, `mode`, `context`, and `hints`.

3. Respond based on the step's **mode**:
   - **`plan`**: Enter plan mode. Analyze the codebase, form a strategy, then execute.
   - **`act`**: Execute the intent directly using tools, code, commands as needed.
   - **`gather`**: Collect the requested data. Scan the codebase first, then ask the user
     only for information the code cannot provide. Use interactive prompts where appropriate.
   - **`report`**: Synthesize prior step results into a formatted output.

4. Call `mcp__dobbe__pipeline_step` with results matching the provided schema.

5. Continue until the tool returns `{done: true}`.

## Rules

- **Respect the intent** of each step -- never skip steps.
- **Use hints as guidance, not rigid steps.**
- **NEVER fabricate user answers** -- if the user says "skip" or "I don't know", record that honestly.
- Reference specific test files, CI configs, and test patterns you found when asking questions.
- Assess the full test pyramid: unit, integration, e2e, performance, contract tests.
- Evaluate CI/CD pipeline configuration for test efficiency and reliability.
- Identify specific flaky test risks with root cause analysis.
- Consider test data management and test environment parity.
