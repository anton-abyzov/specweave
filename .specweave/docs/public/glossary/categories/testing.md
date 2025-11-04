---
id: testing-category
title: Testing & Quality
sidebar_label: Testing & Quality
---

# Testing & Quality

Understanding how to ensure software quality through comprehensive testing strategies.

---

## Overview

Testing and quality terms cover the practices, tools, and methodologies for verifying software correctness, reliability, and performance. These concepts enable teams to ship high-quality code with confidence, catch bugs early, and maintain system stability.

## Core Concepts

### Testing Methodologies

**[TDD (Test-Driven Development)](/docs/glossary/terms/tdd)**
- Write tests BEFORE implementation
- Red → Green → Refactor cycle
- Benefits: better design, higher coverage, fewer bugs
- SpecWeave supports TDD workflow natively

**[BDD (Behavior-Driven Development)](/docs/glossary/terms/bdd)**
- Tests written as user behavior (Given/When/Then)
- Bridges gap between business and technical teams
- Format: "Given user logged in, When clicks button, Then sees confirmation"
- SpecWeave uses BDD format in tasks.md (v0.7.0+)

### Testing Levels

**[Unit Testing](/docs/glossary/terms/unit-testing)**
- Tests individual functions/methods
- Fast, isolated, no external dependencies
- Tools: Jest, Mocha, pytest
- Target: 80-90% coverage for critical code

**[Integration Testing](/docs/glossary/terms/integration-testing)**
- Tests multiple components together
- Verifies APIs, database connections
- Tools: Supertest, pytest, JUnit
- Target: 80-85% coverage for integration points

**[E2E Testing](/docs/glossary/terms/e2e-testing)**
- Tests complete user flows
- Browser automation, real scenarios
- Tools: Playwright, Cypress, Selenium
- SpecWeave mandates E2E for UI features

### Quality Metrics

**[Test Coverage](/docs/glossary/terms/test-coverage)**
- Percentage of code executed by tests
- Types: line coverage, branch coverage, function coverage
- Target: 80-90% overall, 100% for critical paths
- Tools: Istanbul, Coverage.py, JaCoCo

**[Test Pyramid](/docs/glossary/terms/test-pyramid)**
- Visual model of test distribution
- Base: Many unit tests (fast, cheap)
- Middle: Some integration tests (moderate speed)
- Top: Few E2E tests (slow, expensive)
- SpecWeave recommends 70% unit, 20% integration, 10% E2E

### Testing Tools

**[Playwright](/docs/glossary/terms/playwright)**
- Modern E2E testing framework
- Multi-browser support (Chromium, Firefox, WebKit)
- Fast, reliable, auto-wait
- SpecWeave uses Playwright for E2E tests

**[Jest](/docs/glossary/terms/jest)**
- JavaScript testing framework
- Zero-config, snapshot testing, mocking
- Most popular for React/Node.js
- SpecWeave uses Jest for unit tests

**[Pytest](/docs/glossary/terms/pytest)**
- Python testing framework
- Simple syntax, powerful fixtures
- Best for: Python backend testing
- Plugin ecosystem (pytest-django, pytest-asyncio)

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **TDD** | Building new features, want better design | Prototyping, spike work, tight deadlines |
| **BDD** | Collaborating with non-technical stakeholders | Pure technical implementation |
| **Unit Testing** | Testing business logic, utilities | Testing UI, database queries |
| **Integration Testing** | Testing API endpoints, database operations | Testing pure functions |
| **E2E Testing** | Testing critical user flows (login, checkout) | Testing internal utilities |
| **Playwright** | Modern web apps, multi-browser testing | Simple scripts, non-browser testing |

---

## Real-World Examples

### TDD Workflow: Building Login Feature

**Step 1: RED - Write Failing Test**

```typescript
// auth.test.ts
import { describe, it, expect } from '@jest/globals';
import { AuthService } from './auth';

describe('AuthService', () => {
  it('should authenticate user with valid credentials', async () => {
    const auth = new AuthService();
    const result = await auth.login('user@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('user@example.com');
  });
});
```

