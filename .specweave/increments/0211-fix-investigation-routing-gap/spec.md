---
increment: 0211-fix-investigation-routing-gap
title: "Fix investigation/debugging routing gap in detect-intent"
type: bug
priority: P1
status: planned
created: 2026-02-15
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: Fix investigation/debugging routing gap in detect-intent

## Overview

The detect-intent LLM prompt and keyword fallback regex incorrectly classify investigation/debugging prompts as "questions" (`action: "none"`) instead of implementation work requiring an increment. This causes Claude to skip plan mode and jump into ad-hoc debugging without spec-first tracking.

## User Stories

### US-001: LLM correctly classifies investigation prompts (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** the detect-intent LLM to classify investigation/debugging/analysis prompts as `action: "new"`
**So that** investigation work is properly tracked in increments instead of being treated as casual questions

**Acceptance Criteria**:
- [x] **AC-US1-01**: LLM prompt NEVER-use-none list includes "investigate", "debug", "troubleshoot", "optimize", "secure", "audit", "solve", "resolve", "analyze"
- [x] **AC-US1-02**: LLM prompt contains explicit investigation/debugging guidance block
- [x] **AC-US1-03**: LLM prompt includes investigation example with `action: "new"`

---

### US-002: Keyword fallback catches all work-intent patterns (P1)
**Project**: specweave

**As a** SpecWeave developer
**I want** the keyword fallback regex to cover 65+ work-intent keywords across 9 categories (investigation, analysis, problem-solving, optimization, security, documentation, devops, data, structural)
**So that** when LLM detection fails/times out, the fallback still catches work prompts correctly

**Acceptance Criteria**:
- [x] **AC-US2-01**: Keyword regex expanded from 20 to 65+ keywords covering: investigation, analysis, problem-solving, optimization, security, documentation, devops, data/migration, structural patterns
- [x] **AC-US2-02**: Question exclusion refined — `why` and `how` removed from exclusion, patterns made more specific
- [x] **AC-US2-03**: Error-state secondary detection added for symptom-based prompts ("is broken", "keeps failing", "crashes")
- [x] **AC-US2-04**: Documentation comment block updated to reflect new routing rules

## Functional Requirements

### FR-001: No regressions on pure questions
Pure questions ("what is React?", "explain hooks", "hello") must still return `action: "none"`.

### FR-002: Mixed-intent prompts route to work
Prompts like "why does X fail? fix it" must route to increment creation, not be blocked by question exclusion.

## Success Criteria

- All new tests pass (RED→GREEN)
- Zero regressions on existing tests
- Manual verification confirms correct routing for investigation, optimization, security, and error-state prompts

## Out of Scope

- Pre-edit guard (prevents editing without active increment) — separate increment
- Hard `suggestPlanMode` enforcement — soft text suggestion is acceptable for now

## Dependencies

None — self-contained changes to LLM prompt and hook regex
