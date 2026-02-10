---
status: completed
---
# 0189: TDD Default Mode & 100% Coverage Option

## Overview

SpecWeave currently defaults to `test-after` mode with 50% coverage. This should be changed to promote TDD as the standard practice: TDD mode with 90% coverage as the default, and a new 100% coverage option in the init wizard for teams wanting strict coverage.

## Problem Statement

1. **Wrong defaults**: `DEFAULT_CONFIG.testing` uses `test-after` with 50% coverage, which doesn't reflect SpecWeave's TDD-first philosophy.
2. **Missing 100% option**: The init wizard coverage picker offers 0/50/70/80/90/Custom but not 100%, forcing users to type a custom value.
3. **No mode-aware defaults**: Coverage default is 80% regardless of test mode. TDD users should get 90% by default; test-after users should get 80%.
4. **SpecWeave's own config**: The project's `.specweave/config.json` uses `test-after/50%`, not eating its own dogfood.

---

## User Stories

### US-001: TDD as Default Test Mode

**As a** developer creating a new SpecWeave project
**I want** TDD to be the default test mode
**So that** new projects start with best testing practices out of the box

**Acceptance Criteria**:
- [x] AC-US1-01: `DEFAULT_CONFIG.testing.defaultTestMode` is `'TDD'` (was `'test-after'`)
- [x] AC-US1-02: `DEFAULT_CONFIG.testing.defaultCoverageTarget` is `90` (was `50`)
- [x] AC-US1-03: `DEFAULT_CONFIG.testing.coverageTargets` updated to `{ unit: 95, integration: 90, e2e: 100 }` (was `{ unit: 55, integration: 50, e2e: 60 }`)
- [x] AC-US1-04: Init wizard test mode prompt defaults to `TDD` (was `TDD` already in wizard, but code default was `test-after`)

### US-002: 100% Coverage Option in Init Wizard

**As a** team lead setting up a project with strict quality standards
**I want** a 100% coverage option in the init wizard
**So that** I don't have to type a custom value for full coverage

**Acceptance Criteria**:
- [x] AC-US2-01: Coverage picker includes `100%` option labeled "Full coverage (strict)" after the 90% option
- [x] AC-US2-02: 100% option is available in all 9 languages (en, ru, es, zh, de, fr, ja, ko, pt)
- [x] AC-US2-03: When 100% is selected, `coverageTargets` is `{ unit: 100, integration: 100, e2e: 100 }`

### US-003: Mode-Aware Coverage Defaults

**As a** developer selecting a test mode during init
**I want** the coverage default to adjust based on the mode I chose
**So that** I get sensible defaults without manual tuning

**Acceptance Criteria**:
- [x] AC-US3-01: When `TDD` is selected, coverage prompt defaults to `90%`
- [x] AC-US3-02: When `test-after` is selected, coverage prompt defaults to `80%`
- [x] AC-US3-03: When `manual` or `none` is selected, coverage prompt is skipped (existing behavior preserved)

### US-004: SpecWeave Self-Application

**As a** SpecWeave maintainer
**I want** the project's own config to use TDD with 90% coverage
**So that** the framework practices what it preaches

**Acceptance Criteria**:
- [x] AC-US4-01: `.specweave/config.json` updated: `testing.defaultTestMode: "TDD"`
- [x] AC-US4-02: `.specweave/config.json` updated: `testing.defaultCoverageTarget: 90`
- [x] AC-US4-03: `.specweave/config.json` updated: `testing.coverageTargets: { unit: 95, integration: 90, e2e: 100 }`

---

## Out of Scope

- Coverage enforcement in CI (separate concern)
- Per-file coverage thresholds
- Coverage report generation
- Vitest/Jest configuration changes