Run test: `npm test` → ❌ FAILS (AuthService doesn't exist yet)

**Step 2: GREEN - Write Minimal Implementation**

```typescript
// auth.ts
export class AuthService {
  async login(email: string, password: string) {
    // Minimal implementation to pass test
    if (email === 'user@example.com' && password === 'password123') {
      return {
        success: true,
        token: 'fake-token-123',
        user: { email }
      };
    }
    return { success: false };
  }
}
```

Run test: `npm test` → ✅ PASSES

**Step 3: REFACTOR - Improve Implementation**

```typescript
// auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from './user-repository';

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async login(email: string, password: string) {
    // Real implementation
    const user = await this.userRepo.findByEmail(email);
    if (!user) return { success: false };

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { success: false };

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    return {
      success: true,
      token,
      user: { email: user.email, name: user.name }
    };
  }
}
```

Run test: `npm test` → ✅ STILL PASSES (refactored without breaking tests)

### Test Pyramid in Practice

**Scenario**: E-Commerce checkout flow

```
E2E Tests (10% - Top of Pyramid)
├─ Complete checkout flow
├─ Payment integration
└─ Order confirmation

Integration Tests (20% - Middle)
├─ POST /api/orders (create order)
├─ GET /api/orders/:id (fetch order)
├─ POST /api/payments (process payment)
├─ Database transactions
└─ External API calls (Stripe)

Unit Tests (70% - Base of Pyramid)
├─ calculateTotal(items) → sum prices
├─ validateAddress(address) → check format
├─ applyDiscount(code) → calculate discount
├─ generateOrderId() → unique ID
├─ formatCurrency(amount) → $99.99
└─ ... (50+ more unit tests)
```

**Why this distribution?**
- ✅ Unit tests are FAST (milliseconds), run frequently
- ✅ Integration tests are MODERATE (seconds), run on PR
- ✅ E2E tests are SLOW (minutes), run before deployment
- ✅ Catch 80% of bugs with fast unit tests
- ✅ Reserve E2E for critical user flows only

### SpecWeave Testing Example (v0.7.0+ Format)

```markdown
# Increment 0025: User Authentication

## Tasks with Embedded Tests

### T-001: Implement AuthService

**AC**: AC-US1-01, AC-US1-02

**Test Plan** (BDD format):
- **Given** user with valid credentials → **When** login → **Then** receive JWT token
- **Given** invalid password → **When** login → **Then** receive error
- **Given** non-existent user → **When** login → **Then** receive error

**Test Cases**:
- Unit (`auth.test.ts`):
  - `login_withValidCredentials_returnsToken()`
  - `login_withInvalidPassword_returnsError()`
  - `login_withNonexistentUser_returnsError()`
  - `login_withLockedAccount_returnsError()`
  - Coverage: 90%

- Integration (`auth-flow.test.ts`):
  - POST /api/auth/login (valid credentials)
  - POST /api/auth/login (invalid credentials)
  - POST /api/auth/logout
  - Coverage: 85%

**Overall Coverage**: 87%

**Implementation**:
1. Create AuthService class
2. Implement bcrypt password hashing
3. Generate JWT tokens
4. Add rate limiting (5 attempts, 15min lockout)
5. Write tests FIRST (TDD workflow)

---

### T-002: Add login API endpoint

**AC**: AC-US1-01

**Test Plan** (BDD):
- **Given** valid credentials → **When** POST /api/auth/login → **Then** 200 + token

**Test Cases**:
- Integration (`api.test.ts`):
  - POST /api/auth/login (success case)
  - POST /api/auth/login (validation errors)
  - POST /api/auth/login (rate limiting)
  - Coverage: 85%

- E2E (`auth.spec.ts`):
  - Complete login flow (browser automation)
  - Coverage: 100% (critical path)

**Overall Coverage**: 88%
```

**Key Features**:
- ✅ AC-ID traceability (AC-US1-01, AC-US1-02)
- ✅ BDD format (Given/When/Then)
- ✅ Coverage targets per test level
- ✅ Overall coverage per task
- ✅ TDD workflow supported

---

## How SpecWeave Uses Testing Terms

### 1. Test-Aware Planning (v0.7.0+)

SpecWeave embeds tests in `tasks.md` instead of separate `tests.md`:

**Old Format** (deprecated):
- ❌ Separate `tests.md` file
- ❌ Manual TC-ID management (TC-001, TC-002)
- ❌ No BDD format

**New Format** (v0.7.0+):
- ✅ Tests embedded in `tasks.md`
- ✅ BDD format (Given/When/Then)
- ✅ AC-ID traceability
- ✅ Coverage targets per task

### 2. TDD Workflow Mode

When `test_mode: TDD` in tasks.md frontmatter:

```bash
# 1. RED - Write failing test
vim tests/unit/auth.test.ts
npm test  # ❌ Fails (expected)

# 2. GREEN - Implement feature
vim src/services/auth.ts
npm test  # ✅ Passes

# 3. REFACTOR - Improve code
vim src/services/auth.ts
npm test  # ✅ Still passes
```

### 3. Test Validation Command

```bash
/specweave:check-tests 0025
```

**Output**:
```
✅ Increment 0025: User Authentication

Test Coverage Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task    | Unit    | Integration | E2E    | Overall
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T-001   | 90%     | 85%         | N/A    | 87% ✅
T-002   | 85%     | 85%         | 100%   | 88% ✅
T-003   | 88%     | 80%         | 100%   | 86% ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall | 87%     | 83%         | 100%   | 87% ✅

AC-ID Coverage:
✅ AC-US1-01: Covered by T-001, T-002
✅ AC-US1-02: Covered by T-001
✅ AC-US1-03: Covered by T-003

Test Pyramid Distribution:
Unit:        70% ✅ (Target: 70%)
Integration: 20% ✅ (Target: 20%)
E2E:         10% ✅ (Target: 10%)

Recommendations:
✅ Coverage targets met
✅ Test pyramid balanced
✅ All AC-IDs covered
```

### 4. Mandatory E2E Testing

**SpecWeave enforces E2E tests for UI features**:

```markdown
## T-004: Implement login page UI

**Test Plan**:
- E2E: MANDATORY (Playwright)
  - User can log in with valid credentials
  - Error message shown for invalid credentials
  - Rate limiting works (5 failed attempts)
```

**Playwright Example**:

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in with valid credentials', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Wait for redirect
  await expect(page).toHaveURL('/dashboard');

  // Verify user name displayed
  await expect(page.locator('h1')).toContainText('Welcome, John');
});

