---
increment: 0229-tier2-llm-security-judge
title: "Tier 2 LLM Security Judge"
type: feature
priority: P1
status: active
created: 2026-02-16
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Feature: Tier 2 LLM Security Judge

## Overview

LLM-based security judge that catches semantic threats regex patterns miss. Closes the 25% detection gap identified in Tier 1 testing against Snyk ToxicSkills samples.

## User Stories

### US-001: SecurityJudge Core (P1)
**Project**: specweave

**As a** skill marketplace operator
**I want** an LLM judge that detects semantic security threats in skill files
**So that** social engineering and obfuscated attacks are caught before skills reach users

**Acceptance Criteria**:
- [x] **AC-US1-01**: SecurityJudge returns FAIL for social engineering content
- [x] **AC-US1-02**: SecurityJudge returns PASS for clean legitimate skills
- [x] **AC-US1-03**: SecurityJudge falls back gracefully when no LLM configured (CONCERNS verdict)
- [x] **AC-US1-04**: SecurityJudge respects consent gate — no API calls without permission

---

### US-002: judge-skill CLI (P1)
**Project**: specweave

**As a** developer reviewing third-party skills
**I want** a CLI command that combines Tier 1 + Tier 2 analysis
**So that** I get comprehensive security assessment in a single command

**Acceptance Criteria**:
- [x] **AC-US2-01**: `judge-skill` runs Tier 1 scan + Tier 2 LLM judge
- [x] **AC-US2-02**: Tier 1 critical/high findings produce BLOCKED verdict (skip LLM)
- [x] **AC-US2-03**: --json, --model, --scan-only flags work correctly

## Success Criteria

- 105/105 security tests pass (91 scanner + 9 judge + 5 CLI)
- All 4 ToxicSkills samples correctly classified
- Clean build, no regressions

## Dependencies

- Increment 0226: Tier 1 scanner (41 patterns)
- LLM provider abstraction (`src/core/llm/`)
- Consent management (`src/core/llm/consent.ts`)
