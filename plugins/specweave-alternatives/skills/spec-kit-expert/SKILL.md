---
name: spec-kit-expert
description: Specification Kit expert covering RFC 2119 keywords, Gherkin syntax, user story formats, acceptance criteria patterns, and specification best practices. Activates for spec writing, specification format, RFC 2119, Gherkin, BDD, user stories, acceptance criteria, requirements, INVEST criteria, given-when-then, spec-driven development, specification templates.
---

# Specification Kit Expert Skill

Expert in specification formats, patterns, and best practices for writing clear, testable, and comprehensive requirements documentation.

## Core Competencies

### 1. RFC 2119 Keywords
**Standard requirement levels** for precise specification language:

- **MUST / SHALL**: Absolute requirement (mandatory)
- **MUST NOT / SHALL NOT**: Absolute prohibition
- **SHOULD**: Recommended (flexibility allowed)
- **SHOULD NOT**: Not recommended (discouraged but not prohibited)
- **MAY / OPTIONAL**: Truly optional feature

**Usage example**:
```markdown
The system MUST validate email format before saving.
The API SHOULD return results within 200ms.
The cache MAY expire after 1 hour.
The system MUST NOT store passwords in plain text.
```

### 2. Gherkin Syntax (BDD)
**Behavior-Driven Development** format for executable specifications:

```gherkin
Feature: User Authentication
  As a registered user
  I want to log in to my account
  So that I can access personalized features

  Background:
    Given the user database is initialized
    And the user "john@example.com" exists with password "SecurePass123"

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "john@example.com"
    And I enter password "SecurePass123"
    And I click the "Login" button
    Then I should be redirected to the dashboard
    And I should see "Welcome, John"

  Scenario: Failed login with invalid password
    Given I am on the login page
    When I enter email "john@example.com"
    And I enter password "WrongPassword"
    And I click the "Login" button
    Then I should see error message "Invalid credentials"
    And I should remain on the login page

  Scenario Outline: Password validation rules
    Given I am on the registration page
    When I enter password "<password>"
    Then the validation message should be "<message>"

    Examples:
      | password    | message                              |
      | abc         | Password must be at least 8 characters |
      | password    | Password must contain numbers         |
      | Pass123     | Password must contain special chars   |
      | Pass123!    | Password accepted                     |
```

### 3. User Story Formats

#### Standard User Story (Role-Feature-Benefit)
```markdown
**As a** [type of user/role]
**I want** [goal/desire]
**So that** [benefit/value]

Example:
As a shopping cart user
I want to save items for later
So that I can purchase them when I'm ready without searching again
```

#### Job Story Format (Context-Event-Outcome)
```markdown
**When** [situation/context]
**I want to** [motivation/job to be done]
**So I can** [expected outcome]

Example:
When I'm browsing products but not ready to buy
I want to save items to a wishlist
So I can easily find them later when I have budget
```

#### Feature-Driven Format
```markdown
**In order to** [business value]
**As a** [role]
**I want** [feature]

Example:
In order to increase user retention
As a product manager
I want users to receive personalized recommendations
```

### 4. Acceptance Criteria Patterns

#### Given-When-Then Format
```markdown
## Acceptance Criteria

**AC-001**: User login with valid credentials
- **Given** the user has a registered account
- **When** they enter correct email and password
- **Then** they are logged in and redirected to dashboard

**AC-002**: User login with invalid credentials
- **Given** the user enters incorrect password
- **When** they submit the login form
- **Then** an error message "Invalid credentials" is displayed
- **And** the login form remains visible
```

#### Checklist Format
```markdown
## Acceptance Criteria

**AC-001**: User can complete checkout
- [ ] User can review cart before payment
- [ ] User can select shipping address
- [ ] User can choose payment method
- [ ] User receives order confirmation email
- [ ] Order appears in user's order history

**AC-002**: Error handling
- [ ] System validates card number format
- [ ] System shows error for expired cards
- [ ] User can retry payment without losing cart
```

#### Rule-Oriented Format (SBVR - Semantics of Business Vocabulary)
```markdown
## Business Rules

**BR-001**: Password complexity requirements
- It is MANDATORY that passwords contain at least 8 characters
- It is MANDATORY that passwords contain at least one uppercase letter
- It is MANDATORY that passwords contain at least one number
- It is MANDATORY that passwords contain at least one special character
- It is PROHIBITED that passwords match the user's email

**BR-002**: Discount eligibility
- It is POSSIBLE that users with loyalty status "Gold" receive 10% discount
- It is POSSIBLE that users with loyalty status "Platinum" receive 20% discount
- It is PROHIBITED that discounts stack beyond 25% total
```