test('error shown for invalid credentials', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'wrong-password');
  await page.click('button[type="submit"]');

  // Error message visible
  await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials');

  // Still on login page
  await expect(page).toHaveURL('/login');
});
```

### 5. Living Documentation

Test strategy is documented in:
```
.specweave/docs/internal/
├── delivery/
│   ├── testing-strategy.md      # Overall test approach
│   └── test-pyramid.md          # Test distribution
├── operations/
│   └── qa-checklist.md          # Manual QA steps
└── architecture/
    └── adr/
        └── 0030-playwright-for-e2e.md
```

---

## Related Categories

- **[DevOps & Tools](/docs/glossary/categories/devops)** - CI/CD integration
- **[Backend Development](/docs/glossary/categories/backend)** - API testing
- **[Frontend Development](/docs/glossary/categories/frontend)** - UI testing

---

## Learn More

### Guides
- [Testing Strategy (comprehensive)](/docs/delivery/guides/testing-strategy)
- [TDD Workflow (coming soon)](/docs/learn/foundations/tdd)
- [E2E Testing with Playwright (coming soon)](/docs/learn/foundations/playwright)

### Books
- "Test-Driven Development: By Example" by Kent Beck
- "Growing Object-Oriented Software, Guided by Tests" by Steve Freeman
- "The Art of Unit Testing" by Roy Osherove
- "Effective Software Testing" by Maurício Aniche

### External Resources
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Martin Fowler on Testing](https://martinfowler.com/testing/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Google Testing Blog](https://testing.googleblog.com/)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
