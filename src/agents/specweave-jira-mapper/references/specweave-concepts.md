# SpecWeave Concepts Reference

## Core Structure

SpecWeave organizes work into **Increments** with supporting documentation.

```
.specweave/increments/0001-feature-name/
├── spec.md                     # WHAT and WHY (specification)
├── plan.md                     # HOW (implementation plan)
├── tasks.md                    # Executable checklist
├── tests.md                    # Test strategy and coverage
├── context-manifest.yaml       # Context loading
└── logs/                       # Execution logs
```

---

## Increment

**Definition**: A discrete product feature or enhancement with complete specification.

**Characteristics**:
- Auto-numbered (0001, 0002, 0003...)
- Self-contained (all files in one folder)
- Specification-first (spec.md defines WHAT/WHY)
- Test-validated (tests.md ensures quality)
- Context-aware (context-manifest.yaml loads relevant docs)

**Example**:
```
.specweave/increments/0001-user-authentication/
├── spec.md                     # User authentication specification
├── plan.md                     # Implementation approach
├── tasks.md                    # Task checklist
├── tests.md                    # Test strategy
└── context-manifest.yaml       # Context to load
```

---

## spec.md (Specification)

**Purpose**: Define WHAT the feature does and WHY it's needed (business perspective).

**Format**:
```yaml
---
increment_id: "0001"
title: "User Authentication"
description: "Implement user login, registration, and session management"
status: "planned"
priority: "P1"
created_at: "2025-10-20T10:00:00Z"
---

# User Authentication

## Overview

This increment implements user authentication with email/password and OAuth.

## User Stories

### US1-001: User can log in with email and password

**As a** registered user
**I want to** log in with email and password
**So that** I can access my account

**Acceptance Criteria**:
- [ ] TC-0001: Valid credentials redirect to dashboard
- [ ] TC-0002: Invalid password shows error "Invalid password"
- [ ] TC-0003: Email not found shows error "Email not found"

---

### US1-002: User can register a new account

**As a** new user
**I want to** register with email and password
**So that** I can create an account

**Acceptance Criteria**:
- [ ] TC-0004: Registration form validates email format
- [ ] TC-0005: Password must be at least 8 characters
- [ ] TC-0006: Duplicate email shows error "Email already exists"
```

**Key Sections**:
- **Frontmatter** - Metadata (YAML)
- **Overview** - High-level summary
- **User Stories** - Business requirements (US1-001 format)
- **Acceptance Criteria** - Testable conditions (TC-0001 format)

---

## User Stories

**Format**: `US{increment}-{number}` (e.g., US1-001, US1-002)

**Structure**:
```markdown
### US1-001: User can log in

**As a** {role}
**I want to** {goal}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] TC-0001: {testable condition}
- [ ] TC-0002: {testable condition}
```

**Guidelines**:
- Technology-agnostic (business language, not technical)
- Testable (each criterion is verifiable)
- Valuable (delivers user benefit)
- Independent (can be implemented separately)

---

## Acceptance Criteria (Test Cases)

**Format**: `TC-{number}` (e.g., TC-0001, TC-0002)

**Purpose**: Define testable conditions that MUST be true for feature to be complete.

**Example**:
```markdown
- [ ] TC-0001: Valid credentials redirect to dashboard
- [ ] TC-0002: Invalid password shows error message "Invalid password"
- [ ] TC-0003: Empty email field shows validation error "Email required"
```

**Guidelines**:
- Specific (no ambiguity)
- Testable (can be automated)
- Technology-agnostic (business perspective)
- Checkboxes for tracking

---

## tasks.md (Task Checklist)

**Purpose**: Executable checklist of implementation tasks.

**Format**:
```markdown
# Tasks: User Authentication

## User Story: US1-001 - User Login

- [ ] Create login API endpoint (POST /api/auth/login)
- [ ] Implement password validation with bcrypt
- [ ] Create JWT token generation
- [ ] Add session management
- [ ] Create login UI form
- [ ] Add form validation
- [ ] Write E2E tests for login flow

## User Story: US1-002 - User Registration

- [ ] Create registration API endpoint (POST /api/auth/register)
- [ ] Implement email uniqueness check
- [ ] Hash passwords with bcrypt
- [ ] Send welcome email
- [ ] Create registration UI form
- [ ] Write E2E tests for registration flow
```

**Guidelines**:
- Grouped by user story
- Implementation-level (technical tasks)
- Checkboxes for progress tracking
- Can reference JIRA Subtasks (if synced)

---

## tests.md (Test Strategy)

**Purpose**: Define HOW to validate feature meets acceptance criteria.

**Format**:
```markdown
# Test Strategy: User Authentication

## Test Coverage Matrix

| TC ID | Acceptance Criteria | Test Type | Location | Priority |
|-------|---------------------|-----------|----------|----------|
| TC-0001 | Valid login flow | E2E | tests/e2e/login.spec.ts | P1 |
| TC-0002 | Invalid password | E2E | tests/e2e/login.spec.ts | P1 |
| TC-0003 | Email not found | E2E | tests/e2e/login.spec.ts | P1 |

## Test Details

### TC-0001: Valid Login Flow
- **Type**: E2E (Playwright)
- **Given**: User has registered account
- **When**: User enters valid credentials
- **Then**: Redirect to dashboard with session token
```

**Key Sections**:
- **Coverage Matrix** - Maps TC-0001 to test implementations
- **Test Details** - Given/When/Then scenarios
- **Test Types** - E2E, Unit, Integration

---

## context-manifest.yaml (Context Loading)

**Purpose**: Define what specifications/docs to load for this increment.

**Format**:
```yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/auth/authentication-spec.md
  - .specweave/docs/internal/strategy/auth/session-management.md

documentation:
  - .specweave/docs/internal/architecture/auth-system.md
  - .specweave/docs/internal/architecture/adr/0003-jwt-tokens.md

max_context_tokens: 10000
priority: high
auto_refresh: false
---
```

**Benefits**:
- Precision loading (70%+ token reduction)
- Load only relevant context
- Scalable to enterprise (500+ page specs)

---

## Status Values

| Status | Meaning | JIRA Equivalent |
|--------|---------|-----------------|
| **planned** | Not started | To Do |
| **in-progress** | Active work | In Progress |
| **completed** | Finished | Done |

---

## Priority Values

| Priority | Meaning | JIRA Equivalent |
|----------|---------|-----------------|
| **P1** | Critical, must complete | Highest |
| **P2** | Important, not blocking | High |
| **P3** | Nice to have | Medium |

---

## Increment Lifecycle

1. **Create**: `/create-increment "feature name"`
   - Auto-numbers increment
   - Creates folder structure
   - Generates spec.md, tasks.md, context-manifest.yaml

2. **Plan**: Architect and PM agents create plan.md

3. **Implement**: Developers follow tasks.md checklist

4. **Test**: QA validates against tests.md

5. **Complete**: All tasks checked, tests pass

6. **Sync**: Bidirectional sync with JIRA (if configured)

---

## Best Practices

1. **Specification before implementation** - Define WHAT/WHY before HOW
2. **Technology-agnostic specs** - Business language, not tech details
3. **Testable acceptance criteria** - Every TC-0001 must be verifiable
4. **Context manifests** - Load only relevant docs (avoid context bloat)
5. **Living documentation** - Update specs when implementation changes
6. **Traceability** - Link to JIRA (if synced)

---

## Related Documentation

- [JIRA Concepts](./jira-concepts.md) - JIRA structure
- [Mapping Examples](./mapping-examples.md) - Real-world conversions
- [CLAUDE.md](../../../../CLAUDE.md) - Complete SpecWeave guide
