# ado-sync Skill

**Status**: To be developed
**Priority**: Medium

## Purpose

Bidirectional sync between SpecWeave increments and Azure DevOps (ADO)

**Note**: This skill handles ONLY Azure DevOps. For JIRA, see `jira-sync` skill.

## Features

### Export to ADO
- Create ADO work items from SpecWeave increments
- Map spec.md user stories → ADO User Stories
- Map tasks.md tasks → ADO Tasks
- Create Features if specified in spec.md
- Set Area Paths, Iterations, priorities

### Import from ADO
- Sync ADO updates back to SpecWeave
- Import existing ADO work items as increments
- Update status, assignees, comments

### Bidirectional Sync
- Keep status in sync (New, Active, Resolved, Closed)
- Sync descriptions and acceptance criteria
- Sync comments and attachments
- Handle conflicts intelligently

## ADO-Specific Concepts

### Mapping: SpecWeave → Azure DevOps

| SpecWeave | Azure DevOps |
|-----------|--------------|
| spec.md (with Feature) | Feature |
| spec.md User Story | User Story |
| tasks.md Task | Task |
| Acceptance Tests (spec.md) | Acceptance Criteria (User Story) |
| Acceptance Criteria (tasks.md) | Task checklist |
| Status: planned | New |
| Status: in-progress | Active |
| Status: completed | Closed |

### ADO Structure Example

**spec.md with ADO structure**:
```markdown
---
increment: 002-payment-processing
status: planned
structure: ado
ado_feature: 456
---

## Feature: Payment Processing
**ADO**: 456
**Area Path**: Platform/Payments
**Iteration**: Sprint 12

### User Story: Subscribe to Plan
**ADO**: 789
**Priority**: 1
**Area Path**: Platform/Payments
**Iteration**: Sprint 12

**Description**:
As a user, I want to subscribe to a monthly plan...

**Acceptance Criteria**:
- User can select plan
- Payment processed
- Subscription activated
```

**tasks.md creates Tasks**:
```markdown
## Tasks for ADO-789 (Subscribe to Plan)

### Task T001: Create StripeService
**ADO**: 790 (Task under User Story 789)
**Agent**: nodejs-backend
**Area Path**: Platform/Payments/Backend
**Iteration**: Sprint 12

**Description**: Create Stripe service class...

**Acceptance Criteria**:
- [ ] StripeService class exists
- [ ] Unit tests passing
```

## Authentication

**Personal Access Token (PAT)**:


**OAuth 2.0** (for apps):
```yaml
ado_sync:
  url: "https://dev.azure.com/your-org"
  project: "YourProject"
  auth_type: "oauth"
  client_id: "${ADO_CLIENT_ID}"
  client_secret: "${ADO_CLIENT_SECRET}"
```

## Configuration



## Workflow

### Export Workflow (SpecWeave → ADO)

```
User: Creates increment in SpecWeave
  .specweave/increments/0002-payment/
    spec.md (with structure: ado)
    tasks.md

↓ ado-sync detects new increment

Creates in ADO:
  Feature: 456 "Payment Processing"
    Area Path: Platform/Payments
    Iteration: Sprint 12

    User Story: 789 "Subscribe to Plan"
      Area Path: Platform/Payments
      Iteration: Sprint 12

      Task: 790 "Create StripeService"
        Area Path: Platform/Payments/Backend
        Iteration: Sprint 12

      Task: 791 "Create API endpoints"

Links created:
  spec.md → ADO-789
  tasks.md T001 → ADO-790
  tasks.md T002 → ADO-791
```

### Import Workflow (ADO → SpecWeave)

```
User: Updates ADO work item status to "Active"

↓ ADO service hook triggers

ado-sync:
  Detects change to ADO-789
  Finds linked increment: 002-payment
  Updates: .specweave/increments/0002-payment/spec.md
    status: planned → in-progress
```

### Bidirectional Sync

```
User: Checks off task in tasks.md
  - [x] T001: Create StripeService

↓ ado-sync detects change

Updates ADO:
  Work Item 790 status → Closed

User: Changes ADO-789 to "Closed" in Azure DevOps

↓ ADO service hook triggers

ado-sync updates SpecWeave:
  .specweave/increments/0002-payment/spec.md
    status: in-progress → completed
```

## API Integration

### Azure DevOps REST API Endpoints Used

