# jira-sync Skill

**Status**: To be developed
**Priority**: Medium

## Purpose

Bidirectional sync between SpecWeave increments and JIRA (Atlassian)

**Note**: This skill handles ONLY JIRA. For Azure DevOps, see `ado-sync` skill.

## Features

### Export to JIRA
- Create JIRA issues from SpecWeave increments
- Map spec.md user stories → JIRA Stories
- Map tasks.md tasks → JIRA Sub-tasks
- Create Epics if specified in spec.md
- Set priorities, labels, components

### Import from JIRA
- Sync JIRA updates back to SpecWeave
- Import existing JIRA issues as increments
- Update status, assignees, comments

### Bidirectional Sync
- Keep status in sync (To Do, In Progress, Done)
- Sync descriptions and acceptance criteria
- Sync comments
- Handle conflicts intelligently

## JIRA-Specific Concepts

### Mapping: SpecWeave → JIRA

| SpecWeave | JIRA |
|-----------|------|
| spec.md (with Epic) | Epic |
| spec.md User Story | Story |
| tasks.md Task | Sub-task |
| Acceptance Tests (spec.md) | Acceptance Criteria (Story) |
| Acceptance Criteria (tasks.md) | Sub-task checklist |
| Status: planned | To Do |
| Status: in-progress | In Progress |
| Status: completed | Done |

### JIRA Structure Example

**spec.md with JIRA structure**:
```markdown
---
increment: 002-payment-processing
status: planned
structure: jira
jira_epic: PROJ-123
---

## Epic: E-commerce Infrastructure
**JIRA**: PROJ-123

### Story: Subscribe to Plan
**JIRA**: PROJ-124
**Priority**: P1
**Labels**: payments, stripe
**Components**: Backend, Frontend

**Description**:
As a user, I want to subscribe to a monthly plan...

**Acceptance Criteria**:
- User can select plan
- Payment processed
- Subscription activated
```

**tasks.md creates Sub-tasks**:
```markdown
## Tasks for PROJ-124 (Subscribe to Plan)

### Task T001: Create StripeService
**JIRA**: PROJ-125 (Sub-task of PROJ-124)
**Agent**: nodejs-backend

**Description**: Create Stripe service class...

**Acceptance Criteria**:
- [ ] StripeService class exists
- [ ] Unit tests passing
```

## Authentication

**JIRA Cloud**:


**JIRA Server/Data Center**:
```yaml
jira_sync:
  type: "server"
  url: "https://jira.your-company.com"
  username: "user"
  password: "${JIRA_PASSWORD}"  # From environment variable
  project_key: "PROJ"
```

## Configuration



## Workflow

### Export Workflow (SpecWeave → JIRA)

```
User: Creates increment in SpecWeave
  .specweave/increments/0002-payment/
    spec.md (with structure: jira)
    tasks.md

↓ jira-sync detects new increment

Creates in JIRA:
  Epic: PROJ-123 "E-commerce Infrastructure"
    Story: PROJ-124 "Subscribe to Plan"
      Sub-task: PROJ-125 "Create StripeService"
      Sub-task: PROJ-126 "Create API endpoints"

Links created:
  spec.md → PROJ-124
  tasks.md T001 → PROJ-125
  tasks.md T002 → PROJ-126
```

### Import Workflow (JIRA → SpecWeave)

```
User: Updates JIRA issue status to "In Progress"

↓ JIRA webhook triggers

jira-sync:
  Detects change to PROJ-124
  Finds linked increment: 002-payment
  Updates: .specweave/increments/0002-payment/spec.md
    status: planned → in-progress
```

### Bidirectional Sync

```
User: Checks off task in tasks.md
  - [x] T001: Create StripeService

↓ jira-sync detects change

Updates JIRA:
  PROJ-125 status → Done

User: Changes PROJ-124 to "Done" in JIRA

↓ JIRA webhook triggers

jira-sync updates SpecWeave:
  .specweave/increments/0002-payment/spec.md
    status: in-progress → completed
```

## API Integration

### JIRA REST API Endpoints Used

```typescript
// Create Epic
POST /rest/api/3/issue
{
  "fields": {
    "project": { "key": "PROJ" },
    "issuetype": { "name": "Epic" },
    "summary": "E-commerce Infrastructure",
    "customfield_10011": "epic-name"  // Epic Name field
  }
}

// Create Story (linked to Epic)
POST /rest/api/3/issue
{
  "fields": {
    "project": { "key": "PROJ" },
    "issuetype": { "name": "Story" },
    "summary": "Subscribe to Plan",
    "parent": { "key": "PROJ-123" }  // Link to Epic
  }
}

// Create Sub-task
POST /rest/api/3/issue
{
  "fields": {
    "project": { "key": "PROJ" },
    "issuetype": { "name": "Sub-task" },
    "parent": { "key": "PROJ-124" },
    "summary": "Create StripeService"
  }
}

// Update status
POST /rest/api/3/issue/{issueKey}/transitions
{
  "transition": { "id": "31" }  // "In Progress"
}
```

## Webhooks

### Setup JIRA Webhook

1. Go to JIRA Settings → System → Webhooks
2. Create webhook:
   - URL: `https://your-app.com/api/webhooks/jira`
   - Events: Issue created, updated, deleted
   - Secret: Random string (store in JIRA_WEBHOOK_SECRET)

### Webhook Handler

```typescript
// Receives JIRA webhook
POST /api/webhooks/jira

// jira-sync processes:
1. Verify webhook signature
2. Extract issue data
3. Find linked SpecWeave increment
4. Update spec.md or tasks.md
5. Commit changes (optional)
```

## Conflict Resolution

**Scenario**: Both SpecWeave and JIRA updated simultaneously

**Strategy**:
1. **Timestamp-based**: Latest change wins
2. **User prompt**: Ask user which to keep
3. **Merge**: Combine changes if possible

**Example**:
```
SpecWeave: status → in-progress (10:00 AM)
JIRA: status → done (10:05 AM)

jira-sync:
  Latest is JIRA (10:05 AM)
  Update SpecWeave → done
```

## Error Handling

**Common errors**:
- JIRA API rate limits → Retry with exponential backoff
- Authentication failed → Notify user, check credentials
- Issue not found → Create if export, skip if import
- Network errors → Queue for retry

## Testing

**Test scenarios**:
1. Create increment → Creates JIRA issues
2. Update JIRA → Updates SpecWeave
3. Update SpecWeave → Updates JIRA
4. Conflict resolution
5. Webhook handling
6. Error recovery

## Integration with Other Skills

- **task-builder**: Reads JIRA structure from spec.md
- **increment-planner**: Can specify structure: jira

## Future Enhancements

- Support for JIRA sprints/iterations
- Sync custom fields
- Attachment sync
- Advanced filtering (which issues to sync)
- Bulk import from JIRA

---

**To implement**: See task in .specweave/increments/

**See also**: `ado-sync` skill for Azure DevOps integration
