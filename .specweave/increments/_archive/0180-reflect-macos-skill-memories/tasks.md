# Tasks - 0180-reflect-macos-skill-memories

## Overview
Fix reflect macOS bug + add skill-specific memory support.

---

## US-001: Cross-Platform Timeout for Reflect Hook

### T-001: [RED] Write failing test for cross-platform timeout
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Test**: Given a system without `timeout` command → When reflect hook runs → Then it uses perl fallback and succeeds

### T-002: [GREEN] Implement cross-platform timeout function
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Depends On**: T-001
**Test**: Given run_with_timeout function → When called on macOS → Then uses available timeout method

### T-003: [REFACTOR] Clean up timeout implementation
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04, AC-US1-05
**Status**: [x] completed
**Depends On**: T-002
**Test**: Given refactored code → When run on Linux and macOS → Then tests still pass

### T-004: [RED] Write integration test for reflect hook on macOS
**User Story**: US-001 | **Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Test**: Given mock environment without timeout → When reflect hook executes → Then reflection completes successfully

### T-005: [GREEN] Make integration test pass
**User Story**: US-001 | **Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Depends On**: T-004

---

## US-002: Auto Mode Session Marker Creation

### T-006: [RED] Write failing test for auto-mode.json creation
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Test**: Given `specweave auto` is called → When command completes → Then auto-mode.json exists with correct structure

### T-007: [GREEN] Verify auto-mode.json creation works
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-03
**Status**: [x] completed
**Depends On**: T-006
**Test**: Given auto.ts printStartMessage → When called → Then creates session marker

### T-008: [RED] Write failing test for stop hook detection
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Test**: Given auto-mode.json exists → When stop hook runs → Then exit is blocked

### T-009: [GREEN] Verify stop hook blocks when session active
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02
**Status**: [x] completed
**Depends On**: T-008

### T-010: [RED] Write test for stale session cleanup
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Test**: Given auto-mode.json older than 30 minutes → When stop hook runs → Then session is cleaned up

### T-011: [GREEN] Verify stale session cleanup works
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04
**Status**: [x] completed
**Depends On**: T-010

### T-012: [RED] Write integration test for full auto flow
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Test**: Given auto command → When executed → Then session marker created and hook detects it

### T-013: [GREEN] Make auto integration test pass
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Depends On**: T-012

---

## US-003: Skill-Specific Memory Files

### T-014: [RED] Write failing test for skill memory file creation
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Test**: Given learning for 'frontend' skill → When reflect handler runs → Then `.specweave/skill-memories/frontend.md` created

### T-015: [GREEN] Implement skill memory file writing
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-03
**Status**: [x] completed
**Depends On**: T-014

### T-016: [RED] Write test for SKILL.md instruction inclusion
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Test**: Given SKILL.md files → When checked → Then each has instruction to read skill memories

### T-017: [GREEN] Add skill memory instruction to SKILL.md files
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02
**Status**: [x] completed
**Depends On**: T-016

### T-018: [RED] Write test for cross-file duplicate detection
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Test**: Given learning exists in CLAUDE.md → When same learning extracted → Then not duplicated in skill memory

### T-019: [GREEN] Implement cross-file duplicate detection
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Depends On**: T-018

### T-020: [RED] Write integration test for skill memories
**User Story**: US-003 | **Satisfies ACs**: AC-US3-05
**Status**: [x] completed
**Test**: Given full reflect flow → When learning extracted → Then both CLAUDE.md and skill memory updated

### T-021: [GREEN] Make skill memory integration test pass
**User Story**: US-003 | **Satisfies ACs**: AC-US3-05
**Status**: [x] completed
**Depends On**: T-020

### T-022: [REFACTOR] Clean up and optimize skill memory code
**User Story**: US-003 | **Satisfies ACs**: All
**Status**: [x] completed
**Depends On**: T-021
