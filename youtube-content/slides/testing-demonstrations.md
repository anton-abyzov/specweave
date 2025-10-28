# Testing Demonstrations Guide

**Purpose**: Detailed guide for testing demonstrations in the masterclass
**Duration**: ~15 minutes (Part 8 of script)

---

## Overview

This guide covers three types of testing demonstrated in SpecWeave:
1. **Skill Testing** - Validating individual skills
2. **E2E Testing** - End-to-end user flows with Playwright
3. **Truth-Telling Tests** - Tests that actually validate outcomes

---

## Demo 1: Skill Testing (5 min)

### Concept

Every SpecWeave skill must have minimum 3 test cases:
- Basic functionality
- Edge cases
- Integration scenarios

### Demo Setup

```bash
cd specweave
ls src/skills/increment-planner/test-cases/
```

**Show**:
```
test-cases/
├── test-1-basic.yaml
├── test-2-complex.yaml
└── test-3-edge-case.yaml
```

### Test Case Structure

**Show**: `test-1-basic.yaml`

```yaml
---
test_id: increment-planner-001
name: Basic Feature Planning
description: Test that increment-planner creates complete feature structure

setup:
  project_type: greenfield
  existing_features: 0

input:
  user_request: |
    Plan a user authentication feature with email/password login,
    registration, and password reset.

expected_outputs:
  - type: directory
    path: features/001-user-authentication/

  - type: file
    path: features/001-user-authentication/spec.md
    contains:
      - "User Authentication"
      - "email/password"
      - "registration"
      - "password reset"

  - type: file
    path: features/001-user-authentication/plan.md
    contains:
      - "Implementation Plan"
      - "Phase"

  - type: file
    path: features/001-user-authentication/tasks.md
    contains:
      - "[ ]"  # Has checkboxes

  - type: file
    path: features/001-user-authentication/tests.md
    contains:
      - "Test Strategy"

  - type: file
    path: features/001-user-authentication/context-manifest.yaml
    contains:
      - "spec_sections"
      - "authentication"

validation:
  - check: file_exists
    path: features/001-user-authentication/spec.md

  - check: yaml_valid
    path: features/001-user-authentication/context-manifest.yaml

  - check: feature_number
    expected: "001"

  - check: all_files_created
    count: 5

pass_criteria:
  - All expected files created
  - Content contains required keywords
  - YAML is valid
  - Feature number is correct
---
```

### Running Skill Tests

**Command**:
```bash
npm run test:skills -- increment-planner
```

**Terminal Output** (show live):
```
🧪 Running Skill Tests: increment-planner

Test 1/3: Basic Feature Planning (test-1-basic.yaml)
  ⏳ Setting up test environment...
  ✅ Setup complete

  ⏳ Executing test...
  → User Request: "Plan a user authentication feature..."
  → increment-planner skill activated
  → Creating features/001-user-authentication/

  ⏳ Validating outputs...
  ✅ Directory created: features/001-user-authentication/
  ✅ File created: spec.md (342 lines)
  ✅ File created: plan.md (156 lines)
  ✅ File created: tasks.md (45 lines)
  ✅ File created: tests.md (78 lines)
  ✅ File created: context-manifest.yaml (23 lines)

  ⏳ Validating content...
  ✅ spec.md contains "User Authentication"
  ✅ spec.md contains "email/password"
  ✅ spec.md contains "registration"
  ✅ spec.md contains "password reset"
  ✅ plan.md contains "Implementation Plan"
  ✅ plan.md contains "Phase"
  ✅ tasks.md contains checkboxes
  ✅ tests.md contains "Test Strategy"
  ✅ context-manifest.yaml is valid YAML
  ✅ Feature number is 001

  ✅ PASSED (12.3s)

Test 2/3: Complex Feature (test-2-complex.yaml)
  ✅ PASSED (18.7s)

Test 3/3: Edge Case - Existing Features (test-3-edge-case.yaml)
  ✅ PASSED (9.2s)

---

Summary:
  ✅ 3/3 tests passed
  ⏱️  Total duration: 40.2s

✅ increment-planner skill validation: PASSED
```

**Key Point**: Skill tests ensure skills work as designed before shipping.

---

## Demo 2: E2E Testing with Playwright (7 min)

### Concept

E2E tests validate actual user flows in real browsers.
They test the COMPLETE system, not isolated units.

### Why E2E is Mandatory (for UI)

**Show Slide**: Unit test vs E2E test comparison

**Bad Test** (Unit):
```typescript
test('login returns token', async () => {
  const result = await authService.login('user@test.com', 'pass123');
  expect(result.token).toBeDefined();
});
```

