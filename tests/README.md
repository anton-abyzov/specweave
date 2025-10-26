# SpecWeave Test Suite

This directory contains all automated tests for the SpecWeave framework.

---

## Directory Structure

```
tests/
├── README.md                   # This file
├── unit/                       # Unit tests (or co-located with code)
│   ├── skills/
│   │   ├── structure.test.ts           # TC-001: Skills directory structure
│   │   └── skill-md-validation.test.ts # TC-002: SKILL.md validation
│   └── spec-validation.test.ts         # TC-015: Spec completeness
├── integration/                # Integration tests
│   ├── skill-testing.test.ts           # TC-003: Skill test requirements
│   ├── context-loading.test.ts         # TC-006: Context loading with globs
│   ├── context-caching.test.ts         # TC-008: Context caching
│   ├── routing-accuracy.test.ts        # TC-010: >90% routing accuracy
│   └── project-detection.test.ts       # TC-013: Config loading
├── e2e/                        # E2E tests (Playwright)
│   ├── setup.ts                        # Playwright configuration
│   ├── skill-installation.spec.ts      # TC-004: CLI installation
│   ├── spec-authoring.spec.ts          # TC-014: Spec authoring
│   └── code-implementation.spec.ts     # TC-020: Code implementation
└── skills/                     # Skill validation results (gitignored)
    └── test-results/
```

---

## Test Types

### Unit Tests (`unit/`)

**Purpose**: Test individual functions, classes, and modules in isolation

**Location**: `tests/unit/` or co-located with source code

**Framework**: Jest

**Example**:
```typescript
// tests/unit/skills/structure.test.ts
describe('Skills Structure', () => {
  test('TC-001: All skills reside in src/skills/', async () => {
    const skillsDir = path.join(__dirname, '../../../src/skills');
    const exists = await fs.pathExists(skillsDir);
    expect(exists).toBe(true);
  });
});
```

**Run**: `npm run test:unit`

---

### Integration Tests (`integration/`)

**Purpose**: Test how components work together

**Location**: `tests/integration/`

**Framework**: Jest

**Example**:
```typescript
// tests/integration/routing-accuracy.test.ts
describe('Routing Accuracy', () => {
  test('TC-010: Skill router achieves >90% accuracy', async () => {
    const testRequests = await loadRoutingTestSet();
    const accuracy = await measureRoutingAccuracy(testRequests);
    expect(accuracy).toBeGreaterThanOrEqual(90);
  });
});
```

**Run**: `npm run test:integration`

---

### E2E Tests (`e2e/`)

**Purpose**: Test complete user workflows through the UI/CLI

**Location**: `tests/e2e/`

**Framework**: Playwright (for UI), Custom test runner (for CLI)

**MANDATORY**: When UI requirements exist

**CRITICAL**: Tests MUST tell the truth (no false positives)

**Example**:
```typescript
// tests/e2e/skill-installation.spec.ts
import { test, expect } from '@playwright/test';

test('TC-004: Install skill via CLI', async () => {
  // Given: SpecWeave CLI is available
  const result = await exec('npx specweave install feature-planner --local');

  // Then: Skill installed successfully
  expect(result.exitCode).toBe(0);

  // Validate skill files copied
  const skillPath = './.claude/skills/feature-planner/SKILL.md';
  const exists = await fs.pathExists(skillPath);
  expect(exists).toBe(true);
});
```

**Run**: `npm run test:e2e`

---

### Skill Tests (`skills/`)

**Purpose**: Validate individual skills work correctly

**Location**: `src/skills/{skill-name}/test-cases/` (test definitions)
**Results**: `tests/skills/test-results/` (gitignored)

**Format**: YAML test case files

**MANDATORY**: Minimum 3 test cases per skill

**Example**:
```yaml
---
name: "Basic Skill Test"
description: "Tests core functionality"
input:
  prompt: "Test prompt"
expected_output:
  type: "files_generated"
  files:
    - "path/to/expected/file"
validation:
  - "File exists"
  - "Content is valid"
---
```

**Run**: `npm run test:skills`

---

### Smoke Tests (`smoke/`)

**Purpose**: Validate SpecWeave can generate complete, production-ready projects from natural language prompts

**Location**: `tests/smoke/`

**CRITICAL**: These tests validate the entire SpecWeave workflow end-to-end

**What Smoke Tests Validate**:
- Installation in clean environment
- Project scaffolding from natural language
- Proper directory structure (specs, features, code, tests)
- Skills and agents installation
- E2E tests generation (for UI projects)
- Test case format (TC-XXX)
- Build and test success
- Integration code (Stripe, Hetzner, etc.)

**Example Scenarios**:
1. Simple Todo App (2 minutes)
2. SaaS Event Management with Stripe & Hetzner (5-10 minutes)
3. E-commerce Platform with Admin Dashboard (5-10 minutes)

**Run**:
```bash
# Quick bash script (recommended)
npm run test:smoke

# Playwright E2E test (advanced)
npm run test:e2e

# All tests including smoke
npm run test:all
```

