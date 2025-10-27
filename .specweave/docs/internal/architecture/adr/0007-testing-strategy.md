# ADR-0007: 4-Level Testing Strategy

**Status**: Accepted  
**Date**: 2025-01-21  
**Deciders**: Core Team  

## Context

Need comprehensive testing that maintains traceability from business requirements to automated tests.

Challenge: How to organize tests across different levels?

## Decision

**4-Level Test Strategy** with full traceability

### Level 1: Specification Acceptance Criteria (WHAT)
**Location**: `.specweave/docs/internal/strategy/{module}/spec.md`
**Format**: Markdown with TC-0001 IDs
**Purpose**: Business validation

```markdown
- [ ] **TC-0001**: Valid credentials → redirect to dashboard
- [ ] **TC-0002**: Invalid password → error message shown
```

### Level 2: Feature Test Strategy (HOW)
**Location**: `.specweave/increments/####/tests.md`
**Format**: Test coverage matrix
**Purpose**: Map TC IDs to implementations

```markdown
| TC-0001 | Valid login | E2E | tests/e2e/login.spec.ts | P1 |
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

## Traceability

**TC-0001** appears at ALL levels:
1. Spec → Acceptance criteria
2. Feature → Test strategy
3. Skill → Test case YAML  
4. Code → E2E test

## E2E Truth-Telling Requirement

**CRITICAL**: When UI exists, Playwright E2E tests MUST:
- Tell the truth (no false positives)
- Actually validate functionality
- Close the loop with real verification

## TDD is Optional

Test-Driven Development available via `tdd-guide` skill but NOT enforced.

## Consequences

### Positive
- ✅ Complete traceability
- ✅ Failed test → Business impact
- ✅ 4 levels of validation
- ✅ TC IDs link requirements → tests

### Negative
- ❌ More complex than simple testing
- ❌ Must maintain TC IDs
- ❌ Requires discipline

## Metrics

**Coverage Target**: >80% for critical paths
**Test Execution**: <5 minutes total
**Flaky Tests**: 0%

## Related

- [Testing Philosophy](../../../../CLAUDE.md#testing-philosophy)
- [Test Strategy Guide](../../delivery/guides/testing-strategy.md)
