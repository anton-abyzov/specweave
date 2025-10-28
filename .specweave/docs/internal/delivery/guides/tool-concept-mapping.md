# Tool Concept Mapping - SpecWeave Integration

**Purpose**: Map concepts from Jira, Azure DevOps (ADO), GitHub, and other tools to SpecWeave's PRD/HLD/RFC/Runbook pattern.

---

## Complete Concept Mapping Table

| Tool | Concept | SpecWeave Concept | Location | Notes |
|------|---------|-------------------|----------|-------|
| **Jira** | Epic | **Increment** | `features/0001-feature-name/` | 1 Epic = 1 Increment |
| **Jira** | Story (business) | **PRD** | `docs/internal/strategy/prd-{name}.md` | Business requirement stories |
| **Jira** | Story (technical) | **RFC** | `docs/internal/architecture/rfc/0001-{name}.md` | Technical design stories |
| **Jira** | Task | **Task** | `features/0001-feature-name/tasks.md` | Executable tasks |
| **Jira** | Subtask | **Subtask** | Same as Task | Sub-items in tasks.md |
| **Jira** | Bug | **Incident** | `docs/internal/operations/incidents/{id}.md` | Operational issues |
| **Jira** | Sprint | **Release Plan** | `docs/internal/delivery/release-v1.0.md` | Sprint = Release iteration |
| **Jira** | Component | **Module** | `docs/internal/architecture/{module}/` | Code/doc modules |
| **Jira** | Label | **Tag** | `metadata.yaml` → tags | Filtering/categorization |
| **Jira** | Version | **Release** | `docs/internal/delivery/release-v1.0.md` | Release versions |
| | | | | |
| **Azure DevOps** | Epic | **Increment** | `features/0001-feature-name/` | 1 Epic = 1 Increment |
| **Azure DevOps** | Feature | **PRD** or **RFC** | Strategy or Architecture | Depends on scope |
| **Azure DevOps** | User Story | **PRD** or **RFC** | Strategy or Architecture | Same as Feature |
| **Azure DevOps** | Task | **Task** | `features/0001-feature-name/tasks.md` | Executable tasks |
| **Azure DevOps** | Bug | **Incident** | `docs/internal/operations/incidents/{id}.md` | Operational issues |
| **Azure DevOps** | Sprint | **Release Plan** | `docs/internal/delivery/release-v1.0.md` | Sprint planning |
| **Azure DevOps** | Area | **Module** | `docs/internal/architecture/{module}/` | Functional areas |
| **Azure DevOps** | Test Case | **Test** | `tests/` or `features/{}/tests.md` | Automated/manual tests |
| | | | | |
| **GitHub** | Milestone | **Release Plan** | `docs/internal/delivery/release-v1.0.md` | Milestone = Release |
| **GitHub** | Project | **Increment** or **Release** | Depends on scope | Board = Release or Increment |
| **GitHub** | Issue (feature) | **RFC** | `docs/internal/architecture/rfc/0001-{name}.md` | Feature requests |
| **GitHub** | Issue (bug) | **Incident** | `docs/internal/operations/incidents/{id}.md` | Bug reports |
| **GitHub** | Issue (task) | **Task** | `features/0001-feature-name/tasks.md` | Tasks |
| **GitHub** | Pull Request | **Implementation** | Code + increment link | PR linked to increment |
| **GitHub** | Label | **Tag** | `metadata.yaml` → tags | Categorization |
| | | | | |
| **Generic** | Product Roadmap | **Roadmap** | `docs/internal/delivery/roadmap.md` | Long-term planning |
| **Generic** | Release Notes | **Changelog** | `docs/public/changelog/` or `docs/internal/delivery/` | What shipped |
| **Generic** | Architecture Doc | **HLD** | `docs/internal/architecture/hld-{system}.md` | System design |
| **Generic** | API Spec | **RFC** | `docs/internal/architecture/rfc/0001-api.md` | API design |
| **Generic** | Decision Log | **ADR** | `docs/internal/architecture/adr/0001-{decision}.md` | Architecture decisions |
| **Generic** | Runbook | **Runbook** | `docs/internal/operations/runbook-{service}.md` | Operational procedures |
| **Generic** | SLA/SLO | **SLO** | `docs/internal/operations/slo-{service}.md` | Service levels |
| **Generic** | Incident | **Incident** | `docs/internal/operations/incidents/{id}.md` | Postmortems |
| **Generic** | Security Policy | **Governance** | `docs/internal/governance/security-model.md` | Policies |

---

## Mapping Rules

### Rule 1: Epics → Increments (1:1)

**Definition**: One Jira/ADO Epic = One SpecWeave Increment

**Why**: Epics represent large bodies of work that map naturally to SpecWeave's increment concept.

**Sync**:
```yaml
# features/0001-user-authentication/metadata.yaml
external_ids:
  jira:
    epic: PROJ-123
  ado:
    epic: 456789
```

