# JIRA ↔ SpecWeave Mapping Examples

## Example 1: Simple Export (Increment → JIRA Epic)

### Source: SpecWeave Increment

**File**: `.specweave/increments/0001-user-authentication/spec.md`

```yaml
---
increment_id: "0001"
title: "User Authentication"
description: "Implement user login and registration"
status: "planned"
priority: "P1"
created_at: "2025-10-20T10:00:00Z"
---

# User Authentication

## User Stories

### US1-001: User can log in

**As a** registered user
**I want to** log in with email and password
**So that** I can access my account

**Acceptance Criteria**:
- [ ] TC-0001: Valid credentials redirect to dashboard
- [ ] TC-0002: Invalid password shows error

### US1-002: User can register

**As a** new user
**I want to** register with email
**So that** I can create an account

**Acceptance Criteria**:
- [ ] TC-0003: Registration form validates email
- [ ] TC-0004: Duplicate email shows error
```

**File**: `.specweave/increments/0001-user-authentication/tasks.md`

```markdown
# Tasks: User Authentication

## User Story: US1-001

- [ ] Create login API endpoint
- [ ] Implement password validation
- [ ] Create login UI

## User Story: US1-002

- [ ] Create registration API endpoint
- [ ] Implement email uniqueness check
- [ ] Create registration UI
```

---

### Result: JIRA Epic + Stories + Subtasks

**JIRA Epic**: `AUTH-001`

```
Title: [Increment 0001] User Authentication
Description:
  Implement user login and registration

  Specification: https://github.com/user/repo/blob/main/.specweave/increments/0001-user-authentication/spec.md

Labels: specweave, priority:P1, status:planned
Custom Fields:
  - SpecWeave Increment ID: 0001-user-authentication
  - Spec URL: https://github.com/.../spec.md
Priority: Highest
Status: To Do
```

**JIRA Story 1**: `AUTH-002`

```
Title: User can log in
Description:
  **As a** registered user
  **I want to** log in with email and password
  **So that** I can access my account

  **Acceptance Criteria**:
  - [ ] TC-0001: Valid credentials redirect to dashboard
  - [ ] TC-0002: Invalid password shows error

Epic Link: AUTH-001
Labels: specweave, user-story, increment-0001
Custom Fields:
  - User Story ID: US1-001
  - Test Case IDs: TC-0001, TC-0002
```

**JIRA Subtasks** (linked to `AUTH-002`):
- `AUTH-003`: Create login API endpoint
- `AUTH-004`: Implement password validation
- `AUTH-005`: Create login UI

**JIRA Story 2**: `AUTH-006`

```
Title: User can register
Description:
  **As a** new user
  **I want to** register with email
  **So that** I can create an account

  **Acceptance Criteria**:
  - [ ] TC-0003: Registration form validates email
  - [ ] TC-0004: Duplicate email shows error

Epic Link: AUTH-001
Labels: specweave, user-story, increment-0001
Custom Fields:
  - User Story ID: US1-002
  - Test Case IDs: TC-0003, TC-0004
```

**JIRA Subtasks** (linked to `AUTH-006`):
- `AUTH-007`: Create registration API endpoint
- `AUTH-008`: Implement email uniqueness check
- `AUTH-009`: Create registration UI

---

## Example 2: Simple Import (JIRA Epic → Increment)

### Source: JIRA Epic

**JIRA Epic**: `PROJ-100`

```
Title: Payment Integration
Description: Integrate Stripe for payment processing
Priority: Highest
Status: To Do
Labels: payments, backend
```

**JIRA Stories**:

1. `PROJ-101`: Setup Stripe account
   - Description: Create Stripe account and configure API keys
   - Subtasks:
     - `PROJ-102`: Create Stripe account
     - `PROJ-103`: Generate API keys
     - `PROJ-104`: Store keys in environment variables

2. `PROJ-105`: Implement payment endpoint
   - Description: Create API endpoint for processing payments
   - Acceptance Criteria:
     - Valid card charges successfully
     - Invalid card returns error
   - Subtasks:
     - `PROJ-106`: Create POST /api/payments endpoint
     - `PROJ-107`: Integrate Stripe SDK
     - `PROJ-108`: Add error handling

---

### Result: SpecWeave Increment

**Created**: `.specweave/increments/0003-payment-integration/`

**File**: `spec.md`

```yaml
---
increment_id: "0003"
title: "Payment Integration"
description: "Integrate Stripe for payment processing"
status: "planned"
priority: "P1"
created_at: "2025-10-21T14:00:00Z"
jira:
  epic_key: "PROJ-100"
  epic_url: "https://jira.company.com/browse/PROJ-100"
  stories:
    - key: "PROJ-101"
      user_story_id: "US3-001"
    - key: "PROJ-105"
      user_story_id: "US3-002"
  imported_at: "2025-10-26T14:00:00Z"
  sync_direction: "import"
---

# Payment Integration

Integrate Stripe for payment processing.

## User Stories

### US3-001: Setup Stripe account

**As a** developer
**I want to** setup Stripe account
**So that** we can process payments

**Acceptance Criteria**:
- [ ] TC-0001: Stripe account created
- [ ] TC-0002: API keys generated and stored securely

**JIRA Story**: [PROJ-101](https://jira.company.com/browse/PROJ-101)

---

### US3-002: Implement payment endpoint

**As a** customer
**I want to** make payments with credit card
**So that** I can purchase products

**Acceptance Criteria**:
- [ ] TC-0003: Valid card charges successfully
- [ ] TC-0004: Invalid card returns error message

**JIRA Story**: [PROJ-105](https://jira.company.com/browse/PROJ-105)
```

