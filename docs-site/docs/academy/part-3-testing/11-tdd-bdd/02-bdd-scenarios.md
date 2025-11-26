---
sidebar_position: 2
title: "11.2 BDD Scenarios"
description: "Write behavior specifications with Given-When-Then syntax"
---

# Lesson 11.2: Behavior-Driven Development

**Duration**: 45 minutes | **Difficulty**: Intermediate

---

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand BDD and its relationship to TDD
- Write scenarios using Given-When-Then syntax
- Convert user stories to executable specifications
- Use BDD tools in JavaScript/TypeScript

---

## What is BDD?

**Behavior-Driven Development (BDD)** extends TDD by:

```
TDD:  Write test → Make it pass → Refactor
BDD:  Describe behavior → Write test → Make it pass → Refactor
```

BDD focuses on **what** the system should do, not **how**.

### BDD vs TDD

| Aspect | TDD | BDD |
|--------|-----|-----|
| Focus | Implementation | Behavior |
| Language | Technical | Business |
| Audience | Developers | Everyone |
| Tests describe | Functions | Features |

---

## Given-When-Then

BDD scenarios follow a standard structure:

```gherkin
Given [precondition/context]
When [action/trigger]
Then [expected outcome]
```

### Real Examples

**User Login:**
```gherkin
Given a registered user with email "alice@example.com"
When they submit correct credentials
Then they should be logged in
And they should see their dashboard
```

**Shopping Cart:**
```gherkin
Given an empty shopping cart
When the user adds a product costing $29.99
Then the cart should contain 1 item
And the cart total should be $29.99
```

**Form Validation:**
```gherkin
Given a user on the registration page
When they submit with an invalid email "not-an-email"
Then they should see "Invalid email format" error
And the form should not be submitted
```

---

## Writing Good Scenarios

### 1. Focus on Behavior, Not Implementation

```gherkin
# ❌ BAD: Implementation details
Given the users table has a row with id=1
When a GET request is sent to /api/users/1
Then the response JSON should have status 200

# ✅ GOOD: Behavior
Given Alice is a registered user
When viewing Alice's profile
Then her name and email should be displayed
```

### 2. One Behavior Per Scenario

```gherkin
# ❌ BAD: Multiple behaviors
Given a user
When they log in
Then they see dashboard
When they click settings
Then they see settings page
When they update email
Then email should be updated

# ✅ GOOD: Single behavior
Scenario: User logs in
Given a registered user
When they submit correct credentials
Then they should see their dashboard

Scenario: User updates email
Given a logged-in user on settings page
When they change their email
Then the email should be updated
```

### 3. Use Concrete Examples

```gherkin
# ❌ BAD: Vague
Given a user with some items in cart
When they checkout
Then they should pay the right amount

# ✅ GOOD: Specific
Given a cart with:
  | Product     | Price  | Quantity |
  | Widget      | $10.00 | 2        |
  | Gadget      | $25.00 | 1        |
When the user proceeds to checkout
Then the subtotal should be $45.00
And the tax (10%) should be $4.50
And the total should be $49.50
```

---

## BDD in JavaScript: Vitest + Describe

You can write BDD-style tests without special tools:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ShoppingCart } from '../src/cart';
import { Product } from '../src/product';

describe('Shopping Cart', () => {
  describe('Given an empty cart', () => {
    let cart: ShoppingCart;

    beforeEach(() => {
      cart = new ShoppingCart();
    });

    describe('When adding a product', () => {
      const product: Product = {
        id: '1',
        name: 'Widget',
        price: 29.99
      };

      beforeEach(() => {
        cart.add(product);
      });

      it('Then the cart should contain 1 item', () => {
        expect(cart.itemCount).toBe(1);
      });

      it('Then the total should equal the product price', () => {
        expect(cart.total).toBe(29.99);
      });
    });

    describe('When checking out with no items', () => {
      it('Then it should throw an error', () => {
        expect(() => cart.checkout()).toThrow('Cart is empty');
      });
    });
  });

  describe('Given a cart with items', () => {
    let cart: ShoppingCart;

    beforeEach(() => {
      cart = new ShoppingCart();
      cart.add({ id: '1', name: 'Widget', price: 10 });
      cart.add({ id: '2', name: 'Gadget', price: 25 });
    });

    describe('When removing an item', () => {
      beforeEach(() => {
        cart.remove('1');
      });

      it('Then the cart should contain 1 item', () => {
        expect(cart.itemCount).toBe(1);
      });

      it('Then the total should update', () => {
        expect(cart.total).toBe(25);
      });
    });
  });
});
```

---

## Cucumber.js for Full BDD

For teams that want feature files readable by non-developers:

### Installation

```bash
npm install -D @cucumber/cucumber
```

### Feature File

```gherkin
# features/login.feature
Feature: User Authentication

  As a registered user
  I want to log in to my account
  So that I can access my personal data

  Scenario: Successful login
    Given I am on the login page
    When I enter "alice@example.com" as email
    And I enter "SecurePass123!" as password
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Welcome, Alice"

  Scenario: Failed login with wrong password
    Given I am on the login page
    When I enter "alice@example.com" as email
    And I enter "wrong-password" as password
    And I click the login button
    Then I should see "Invalid credentials" error
    And I should stay on the login page

  Scenario Outline: Password validation
    Given I am on the registration page
    When I enter "<password>" as password
    Then I should see "<message>"

    Examples:
      | password      | message                      |
      | short         | Minimum 8 characters         |
      | nouppercas3!  | Need uppercase letter        |
      | NOLOWERCASE3! | Need lowercase letter        |
      | NoNumbers!    | Need a number                |
      | Valid1Pass!   | Password meets requirements  |