**Problem**: This test passes even if:
- Form doesn't submit
- Token not stored
- Redirect doesn't work
- User sees error despite valid login

**Good Test** (E2E):
```typescript
test('user can actually log in', async ({ page }) => {
  // Test REAL UI
  await page.goto('http://localhost:3000/login');
  await page.fill('[name="email"]', 'user@test.com');
  await page.fill('[name="password"]', 'pass123');
  await page.click('button[type="submit"]');

  // Verify REAL outcome
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
  await expect(page.locator('[data-testid="username"]'))
    .toHaveText('testuser');

  // Check REAL side effects
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  expect(token).toBeTruthy();
});
```

If this test passes, the feature ACTUALLY works.

### Live E2E Test Demonstration

**Setup**:
```bash
cd taskmaster  # From greenfield demo
npm run test:e2e -- tests/e2e/auth.spec.ts
```

**Show Playwright UI**:
```bash
npm run test:e2e -- --ui
```

**Select Test**: "complete registration and login flow"

**Show Live**:
1. Browser opens
2. Navigates to /register
3. Fills form fields (visible in browser)
4. Clicks submit button
5. Waits for redirect
6. Verifies on /login page
7. Fills login form
8. Clicks login button
9. Verifies on /dashboard
10. Verifies username displayed
11. Checks localStorage for token

**All steps visible** - this is truth-telling!

### E2E Test Code Walkthrough

**Show**: `tests/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('complete registration and login flow', async ({ page }) => {
    // Part 1: Registration
    await page.goto('/register');

    const uniqueEmail = `user${Date.now()}@example.com`;
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="username"]', 'newuser');
    await page.click('button[type="submit"]');

    // Verify registration success
    await expect(page.locator('.success-message'))
      .toContainText('Please check your email to verify');

    // Part 2: Email Verification (simulate)
    // In real test: check email or use test helper to get token
    const verificationToken = await getVerificationToken(uniqueEmail);
    await page.goto(`/verify-email/${verificationToken}`);

    await expect(page.locator('.success-message'))
      .toContainText('Email verified successfully');

    // Part 3: Login
    await page.goto('/login');
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Part 4: Verify Authentication
    // Check URL changed
    await expect(page).toHaveURL('/dashboard');

    // Check UI shows user
    await expect(page.locator('[data-testid="user-email"]'))
      .toHaveText(uniqueEmail);

    // Check token stored
    const token = await page.evaluate(() =>
      localStorage.getItem('authToken')
    );
    expect(token).toBeTruthy();
    expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT format

    // Part 5: Verify Protected Routes Work
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');  // Not redirected to login

    // Part 6: Logout
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/login');

    // Part 7: Verify Token Cleared
    const tokenAfterLogout = await page.evaluate(() =>
      localStorage.getItem('authToken')
    );
    expect(tokenAfterLogout).toBeNull();
  });
});
```

**Key Points**:
- Tests actual UI elements
- Verifies navigation
- Checks side effects (localStorage, database)
- Tests complete user journey
- If test passes, feature works end-to-end

### Running E2E Suite

```bash
npm run test:e2e
```

**Terminal Output**:
```
Running 15 tests using 3 workers

  ✓  [chromium] › auth.spec.ts:10:1 › complete registration and login flow (2.1s)
  ✓  [chromium] › auth.spec.ts:50:1 › should reject invalid credentials (1.3s)
  ✓  [chromium] › auth.spec.ts:65:1 › should enforce rate limiting (2.8s)
  ✓  [chromium] › auth.spec.ts:80:1 › should handle password reset flow (3.2s)
  ✓  [firefox] › auth.spec.ts:10:1 › complete registration and login flow (2.5s)
  ... (tests run in parallel across browsers)

15 passed (18s)
```

**Show**: Playwright HTML Report
- Screenshots of each step
- Trace viewer for debugging
- Network logs
- Console logs

---

## Demo 3: Truth-Telling Tests (3 min)

### Concept

Tests must tell the truth: if they pass, the feature MUST work.

### Bad Test Examples (Lies)

**Example 1: Timeout Instead of Verification**

❌ **Bad**:
```typescript
test('payment succeeds', async ({ page }) => {
  await page.goto('/checkout');
  await page.fill('[name="card"]', '4242424242424242');
  await page.click('button:has-text("Pay")');

  // Just waits - doesn't verify anything!
  await page.waitForTimeout(2000);

  // Passes even if payment failed
});
```

