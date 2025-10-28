## Testing Philosophy

**Core Principle**: Test cases exist at **FOUR distinct levels** in SpecWeave, each serving a different purpose with full traceability from business requirements to automated tests.

---

### The Four Levels of Test Cases

#### Level 1: Specification Acceptance Criteria (WHAT must be true)

**Purpose**: Define business validation - WHAT must be true from user/business perspective

**Location**: `.specweave/docs/internal/strategy/{module}/{feature}-spec.md`

**Format**: Markdown with test case IDs (TC-0001)

**Example**:
```markdown
### User Story: US1-001 - User Login

**As a** user
**I want to** log in with email and password
**So that** I can access my account

**Acceptance Criteria** (Test Cases):
- [ ] **TC-0001**: Valid credentials → redirect to dashboard
- [ ] **TC-0002**: Invalid password → error message "Invalid password" shown
- [ ] **TC-0003**: Non-existent email → error message "Email not found" shown
- [ ] **TC-0004**: Empty email field → validation error "Email required"
```

**Key Points**:
- Test Case IDs: `TC-0001` format for traceability
- Business language (technology-agnostic)
- Testable conditions (no ambiguity)
- Part of specification (WHAT/WHY)

---

#### Level 2: Feature Test Strategy (HOW to validate)

**Purpose**: Define HOW to validate feature meets acceptance criteria

**Location**: `.specweave/increments/0001-feature-name/tests.md`

**Format**: Markdown with test coverage matrix and detailed strategies

**Example Structure**:
```markdown
# Test Strategy: User Login Feature

## Test Coverage Matrix

| TC ID | Acceptance Criteria | Test Type | Location | Priority |
|-------|---------------------|-----------|----------|----------|
| TC-0001 | Valid login flow | E2E | tests/e2e/login.spec.ts | P1 |
| TC-0002 | Invalid password | E2E | tests/e2e/login.spec.ts | P1 |

## Test Details

### TC-0001: Valid Login Flow
- **Type**: E2E (Playwright)
- **Given**: User has registered account
- **When**: User enters valid credentials
- **Then**: Redirect to dashboard with session token
```

**Key Points**:
- Maps TC-0001 IDs to test implementations
- Defines test types (E2E, Unit, Integration)
- Specifies exact test file locations
- Includes priorities (P1, P2, P3)
- Documents Given/When/Then scenarios

**See**: [.specweave/increments/0001-skills-framework/tests.md](.specweave/increments/0001-skills-framework/tests.md) for complete example

---

#### Level 3: Skill Test Cases (VALIDATE skill works)

**Purpose**: Validate that SpecWeave skills function correctly

**Location**: `src/skills/{skill-name}/test-cases/`

**Format**: YAML files with structured test definitions

**MANDATORY**: Minimum 3 test cases per skill

**Example**:
```yaml
---
name: "Create Basic Specification"
description: "Tests if spec-author can create a specification from user story"
input:
  prompt: "Create a spec for user authentication"
  files: []
expected_output:
  type: "files_generated"
  files:
    - ".specweave/docs/internal/strategy/auth/authentication-spec.md"
  contains:
    - "User Story"
    - "TC-0001"
validation:
  - "Specification is technology-agnostic"
  - "Test case IDs follow TC-0001 format"
success_criteria:
  - "File exists at specified path"
  - "Contains all required sections"
---
```

**Structure** (MANDATORY):
```
src/skills/{skill-name}/
├── SKILL.md
├── test-cases/              # REQUIRED (min 3 tests)
│   ├── test-1-basic.yaml    # Basic functionality
│   ├── test-2-edge.yaml     # Edge cases, error handling
│   └── test-3-integration.yaml  # Integration scenarios
└── test-results/            # Generated (gitignored)
```

**Key Points**:
- 3+ test cases MANDATORY for every skill
- YAML format for structured validation
- Test results gitignored (generated dynamically)
- Covers: basic, edge cases, integration

**Examples**:
- `src/skills/specweave-detector/test-cases/` ✅
- `src/skills/skill-router/test-cases/` ✅
- `src/skills/context-loader/test-cases/` ✅
- `src/skills/increment-planner/test-cases/` ✅

---

#### Level 4: Code Tests (AUTOMATE validation)

**Purpose**: Automated continuous validation

**Location**: `tests/`

**Format**: Unit/Integration/E2E test code

**Organization**:
```
tests/
├── README.md                   # Test organization guide
├── unit/                       # Unit tests (or co-located with code)
│   ├── skills/
│   │   ├── structure.test.ts
│   │   └── skill-md-validation.test.ts
│   └── spec-validation.test.ts
├── integration/                # Integration tests
│   ├── skill-testing.test.ts
│   ├── context-loading.test.ts
│   ├── routing-accuracy.test.ts
│   └── project-detection.test.ts
├── e2e/                        # E2E tests (Playwright, MANDATORY when UI exists)
│   ├── setup.ts
│   ├── skill-installation.spec.ts
│   ├── spec-authoring.spec.ts
│   └── code-implementation.spec.ts
└── skills/                     # Skill validation results (gitignored)
```