```

### Step Definitions

```typescript
// features/steps/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { Browser, Page } from 'playwright';

let page: Page;

Given('I am on the login page', async function () {
  await page.goto('/login');
});

When('I enter {string} as email', async function (email: string) {
  await page.fill('[data-testid="email"]', email);
});

When('I enter {string} as password', async function (password: string) {
  await page.fill('[data-testid="password"]', password);
});

When('I click the login button', async function () {
  await page.click('[data-testid="login-button"]');
});

Then('I should be redirected to the dashboard', async function () {
  await page.waitForURL('/dashboard');
  expect(page.url()).to.include('/dashboard');
});

Then('I should see {string}', async function (text: string) {
  const content = await page.textContent('body');
  expect(content).to.include(text);
});

Then('I should see {string} error', async function (message: string) {
  const error = await page.textContent('[data-testid="error"]');
  expect(error).to.include(message);
});
```

---

## Scenario Tables

Use data tables for multiple examples:

```gherkin
Scenario: Calculate order total
  Given a customer with membership level "gold"
  And the following items in cart:
    | Item        | Price  | Quantity |
    | Laptop      | 999.99 | 1        |
    | Mouse       | 29.99  | 2        |
    | Keyboard    | 79.99  | 1        |
  When calculating the order total
  Then the subtotal should be $1139.96
  And the gold discount (15%) should be $170.99
  And the final total should be $968.97
```

```typescript
// Step definition with data table
Given('the following items in cart:', async function (dataTable) {
  const items = dataTable.hashes();
  for (const item of items) {
    await this.cart.add({
      name: item.Item,
      price: parseFloat(item.Price),
      quantity: parseInt(item.Quantity)
    });
  }
});
```

---

## BDD Best Practices

### 1. Three Amigos Sessions

Before writing scenarios, have:
- **Business** (what's valuable)
- **Development** (what's possible)
- **Testing** (what could go wrong)

### 2. Example Mapping

```
┌─────────────────────────────────────────┐
│ RULE: Users must verify email           │
├─────────────────────────────────────────┤
│ Example: User clicks verification link  │
│ Example: Link expires after 24 hours    │
│ Example: User requests new link         │
├─────────────────────────────────────────┤
│ Question: What if email bounces?        │
│ Question: Allow multiple attempts?      │
└─────────────────────────────────────────┘
```

### 3. Living Documentation

Keep scenarios updated as features evolve. They become:
- Acceptance criteria
- Test cases
- Documentation
- Communication tool

---

## From User Story to Scenarios

### User Story

```
As a customer
I want to apply discount codes
So that I can save money on my order
```

### Scenarios

```gherkin
Feature: Discount Codes

  Scenario: Apply valid percentage discount
    Given a cart with total $100.00
    When I apply code "SAVE20" (20% off)
    Then the discount should be $20.00
    And the new total should be $80.00

  Scenario: Apply valid fixed discount
    Given a cart with total $100.00
    When I apply code "FLAT15" ($15 off)
    Then the discount should be $15.00
    And the new total should be $85.00

  Scenario: Reject expired discount code
    Given a cart with total $100.00
    When I apply expired code "OLDCODE"
    Then I should see "This code has expired"
    And the total should remain $100.00

  Scenario: Reject discount below minimum
    Given a cart with total $25.00
    When I apply code "SAVE20" (requires $50 minimum)
    Then I should see "Minimum order $50 required"
    And the total should remain $25.00

  Scenario: Only one discount at a time
    Given a cart with total $100.00
    And code "SAVE20" is already applied
    When I try to apply code "FLAT15"
    Then I should see "Only one discount allowed"
    And "SAVE20" should remain applied
```

---

## Key Takeaways

1. **BDD bridges business and tech** — Scenarios everyone understands
2. **Given-When-Then structure** — Clear, consistent format
3. **One behavior per scenario** — Keep them focused
4. **Use concrete examples** — Not vague descriptions
5. **Living documentation** — Scenarios stay current

---

## Practice Exercise

Convert this user story to BDD scenarios:

```
As a user
I want to reset my password
So that I can regain access to my account
```

Write scenarios for:
1. Request password reset
2. Click reset link in email
3. Set new password
4. Expired reset link
5. Invalid email address

---

## Next Lesson

Learn how SpecWeave integrates TDD/BDD workflows.

→ [Continue to Lesson 11.3: TDD with SpecWeave](./03-specweave-tdd)
