# ADR-0007: Test-Aware Planning Strategy (v0.7.0+)

**Status**: Accepted (Updated v0.7.0)
**Date**: 2025-01-21 (Updated: 2025-11-04)
**Deciders**: Core Team

## Context

Need comprehensive testing that maintains traceability from business requirements to automated tests.

Challenge: How to organize tests across different levels while avoiding duplication?

## Decision (v0.7.0 Update)

**Embedded Test Strategy** with AC-ID traceability (tests in tasks.md, not separate tests.md)

### Level 1: Specification Acceptance Criteria (WHAT)
**Location**: `.specweave/docs/internal/specs/{module}/spec.md` OR `.specweave/increments/####/spec.md`
**Format**: Markdown with AC-ID format (AC-US1-01, AC-US2-03)
**Purpose**: Business validation

```markdown
**Acceptance Criteria**:
- [ ] **AC-US1-01**: Valid credentials → redirect to dashboard (P1, testable)
- [ ] **AC-US1-02**: Invalid password → error message shown (P1, testable)
```

### Level 2: Feature Test Strategy (HOW) - EMBEDDED IN TASKS.MD
**Location**: `.specweave/increments/####/tasks.md`
**Format**: BDD test plans embedded per task
**Purpose**: Map AC-IDs to test implementations

```markdown
## T-001: Implement Authentication Service

**AC**: AC-US1-01, AC-US1-02

**Test Plan** (BDD format):
- **Given** user with valid credentials → **When** login → **Then** receive JWT token

**Test Cases**:
- Unit (auth.test.ts): validLogin, invalidPassword → 90% coverage
- Integration (auth-flow.test.ts): loginEndpoint → 85% coverage
- **Overall: 87% coverage**
```

### Level 3: Skill Test Cases (VALIDATE)
**Location**: `src/skills/{skill}/test-cases/`
**Format**: YAML files
**Purpose**: Validate skills work
**Requirement**: Minimum 3 tests per skill

```yaml
---
name: "Create Basic Specification"
expected_output:
  type: files_generated
  files: [".specweave/docs/internal/strategy/auth/spec.md"]
---
```

### Level 4: Code Tests (AUTOMATE)
**Location**: `tests/`
**Format**: Unit/Integration/E2E code
**Purpose**: Continuous validation

```typescript
test('TC-0001: Valid Login Flow', async ({ page }) => {
  // Implementation
});
```

## Traceability (v0.7.0+)

**AC-IDs** (e.g., AC-US1-01) appear at ALL levels:
1. Spec → Acceptance criteria (AC-US1-01, AC-US1-02)
2. Tasks → Embedded test plans (references AC-IDs)
3. Skill → Test case YAML
4. Code → E2E test (references AC-IDs in test names)

**Old Format (pre-v0.7.0)**: TC-0001 IDs in separate tests.md
**New Format (v0.7.0+)**: AC-IDs in spec.md → embedded tests in tasks.md

## E2E Truth-Telling Requirement

**CRITICAL**: When UI exists, Playwright E2E tests MUST:
- Tell the truth (no false positives)
- Actually validate functionality
- Close the loop with real verification

## TDD is Optional

Test-Driven Development available via `tdd-guide` skill but NOT enforced.

## Consequences

### Positive (v0.7.0 Improvements)
- ✅ Complete traceability (AC-IDs from spec → tasks → code)
- ✅ No duplication (tests in tasks.md, not separate file)
- ✅ BDD format (Given/When/Then - clear intent)
- ✅ Single source of truth (tasks.md)
- ✅ Per-task coverage targets (realistic 80-90%)
- ✅ Failed test → Business impact

### Negative
- ❌ More complex than simple testing
- ❌ Must maintain AC-IDs
- ❌ Requires discipline

### Migration from tests.md
**If you have increments with tests.md** (pre-v0.7.0):
- Old increments continue to work (backward compatible)
- New increments use tasks.md format only
- Recommended: Migrate old increments by embedding tests into tasks.md

## Metrics

**Coverage Target**: >80% for critical paths
**Test Execution**: <5 minutes total
**Flaky Tests**: 0%

## Related

- [Testing Philosophy](../../../../CLAUDE.md#testing-philosophy)
- [Test Strategy Guide](../../delivery/guides/testing-strategy.md)
