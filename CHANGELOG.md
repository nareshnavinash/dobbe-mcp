# Changelog

All notable changes to dobbe are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-04-11

### Changed
- **Declarative intent-based pipeline steps** -- replaced prescriptive `instruction` strings with `intent`, `mode`, `context`, `gatherFields`, and `hints` fields. The MCP server now declares WHAT needs to happen; Claude decides HOW to interact with the user.
- 4 step modes: `plan` (enter plan mode for analysis), `act` (execute directly), `gather` (collect data from user/codebase), `report` (synthesize formatted output)
- All 21 pipeline definitions converted to declarative model
- All 24 SKILL.md files updated with mode-based interaction guidance
- `review-roles.ts` discover/analyze instruction builders replaced with `buildDiscoverStep()`/`buildAnalyzeStep()` returning declarative step definitions
- `StepDefinition` and `StepResponse` interfaces updated; `instruction` field removed
- `validateDefinition()` now requires `intent` on every state
- Retry path simplified: iteration/feedback passed as fields instead of prepended to instruction text

### Added
- 8 multi-perspective review pipelines: `review-as-pm`, `review-as-engineer`, `review-as-designer`, `review-as-qa`, `review-as-test-architect`, `review-as-marketing`, `review-as-sales`, `project-review`
- `RoleConfig` system in `review-roles.ts` with shared `discoverFields` and `analyzeFocus` per role
- `StepMode` type (`plan | act | gather | report`)
- `gatherFields` for gather-mode steps (structured field descriptions for data collection)
- 107 new tests (266 -> 373)

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
- Retry iteration context in step responses (`[Retry attempt 2 of 3]`)
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
