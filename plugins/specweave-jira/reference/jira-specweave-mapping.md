# Jira ↔ SpecWeave Concept Mapping

**Purpose**: Quick reference for mapping Jira concepts to SpecWeave architecture

**Source of Truth**: [.specweave/docs/internal/delivery/guides/tool-concept-mapping.md](../../../.specweave/docs/internal/delivery/guides/tool-concept-mapping.md)

**Last Synced**: 2025-11-04

---

## 🚨 CRITICAL: Agents MUST Follow This Mapping

When syncing between Jira and SpecWeave, you **MUST** use these exact mappings. Do not deviate or create custom mappings.

---

## Core Concept Mapping

| Jira Concept | SpecWeave Concept | Location | Mapping Rule |
|--------------|-------------------|----------|--------------|
| **Epic** | Increment | `.specweave/increments/####-{name}/` | 1 Epic = 1 Increment (1:1) |
| **Story (business)** | PRD | `.specweave/docs/internal/strategy/prd-{name}.md` | Business requirement stories |
| **Story (technical)** | RFC | `.specweave/docs/internal/architecture/rfc/####-{name}.md` | Technical design stories |
| **Task** | Task | `.specweave/increments/####-{name}/tasks.md` | Implementation tasks |
| **Subtask** | Subtask | Same as Task | Sub-items in tasks.md |
| **Bug** | Incident | `.specweave/docs/internal/operations/incidents/{id}.md` | Operational issues |
| **Sprint** | Release Plan | `.specweave/docs/internal/delivery/release-v{version}.md` | Sprint = Release iteration |
| **Component** | Module | `.specweave/docs/internal/architecture/{module}/` | Code/doc modules |
| **Label** | Tag | `metadata.json` → tags | Filtering/categorization |
| **Version** | Release | `.specweave/docs/internal/delivery/release-v{version}.md` | Release versions |

---

## Epic → Increment Mapping (MANDATORY 1:1)

**Rule**: **ONE Jira Epic = ONE SpecWeave Increment**

This is the **MOST CRITICAL** mapping. Never deviate from this 1:1 relationship.

**Bidirectional Link**:
```yaml
# .specweave/increments/####-{name}/metadata.json
{
  "external_ids": {
    "jira": {
      "epic": "PROJ-123",
      "epic_url": "https://company.atlassian.net/browse/PROJ-123",
      "project_key": "PROJ"
    }
  }
}
```

**Example**:
```
Jira Epic: PROJ-123 "User Authentication"
  ↓
SpecWeave: .specweave/increments/0005-user-authentication/
```

---

## Story Type Detection (Context-Dependent)

**Critical Decision Tree** (use this EXACTLY):

```
Is the story primarily a business requirement?
├─ YES → PRD (.specweave/docs/internal/strategy/prd-{name}.md)
│   Example: "As a user, I want to log in with email so I can access my account"
│
└─ NO → Is it a technical design/API change?
    ├─ YES → RFC (.specweave/docs/internal/architecture/rfc/####-{name}.md)
    │   Example: "Design OAuth 2.0 authentication API"
    │
    └─ NO → Is it an architecture decision?
        ├─ YES → ADR (.specweave/docs/internal/architecture/adr/####-{decision}.md)
        │   Example: "Decide between OAuth 2.0 vs SAML"
        │
        └─ NO → Task (.specweave/increments/####-{name}/tasks.md)
            Example: "Write unit tests for login endpoint"
```

**Detection Rules** (use Jira fields):
1. **Business Story → PRD**:
   - Issue type: Story
   - Labels: `business`, `requirement`, `user-story`
   - Description contains: "As a user", "I want to", "so that"

2. **Technical Story → RFC**:
   - Issue type: Story
   - Labels: `technical`, `design`, `api`, `architecture`
   - Description contains: "Design", "Implement", "API", "Technical"

3. **Architecture Decision → ADR**:
   - Issue type: Story or Task
   - Labels: `decision`, `adr`, `architecture-decision`
   - Summary starts with: "Decide", "Choose", "Select", "Evaluate"