**See**: [tests/smoke/README.md](./smoke/README.md) for complete smoke test documentation

---

## Test Case Traceability

All tests reference Test Case IDs (TC-XXX) that trace back to acceptance criteria in specifications.

**Example Trace**:
1. **Specification**: `specifications/modules/auth/login-spec.md`
   ```markdown
   - [ ] **TC-001**: Valid credentials → redirect to dashboard
   ```

2. **Feature Test Strategy**: `features/002-user-login/tests.md`
   ```markdown
   | TC-001 | Valid login flow | E2E | tests/e2e/login.spec.ts | P1 |
   ```

3. **Code Test**: `tests/e2e/login.spec.ts`
   ```typescript
   test('TC-001: Valid Login Flow', async ({ page }) => {
     // Test implementation
   });
   ```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run by Type
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only (Playwright)
npm run test:skills        # Skill validation only
npm run test:smoke         # Smoke tests (end-to-end workflow validation)
npm run test:all           # All tests including smoke
```

### Run by Priority
```bash
npm run test:p1            # P1 tests (must pass before merge)
npm run test:p2            # P2 tests (must pass before release)
```

### Run Specific Test
```bash
npm test -- tests/unit/skills/structure.test.ts
npm test -- --testNamePattern="TC-001"
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

---

## Test Requirements

### For All Tests
- ✅ Reference TC-XXX ID in test name
- ✅ Follow Given/When/Then pattern
- ✅ Include descriptive failure messages
- ✅ Clean up after test (no side effects)
- ✅ Run independently (no test dependencies)

### For E2E Tests (MANDATORY when UI exists)
- ✅ Use Playwright framework
- ✅ MUST tell the truth (no false positives)
- ✅ Validate real outcomes, not mocked data
- ✅ Close the loop with validation reports
- ✅ Test actual user flows

### For Skill Tests (MANDATORY)
- ✅ Minimum 3 test cases per skill
- ✅ YAML format in test-cases/ directory
- ✅ Cover: basic functionality, edge cases, integration
- ✅ Results gitignored (test-results/)

---

## Success Criteria

### Code Coverage
- **Target**: >80% for critical paths
- **Measure**: `npm run test:coverage`
- **Critical paths**:
  - Skill detection and routing
  - Context loading and token management
  - Feature planning workflow
  - Test generation

### Test Execution
- **P1 tests**: Must pass before merge to main
- **P2 tests**: Must pass before release
- **Performance**: All tests complete in <5 minutes
- **Reliability**: 0% flaky tests

### Quality Metrics
- **Routing accuracy**: >90% (TC-010)
- **Context efficiency**: 70%+ token reduction
- **Skill test coverage**: 100% of skills have ≥3 tests
- **E2E truth-telling**: 0% false positives

---

## CI/CD Integration

Tests run automatically on every push and pull request.

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test-p1:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:p1
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-p2:
    runs-on: ubuntu-latest
    needs: test-p1
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:p2
```

---

## Writing New Tests

### 1. Identify Test Case
- Check specification for acceptance criteria
- Assign TC-XXX ID
- Determine test type (unit/integration/e2e/skill)

### 2. Create Test File
```bash
# Unit test
touch tests/unit/my-feature.test.ts

# Integration test
touch tests/integration/my-integration.test.ts

# E2E test
touch tests/e2e/my-workflow.spec.ts

# Skill test
mkdir -p src/skills/my-skill/test-cases
touch src/skills/my-skill/test-cases/test-1-basic.yaml
```

### 3. Follow Template
```typescript
describe('Feature Name', () => {
  test('TC-XXX: Test description', async () => {
    // Given: Setup preconditions
    const context = await setupContext();

    // When: Execute action
    const result = await performAction(context);

    // Then: Validate outcome
    expect(result).toBe(expectedOutcome);

    // Cleanup
    await cleanup();
  });
});
```

### 4. Update Test Strategy
- Add test to feature's tests.md
- Update test coverage matrix
- Document traceability

---

## Debugging Tests

### Run with Verbose Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- --testNamePattern="TC-001"
```

### Debug in VS Code
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Playwright Debug
```bash
npm run test:e2e -- --debug
```

---

## Test Data

### Fixtures
Store test fixtures in `tests/fixtures/`

```
tests/fixtures/
├── sample-spec.md
├── sample-context-manifest.yaml
└── sample-config.yaml
```

### Mocks
Use Jest mocks for external dependencies

```typescript
jest.mock('../src/external-service');
```

---

## Related Documentation

- [TEST-CASE-STRATEGY.md](../ai-execution-files/reports/TEST-CASE-STRATEGY.md) - Comprehensive test case strategy
- [features/001-skills-framework/tests.md](../features/001-skills-framework/tests.md) - Feature test strategy
- [CLAUDE.md](../CLAUDE.md#testing-philosophy) - Testing philosophy
- [Playwright Docs](https://playwright.dev) - E2E testing framework
- [Jest Docs](https://jestjs.io) - Unit/integration testing framework

---

**Last Updated**: 2025-10-26
**Maintainer**: SpecWeave Team
