---
increment: 0184-tdd-enforcement-implementation
title: "TDD Enforcement Implementation"
type: feature
priority: P1
status: active
created: 2026-01-07
epic: CORE-TDD
test_mode: TDD
coverage_target: 80
---

# Feature: TDD Enforcement Implementation

## Overview

Implement actual behavioral enforcement of TDD configuration settings. Currently, `testMode` and `coverageTarget` are stored in metadata.json but do NOT affect how increments are designed or executed.

**Problem Statement**: TDD configuration exists at project-level (`config.testing.defaultTestMode`) and per-increment level (`metadata.testMode`), but nothing in the codebase changes behavior based on these values during `/sw:do`, `/sw:auto`, or task generation.

**Business Impact**: Users who select TDD mode expect test-first enforcement. Without it, TDD is just a label, not a workflow.

---

## User Stories

### US-001: TDD-Aware Task Template Generation
**Project**: specweave

**As a** developer using TDD mode
**I want** task templates to be generated with RED-GREEN-REFACTOR structure
**So that** my tasks guide me through proper TDD discipline

**Acceptance Criteria**:
- [ ] **AC-US1-01**: When `testMode: "TDD"`, `/sw:increment` generates tasks in RED→GREEN→REFACTOR triplets
  - Priority: P0 (Critical)
  - Testable: Yes
  - Test: Create increment with TDD config, verify task structure

- [ ] **AC-US1-02**: Each RED task explicitly states "Write failing test FIRST"
  - Priority: P0 (Critical)
  - Testable: Yes

- [ ] **AC-US1-03**: Each GREEN task has dependency on its RED task
  - Priority: P0 (Critical)
  - Testable: Yes

- [ ] **AC-US1-04**: When `testMode: "test-after"`, tasks are implementation-first (current behavior)
  - Priority: P1 (High)
  - Testable: Yes

- [ ] **AC-US1-05**: Task templates include `[RED]`, `[GREEN]`, `[REFACTOR]` phase markers
  - Priority: P1 (High)
  - Testable: Yes

---

### US-002: TDD Execution Enforcement Hook
**Project**: specweave

**As a** developer running `/sw:do` in TDD mode
**I want** the system to enforce test-first discipline
**So that** I cannot skip writing tests before implementation

**Acceptance Criteria**:
- [ ] **AC-US2-01**: New hook `tdd-enforcement-guard.sh` reads `testMode` from metadata.json
  - Priority: P0 (Critical)
  - Testable: Yes

- [ ] **AC-US2-02**: When TDD mode and GREEN task is marked complete, verify RED task completed first
  - Priority: P0 (Critical)
  - Testable: Yes

- [ ] **AC-US2-03**: Hook emits warning (not block) if TDD discipline violated
  - Priority: P1 (High)
  - Testable: Yes
  - Rationale: Blocking is too aggressive; warnings educate users

- [ ] **AC-US2-04**: Hook logs TDD violations to `.specweave/logs/tdd-violations.log`
  - Priority: P2 (Medium)
  - Testable: Yes

- [ ] **AC-US2-05**: Skip enforcement for `testMode: "test-after"`, `"manual"`, or `"none"`
  - Priority: P0 (Critical)
  - Testable: Yes

---

### US-003: Auto Mode TDD Integration
**Project**: specweave

**As a** developer using `/sw:auto` with TDD mode
**I want** auto mode to invoke TDD workflow commands
**So that** autonomous execution follows TDD discipline

**Acceptance Criteria**:
- [ ] **AC-US3-01**: `setup-auto.sh` reads `testMode` from metadata.json
  - Priority: P0 (Critical)
  - Testable: Yes

- [ ] **AC-US3-02**: When `testMode: "TDD"`, auto mode injects TDD guidance into re-feed prompt
  - Priority: P1 (High)
  - Testable: Yes

- [ ] **AC-US3-03**: When `enforceTestFirst: true` in config.auto, auto blocks implementation without test
  - Priority: P1 (High)
  - Testable: Yes

- [ ] **AC-US3-04**: Stop hook validates TDD compliance before allowing session completion
  - Priority: P2 (Medium)
  - Testable: Yes

---

### US-004: Coverage Target Enforcement
**Project**: specweave

**As a** developer with a coverage target configured
**I want** the system to validate coverage meets target before closing increment
**So that** I maintain code quality standards

**Acceptance Criteria**:
- [ ] **AC-US4-01**: `/sw:done` reads `coverageTarget` from metadata.json
  - Priority: P1 (High)
  - Testable: Yes

- [ ] **AC-US4-02**: If coverage data available, compare actual vs target
  - Priority: P1 (High)
  - Testable: Yes

- [ ] **AC-US4-03**: Emit warning if coverage below target (not blocking)
  - Priority: P1 (High)
  - Testable: Yes
  - Rationale: Coverage is aspirational, not gate-blocking

- [ ] **AC-US4-04**: Skip coverage check if `coverageTarget: 0` or `testMode: "none"`
  - Priority: P1 (High)
  - Testable: Yes

---

### US-005: TDD Workflow Auto-Invocation
**Project**: specweave

**As a** developer starting work on a TDD-mode increment
**I want** the TDD workflow skill to activate automatically
**So that** I don't have to manually invoke TDD commands

**Acceptance Criteria**:
- [ ] **AC-US5-01**: `/sw:do` checks `testMode` before starting task execution
  - Priority: P1 (High)
  - Testable: Yes

- [ ] **AC-US5-02**: If `testMode: "TDD"`, suggest using `/sw:tdd-cycle` instead of direct implementation
  - Priority: P2 (Medium)
  - Testable: Yes

- [ ] **AC-US5-03**: Add `--tdd` flag to `/sw:do` to force TDD workflow regardless of config
  - Priority: P2 (Medium)
  - Testable: Yes

---

## Out of Scope

- Mutation testing integration (future enhancement)
- Property-based testing enforcement (handled by tdd-orchestrator agent)
- IDE integration for TDD feedback (external tooling)
- Blocking enforcement (intentionally warnings-only for first iteration)

---

## Technical Constraints

1. **Backwards Compatibility**: Existing increments without `testMode` must work (default to current behavior)
2. **Performance**: Hooks must remain fast (<50ms)
3. **Non-Blocking**: TDD violations emit warnings, not hard blocks (user education, not punishment)
4. **Graceful Degradation**: If jq not available, skip TDD checks

---

## Success Criteria

| Metric | Target |
|--------|--------|
| TDD mode generates triplet tasks | 100% |
| Hook correctly reads testMode | 100% |
| Auto mode respects testMode | 100% |
| Coverage warning emitted when below target | 100% |
| No regression in non-TDD workflows | 100% |

---

## Dependencies

- Existing TDD workflow skill (`plugins/specweave/skills/tdd-workflow/SKILL.md`)
- Existing TDD commands (`/sw:tdd-red`, `/sw:tdd-green`, `/sw:tdd-refactor`, `/sw:tdd-cycle`)
- Hook infrastructure v2 (`plugins/specweave/hooks/v2/`)
- Increment metadata schema (`src/core/types/increment-metadata.ts`)

---

## Notes

**Root Cause Analysis**: The gap between configuration and enforcement was never implemented because:
1. TDD workflow skill was designed as manual-trigger only
2. Hooks never read `testMode` from metadata
3. No template differentiation logic existed

**Implementation Strategy**:
1. Start with task template differentiation (most visible impact)
2. Add hook-based enforcement (warning-only)
3. Integrate with auto mode
4. Add coverage validation

**Testing Strategy**: Each component will have unit tests + integration tests demonstrating TDD enforcement in action.