4. **Implementation Task → Task**:
   - Issue type: Task or Subtask
   - No special labels
   - Specific, actionable work

---

## Status Mapping (MUST BE EXACT)

| Jira Status | SpecWeave Status | Notes |
|-------------|------------------|-------|
| `To Do` | `planned` | Not started |
| `In Progress` | `in_progress` | Active development |
| `In Review` | `in_progress` | Code review, still in progress |
| `Done` | `completed` | Fully complete |
| `On Hold` | `on_hold` | Temporarily paused |
| `Won't Do` | `cancelled` | Decided not to do |

**Custom Statuses** (map to closest standard):
- `Backlog` → `planned`
- `Selected for Development` → `planned`
- `In Development` → `in_progress`
- `Code Review` → `in_progress`
- `Testing` → `in_progress`
- `Deployed` → `completed`
- `Rejected` → `cancelled`

---

## Priority Mapping

| Jira Priority | SpecWeave Priority | Description |
|---------------|-------------------|-------------|
| `Highest` | `P1` | Critical, must do now |
| `High` | `P2` | High priority |
| `Medium` | `P3` | Medium priority |
| `Low` | `P4` | Low priority, nice-to-have |
| (unset) | `P3` | Default to medium |

---

## Sprint → Release Plan Mapping

**Mapping Rule**: 1 Jira Sprint = 1 SpecWeave Release Plan

**Example**:
```
Jira: Sprint 1 "Jan 1-14" (User Authentication)
  ↓
SpecWeave: .specweave/docs/internal/delivery/release-v1.0.md
```

**Release Plan Contents**:
- **What increments are included**: List of increment IDs (0005, 0006, 0007)
- **What features ship**: User-facing features (login, password reset, 2FA)
- **Testing strategy**: E2E, integration, unit test plans
- **Rollout plan**: Blue-green, canary, phased rollout
- **Rollback plan**: How to revert if issues
- **Success metrics**: DORA metrics, test coverage, uptime

---

## Task → Task Mapping (Direct)

**Mapping Rule**: Jira Tasks map directly to SpecWeave Tasks

**Format**:
```markdown
# tasks.md

## Implementation Tasks

- [ ] **T-001**: Set up OAuth 2.0 client config (Jira: PROJ-126)
- [ ] **T-002**: Implement login endpoint (Jira: PROJ-127)
- [ ] **T-003**: Write unit tests (Jira: PROJ-128)
- [ ] **T-004**: Write E2E tests (Jira: PROJ-129)
- [ ] **T-005**: Deploy to staging (Jira: PROJ-130)
```

**Bidirectional Link**:
```yaml
# metadata.json
{
  "external_ids": {
    "jira": {
      "tasks": [
        {"id": "T-001", "jira_key": "PROJ-126"},
        {"id": "T-002", "jira_key": "PROJ-127"},
        {"id": "T-003", "jira_key": "PROJ-128"}
      ]
    }
  }
}
```

---

## Bug → Incident Mapping

**Rule**: Bugs are operational incidents, not development tasks

**Location**: `.specweave/docs/internal/operations/incidents/{id}.md`

**Why**: Bugs discovered in production are operational issues requiring postmortems, not feature work.

**Example**:
```markdown
# Incident: Login Failures on 2025-01-20

**Incident ID**: INC-001
**Jira Bug**: PROJ-999
**Severity**: P1 (Critical)
**Status**: Resolved

## Timeline

- 10:00 AM: Users report login failures
- 10:15 AM: On-call engineer investigates
- 10:30 AM: Root cause identified (expired SSL cert)
- 10:45 AM: SSL cert renewed
- 11:00 AM: Service restored

## Root Cause

SSL certificate expired, causing HTTPS handshake failures.

## Resolution

Renewed SSL cert via Let's Encrypt. Implemented automated renewal.

## Prevention

- [ ] Set up SSL cert expiration monitoring (created Jira story PROJ-1000)
- [ ] Automate cert renewal
```

---

