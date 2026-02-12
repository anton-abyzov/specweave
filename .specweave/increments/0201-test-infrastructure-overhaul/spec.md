---
increment: 0201-test-infrastructure-overhaul
status: done
type: feature
---

# Test Infrastructure Overhaul

## User Stories

### US-001: As a developer, I want tiered vitest configs so I can run unit tests fast and e2e tests separately
### US-002: As a developer, I want working CLI e2e tests so I can verify CLI commands actually work
### US-003: As a developer, I want home directory isolation in tests so tests never touch real ~/.specweave/
### US-004: As a developer, I want CLI output normalization helpers so I can reliably assert on terminal output
### US-005: As a developer, I want TDD skills that teach CLI integration testing patterns
### US-006: As a developer, I want public docs covering CLI/hook testing best practices

## Acceptance Criteria

- [x] AC-US1-01: vitest.unit.config.ts exists and only runs unit tests
- [x] AC-US1-02: vitest.e2e.config.ts exists with longer timeouts and lower worker count
- [x] AC-US1-03: package.json has separate test:unit:fast, test:e2e scripts
- [x] AC-US2-01: CLI e2e tests are un-skipped and passing
- [x] AC-US2-02: Tests verify specweave --version, --help, and init commands
- [x] AC-US3-01: temp-home.ts helper exists that overrides HOME env var for test isolation
- [x] AC-US3-02: Tests using temp-home restore original env vars after completion
- [x] AC-US4-01: normalize-output.ts helper strips ANSI codes and normalizes line endings
- [x] AC-US4-02: extract-json.ts helper reliably extracts JSON from mixed stdout
- [x] AC-US5-01: TDD red skill includes CLI integration testing patterns
- [x] AC-US5-02: TDD orchestrator mentions temp-home and process spawning patterns
- [x] AC-US6-01: Public docs have CLI integration testing guide
- [x] AC-US6-02: Coverage thresholds raised from 25% to 40%
