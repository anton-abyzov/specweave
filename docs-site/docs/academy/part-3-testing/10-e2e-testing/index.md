---
sidebar_position: 1
title: "Module 10: E2E Testing"
description: "Test complete user journeys with Playwright"
---

# Module 10: E2E Testing

**Duration**: 2-3 hours | **Difficulty**: Intermediate

End-to-end tests verify that your application works correctly from the user's perspective, testing complete workflows through the UI.

---

## What You'll Learn

- Setting up Playwright
- Writing E2E tests
- Page Object Model pattern
- Visual regression testing
- Handling flaky tests

---

## Module Lessons

| Lesson | Topic | Duration |
|--------|-------|----------|
| [10.1 Playwright Setup](./01-playwright-setup) | Installing and configuring Playwright | 30 min |
| [10.2 Writing E2E Tests](./02-writing-e2e) | Testing user workflows | 45 min |
| [10.3 Page Object Model](./03-page-objects) | Organizing E2E test code | 45 min |
| [10.4 Visual Testing](./04-visual-testing) | Screenshot comparison testing | 30 min |
| [10.5 Debugging E2E](./05-debugging) | Fixing flaky tests | 30 min |

---

## E2E Test Characteristics

```
Speed:        🐢 Slow (minutes)
Count:        📊 Few (5-20 critical paths)
Scope:        🌐 Complete application
Dependencies: ✅ All real
Cost:         💰💰 Expensive
```

---

## Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('User can complete checkout', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Add product to cart
  await page.goto('/products');
  await page.click('[data-product="laptop"]');
  await page.click('button:has-text("Add to Cart")');

  // Checkout
  await page.goto('/checkout');
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.click('button:has-text("Pay")');

  // Verify success
  await expect(page.locator('h1')).toHaveText('Order Confirmed!');
});
```

---

## Prerequisites

Before starting:
- ✅ Completed Module 09
- ✅ Working web application
- ✅ Basic HTML/CSS knowledge

---

## Let's Begin

Ready to test complete user journeys?

→ [Start Lesson 10.1: Playwright Setup](./01-playwright-setup)
