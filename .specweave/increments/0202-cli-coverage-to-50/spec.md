---
increment: 0202-cli-coverage-to-50
status: active
type: feature
---

# CLI Test Coverage to 50%

## User Stories

### US-001: As a developer, I want unit tests for existing CLI command handlers so coverage reaches 50%+
### US-002: As a developer, I want CLI e2e smoke tests for key commands so I can verify they work end-to-end
### US-003: As a developer, I want obsolete skipped tests cleaned up so test stats are accurate

## Acceptance Criteria

- [ ] AC-US1-01: Unit tests exist for status, save, doctor, analytics, context, list commands
- [ ] AC-US1-02: Unit tests exist for auto, auto-status, cancel-auto commands
- [ ] AC-US1-03: Unit tests exist for validate-jira, export-skills, decision-log commands
- [ ] AC-US1-04: Overall statement coverage >= 50%
- [ ] AC-US1-05: Overall line coverage >= 50%
- [ ] AC-US1-06: Overall branch coverage >= 42%
- [ ] AC-US1-07: Overall function coverage >= 55%
- [ ] AC-US2-01: E2e tests cover specweave status, doctor --json, list, context commands
- [ ] AC-US2-02: E2e tests use isolated HOME and cleanup patterns from 0201
- [ ] AC-US3-01: Obsolete skipped tests deleted (keyword-detector, multi-project/switching)
- [ ] AC-US3-02: Coverage gates in vitest.config.ts raised to match new actuals
