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
