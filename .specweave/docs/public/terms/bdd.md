---
sidebar_position: 20
---

# BDD (Behavior-Driven Development)

**Category**: Testing & Quality

## Definition

**BDD** (Behavior-Driven Development) is a testing methodology that describes system behavior using natural language scenarios in **Given/When/Then** format. BDD bridges the gap between technical and non-technical stakeholders by writing tests in plain English.

**Format**: Given [initial state] → When [action] → Then [expected outcome]

## What Problem Does It Solve?

**The Traditional Testing Problem**:
- ❌ Tests written in technical jargon (only developers understand)
- ❌ No clear connection to business requirements
- ❌ Hard to understand what's being tested
- ❌ Non-technical stakeholders can't review tests

**BDD Solution**:
- ✅ Tests written in plain language (anyone can understand)
- ✅ Clear connection to user stories and acceptance criteria
- ✅ Self-documenting (test name explains behavior)
- ✅ Stakeholders can validate test scenarios

## Given/When/Then Format

### Structure

**Given**: Initial state or context
- Sets up preconditions
- Describes the starting point

**When**: Action or event
- The behavior being tested
- What the user does

**Then**: Expected outcome
- What should happen
- The observable result

### Examples

**Example 1: Login**
```
Given: User with valid credentials
When: User submits login form
Then: User receives JWT token and is redirected to dashboard
```

**Example 2: Invalid Login**
```
Given: User with invalid password
When: User submits login form
Then: System shows error "Invalid credentials" and does not log in
```

**Example 3: Rate Limiting**
```
Given: User with 5 failed login attempts
When: User attempts to log in again
Then: Account is locked for 15 minutes
```

## BDD in SpecWeave

### In tasks.md (Test Plans)

```markdown
## T-001: Implement Authentication Service

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD format):
- **Given** user with valid credentials → **When** login → **Then** receive JWT token
- **Given** user with invalid password → **When** login → **Then** show error "Invalid credentials"
- **Given** user with 5 failed attempts → **When** login → **Then** account locked 15min

**Test Cases**:
- Unit (`auth.test.ts`):
  - validLogin() - Happy path
  - invalidPassword() - Error handling
  - rateLimiting() - Security
```

### In Test Files

```typescript
// tests/unit/services/auth.test.ts
describe('AuthService', () => {
  describe('login()', () => {
    it('should return JWT token when given valid credentials (AC-US1-01)', async () => {
      // Given: User with valid credentials
      const email = 'user@example.com';
      const password = 'ValidPassword123!';
      const user = await createTestUser(email, password);

      // When: User attempts to log in
      const result = await authService.login(email, password);

      // Then: User receives JWT token
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);
    });

    it('should return error when given invalid password (AC-US1-02)', async () => {
      // Given: User with invalid password
      const email = 'user@example.com';
      const validPassword = 'ValidPassword123!';
      const invalidPassword = 'WrongPassword';
      await createTestUser(email, validPassword);

      // When: User attempts to log in with wrong password
      const result = await authService.login(email, invalidPassword);

      // Then: System returns error
      expect(result.error).toBe('Invalid credentials');
      expect(result.user).toBeUndefined();
    });

    it('should lock account after 5 failed attempts (AC-US1-03)', async () => {
      // Given: User with 5 failed login attempts
      const email = 'user@example.com';
      const password = 'ValidPassword123!';
      await createTestUser(email, password);

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.login(email, 'WrongPassword');
      }

      // When: User attempts to log in again
      const result = await authService.login(email, password);

      // Then: Account is locked
      expect(result.error).toBe('Account locked. Try again in 15 minutes');
      expect(result.lockedUntil).toBeGreaterThan(Date.now());
    });
  });
});
```

## BDD vs TDD

**Comparison**:

| Aspect | BDD | TDD |
|--------|-----|-----|
| **Focus** | Business behavior | Technical correctness |
| **Language** | Plain English (Given/When/Then) | Code (assertions) |
| **Audience** | Technical + non-technical | Developers only |
| **Scenarios** | User-facing behaviors | Unit logic |
| **Format** | Given/When/Then | Arrange/Act/Assert |

**When to Use**:
- **BDD**: Integration tests, E2E tests, user-facing features
- **TDD**: Unit tests, pure functions, algorithms

**Can Use Both**: BDD scenarios at high level, TDD for implementation

## Real-World Example

**Feature**: Password Reset

**BDD Scenarios**:

```markdown
### Scenario 1: Request Password Reset
Given: User with registered email
When: User requests password reset
Then: System sends reset email with valid link

### Scenario 2: Reset Link Expiration
Given: User with expired reset link (>1 hour old)
When: User clicks reset link
Then: System shows error "Reset link expired" and offers to resend

### Scenario 3: Successful Password Reset
Given: User with valid reset link
When: User submits new password meeting requirements
Then: Password is updated and user can log in with new password

### Scenario 4: Reset Link Single-Use
Given: User with already-used reset link
When: User clicks reset link again
Then: System shows error "Reset link already used"
```

**Test Implementation**:

```typescript
describe('Password Reset Flow', () => {
  it('should send reset email when user requests password reset', async () => {
    // Given: User with registered email
    const email = 'user@example.com';
    await createTestUser(email, 'OldPassword123!');

    // When: User requests password reset
    const result = await authService.requestPasswordReset(email);

    // Then: System sends reset email with valid link
    expect(result.success).toBe(true);
    expect(result.message).toBe('Reset email sent');

    const sentEmails = await getTestEmails(email);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toContain('Password Reset');
    expect(sentEmails[0].body).toMatch(/reset\/[a-f0-9]{32}/);
  });

  it('should reject expired reset link (>1 hour old)', async () => {
    // Given: User with expired reset link
    const token = await createPasswordResetToken(userId, {
      expiresAt: Date.now() - 3600000 // 1 hour ago
    });

    // When: User clicks reset link
    const result = await authService.validateResetToken(token);

    // Then: System shows error
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Reset link expired');
  });

  it('should update password when user submits valid new password', async () => {
    // Given: User with valid reset link
    const token = await createPasswordResetToken(userId);
    const newPassword = 'NewPassword123!';

    // When: User submits new password
    const result = await authService.resetPassword(token, newPassword);

    // Then: Password is updated
    expect(result.success).toBe(true);

    // And: User can log in with new password
    const loginResult = await authService.login(email, newPassword);
    expect(loginResult.accessToken).toBeDefined();
  });

  it('should reject already-used reset link', async () => {
    // Given: User with already-used reset link
    const token = await createPasswordResetToken(userId);
    await authService.resetPassword(token, 'NewPassword123!'); // Use it once

    // When: User clicks reset link again
    const result = await authService.validateResetToken(token);

    // Then: System shows error
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Reset link already used');
  });
});
```

## Best Practices

### 1. **Use Clear, Specific Language**
```markdown
✅ CORRECT:
Given: User with valid email "user@example.com" and password "Pass123!"
When: User submits login form
Then: User receives JWT token with 15min expiration

❌ WRONG:
Given: User exists
When: Login happens
Then: It works
```

### 2. **One Behavior Per Scenario**
```markdown
✅ CORRECT:
Scenario 1: Valid login succeeds
Scenario 2: Invalid password fails
Scenario 3: Account locks after 5 attempts

❌ WRONG:
Scenario 1: Login works, password reset works, and 2FA works
```

### 3. **Make Scenarios Independent**
```markdown
✅ CORRECT:
Each scenario sets up its own test data (Given clause)

❌ WRONG:
Scenario 2 depends on data from Scenario 1
```

### 4. **Link to AC-IDs**
```markdown
✅ CORRECT:
Test Plan (BDD):
- Given valid credentials → When login → Then JWT token (AC-US1-01)

Test File:
it('should return JWT when given valid credentials (AC-US1-01)', ...)
```

## BDD Tools

**JavaScript/TypeScript**:
- **Jest**: Test runner with BDD-style assertions (`expect().toBe()`)
- **Cucumber**: Natural language test scenarios (Gherkin syntax)
- **Playwright**: E2E testing with BDD-style API

**Example (Cucumber Gherkin)**:
```gherkin
Feature: User Authentication

  Scenario: Successful login with valid credentials
    Given a user with email "user@example.com" and password "Pass123!"
    When the user submits the login form
    Then the user should receive a JWT token
    And the user should be redirected to the dashboard

  Scenario: Failed login with invalid password
    Given a user with email "user@example.com" and incorrect password
    When the user submits the login form
    Then the user should see error "Invalid credentials"
    And the user should not be logged in
```

## Related Terms

- [TDD](./tdd.md) - Test-Driven Development
- [AC-ID](./ac-id.md) - Acceptance Criteria ID
- [Tasks.md](./tasks-md.md) - Task file with embedded test plans
- [User Story](./user-story.md) - User-facing requirement

## Learn More

- [Test-Aware Planning](/docs/workflows/planning#test-aware-planning)
- [Writing BDD Tests](/docs/guides/testing/bdd-testing)
- [Cucumber Documentation](https://cucumber.io/docs/guides/overview/)