## Component → Module Mapping

**Jira Component** maps to **SpecWeave Module** (architecture folder)

**Example**:
```
Jira Component: "Frontend - Authentication"
  ↓
SpecWeave: .specweave/docs/internal/architecture/frontend-auth/
```

**Module Contents**:
- HLD (High-Level Design)
- Component diagrams
- API contracts
- Data models

---

## Sync Scenarios (Step-by-Step)

### Scenario 1: New Jira Epic Created

**What Happens**:
1. Jira webhook fires: "Epic PROJ-123 created"
2. SpecWeave receives webhook
3. SpecWeave creates new increment:
   ```bash
   .specweave/increments/0001-user-authentication/
   ├── metadata.json  # external_ids.jira.epic = PROJ-123
   ├── spec.md
   ├── plan.md
   └── tasks.md
   ```
4. SpecWeave creates PRD stub:
   ```bash
   .specweave/docs/internal/strategy/prd-user-authentication.md
   ```
5. SpecWeave logs sync in `.specweave/logs/jira-sync.json`

### Scenario 2: Jira Epic Status Changed

**What Happens**:
1. Jira webhook: "Epic PROJ-123 status changed to In Progress"
2. SpecWeave receives webhook
3. SpecWeave updates `metadata.json`:
   ```json
   {
     "status": "in_progress",
     "started": "2025-01-20T10:00:00Z",
     "updated": "2025-01-20T10:00:00Z"
   }
   ```
4. SpecWeave commits change: `sync: Epic PROJ-123 status → in_progress`

### Scenario 3: New Story Added to Epic

**What Happens**:
1. Jira: Story PROJ-124 created, linked to Epic PROJ-123
2. SpecWeave receives webhook
3. SpecWeave analyzes story:
   - Is it business requirement? → Create PRD
   - Is it technical design? → Create RFC
4. SpecWeave updates `metadata.json`:
   ```json
   {
     "external_ids": {
       "jira": {
         "stories": ["PROJ-124"]
       }
     },
     "docs": {
       "prd": ".specweave/docs/internal/strategy/prd-user-authentication.md"
     }
   }
   ```

### Scenario 4: SpecWeave ADR Created → Sync to Jira

**What Happens**:
1. Developer creates ADR locally:
   ```bash
   .specweave/docs/internal/architecture/adr/0001-use-oauth2.md
   ```
2. Developer commits and pushes
3. SpecWeave post-commit hook detects new ADR
4. SpecWeave finds related increment (via `metadata.json` → docs.adrs)
5. SpecWeave creates Jira story:
   - Title: "ADR 0001: Use OAuth 2.0"
   - Type: Story
   - Parent: Epic PROJ-123
   - Link: URL to ADR in repo
6. SpecWeave updates `metadata.json`:
   ```json
   {
     "external_ids": {
       "jira": {
         "stories": ["PROJ-124", "PROJ-131"]
       }
     },
     "docs": {
       "adrs": [
         ".specweave/docs/internal/architecture/adr/0001-use-oauth2.md"
       ]
     }
   }
   ```

---

## Conflict Resolution

### Conflict: Both Jira and SpecWeave Changed Status

**Scenario**:
- Jira Epic PROJ-123: Status changed from "In Progress" → "Done" (at 10:00 AM)
- SpecWeave Increment 0001: Status changed from "in_progress" → "on_hold" (at 10:05 AM)
- Last sync: 9:00 AM

**Detection**:
- Sync runs at 10:15 AM
- Finds both changed since last sync

**Resolution Options**:

1. **Prompt User** (default):
   ```
   Conflict detected for increment 0001-user-authentication:
   - Jira Epic PROJ-123: Done (changed at 10:00 AM)
   - SpecWeave: on_hold (changed at 10:05 AM)

   Which version to keep?
   1) Use Jira (Done)
   2) Use SpecWeave (on_hold)
   3) Merge manually
   ```

2. **Auto-Resolve (configured)**:
   - SpecWeave wins (local is source of truth)
   - Jira wins (team collaboration via Jira)

