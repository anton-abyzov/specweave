# @tests - Test Strategy Context

This file is loaded when you type `@tests` in Cursor.

## What This Provides

Quick access to test documentation:
- Test strategy (E2E, unit, integration)
- Test coverage matrix (TC-0001 → test files)
- Test cases (YAML format for skills)
- Acceptance criteria validation

## Usage

```
@tests show me test strategy
@tests what tests exist for authentication?
@tests map TC-0001 to test file
```

## Files Loaded

When `@tests` is used, Cursor should load:

```
.specweave/increments/####-feature/tests.md    # Test strategy
tests/                                          # Actual test code
├── e2e/                                        # Playwright E2E tests
│   └── auth.spec.ts
├── unit/                                       # Unit tests
│   └── auth-utils.test.ts
└── integration/                                # Integration tests
    └── auth-api.test.ts
```

## Test Coverage Matrix

**tests.md contains mapping: TC-0001 → test file**

Example:
```markdown
| TC ID   | Acceptance Criteria     | Test Type | Location               | Priority |
|---------|-------------------------|-----------|------------------------|----------|
| TC-0001 | Valid login redirects   | E2E       | tests/e2e/auth.spec.ts | P1       |
| TC-0002 | Invalid password errors | E2E       | tests/e2e/auth.spec.ts | P1       |
```

## Four Levels of Test Cases

### Level 1: Specification (TC-0001 in spec.md)
```markdown
- [ ] **TC-0001**: Valid credentials → redirect to dashboard
```

### Level 2: Feature Test Strategy (tests.md)
Mapping TC-0001 to test implementation

### Level 3: Skill Test Cases (for SpecWeave skills)
YAML format in src/skills/{name}/test-cases/

### Level 4: Code Tests (Playwright, Jest, etc.)
```typescript
test('TC-0001: Valid Login Flow', async ({ page }) => {
  // Implementation
});
```

## Context Precision

**Load test strategy for current increment only**

If working on auth increment:
```
.specweave/increments/0002-user-auth/tests.md
tests/e2e/auth.spec.ts
tests/unit/auth-utils.test.ts
```

Don't load ALL tests from ALL increments.

## Example Workflow

User: `@tests what's the test coverage for authentication?`

You:
1. Load .specweave/increments/0002-user-auth/tests.md
2. Read test coverage matrix
3. Load referenced test files (auth.spec.ts)
4. Summarize: "TC-0001 to TC-0008 covered. 8/8 E2E tests in auth.spec.ts. All P1 tests passing."