**Traceability**:
- Jira Epic PROJ-123 → Increment 0001
- Increment 0001 → Jira Epic PROJ-123

---

### Rule 2: Stories → PRD or RFC (Context-Dependent)

**Decision Tree**:
```
Is the story primarily a business requirement?
├─ YES → PRD (docs/internal/strategy/prd-{name}.md)
│   Example: "As a user, I want to log in with email so I can access my account"
│
└─ NO → Is it a technical design/API change?
    ├─ YES → RFC (docs/internal/architecture/rfc/0001-{name}.md)
    │   Example: "Design OAuth 2.0 authentication API"
    │
    └─ NO → Is it an architecture decision?
        ├─ YES → ADR (docs/internal/architecture/adr/0001-{decision}.md)
        │   Example: "Decide between OAuth 2.0 vs SAML"
        │
        └─ NO → Task (features/0001-feature-name/tasks.md)
            Example: "Write unit tests for login endpoint"
```

**Sync**:
```yaml
# features/0001-user-authentication/metadata.yaml
external_ids:
  jira:
    stories:
      - PROJ-124  # Business story → PRD
      - PROJ-125  # Technical story → RFC
docs:
  prd: docs/internal/strategy/prd-user-authentication.md  # From PROJ-124
  rfcs:
    - docs/internal/architecture/rfc/0001-auth-api.md  # From PROJ-125
```

---

### Rule 3: Tasks → Tasks (Direct)

**Definition**: Jira/ADO Tasks map directly to SpecWeave Tasks

**Location**: `features/0001-feature-name/tasks.md`

**Format**:
```markdown
# Tasks for 0001-user-authentication

## Implementation Tasks

- [ ] **TASK-001**: Set up OAuth 2.0 client config (Jira: PROJ-126)
- [ ] **TASK-002**: Implement login endpoint (Jira: PROJ-127)
- [ ] **TASK-003**: Write unit tests (Jira: PROJ-128)
- [ ] **TASK-004**: Write E2E tests (Jira: PROJ-129)
- [ ] **TASK-005**: Deploy to staging (Jira: PROJ-130)
```

**Sync**: Task completion in Jira → Update checkbox in SpecWeave

---

### Rule 4: Bugs → Incidents (Operations)

**Definition**: Bugs are operational incidents, not development tasks

**Location**: `docs/internal/operations/incidents/{id}.md`

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

- [ ] Set up SSL cert expiration monitoring
- [ ] Automate cert renewal (created Jira story PROJ-1000)
```

---

### Rule 5: Sprints/Milestones → Release Plans

**Definition**: Sprints/Milestones are time-boxed release plans

**Location**: `docs/internal/delivery/release-v1.0.md`

**Mapping**:
```
Jira Sprint 1 (Jan 1-14) → Release v1.0 (Target: Jan 14)
Jira Sprint 2 (Jan 15-28) → Release v1.1 (Target: Jan 28)
```

**Release Plan Content**:
- What increments are included
- What features ship
- Testing strategy
- Rollout plan
- Rollback plan

---

## Status Mapping

### Jira Status → SpecWeave Status

| Jira Status | SpecWeave Status | Notes |
|-------------|------------------|-------|
| To Do | `planned` | Not started |
| In Progress | `in_progress` | Active development |
| In Review | `in_progress` | Code review, still in progress |
| Done | `completed` | Fully complete |
| On Hold | `on_hold` | Temporarily paused |
| Won't Do | `cancelled` | Decided not to do |

### ADO State → SpecWeave Status

| ADO State | SpecWeave Status | Notes |
|-----------|------------------|-------|
| New | `planned` | Not started |
| Active | `in_progress` | Active development |
| Resolved | `in_progress` | Awaiting deployment |
| Closed | `completed` | Fully complete |
| Removed | `cancelled` | Decided not to do |

### GitHub State → SpecWeave Status

| GitHub State | SpecWeave Status | Notes |
|--------------|------------------|-------|
| Open | `planned` or `in_progress` | Depends on labels/assignee |
| Closed | `completed` or `cancelled` | Depends on why closed |

---

## Priority Mapping

| Tool Priority | SpecWeave Priority | Description |
|---------------|-------------------|-------------|
| Jira: Highest | `P1` | Critical, must do now |
| Jira: High | `P2` | High priority |
| Jira: Medium | `P3` | Medium priority |
| Jira: Low | `P4` | Low priority, nice-to-have |
| ADO: 1 | `P1` | Critical |
| ADO: 2 | `P2` | High |
| ADO: 3 | `P3` | Medium |
| ADO: 4 | `P4` | Low |

---

## Sync Scenarios

### Scenario 1: New Jira Epic Created

**What Happens**:
1. Jira webhook fires: "Epic PROJ-123 created"
2. SpecWeave receives webhook
3. SpecWeave creates new increment:
   ```bash
   features/0001-user-authentication/
   ├── metadata.yaml  # external_ids.jira.epic = PROJ-123
   ├── spec.md
   ├── plan.md
   ├── tasks.md
   └── tests.md
   ```
4. SpecWeave creates PRD stub:
   ```bash
   docs/internal/strategy/prd-user-authentication.md
   ```
5. SpecWeave logs sync in `sync/jira-sync.json`

### Scenario 2: Jira Epic Status Changed (To Do → In Progress)

**What Happens**:
1. Jira webhook: "Epic PROJ-123 status changed to In Progress"
2. SpecWeave receives webhook
3. SpecWeave updates `metadata.yaml`:
   ```yaml
   status: in_progress
   started: 2025-01-20T10:00:00Z
   updated: 2025-01-20T10:00:00Z
   ```
4. SpecWeave commits change: `sync: Epic PROJ-123 status → in_progress`

### Scenario 3: New Story Added to Epic

**What Happens**:
1. Jira: Story PROJ-124 created, linked to Epic PROJ-123
2. SpecWeave receives webhook
3. SpecWeave analyzes story:
   - Is it business requirement? → Create PRD
   - Is it technical design? → Create RFC
4. SpecWeave updates `metadata.yaml`:
   ```yaml
   external_ids:
     jira:
       stories:
         - PROJ-124
   docs:
     prd: docs/internal/strategy/prd-user-authentication.md
   ```

### Scenario 4: SpecWeave ADR Created → Sync to Jira

**What Happens**:
1. Developer creates ADR locally:
   ```bash
   docs/internal/architecture/adr/0001-use-oauth2.md
   ```
2. Developer commits and pushes
3. SpecWeave post-commit hook detects new ADR
4. SpecWeave finds related increment (via `metadata.yaml` → docs.adrs)
5. SpecWeave creates Jira story:
   - Title: "ADR 0001: Use OAuth 2.0"
   - Type: Story
   - Parent: Epic PROJ-123
   - Link: URL to ADR in repo
6. SpecWeave updates `metadata.yaml`:
   ```yaml
   external_ids:
     jira:
       stories:
         - PROJ-124  # Existing
         - PROJ-131  # Newly created for ADR
   docs:
     adrs:
       - docs/internal/architecture/adr/0001-use-oauth2.md
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
   ```yaml
   # .specweave/config.yaml
   sync:
     conflict_resolution: pull  # Use Jira version
   ```

