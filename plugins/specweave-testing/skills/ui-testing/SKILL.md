---
name: ui-testing
description: UI testing expert for Cypress, Testing Library, and component tests. Use when testing UI components or implementing component tests.
---

# UI Testing Skill

Expert in UI testing with **Cypress** and **Testing Library**. For deep Playwright expertise, see the `e2e-playwright` skill.

## Framework Selection Guide

| Framework | Best For | Key Strength |
|-----------|----------|--------------|
| **Playwright** | E2E, cross-browser | Auto-wait, multi-browser → Use `e2e-playwright` skill |
| **Cypress** | E2E, developer experience | Time-travel debugging, real-time reload |
| **Testing Library** | Component tests | User-centric queries, accessibility-first |

---

## 1. Cypress (E2E Testing)

**Why Cypress?**
- Developer-friendly API
- Real-time reloading
- Time-travel debugging
- Screenshot/video recording
- Stubbing and mocking built-in

#### Basic Test

```javascript
describe('User Authentication', () => {
  it('should login with valid credentials', () => {
    cy.visit('/login');

    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('SecurePass123!');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('h1').should('have.text', 'Welcome, User');
  });

  it('should show error with invalid credentials', () => {
    cy.visit('/login');

    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('WrongPass');
    cy.get('button[type="submit"]').click();

    cy.get('.error-message')
      .should('be.visible')
      .and('have.text', 'Invalid credentials');
  });
});
```

#### Custom Commands (Reusable Actions)

```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
});

// Usage in tests
it('should display dashboard for logged-in user', () => {
  cy.login('user@example.com', 'SecurePass123!');
  cy.get('h1').should('have.text', 'Dashboard');
});
```

#### API Mocking with Intercept

```javascript
it('should display mocked user data', () => {
  cy.intercept('GET', '/api/user', {
    statusCode: 200,
    body: {
      id: 1,
      name: 'Mock User',
      email: 'mock@example.com',
    },
  }).as('getUser');

  cy.visit('/profile');

  cy.wait('@getUser');
  cy.get('.user-name').should('have.text', 'Mock User');
});
```

### 3. React Testing Library (Component Tests)

**Why Testing Library?**
- User-centric queries (accessibility-first)
- Encourages best practices (testing behavior, not implementation)
- Works with React, Vue, Svelte, Angular

#### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render email and password inputs', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should call onSubmit with email and password', async () => {
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    // Type into inputs
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SecurePass123!' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verify callback
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'SecurePass123!',
    });
  });

  it('should show validation error for invalid email', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText('Email'));

    expect(await screen.findByText('Invalid email format')).toBeInTheDocument();
  });
});
```

#### User-Centric Queries (Preferred)

```typescript
// ✅ GOOD: Accessible queries (user-facing)
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText('Email');
screen.getByPlaceholderText('Enter your email');
screen.getByText('Welcome');

// ❌ BAD: Implementation-detail queries (fragile)
screen.getByClassName('btn-primary'); // Changes when CSS changes
screen.getByTestId('submit-button'); // Not user-facing
```

## Test Strategies

### 1. Testing Pyramid

```
         /\
        /  \  E2E (10%)
       /____\
      /      \  Integration (30%)
     /________\
    /          \  Unit (60%)
   /____________\
```

**Unit Tests** (60%):
- Individual components in isolation
- Fast, cheap, many tests
- Mock external dependencies

**Integration Tests** (30%):
- Multiple components working together
- API integration, data flow
- Moderate speed, moderate cost

**E2E Tests** (10%):
- Full user journeys (login → checkout)
- Slowest, most expensive
- Critical paths only

### 2. Test Coverage Strategy

**What to Test**:
- ✅ Happy paths (core user flows)
- ✅ Error states (validation, API failures)
- ✅ Edge cases (empty states, max limits)
- ✅ Accessibility (keyboard navigation, screen readers)
- ✅ Regression bugs (add test for each bug fix)

**What NOT to Test**:
- ❌ Third-party libraries (assume they work)
- ❌ Implementation details (internal state, CSS classes)
- ❌ Trivial code (getters, setters)

### 3. Flakiness Mitigation

**Common Causes of Flaky Tests**:

1. **Race Conditions**

❌ **Bad**:
```typescript
await page.click('button');
const text = await page.textContent('.result'); // May fail!
```

✅ **Good**:
```typescript
await page.click('button');
await page.waitForSelector('.result'); // Wait for element
const text = await page.textContent('.result');
```

2. **Non-Deterministic Data**

❌ **Bad**:
```typescript
expect(page.locator('.user')).toHaveCount(5); // Depends on database state
```

✅ **Good**:
```typescript
// Mock API to return deterministic data
await page.route('**/api/users', (route) =>
  route.fulfill({
    body: JSON.stringify([{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }]),
  })
);

expect(page.locator('.user')).toHaveCount(2); // Predictable
```

3. **Timing Issues**

❌ **Bad**:
```typescript
await page.waitForTimeout(3000); // Arbitrary wait
```

✅ **Good**:
```typescript
await page.waitForSelector('.loaded'); // Wait for specific condition
await page.waitForLoadState('networkidle'); // Wait for network idle
```

4. **Test Interdependence**

❌ **Bad**:
```typescript
test('create user', async () => {
  // Creates user in DB
});

