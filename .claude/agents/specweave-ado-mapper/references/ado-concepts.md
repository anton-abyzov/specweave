# Azure DevOps (ADO) Concepts Reference

## Work Item Hierarchy

ADO uses a **4-level hierarchy** (one more level than JIRA):

```
Epic
└── Feature
    └── User Story
        └── Task
```

### Epic

**Definition**: Large initiative spanning multiple features and sprints.

**Example**:
```
Title: User Authentication System
Description: Complete authentication with OAuth, JWT, session management
Priority: 1
State: Active
Area Path: MyProject\Authentication
Iteration: Release 2.0
```

### Feature

**Definition**: Significant functionality that can be broken into user stories.

**Example**:
```
Title: OAuth Integration
Description: Implement OAuth 2.0 for Google, GitHub, Microsoft
Parent: Epic (User Authentication System)
Priority: 1
State: Active
```

### User Story

**Definition**: Small, specific user-facing functionality.

**Example**:
```
Title: User can log in with Google OAuth
Description:
  As a user
  I want to log in with Google
  So that I don't need to remember another password

Acceptance Criteria:
  - Google OAuth button on login page
  - Redirects to Google for authentication
  - Creates user account on first login
  - Redirects to dashboard after successful login

Parent: Feature (OAuth Integration)
```

### Task

**Definition**: Technical work item for implementing user story.

**Example**:
```
Title: Create OAuth callback endpoint
Description: Implement POST /api/auth/oauth/callback
Parent: User Story (User can log in with Google OAuth)
State: Active
```

---

## ADO Fields

### Standard Fields

| Field | Description | Example |
|-------|-------------|---------|
| **ID** | Unique work item ID | 12345 |
| **Title** | Brief description | User can log in with OAuth |
| **Description** | Detailed description | Rich text/HTML |
| **State** | Current state | New, Active, Resolved, Closed |
| **Work Item Type** | Type | Epic, Feature, User Story, Task |
| **Priority** | Importance (1-4) | 1 (highest), 4 (lowest) |
| **Assigned To** | Person responsible | john.doe@company.com |
| **Created By** | Person who created | jane.smith@company.com |
| **Tags** | Tags for grouping | auth; backend; specweave |
| **Area Path** | Organizational hierarchy | MyProject\TeamA\Backend |
| **Iteration** | Sprint/time period | Sprint 24, Release 2.0 |
| **Parent** | Parent work item | Epic ID, Feature ID |
| **Acceptance Criteria** | Testable conditions | Markdown field |

### Custom Fields

Projects can define custom fields:

| Custom Field | Purpose | Example Value |
|--------------|---------|---------------|
| **SpecWeave.IncrementID** | Link to SpecWeave | 0001-user-auth |
| **SpecWeave.SpecURL** | Link to specification | https://dev.azure.com/.../spec.md |
| **SpecWeave.TestCaseIDs** | Test coverage | TC-0001, TC-0002 |
| **SpecWeave.UserStoryID** | User story mapping | US1-001 |

---

## Area Path (Organizational Hierarchy)

**Definition**: Tree structure for organizing work by team/component.

**Example**:
```
MyProject
├── TeamA
│   ├── Backend
│   └── Frontend
├── TeamB
│   ├── Mobile
│   └── API
└── Infrastructure
```

**Usage**: Assign work items to teams/components for filtering and reporting.

---

## Iteration (Time Periods)

**Definition**: Time-boxed periods for planning work (sprints, releases).

**Example**:
```
Release 2.0
├── Sprint 20
├── Sprint 21
├── Sprint 22
└── Sprint 23

Backlog
```

**Usage**: Schedule work items in specific sprints or releases.

---

## State Workflow

### Standard Workflow

```
New → Active → Resolved → Closed
```

### Custom Workflows

Organizations can customize:

```
New → Active → Code Complete → In Review → Closed
```

**Important**: Always check project workflow before mapping!

---

## Priority Levels

| Priority | Meaning |
|----------|---------|
| **1** | Critical, must complete |
| **2** | Important, high priority |
| **3** | Normal priority |
| **4** | Low priority, nice to have |

---

## ADO REST API

### Authentication

- **Personal Access Token (PAT)** - Recommended
- **OAuth 2.0** - For integrations

**PAT Creation**:
1. Go to `https://dev.azure.com/{organization}/_usersSettings/tokens`
2. Click "New Token"
3. Select scope: Work Items (Read, Write, Manage)
4. Set expiration
5. Copy token (store securely)

### Endpoints

```
Base URL: https://dev.azure.com/{organization}/{project}/_apis

# Get work item
GET /wit/workitems/{id}?api-version=7.0

# Create work item
POST /wit/workitems/${workItemType}?api-version=7.0

# Update work item
PATCH /wit/workitems/{id}?api-version=7.0

# Query work items (WIQL)
POST /wit/wiql?api-version=7.0
```

### WIQL (Work Item Query Language)

Query work items with SQL-like syntax:

```sql
-- Get all Features in an Epic
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.WorkItemType] = 'Feature'
  AND [System.Parent] = 12345

-- Get all work items in Area Path
SELECT [System.Id]
FROM WorkItems
WHERE [System.AreaPath] UNDER 'MyProject\TeamA'
  AND [System.State] <> 'Closed'
```

---

## ADO Webhooks

**Events**:
- `workitem.created`
- `workitem.updated`
- `workitem.deleted`
- `workitem.commented`

**Webhook Payload**:
```json
{
  "eventType": "workitem.updated",
  "resource": {
    "id": 12345,
    "workItemType": "User Story",
    "fields": {
      "System.Title": "Updated title",
      "System.State": "Active"
    }
  }
}
```

---

## Best Practices

1. **Use Area Paths consistently** - Organize by team/component
2. **Plan with Iterations** - Schedule work in sprints
3. **Link work items** - Maintain Parent-Child relationships
4. **Write clear acceptance criteria** - Use Acceptance Criteria field
5. **Tag appropriately** - Use tags for cross-cutting concerns
6. **Update states promptly** - Keep team informed

---

## Related Documentation

- [SpecWeave Concepts](./specweave-concepts.md) - SpecWeave structure
- [Mapping Examples](./mapping-examples.md) - Real-world ADO conversions