### 5. INVEST Criteria for User Stories

**I - Independent**: Can be developed and tested independently
**N - Negotiable**: Details can be refined through conversation
**V - Valuable**: Delivers clear value to users or business
**E - Estimable**: Team can estimate effort required
**S - Small**: Completable within one sprint/iteration
**T - Testable**: Clear acceptance criteria for validation

**Example - Poor User Story**:
```
As a user, I want the system to be fast
❌ Not testable (what is "fast"?)
❌ Too broad (not small)
❌ Not estimable (unclear scope)
```

**Example - INVEST-Compliant User Story**:
```
As a search user
I want search results to load within 1 second for queries under 10 characters
So that I can quickly find products without frustration

Acceptance Criteria:
- Search returns results in < 1 second for 95% of queries
- Timeout message shown after 3 seconds if no results
- Analytics track search performance metrics

✅ Independent: Doesn't depend on other stories
✅ Negotiable: Performance target can be refined
✅ Valuable: Improves user experience
✅ Estimable: Team can estimate backend + frontend work
✅ Small: Can complete in one sprint
✅ Testable: Clear performance metrics
```

### 6. Specification Templates

#### Feature Specification Template
```markdown
# Feature: [Feature Name]

## Overview
Brief description of the feature and its purpose.

## User Stories

### US-001: [Story Title]
**As a** [role]
**I want** [goal]
**So that** [benefit]

**Priority**: High/Medium/Low
**Estimated Effort**: [story points or time]

## Acceptance Criteria

### AC-US1-01: [Criterion Title]
- **Given** [context]
- **When** [action]
- **Then** [expected outcome]

### AC-US1-02: [Criterion Title]
- **Given** [context]
- **When** [action]
- **Then** [expected outcome]

## Technical Considerations
- Database changes required
- API endpoints needed
- Third-party integrations
- Security requirements
- Performance requirements

## Non-Functional Requirements
- Performance: Response time < 200ms
- Security: Data encrypted at rest and in transit
- Accessibility: WCAG 2.1 AA compliance
- Scalability: Support 10,000 concurrent users

## Dependencies
- [Other features or systems required]

## Risks & Mitigations
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API downtime | Medium | High | Implement retry logic + cache |

## Test Scenarios
1. Happy path: User completes flow successfully
2. Error path: Invalid input validation
3. Edge cases: Boundary conditions
4. Performance: Load testing under peak traffic

## Success Metrics
- User adoption: 40% of users enable feature within 30 days
- Performance: P95 response time < 300ms
- Error rate: < 0.5% of requests fail
```

#### API Specification Template (OpenAPI-style)
```markdown
# API Specification: [Endpoint Name]

## Endpoint
`POST /api/v1/users`

## Description
Creates a new user account with email verification.

## Request

### Headers
- `Content-Type: application/json` (REQUIRED)
- `Authorization: Bearer <token>` (OPTIONAL - for admin creation)

### Body
```json
{
  "email": "user@example.com",      // REQUIRED, valid email format
  "password": "SecurePass123!",     // REQUIRED, min 8 chars, RFC 2119 MUST
  "name": "John Doe",               // REQUIRED, 1-100 characters
  "age": 25,                         // OPTIONAL, integer >= 18
  "preferences": {                   // OPTIONAL
    "newsletter": true,
    "notifications": false
  }
}
```

### Validation Rules
- Email MUST be unique in the system
- Password MUST meet complexity requirements (see BR-001)
- Name MUST NOT contain special characters
- Age SHOULD be >= 18 for most features

## Response

### Success (201 Created)
```json
{
  "id": "uuid-v4",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "verification_email_sent": true
}
```

### Error (400 Bad Request)
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Email already exists",
  "field": "email"
}
```

### Error (422 Unprocessable Entity)
```json
{
  "error": "INVALID_PASSWORD",
  "message": "Password must contain at least one special character",
  "field": "password"
}
```

## Business Rules
- **BR-001**: Email verification MUST be sent within 5 minutes
- **BR-002**: Unverified accounts SHOULD be deleted after 7 days
- **BR-003**: Password reset MUST use secure tokens (expiry: 1 hour)

## Rate Limiting
- 5 requests per minute per IP address
- 429 Too Many Requests response after limit exceeded