**Example**:
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('TC-0001: Valid Login Flow', async ({ page }) => {
  // Given: User has registered account
  await page.goto('/login');

  // When: User enters valid credentials
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.click('button[type="submit"]');

  // Then: Redirect to dashboard with session
  await expect(page).toHaveURL('/dashboard');

  // Validate session token exists
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find(c => c.name === 'session_token');
  expect(sessionToken).toBeDefined();
});
```

**Key Points**:
- Reference TC-0001 IDs in test names
- Use Given/When/Then pattern
- E2E tests MUST tell the truth (no false positives)
- Run in CI/CD pipeline

**See**: [tests/README.md](tests/README.md) for complete testing guide

---

### Test Case Traceability

**Flow**: Specification → Feature → Skill → Code

**Example Trace: TC-0001 (Valid Login)**

1. **Specification**: `.specweave/docs/internal/strategy/auth/login-spec.md`
   ```markdown
   - [ ] **TC-0001**: Valid credentials → redirect to dashboard
   ```

2. **Feature**: `.specweave/increments/0002-user-login/tests.md`
   ```markdown
   | TC-0001 | Valid login flow | E2E | tests/e2e/login.spec.ts | P1 |
   ```

3. **Skill**: `src/skills/playwright-tester/test-cases/test-1-login.yaml`
   ```yaml
   expected_output:
     files: ["tests/e2e/login.spec.ts"]
     contains: ["TC-0001"]
   ```

4. **Code**: `tests/e2e/login.spec.ts`
   ```typescript
   test('TC-0001: Valid Login Flow', async ({ page }) => {
     // Implementation
   });
   ```

**Benefits**:
- Requirements → Tests (complete coverage)
- Failed test → Business impact (TC-0001 → User Story)
- Change request → Impact analysis (which tests affected)

---

### Test Requirements by Level

#### Specification Level (MANDATORY when spec exists)
- ✅ All user stories have acceptance criteria
- ✅ Acceptance criteria use TC-0001 format
- ✅ Criteria are testable (no ambiguity)
- ✅ Technology-agnostic (business language)

#### Feature Level (MANDATORY for all features)
- ✅ Feature has `tests.md` file
- ✅ Test coverage matrix maps TC-0001 to implementations
- ✅ All acceptance criteria covered
- ✅ Test types specified (E2E, Unit, Integration)

#### Skill Level (MANDATORY for all skills)
- ✅ Minimum 3 test cases in `test-cases/`
- ✅ YAML format with input/expected_output/validation
- ✅ Cover: basic, edge cases, integration
- ✅ Results gitignored (`test-results/`)

#### Code Level (MANDATORY for implementation)
- ✅ Unit tests for critical functions
- ✅ Integration tests for component interactions
- ✅ E2E tests when UI exists (Playwright)
- ✅ >80% test coverage for critical paths
- ✅ Reference TC-0001 in test names

---

### E2E Testing with Playwright (MANDATORY when UI exists)

**CRITICAL**: When UI requirements exist, Playwright E2E tests are MANDATORY.

**Requirements**:
- Tests in `tests/e2e/`
- Use Playwright framework
- MUST tell the truth (no false positives)
- Close the loop with validation reports

**Truth-Telling Requirement**:
- If test passes, feature MUST actually work
- If test fails, report EXACTLY what failed
- No masking failures
- No assuming success without validation
- Close the loop with real verification

---

### TDD is OPTIONAL

**Important**: Test-Driven Development (TDD) is OPTIONAL for greenfield development.

**TDD Skill**: `tdd-guide` (P2 priority)
- Available for developers who prefer TDD workflow
- Write tests before implementation
- Red → Green → Refactor cycle
- Not enforced by framework
- Separate from MANDATORY E2E/skill testing

---

### Running Tests

**By Type**:
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only
npm run test:skills        # Skill validation only
```

**By Priority**:
```bash
npm run test:p1            # P1 tests (must pass before merge)
npm run test:p2            # P2 tests (must pass before release)
```

**All Tests**:
```bash
npm test                   # Run all tests
npm run test:coverage      # Generate coverage report
```

---

### Success Criteria

**Code Coverage**:
- Target: >80% for critical paths
- Measured via Jest coverage reports

**Test Execution**:
- P1 tests: Must pass before merge to main
- P2 tests: Must pass before release
- Performance: All tests complete in <5 minutes
- Reliability: 0% flaky tests

**Quality Metrics**:
- Routing accuracy: >90%
- Context efficiency: 70%+ token reduction
- Skill test coverage: 100% of skills have ≥3 tests
- E2E truth-telling: 0% false positives

---

### Related Documentation

- [TEST-CASE-STRATEGY.md](.specweave/increments/0001-skills-framework/reports/TEST-CASE-STRATEGY.md) - Comprehensive test case strategy
- [tests/README.md](tests/README.md) - Complete testing guide
- [.specweave/increments/0001-skills-framework/tests.md](.specweave/increments/0001-skills-framework/tests.md) - Feature test strategy example

---