```typescript
// Create Feature
POST https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$Feature?api-version=7.0
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Payment Processing"
  },
  {
    "op": "add",
    "path": "/fields/System.AreaPath",
    "value": "Platform/Payments"
  },
  {
    "op": "add",
    "path": "/fields/System.IterationPath",
    "value": "Sprint 12"
  }
]

// Create User Story (linked to Feature)
POST https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$User%20Story?api-version=7.0

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Subscribe to Plan"
  },
  {
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "System.LinkTypes.Hierarchy-Reverse",
      "url": "https://dev.azure.com/{org}/_apis/wit/workItems/456"
    }
  }
]

// Create Task (linked to User Story)
POST https://dev.azure.com/{org}/{project}/_apis/wit/workitems/$Task?api-version=7.0

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Create StripeService"
  },
  {
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "System.LinkTypes.Hierarchy-Reverse",
      "url": "https://dev.azure.com/{org}/_apis/wit/workItems/789"
    }
  }
]

// Update status
PATCH https://dev.azure.com/{org}/{project}/_apis/wit/workitems/{id}?api-version=7.0

[
  {
    "op": "add",
    "path": "/fields/System.State",
    "value": "Active"
  }
]
```

## Service Hooks (Webhooks)

### Setup ADO Service Hook

1. Go to Project Settings → Service hooks
2. Create new service hook:
   - Service: Web Hooks
   - Trigger: Work item updated
   - URL: `https://your-app.com/api/webhooks/ado`
   - Filters: Area path = Platform/Payments (optional)

### Service Hook Handler

```typescript
// Receives ADO service hook
POST /api/webhooks/ado

// ado-sync processes:
1. Verify request (optional: check secret)
2. Extract work item data
3. Find linked SpecWeave increment
4. Update spec.md or tasks.md
5. Commit changes (optional)
```

## ADO-Specific Features

### Area Paths

**Organize work by area**:
```markdown
# spec.md
---
ado_area_path: "Platform/Payments"
---
```

Maps to ADO Area Path for organization.

### Iterations/Sprints

**Assign to sprint**:
```markdown
# spec.md
---
ado_iteration: "Sprint 12"
---
```

Or auto-detect current sprint:
```yaml
# config.yaml
ado_sync:
  auto_detect_iteration: true
```

### Work Item Types

**ADO supports custom work item types**:
- Epic → Feature → User Story → Task (default)
- Custom types supported via config

```yaml
ado_sync:
  work_item_types:
    epic: "Epic"
    feature: "Feature"
    story: "User Story"
    task: "Task"
```

### Custom Fields

**Sync custom fields**:
```yaml
ado_sync:
  custom_fields:
    - name: "Custom.Priority"
      map_from: "priority"  # From spec.md frontmatter
    - name: "Custom.Estimate"
      map_from: "estimate"
```

## Conflict Resolution

**Scenario**: Both SpecWeave and ADO updated simultaneously

**Strategy**:
1. **Timestamp-based**: Latest change wins
2. **User prompt**: Ask user which to keep (via Ping.aiff)
3. **Merge**: Combine changes if possible

**Example**:
```
SpecWeave: status → in-progress (10:00 AM)
ADO: status → closed (10:05 AM)

ado-sync:
  Latest is ADO (10:05 AM)
  Update SpecWeave → completed
  🔔 Ping.aiff: "ADO conflict resolved - ADO version used"
```

## Error Handling

**Common errors**:
- ADO API rate limits → Retry with exponential backoff
- Authentication failed → Notify user, check PAT
- Work item not found → Create if export, skip if import
- Network errors → Queue for retry
- Area Path invalid → Use default or notify user

## Testing

**Test scenarios**:
1. Create increment → Creates ADO work items
2. Update ADO → Updates SpecWeave
3. Update SpecWeave → Updates ADO
4. Area Path mapping
5. Iteration mapping
6. Conflict resolution
7. Service hook handling
8. Custom fields sync

## Integration with Other Skills

- **task-builder**: Reads ADO structure from spec.md
- **increment-planner**: Can specify structure: ado

## Comparison: JIRA vs ADO

| Feature | JIRA (jira-sync) | Azure DevOps (ado-sync) |
|---------|------------------|-------------------------|
| **Epic level** | Epic | Feature |
| **Story level** | Story | User Story |
| **Task level** | Sub-task | Task |
| **Organization** | Components, Labels | Area Paths |
| **Sprints** | Sprints (board-based) | Iterations (path-based) |
| **API** | JIRA REST API v3 | Azure DevOps REST API v7.0 |
| **Auth** | API Token | PAT or OAuth |
| **Webhooks** | JIRA Webhooks | Service Hooks |
| **Custom fields** | Custom fields | Work item fields |

## Future Enhancements

- Support for ADO Boards/Backlogs
- Sprint burndown sync
- Test case sync (ADO Test Plans)
- Build/release pipeline integration
- Wiki sync
- Git repo integration (link commits to work items)

---

**To implement**: See task in .specweave/increments/

**See also**: `jira-sync` skill for JIRA integration