## Security
- Passwords MUST be hashed using bcrypt (cost factor 12)
- Email MUST be normalized (lowercase, trimmed)
- Verification tokens MUST expire after 24 hours
```

## Best Practices

### 1. Clear and Concise Language
❌ **Bad**: "The system should probably validate stuff"
✅ **Good**: "The system MUST validate email format before saving (RFC 5322 compliance)"

### 2. Measurable Criteria
❌ **Bad**: "The page should load quickly"
✅ **Good**: "Page MUST load within 2 seconds for 95% of requests (P95 latency < 2s)"

### 3. Specific Edge Cases
❌ **Bad**: "Handle errors gracefully"
✅ **Good**:
```markdown
Error Handling:
- Network timeout (>5s): Show retry button
- 401 Unauthorized: Redirect to login
- 500 Server Error: Show generic error + log ID
- Rate limited (429): Show "Too many requests, try again in 60s"
```

### 4. Use Examples
```markdown
**Input Validation**: Email MUST match RFC 5322 format

Examples:
✅ Valid: user@example.com, john.doe+tag@company.co.uk
❌ Invalid: user@, @example.com, user @example.com (space)
```

### 5. Define "Done"
```markdown
## Definition of Done

This story is complete when:
- [ ] Code implemented and reviewed
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] Manual QA completed
- [ ] Acceptance criteria validated by PO
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Performance benchmarks met
```

## Anti-Patterns to Avoid

### 1. Vague Requirements
❌ "The system should be secure"
✅ "Authentication MUST use OAuth 2.0 with PKCE. Passwords MUST be hashed with bcrypt (cost 12). Sessions MUST expire after 30 minutes of inactivity."

### 2. Implementation Details in Specs
❌ "Use React hooks to fetch data and store in Redux"
✅ "When user loads dashboard, display their recent orders (limit: 10)"

### 3. No Acceptance Criteria
❌ "Improve search performance"
✅ "Search results MUST load in <500ms for 95% of queries (P95). Benchmark: current P95 is 2.3s."

### 4. Overlapping Stories
Ensure stories are **Independent** (INVEST):
- ❌ "US-001: Build login form" + "US-002: Add submit button to login"
- ✅ "US-001: User can log in with email/password"

### 5. Technical Jargon Without Context
❌ "Implement CQRS with eventual consistency"
✅ "Commands (writes) and queries (reads) use separate models. Read models are updated asynchronously (< 100ms delay)."

## Gherkin Advanced Patterns

### Data Tables
```gherkin
Scenario: Bulk user import
  Given the following users exist:
    | email              | role  | status   |
    | admin@example.com  | admin | active   |
    | user@example.com   | user  | active   |
    | guest@example.com  | guest | inactive |
  When I export users to CSV
  Then the CSV should contain 3 rows
```

### Scenario Hooks (Background)
```gherkin
Feature: Shopping Cart

  Background:
    Given I am logged in as "john@example.com"
    And my cart contains 2 items

  Scenario: Remove item from cart
    When I remove "Product A" from cart
    Then my cart should contain 1 item

  Scenario: Apply discount code
    When I enter discount code "SAVE10"
    Then the total should be reduced by 10%
```

### Tagged Scenarios
```gherkin
@critical @smoke
Scenario: User login

@slow @integration
Scenario: Generate monthly report

@wip @experimental
Scenario: AI-powered recommendations
```

## Specification Review Checklist

Before finalizing a specification, verify:

- [ ] **Clarity**: Can a developer implement without questions?
- [ ] **Testability**: Can QA write test cases from this?
- [ ] **Completeness**: All edge cases covered?
- [ ] **Consistency**: Terminology used consistently?
- [ ] **RFC 2119**: MUST/SHOULD/MAY used correctly?
- [ ] **INVEST**: User stories are Independent, Negotiable, Valuable, Estimable, Small, Testable?
- [ ] **Examples**: Concrete examples provided for complex logic?
- [ ] **Non-functionals**: Performance, security, accessibility specified?
- [ ] **Dependencies**: External systems and APIs documented?
- [ ] **Risks**: Potential issues identified with mitigations?

## Resources

- RFC 2119: [Key words for requirement levels](https://www.ietf.org/rfc/rfc2119.txt)
- Gherkin Reference: [Cucumber Documentation](https://cucumber.io/docs/gherkin/reference/)
- INVEST Criteria: [Bill Wake's original article](https://xp123.com/articles/invest-in-good-stories-and-smart-tasks/)
- OpenAPI Specification: [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0)

## Activation Keywords

Ask me about:
- "How do I write good acceptance criteria?"
- "RFC 2119 keywords for specifications"
- "Gherkin syntax examples"
- "User story format and INVEST criteria"
- "BDD specification patterns"
- "How to write testable requirements"
- "Specification templates for features"
- "Given-When-Then examples"
- "Best practices for spec writing"