3. **Log Conflict**:
   ```json
   // .specweave/logs/jira-sync.json
   {
     "conflicts": [
       {
         "increment": "0001",
         "field": "status",
         "jira_value": "Done",
         "specweave_value": "on_hold",
         "timestamp": "2025-01-20T10:15:00Z",
         "resolution": "manual",
         "resolved_by": "@john-doe",
         "resolved_at": "2025-01-20T10:20:00Z",
         "final_value": "on_hold"
       }
     ]
   }
   ```

---

## Traceability Examples

### Example 1: From Jira Epic to Code

**Start**: Jira Epic PROJ-123 "User Authentication"

**Trace** (`specweave trace --jira PROJ-123`):
```
Jira Epic: PROJ-123 "User Authentication"
  ↓
SpecWeave Increment: 0001-user-authentication
  ↓
PRD: .specweave/docs/internal/strategy/prd-user-authentication.md
  (Jira Story: PROJ-124)
  ↓
HLD: .specweave/docs/internal/architecture/hld-user-authentication.md
  ↓
ADR: .specweave/docs/internal/architecture/adr/0001-use-oauth2.md
  (Jira Story: PROJ-131)
ADR: .specweave/docs/internal/architecture/adr/0002-use-auth0.md
  (Jira Story: PROJ-132)
  ↓
RFC: .specweave/docs/internal/architecture/rfc/0001-auth-api.md
  (Jira Story: PROJ-125)
  ↓
Code: src/services/auth/
  ↓
Tests: tests/e2e/auth.spec.ts
  ↓
Runbook: .specweave/docs/internal/operations/runbook-auth-service.md
```

### Example 2: From Code to Jira Epic

**Start**: Code file `src/services/auth/oauth.ts`

**Trace** (`specweave trace --file src/services/auth/oauth.ts`):
```
File: src/services/auth/oauth.ts
  ↓
Increment: 0001-user-authentication
  ↓
Jira Epic: PROJ-123 "User Authentication"
  URL: https://company.atlassian.net/browse/PROJ-123
  ↓
PRD: .specweave/docs/internal/strategy/prd-user-authentication.md
HLD: .specweave/docs/internal/architecture/hld-user-authentication.md
ADRs:
  - 0001-use-oauth2.md (Jira: PROJ-131)
  - 0002-use-auth0.md (Jira: PROJ-132)
RFCs:
  - 0001-auth-api.md (Jira: PROJ-125)
```

---

## Validation Checklist

**Before syncing, verify**:
- [ ] Jira Epic exists and is accessible
- [ ] Increment metadata has valid Jira link
- [ ] Status mapping follows rules above (no custom mappings)
- [ ] Priority mapped correctly (P1/P2/P3/P4)
- [ ] Story type detection used decision tree (PRD vs RFC vs ADR vs Task)
- [ ] Bidirectional links are valid (Epic ↔ Increment)
- [ ] Task IDs match between Jira and SpecWeave
- [ ] Conflicts resolved (if any)

---

## Security: Jira API Token

**Required**:
- Jira API Token (from https://id.atlassian.com/manage-profile/security/api-tokens)
- Jira Email
- Jira Domain (e.g., company.atlassian.net)

**Storage**:
```bash
# .env (gitignored)
JIRA_API_TOKEN=your-token-here
JIRA_EMAIL=your-email@example.com
JIRA_DOMAIN=company.atlassian.net
```

**Authentication**:
```bash
# Basic Auth: base64(email:token)
AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
```

**Never**:
- ❌ Log or commit API token
- ❌ Share token via Slack/email
- ❌ Use token with excessive permissions

---

## Related Documentation

- **Full Mapping Guide**: [.specweave/docs/internal/delivery/guides/tool-concept-mapping.md](../../../.specweave/docs/internal/delivery/guides/tool-concept-mapping.md)
- **Jira Sync Skill**: [../skills/jira-sync/SKILL.md](../skills/jira-sync/SKILL.md)

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
**Plugin**: specweave-jira
