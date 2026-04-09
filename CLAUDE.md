# dobbe — Claude Code Context

## What is dobbe?

An MCP server that orchestrates Claude Code through multi-step DevOps pipelines using a finite state machine. Claude follows step-by-step instructions from the server, submitting results at each step. The server validates results, manages state transitions, and handles retry loops.

## Architecture

```
index.ts → server.ts → PipelineService → StateMachine
                                        → SessionStorage (disk)
                      → ConfigManager   → ~/.dobbe/config.toml
                      → CacheManager    → ~/.dobbe/cache/
                      → SessionTools    → ~/.dobbe/sessions/
```

- **StateMachine** (`src/state/machine.ts`): Generic FSM. Validates results with Zod, manages transitions.
- **PipelineService** (`src/tools/pipeline.ts`): Encapsulates machine + storage + active sessions. One instance per server.
- **Pipelines** (`src/pipelines/*.ts`): Each returns a `PipelineDefinition` with states, transitions, instructions, and schemas.
- **Registry** (`src/pipelines/registry.ts`): Maps command names to pipeline factories with param validation.

## Key patterns

- All file I/O is async (`fs/promises`)
- Atomic writes via `atomicWriteFile()` in `src/utils/fs.ts`
- Structured logging to stderr via `src/utils/logger.ts`
- Shared path constants in `src/utils/paths.ts` (supports `DOBBE_HOME` env var)

## Adding a new pipeline

1. Create `src/pipelines/your-pipeline.ts` exporting a factory function
2. Add Zod schemas for each step's result in `src/utils/schema.ts`
3. Register in `src/pipelines/registry.ts` with a param validation schema
4. Create `skills/dobbe-your-pipeline/SKILL.md`
5. Add tests in `tests/pipelines/your-pipeline.test.ts`

Retry pipelines must include a `"failed"` terminal state.

## Commands

```bash
npm run build        # Compile TypeScript
npm run test         # Run tests
npm run test:coverage # Coverage report
npm run lint         # ESLint
npm run typecheck    # Type check without emit
npm run clean        # Remove dist/ and coverage/
```

## Environment variables

- `DOBBE_HOME` — Override ~/.dobbe directory
- `DOBBE_LOG_LEVEL` — debug | info | warn | error (default: info)
- `DOBBE_LOG_FORMAT` — json | pretty (default: json)

## Testing

- Tests use `vitest` with Node environment
- `PipelineService` tests create fresh instances (no shared state)
- File I/O tests use `fs.mkdtempSync` for isolated temp directories
- Integration tests in `tests/integration/` cover retry loops and recovery
