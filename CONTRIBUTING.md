# Contributing to dobbe

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/nareshnavinash/dobbe-mcp.git
cd dobbe-mcp
npm install
npm test
```

## Commands

| Command | Purpose |
|---|---|
| `npm run build` | Compile TypeScript |
| `npm test` | Run tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type check |

## Adding a New Pipeline

1. Create `src/pipelines/your-pipeline.ts` with a factory function returning `PipelineDefinition`
2. Add Zod schemas for each step in `src/utils/schema.ts`
3. Register in `src/pipelines/registry.ts` with a param validation schema
4. Create `skills/dobbe-your-pipeline/SKILL.md`
5. Add tests in `tests/pipelines/your-pipeline.test.ts`
6. If the pipeline has retry loops, include a `"failed"` terminal state

### Declarative Step Model

Every step uses declarative fields -- the MCP declares **what** needs to happen and Claude decides **how**.

| Field | Purpose |
|---|---|
| `intent` | What this step achieves (required) |
| `mode` | How Claude should approach it: `plan`, `act`, `gather`, or `report` |
| `context` | Structured parameters (repo, severity, target files, etc.) |
| `gatherFields` | For `gather` mode: data fields to collect with descriptions |
| `hints` | Light domain tips (not rigid instructions) |

**Do not use prescriptive instruction text.** Instead of telling Claude *how* to interact ("ask 3-5 questions in a numbered list"), set `mode: "gather"` with `gatherFields` describing what data to collect. Claude will use its best UX.

**Choosing a mode:**

- `plan` -- Deep analysis requiring strategy. Claude enters plan mode.
- `act` -- Direct execution: run commands, edit files, create PRs.
- `gather` -- Collect information from the user or codebase interactively.
- `report` -- Synthesize prior step results into formatted output.

## Code Standards

- All file I/O must be async (`fs/promises`)
- Use `atomicWriteFile()` from `src/utils/fs.ts` for writes
- Use `ensureDir()` from `src/utils/fs.ts` for directory creation
- Add Zod validation for pipeline parameters in the registry
- Each pipeline step must have a Zod schema for result validation

## Pull Request Process

1. Fork and create a feature branch
2. Make your changes
3. Run `npm run lint && npm run typecheck && npm test`
4. Submit a PR with a clear description
