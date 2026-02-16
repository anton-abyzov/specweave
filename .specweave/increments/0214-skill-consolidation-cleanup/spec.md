---
increment: 0214-skill-consolidation-cleanup
title: "Skill Consolidation & Cleanup"
type: refactor
priority: P2
status: ready_for_review
created: 2026-02-15
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Skill Consolidation & Cleanup

## Overview

Reduce 45 skills to 41 by deleting 3 orphaned skills and merging `increment-planner` into `increment`. Saves ~2.5K chars from system context, eliminates 2-level indirection in increment creation, and removes dead code.

## User Stories

### US-001: Remove Orphaned Skills (P1)
**Project**: specweave

**As a** SpecWeave maintainer
**I want** orphaned skills removed from the codebase
**So that** the skill inventory is accurate, system context is smaller, and contributors aren't confused by dead code

**Acceptance Criteria**:
- [x] **AC-US1-01**: `increment-work-router` skill directory deleted
- [x] **AC-US1-02**: `tdd-orchestrator` skill directory deleted
- [x] **AC-US1-03**: `pm-closure-validation` skill directory deleted
- [x] **AC-US1-04**: No remaining references to deleted skills in any SKILL.md, hook, or source file

---

### US-002: Consolidate Increment Entry Point (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** a single `increment` skill that handles planning directly
**So that** increment creation doesn't go through unnecessary 2-level indirection

**Acceptance Criteria**:
- [x] **AC-US2-01**: `increment` SKILL.md contains merged planner logic (pre-flights + planning + delegation)
- [x] **AC-US2-02**: `increment-planner` skill directory deleted
- [x] **AC-US2-03**: Hook references updated from `sw:increment-planner` to `sw:increment`
- [x] **AC-US2-04**: All source code references to `increment-planner` updated
- [x] **AC-US2-05**: Plugin cache rebuilt and verified

## Out of Scope

- TDD phase skill merging (too large at 1221 lines combined, clean delegation already exists)
- `test-aware-planner` merging (3 callers, high breakage risk for small gain)
- `validate` + `pm-closure-validation` merging (pm-closure-validation is orphaned, just delete)
