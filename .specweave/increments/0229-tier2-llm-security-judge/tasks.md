# Tasks: Tier 2 LLM Security Judge

## Task Notation

- `[x]`: Completed

## Phase 1: TDD — SecurityJudge Core

### T-001: Write failing tests for SecurityJudge (RED)
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Test**: Given SecurityJudge class → When judge() called with various inputs → Then correct verdicts returned
**File**: `tests/unit/core/fabric/security-judge.test.ts` (9 tests)

### T-002: Implement SecurityJudge class (GREEN)
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**File**: `src/core/fabric/security-judge.ts`
- 5 threat categories: social-engineering, scope-inflation, obfuscated-intent, multi-step-attack, chained-skill-attack
- Consent gate via LLM provider abstraction
- Graceful fallback when no LLM configured

## Phase 2: TDD — judge-skill CLI

### T-003: Write failing tests for judge-skill CLI (RED)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**File**: `tests/unit/cli/commands/judge-skill.test.ts` (5 tests)

### T-004: Implement judge-skill CLI + register (GREEN)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Files**: `src/cli/commands/judge-skill.ts`, `bin/specweave.js`
- Tier 1 critical/high → BLOCKED (skip LLM)
- --json, --model, --scan-only flags

## Phase 3: Validation

### T-005: Validate against ToxicSkills PoC samples
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04
**Status**: [x] completed
- clawhub: BLOCKED (Tier 1 critical)
- vercel: BLOCKED (Tier 1 high)
- google: CONCERNS (no LLM) / FAIL (with LLM)

### T-006: Update docs with Tier 2 results
**Status**: [x] completed
- Updated skills-ecosystem-security.md with implementation details
- Updated scan-results.md with combined detection table

### T-007: Build + full test verification
**Status**: [x] completed
- 105/105 security tests pass (91 scanner + 9 judge + 5 CLI)
- Clean build, no regressions