**File**: `tasks.md`

```markdown
# Tasks: Payment Integration

## User Story: US3-001 - Setup Stripe account

- [ ] Create Stripe account (JIRA: PROJ-102)
- [ ] Generate API keys (JIRA: PROJ-103)
- [ ] Store keys in environment variables (JIRA: PROJ-104)

## User Story: US3-002 - Implement payment endpoint

- [ ] Create POST /api/payments endpoint (JIRA: PROJ-106)
- [ ] Integrate Stripe SDK (JIRA: PROJ-107)
- [ ] Add error handling (JIRA: PROJ-108)
```

---

## Example 3: Bidirectional Sync

### Initial State

**SpecWeave**: `.specweave/increments/0001-user-authentication/spec.md`

```yaml
---
status: "in-progress"
jira:
  epic_key: "AUTH-001"
  last_sync: "2025-10-26T10:00:00Z"
---
```

**JIRA Epic**: `AUTH-001`
```
Status: In Progress
Last Updated: 2025-10-26T10:00:00Z
```

---

### Changes Made

**SpecWeave Changes** (after last_sync):
1. Task "Create login API endpoint" marked done in `tasks.md`
2. Status changed to "completed" in `spec.md`

**JIRA Changes** (after last_sync):
1. Epic title changed: "User Authentication" → "User Auth with OAuth"
2. New comment added: "OAuth integration is now priority"

---

### Sync Process

**Step 1: Detect Changes**

```
SpecWeave changes:
- spec.md modified: 2025-10-26T12:00:00Z
- tasks.md modified: 2025-10-26T11:30:00Z

JIRA changes:
- Epic AUTH-001 updated: 2025-10-26T11:00:00Z
- Comment added: 2025-10-26T11:15:00Z
```

**Step 2: Detect Conflicts**

```
⚠️  Conflict Detected:

Title changed in both:
  SpecWeave: "User Authentication"
  JIRA: "User Auth with OAuth"

Choose resolution:
  [1] Keep SpecWeave title
  [2] Keep JIRA title ← User selects this
  [3] Manual merge
```

**Step 3: Apply Sync**

**SpecWeave → JIRA**:
- Mark Subtask `AUTH-003` (Create login API endpoint) as Done
- Update Epic status to Done

**JIRA → SpecWeave**:
- Update `spec.md` title to "User Auth with OAuth"
- Add JIRA comment to `.specweave/increments/0001-user-authentication/logs/jira-sync.log`

**Step 4: Update Timestamps**

```yaml
---
jira:
  last_sync: "2025-10-26T14:30:00Z"
  sync_direction: "bidirectional"
  conflicts_resolved: 1
---
```

---

### Final State

**SpecWeave**: `spec.md`

```yaml
---
title: "User Auth with OAuth"  # ← Updated from JIRA
status: "completed"
jira:
  epic_key: "AUTH-001"
  last_sync: "2025-10-26T14:30:00Z"
  sync_direction: "bidirectional"
  conflicts_resolved: 1
---
```

**JIRA Epic**: `AUTH-001`
```
Title: User Auth with OAuth
Status: Done  # ← Updated from SpecWeave
```

**JIRA Subtask**: `AUTH-003`
```
Title: Create login API endpoint
Status: Done  # ← Updated from SpecWeave
```

---

## Mapping Rules Summary

### Export (SpecWeave → JIRA)

| Source | Target | Transformation |
|--------|--------|----------------|
| Increment | Epic | Title: `[Increment ###] {title}` |
| User Story | Story | Include acceptance criteria as checkboxes |
| Task | Subtask | Direct mapping |
| Priority P1/P2/P3 | Priority Highest/High/Medium | Direct mapping |
| Status planned/in-progress/completed | Status To Do/In Progress/Done | Direct mapping |

### Import (JIRA → SpecWeave)

| Source | Target | Transformation |
|--------|--------|----------------|
| Epic | Increment | Auto-number, extract title |
| Story | User Story | Extract As/Want/So That, parse acceptance criteria |
| Subtask | Task | Direct mapping with JIRA key reference |
| Priority Highest/High/Medium/Low | Priority P1/P2/P2/P3 | Direct mapping |
| Status To Do/In Progress/Done | Status planned/in-progress/completed | Direct mapping |

---

## Related Documentation

- [JIRA Concepts](./jira-concepts.md) - JIRA structure
- [SpecWeave Concepts](./specweave-concepts.md) - SpecWeave structure
- [AGENT.md](../AGENT.md) - Complete mapping rules