3. **Log Conflict**:
   ```json
   // sync/jira-sync.json
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

**Trace**:
```bash
specweave trace --jira PROJ-123
```

**Output**:
```
Jira Epic: PROJ-123 "User Authentication"
  ↓
SpecWeave Increment: 0001-user-authentication
  ↓
PRD: docs/internal/strategy/prd-user-authentication.md
  (Jira Story: PROJ-124)
  ↓
HLD: docs/internal/architecture/hld-user-authentication.md
  ↓
ADR: docs/internal/architecture/adr/0001-use-oauth2.md
  (Jira Story: PROJ-131)
ADR: docs/internal/architecture/adr/0002-use-auth0.md
  (Jira Story: PROJ-132)
  ↓
RFC: docs/internal/architecture/rfc/0001-auth-api.md
  (Jira Story: PROJ-125)
  ↓
Code: src/services/auth/
  ↓
Tests: tests/e2e/auth.spec.ts
  ↓
Runbook: docs/internal/operations/runbook-auth-service.md
```

### Example 2: From Code to Jira Epic

**Start**: Code file `src/services/auth/oauth.ts`

**Trace**:
```bash
specweave trace --file src/services/auth/oauth.ts
```

**Output**:
```
File: src/services/auth/oauth.ts
  ↓
Increment: 0001-user-authentication
  ↓
Jira Epic: PROJ-123 "User Authentication"
  URL: https://company.atlassian.net/browse/PROJ-123
  ↓
PRD: docs/internal/strategy/prd-user-authentication.md
HLD: docs/internal/architecture/hld-user-authentication.md
ADRs:
  - 0001-use-oauth2.md (Jira: PROJ-131)
  - 0002-use-auth0.md (Jira: PROJ-132)
RFCs:
  - 0001-auth-api.md (Jira: PROJ-125)
```

---

## Related Documentation

- [docs/internal/delivery/BROWNFIELD-INTEGRATION-STRATEGY.md](internal/delivery/BROWNFIELD-INTEGRATION-STRATEGY.md) - Complete brownfield integration guide
- [templates/increment-metadata-template.yaml](../templates/increment-metadata-template.yaml) - Metadata template
- [.specweave/config.yaml](../.specweave/config.yaml) - Sync configuration

---

**Summary**: This document provides complete mapping between Jira/ADO/GitHub concepts and SpecWeave's PRD/HLD/RFC/Runbook pattern, ensuring bi-directional sync and full traceability.