✅ **Good**:
```typescript
test('payment succeeds', async ({ page }) => {
  await page.goto('/checkout');
  await page.fill('[name="card"]', '4242424242424242');
  await page.click('button:has-text("Pay")');

  // Verify actual success indicator
  await expect(page.locator('.success-message'))
    .toBeVisible();
  await expect(page.locator('.success-message'))
    .toContainText('Payment successful');

  // Verify order status changed
  await page.goto('/orders');
  await expect(page.locator('[data-order-id="123"] .status'))
    .toHaveText('Paid');

  // Verify database updated (via API)
  const response = await page.request.get('/api/orders/123');
  const order = await response.json();
  expect(order.status).toBe('paid');
  expect(order.paymentId).toBeDefined();
});
```

**Example 2: Testing the Mock, Not the Real Thing**

❌ **Bad**:
```typescript
test('sends email', async () => {
  const mockEmailService = jest.fn();
  await sendVerificationEmail('user@test.com', mockEmailService);

  expect(mockEmailService).toHaveBeenCalled();
  // But does the REAL email service work?
});
```

✅ **Good**:
```typescript
test('sends email', async ({ page }) => {
  // Use test email service (like MailHog, Mailpit)
  await page.goto('/register');
  await page.fill('[name="email"]', 'test@mailhog.local');
  await page.fill('[name="password"]', 'Pass123');
  await page.click('button[type="submit"]');

  // Check REAL email was sent
  const emails = await mailhog.getMessages();
  const verificationEmail = emails.find(e =>
    e.to.includes('test@mailhog.local')
  );

  expect(verificationEmail).toBeDefined();
  expect(verificationEmail.subject).toBe('Verify your email');
  expect(verificationEmail.html).toContain('Click here to verify');

  // Extract and click verification link
  const verificationUrl = extractUrlFromEmail(verificationEmail.html);
  await page.goto(verificationUrl);

  // Verify it worked
  await expect(page).toHaveURL('/login');
  await expect(page.locator('.success'))
    .toContainText('Email verified');
});
```

### Truth-Telling Principles

**Show Slide**:

1. ✅ **Verify visible outcomes** (not timeouts)
2. ✅ **Check side effects** (database, API, localStorage)
3. ✅ **Test the happy path AND error cases**
4. ✅ **If test passes, feature MUST work**
5. ✅ **If test fails, report EXACTLY what failed**

### Live Demo: Failing Test

**Show**: Intentionally broken feature

```typescript
test('user can update profile', async ({ page }) => {
  await loginUser(page, 'user@test.com', 'pass123');
  await page.goto('/profile');

  await page.fill('[name="bio"]', 'Updated bio');
  await page.click('button:has-text("Save")');

  // THIS WILL FAIL if save doesn't work
  await expect(page.locator('.success-message'))
    .toBeVisible();

  // Reload page and verify persisted
  await page.reload();
  await expect(page.locator('[name="bio"]'))
    .toHaveValue('Updated bio');
});
```

**Break the save functionality** (comment out backend save):
```typescript
// await db.users.update(userId, { bio: newBio });  // COMMENTED OUT
```

**Run test**:
```bash
npm run test:e2e -- --grep "update profile"
```

**Terminal Output**:
```
  ✗  [chromium] › profile.spec.ts:10:1 › user can update profile (1.8s)

Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: '.success-message'
Expected: visible
Received: hidden

Call log:
  - page.goto('/profile')
  - page.fill('[name="bio"]', 'Updated bio')
  - page.click('button:has-text("Save")')
  - expect.toBeVisible with timeout 5000ms  ← FAILED HERE

1 failed
```

**Key Point**: Test told the truth - feature is broken!

**Fix the feature**, re-run:
```
  ✓  [chromium] › profile.spec.ts:10:1 › user can update profile (1.2s)

1 passed
```

Test passes → Feature works. **Truth!**

---

## Summary

**Three Testing Levels**:
1. **Skill Tests** - Validate AI skills work correctly
2. **E2E Tests** - Validate complete user flows (mandatory for UI)
3. **Truth-Telling Tests** - Tests that actually verify outcomes

**Key Takeaways**:
- E2E tests close the loop
- Tests must verify actual outcomes, not just wait
- If test passes, feature MUST work
- If test fails, it tells you EXACTLY what's broken
- No false positives allowed

**SpecWeave Enforcement**:
- Minimum 3 tests per skill (enforced)
- E2E tests mandatory when UI exists (enforced)
- Closed-loop validation reports (generated)

This is how you ship with confidence! 🎉

---

**Last Updated**: 2025-01-26
**For**: SpecWeave Masterclass Video
