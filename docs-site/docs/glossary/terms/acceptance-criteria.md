---
sidebar_position: 9
---

# Acceptance Criteria

**Category**: Planning & Requirements

## Definition

**Acceptance Criteria** (AC) are specific, testable conditions that a user story must satisfy to be considered complete. They define the boundaries of a user story and are used to confirm when work is done.

**Format**: Written as bullet points under each user story, each with a unique [AC-ID](./ac-id.md) for traceability.

## What Problem Does It Solve?

**The "Definition of Done" Problem**:
- ❌ Vague requirements ("make it user-friendly")
- ❌ Scope creep (team members have different interpretations)
- ❌ No clear testing criteria (how do we know it's done?)
- ❌ Disputes about completeness ("I thought it should...")

**Acceptance Criteria Solution**:
- ✅ Specific, testable conditions (no ambiguity)
- ✅ Shared understanding (everyone agrees on what "done" means)
- ✅ Clear test cases (criteria → tests directly)
- ✅ Prevents scope creep (anything not in AC is out of scope)

## Structure

**Standard Format**:
```markdown
## US-\{number\}: User Story Title
**Priority**: P1 | P2 | P3 | P4

**Acceptance Criteria**:
- [ ] **AC-US\{story\}-\{number\}**: Description (Priority, testable)
- [ ] **AC-US\{story\}-\{number\}**: Description (Priority, testable)
```

**Example**:
```markdown
## US-001: Basic Login Flow
**Priority**: P1 (Critical)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in with valid email/password (P1, testable)
- [ ] **AC-US1-02**: Invalid credentials show error "Invalid email or password" (P1, testable)
- [ ] **AC-US1-03**: 5 failed login attempts lock account for 15 minutes (P2, testable)
- [ ] **AC-US1-04**: Password field is masked (P1, testable)
- [ ] **AC-US1-05**: "Remember Me" checkbox persists session for 30 days (P2, testable)
```

## Priority Levels

**Priority indicates importance and testing rigor**:

| Priority | Meaning | Test Coverage |
|----------|---------|---------------|
| **P1** (Critical) | Must have, blocks release | 100% coverage required |
| **P2** (High) | Should have, high impact | 90% coverage recommended |
| **P3** (Medium) | Nice to have, low impact | 80% coverage recommended |
| **P4** (Low) | Can defer to later | Best effort |

**Example**:
```markdown
- **AC-US1-01**: Login with valid credentials (P1, testable)  ← MUST have 100% test coverage
- **AC-US1-03**: Rate limiting after 5 attempts (P2, testable) ← Should have 90% coverage
- **AC-US1-06**: Animated loading spinner (P4, testable)       ← Best effort
```

## Testability Marker

**Every AC must be marked "testable" or "manual"**:

```markdown
✅ CORRECT:
- **AC-US1-01**: User can log in with email/password (P1, testable)
- **AC-US1-02**: UI matches Figma mockup (P2, manual)

❌ WRONG:
- **AC-US1-01**: User can log in (no testability marker)
```

**Why**:
- `testable` → Automated tests required (unit, integration, E2E)
- `manual` → Manual verification (visual checks, UX review, compliance)

## INVEST Criteria

**Good acceptance criteria follow INVEST principles**:

- **Independent**: Can be implemented in any order
- **Negotiable**: Open to discussion during refinement
- **Valuable**: Delivers value to user
- **Estimable**: Team can estimate effort
- **Small**: Fits in one task/sprint
- **Testable**: Can be verified objectively

**Example**:
```markdown
✅ GOOD AC (INVEST):
- **AC-US1-01**: User receives JWT token with 24-hour expiry (P1, testable)
  → Specific, measurable, testable

❌ BAD AC (violates INVEST):
- **AC-US1-01**: Login should be secure (P1, testable)
  → Too vague, not measurable
```

## Real-World Example

**Feature**: User Authentication System

**spec.md**:
```markdown
# Increment 0008: User Authentication

## US-001: Basic Login Flow
**Priority**: P1 (Critical)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in with valid email/password combination (P1, testable)
- [ ] **AC-US1-02**: Invalid credentials show error message "Invalid email or password" (P1, testable)
- [ ] **AC-US1-03**: Password field is masked with asterisks (P1, testable)
- [ ] **AC-US1-04**: 5 consecutive failed attempts lock account for 15 minutes (P2, testable)
- [ ] **AC-US1-05**: "Remember Me" checkbox keeps user logged in for 30 days (P2, testable)
- [ ] **AC-US1-06**: Login button shows loading spinner while authenticating (P3, testable)

## US-002: Password Reset
**Priority**: P2 (High)

**Acceptance Criteria**:
- [ ] **AC-US2-01**: User can request password reset email (P1, testable)
- [ ] **AC-US2-02**: Reset link expires after 1 hour (P1, testable)
- [ ] **AC-US2-03**: Reset link can only be used once (P2, testable)
- [ ] **AC-US2-04**: Email contains clear instructions (P2, manual)
```

**tasks.md** (links to AC-IDs):
```markdown
## T-001: Implement Authentication Service
**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04, AC-US1-05

**Test Plan**:
- **Given** valid email/password → **When** login → **Then** JWT token returned (AC-US1-01)
- **Given** invalid password → **When** login → **Then** error shown (AC-US1-02)
- **Given** 5 failed attempts → **When** 6th login → **Then** account locked (AC-US1-04)

**Test Cases**:
- Unit: validLogin, invalidPassword, accountLocking, rememberMe
- Integration: loginEndpoint, lockedAccountPersists
- Overall: 87% coverage
```

## AC-ID Traceability

**Every AC gets a unique ID** ([AC-ID](./ac-id.md)) for traceability:

```
spec.md (AC-US1-01) →
tasks.md (T-001: AC-US1-01) →
test plan (Given/When/Then) →
test file (auth.test.ts:15) →
implementation (AuthService.ts)
```

**Validation**:
```bash
/specweave:check-tests 0008

# Output:
✅ AC-ID Coverage:
   AC-US1-01: ✅ Covered (auth.test.ts:15)
   AC-US1-02: ✅ Covered (auth.test.ts:25)
   AC-US1-03: ✅ Covered (auth.test.ts:35)
   AC-US2-01: ⚠️  Missing test coverage

📊 Summary: 3/4 AC-IDs covered (75%)
```

## Best Practices

### 1. **Use Active Voice**
```markdown
✅ CORRECT: User can log in with email/password
❌ WRONG: Login is possible using email/password
```

### 2. **Be Specific**
```markdown
✅ CORRECT: Error message "Invalid email or password" shown
❌ WRONG: Error message shown
```

### 3. **Include Measurable Values**
```markdown
✅ CORRECT: Account locked for 15 minutes after 5 failed attempts
❌ WRONG: Account locked after multiple failed attempts
```

### 4. **One Concern Per AC**
```markdown
✅ CORRECT:
- AC-US1-01: User can log in (authentication)
- AC-US1-02: Invalid credentials show error (validation)

❌ WRONG:
- AC-US1-01: User can log in and invalid credentials show error (two concerns)
```

### 5. **Avoid Implementation Details**
```markdown
✅ CORRECT: User receives session token (what)
❌ WRONG: User receives JWT token signed with RS256 (how)
```

## Gherkin Format (Optional)

**Alternative format** using Given/When/Then:

```gherkin
Feature: User Login

Scenario: Successful login with valid credentials (AC-US1-01)
  Given user has valid email "user@example.com" and password "Pass123!"
  When user submits login form
  Then user receives JWT token
  And user is redirected to dashboard

Scenario: Failed login with invalid password (AC-US1-02)
  Given user has email "user@example.com" and wrong password "wrong"
  When user submits login form
  Then error message "Invalid email or password" is shown
  And user remains on login page
```

## Common Mistakes

### ❌ Mistake 1: Too Vague
```markdown
❌ BAD: Login should work well
✅ GOOD: User can log in with valid email/password in < 2 seconds (P1, testable)
```

### ❌ Mistake 2: Implementation Details
```markdown
❌ BAD: System stores password hash using bcrypt with cost factor 12
✅ GOOD: User password is stored securely (P1, testable)
```

### ❌ Mistake 3: Multiple Concerns
```markdown
❌ BAD: User can log in, reset password, and update profile
✅ GOOD: Split into 3 separate ACs (one per concern)
```

### ❌ Mistake 4: Not Testable
```markdown
❌ BAD: Login page should look good (subjective, not testable)
✅ GOOD: Login page matches Figma design mockup v2.3 (P2, manual)
```

## Acceptance Criteria Checklist

**Before marking AC complete, verify**:
- [ ] Specific and measurable (no ambiguity)
- [ ] Testable (can be verified objectively)
- [ ] Prioritized (P1, P2, P3, P4)
- [ ] Unique AC-ID assigned (AC-US\{story\}-\{number\})
- [ ] Test written (if marked "testable")
- [ ] Test passing (green in CI/CD)
- [ ] Stakeholder acceptance (if P1/P2)

## Related Terms

- [AC-ID](./ac-id.md) - Acceptance Criteria ID for traceability
- [User Story](./user-story.md) - User-facing requirement
- [Spec](./spec.md) - Specification document
- [Tasks.md](./tasks-md.md) - Task file with embedded tests
- [BDD](./bdd.md) - Behavior-Driven Development (Given/When/Then)

## Learn More

- [Writing Good Acceptance Criteria](https://www.agilealliance.org/glossary/acceptance-criteria/) - Agile Alliance guide
- [Test-Aware Planning](/docs/workflows/planning#test-aware-planning) - How ACs become tests
- [Traceability Guide](/docs/guides/core-concepts/traceability) - AC-ID traceability flow

---

**Category**: Planning & Requirements

**Tags**: #acceptance-criteria #requirements #specification #planning #user-stories
