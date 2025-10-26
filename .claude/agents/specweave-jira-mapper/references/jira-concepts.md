# JIRA Concepts Reference

## Work Item Hierarchy

JIRA uses a hierarchical structure for organizing work:

```
Epic
└── Story
    └── Subtask
```

### Epic

**Definition**: A large body of work that can be broken down into smaller stories.

**Characteristics**:
- High-level feature or initiative
- Spans multiple sprints
- Contains multiple Stories
- Has Epic Link field for grouping
- Can have custom fields

**Example**:
```
Title: User Authentication System
Description: Implement complete authentication system with OAuth, JWT, and session management
Epic Link: AUTH-001
Stories: 10 linked stories
Status: In Progress
```

### Story (User Story)

**Definition**: A small, discrete piece of work from the user's perspective.

**Characteristics**:
- Follows "As a... I want... So that..." format
- Fits within a single sprint
- Has acceptance criteria
- Linked to parent Epic
- Can have Subtasks

**Example**:
```
Title: User can log in with email and password
Description:
  As a registered user
  I want to log in with email and password
  So that I can access my account

  Acceptance Criteria:
  - Valid credentials redirect to dashboard
  - Invalid password shows error message
  - Email not found shows error message

Epic Link: AUTH-001
Subtasks: 3 subtasks
Status: To Do
```

### Subtask

**Definition**: A small, technical task that contributes to completing a Story.

**Characteristics**:
- Implementation-level work
- Linked to parent Story
- Cannot have child items
- Typically assigned to individual developers

**Example**:
```
Title: Implement login API endpoint
Parent Story: AUTH-010
Description: Create POST /api/auth/login endpoint with email/password validation
Status: In Progress
```

---

## JIRA Fields

### Standard Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Key** | Unique identifier | PROJ-123 |
| **Title/Summary** | Brief description | User can log in |
| **Description** | Detailed description | Markdown/rich text |
| **Status** | Current state | To Do, In Progress, Done |
| **Priority** | Importance level | Highest, High, Medium, Low |
| **Assignee** | Person responsible | john.doe@company.com |
| **Reporter** | Person who created | jane.smith@company.com |
| **Labels** | Tags for grouping | auth, backend, P1 |
| **Epic Link** | Parent Epic | AUTH-001 |
| **Sprint** | Agile sprint | Sprint 24 |

### Custom Fields

Projects can define custom fields:

| Custom Field | Purpose | Example Value |
|--------------|---------|---------------|
| **SpecWeave Increment ID** | Link to SpecWeave | 0001-user-auth |
| **Spec URL** | Link to specification | https://github.com/.../spec.md |
| **Test Case IDs** | Test coverage | TC-0001, TC-0002 |
| **Context Manifest** | Context loading | YAML serialized |

---

## JIRA Status Workflow

### Standard Workflow

```
To Do → In Progress → Done
```

### Custom Workflows

Many organizations customize workflows:

```
Backlog → To Do → In Progress → Code Review → QA → Done
```

**Important**: Always check project workflow before mapping statuses!

---

## JIRA Priority Levels

### Standard Priorities

| Priority | Meaning | Usage |
|----------|---------|-------|
| **Highest** | Critical, blocking | Must complete immediately |
| **High** | Important, not blocking | Complete soon |
| **Medium** | Normal priority | Standard work |
| **Low** | Nice to have | Complete if time allows |

---

## JIRA API Concepts

### REST API

JIRA provides REST API for programmatic access:

**Endpoints**:
- `GET /rest/api/3/issue/{issueKey}` - Get issue details
- `POST /rest/api/3/issue` - Create issue
- `PUT /rest/api/3/issue/{issueKey}` - Update issue
- `GET /rest/api/3/search` - Search issues (JQL)

**Authentication**:
- Basic Auth (username + API token)
- OAuth 2.0
- Personal Access Token (PAT)

### JQL (JIRA Query Language)

Query issues with SQL-like syntax:

```sql
-- Get all stories in an Epic
project = PROJ AND "Epic Link" = PROJ-123

-- Get all unresolved issues assigned to me
assignee = currentUser() AND resolution = Unresolved

-- Get all stories with label "specweave"
project = PROJ AND issuetype = Story AND labels = specweave
```

---

## JIRA Webhooks

JIRA can send webhooks on issue changes:

**Events**:
- `jira:issue_created`
- `jira:issue_updated`
- `jira:issue_deleted`
- `comment_created`

**Webhook Payload**:
```json
{
  "webhookEvent": "jira:issue_updated",
  "issue": {
    "key": "PROJ-123",
    "fields": {
      "summary": "Updated title",
      "status": { "name": "In Progress" }
    }
  }
}
```

**Use Case**: Trigger SpecWeave sync when JIRA issues change.

---

## JIRA Best Practices

1. **Use Epic Links** - Always link Stories to Epics for traceability
2. **Write clear acceptance criteria** - Makes testing easier
3. **Keep Subtasks small** - Each Subtask should be 1-2 hours of work
4. **Use labels consistently** - Easier to filter and search
5. **Update status promptly** - Keeps team informed
6. **Add comments for context** - Explain decisions and changes

---

## Related Documentation

- [SpecWeave Concepts](./specweave-concepts.md) - SpecWeave structure
- [Mapping Examples](./mapping-examples.md) - Real-world conversions