test('login user', async () => {
  // Depends on previous test creating user
});
```

✅ **Good**:
```typescript
test.beforeEach(async () => {
  // Each test creates its own user
  await createTestUser();
});

test.afterEach(async () => {
  await cleanupTestUsers();
});
```

## Accessibility Testing

### 1. Automated Accessibility Tests (axe-core)

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('https://example.com');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### 2. Keyboard Navigation

```typescript
test('should navigate form with keyboard', async ({ page }) => {
  await page.goto('/form');

  // Tab through form fields
  await page.keyboard.press('Tab');
  await expect(page.locator('input[name="email"]')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('input[name="password"]')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('button[type="submit"]')).toBeFocused();

  // Submit with Enter
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('**/dashboard');
});
```

### 3. Screen Reader Testing (aria-label, roles)

```typescript
test('should have proper ARIA labels', async ({ page }) => {
  await page.goto('/login');

  // Verify accessible names
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

  // Verify error announcements (aria-live)
  await page.fill('input[name="email"]', 'invalid-email');
  await page.click('button[type="submit"]');

  const errorRegion = page.locator('[role="alert"]');
  await expect(errorRegion).toHaveText('Invalid email format');
});
```

## CI/CD Integration

### 1. GitHub Actions (Playwright)

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 2. Parallel Execution

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 2 : undefined, // Parallel in CI
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI
  reporter: process.env.CI ? 'github' : 'html',
});
```

### 3. Sharding (Large Test Suites)

```bash
# Split tests across 4 machines
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

## Best Practices

### 1. Use Data Attributes for Stable Selectors

```html
<!-- ✅ GOOD: Stable selector -->
<button data-testid="submit-button">Submit</button>

<!-- ❌ BAD: Fragile selectors -->
<button class="btn btn-primary">Submit</button> <!-- CSS changes break tests -->
```

```typescript
// Test
await page.click('[data-testid="submit-button"]');
```

### 2. Test User Behavior, Not Implementation

❌ **Bad**:
```typescript
// Testing internal state
expect(component.state.isLoading).toBe(true);
```

✅ **Good**:
```typescript
// Testing visible UI
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

### 3. Keep Tests Independent

```typescript
// ✅ GOOD: Each test is independent
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await login(page, 'user@example.com', 'password');
});

test('test 1', async ({ page }) => {
  // Fresh state
});

test('test 2', async ({ page }) => {
  // Fresh state
});
```

### 4. Use Meaningful Assertions

❌ **Bad**:
```typescript
expect(true).toBe(true); // Useless assertion
```

✅ **Good**:
```typescript
await expect(page.locator('.success-message')).toHaveText(
  'Order placed successfully'
);
```

### 5. Avoid Hard-Coded Waits

❌ **Bad**:
```typescript
await page.waitForTimeout(5000); // Slow, brittle
```

✅ **Good**:
```typescript
await page.waitForSelector('.results'); // Wait for specific element
await expect(page.locator('.results')).toBeVisible(); // Built-in wait
```

## Debugging Tests

### 1. Headed Mode (See Browser)

```bash
npx playwright test --headed
npx playwright test --headed --debug # Pause on each step
```

### 2. Screenshot on Failure

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    await page.screenshot({ path: `failure-${testInfo.title}.png` });
  }
});
```

### 3. Trace Viewer (Time-Travel Debugging)

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry', // Record trace on retry
  },
});
```

```bash
# View trace
npx playwright show-trace trace.zip
```

### 4. Console Logs

```typescript
page.on('console', (msg) => console.log('Browser log:', msg.text()));
page.on('pageerror', (error) => console.error('Page error:', error));
```

## Common Patterns

### 1. Testing Forms

```typescript
test('should validate form fields', async ({ page }) => {
  await page.goto('/form');

  // Empty submission (validation)
  await page.click('button[type="submit"]');
  await expect(page.locator('.email-error')).toHaveText('Email is required');

  // Invalid email
  await page.fill('input[name="email"]', 'invalid');
  await page.click('button[type="submit"]');
  await expect(page.locator('.email-error')).toHaveText('Invalid email format');

  // Valid submission
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('**/success');
});
```

### 2. Testing Modals

```typescript
test('should open and close modal', async ({ page }) => {
  await page.goto('/');

  // Open modal
  await page.click('[data-testid="open-modal"]');
  await expect(page.locator('.modal')).toBeVisible();

  // Close with X button
  await page.click('.modal .close-button');
  await expect(page.locator('.modal')).not.toBeVisible();

  // Open again, close with Escape
  await page.click('[data-testid="open-modal"]');
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).not.toBeVisible();
});
```

### 3. Testing Drag and Drop

```typescript
test('should drag and drop items', async ({ page }) => {
  await page.goto('/kanban');

  const todoItem = page.locator('[data-testid="item-1"]');
  const doneColumn = page.locator('[data-testid="column-done"]');

  // Drag item from TODO to DONE
  await todoItem.dragTo(doneColumn);

  // Verify item moved
  await expect(doneColumn.locator('[data-testid="item-1"]')).toBeVisible();
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Library](https://testing-library.com/)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

## Activation Keywords

Ask me about:
- "How to write E2E tests with Playwright"
- "Cypress test examples"
- "React Testing Library best practices"
- "Page Object Model for UI tests"
- "Accessibility testing with axe-core"
- "How to fix flaky tests"
- "CI/CD integration for UI tests"
- "Debugging Playwright tests"
- "Test automation strategies"
