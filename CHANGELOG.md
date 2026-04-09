# Changelog

All notable changes to dobbe are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-04-09

### Added
- 13 pipeline definitions: vuln-scan, vuln-resolve, review-digest, review-post, audit-report, deps-analyze, test-gen, changelog-gen, migration-plan, incident-triage, metrics-dora, metrics-velocity, scan-secrets
- 16 Claude Code skills (`/dobbe-*` slash commands)
- Generic finite state machine with Zod validation per step
- Retry loops with feedback injection (vuln-resolve, test-gen, migration-plan)
- Pipeline recovery after MCP server restart (session + params persisted to disk)
- `PipelineService` class -- no global mutable state, testable in isolation
- Async file I/O throughout (no sync operations blocking the event loop)
- Atomic file writes via `atomicWriteFile()` to prevent corruption on crash
- File permissions restricted to owner-only (0o600 files, 0o700 directories)
- Structured JSON logging to stderr (`DOBBE_LOG_LEVEL`, `DOBBE_LOG_FORMAT`)
- Pipeline parameter validation with Zod schemas (rejects invalid `maxIterations`, missing `repo`)
- Graceful shutdown on SIGTERM/SIGINT
- Session cleanup and cache eviction at server startup
- Shared path constants with `DOBBE_HOME` env var override
- Session ID validation to prevent path traversal
- Centralized `paths.ts` module (single source for all `~/.dobbe/` paths)
- `pipeline_list_sessions` tool to list all sessions
- `pipeline_abort` tool to cancel in-progress pipelines
- Retry iteration context in instructions (`[Retry attempt 2 of 3]`)
- Schema hints for ZodLiteral, ZodUnion, ZodNullable, ZodDefault, ZodRecord
- Per-pipeline metrics schemas (DoraReportSchema, VelocityReportSchema)
- Framework detection with line-start matching (reduced false positives)
- Config mtime-based cache invalidation (detects external edits)
- GitHub Actions CI (Node 18/20/22, lint, typecheck, coverage)
- CLAUDE.md for project context
- 266 tests, 94%+ coverage

### Fixed
- Silent infinite retry when pipeline has no "failed" terminal state
- Session scope sanitization collisions (now uses SHA256 hash)
- False passing tests in framework-detect.test.ts (invalid Vitest assertion)
- NaN `maxIterations` creating infinite retry loops (now validated)
- Cache hash truncated to 64 bits (increased to 128 bits)
- MetricsReportSchema too permissive (split into per-pipeline schemas)
- PrInfoSchema requiring `repo` field Claude may not include (now optional)
- changelog-gen SKILL.md claiming `fromRef` is required (documents default)
- 9 ESLint errors from unused imports
