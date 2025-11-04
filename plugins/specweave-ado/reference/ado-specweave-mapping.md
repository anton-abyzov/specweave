# Azure DevOps ↔ SpecWeave Concept Mapping

**Purpose**: Quick reference for mapping Azure DevOps work items to SpecWeave architecture

**Source of Truth**: [.specweave/docs/internal/delivery/guides/tool-concept-mapping.md](../../../.specweave/docs/internal/delivery/guides/tool-concept-mapping.md)

**Last Synced**: 2025-11-04

---

## 🚨 CRITICAL: Agents MUST Follow This Mapping

When syncing between Azure DevOps and SpecWeave, you **MUST** use these exact mappings. Do not deviate or create custom mappings.

---

## Core Concept Mapping

| ADO Concept | SpecWeave Concept | Location | Mapping Rule |
|-------------|-------------------|----------|--------------|
| **Epic** | Increment | `.specweave/increments/####-{name}/` | 1 Epic = 1 Increment (1:1) |
| **Feature** | PRD or RFC | Context-dependent | Depends on scope (business vs technical) |
| **User Story** | PRD or RFC | Context-dependent | Same as Feature |
| **Task** | Task | `.specweave/increments/####-{name}/tasks.md` | Implementation tasks |
| **Bug** | Incident | `.specweave/docs/internal/operations/incidents/{id}.md` | Operational issues |
| **Sprint** | Release Plan | `.specweave/docs/internal/delivery/release-v{version}.md` | Sprint planning |
| **Area** | Module | `.specweave/docs/internal/architecture/{module}/` | Functional areas |
| **Test Case** | Test | `tests/` or `.specweave/increments/####/tasks.md` | Automated/manual tests |
| **Iteration** | Release Plan | `.specweave/docs/internal/delivery/release-v{version}.md` | Same as Sprint |

---

## Epic → Increment Mapping (MANDATORY 1:1)

**Rule**: **ONE ADO Epic = ONE SpecWeave Increment**

This is the **MOST CRITICAL** mapping. Never deviate from this 1:1 relationship.

**Bidirectional Link**:
```json
// .specweave/increments/####-{name}/metadata.json
{
  "external_ids": {
    "ado": {
      "work_item_id": 12345,
      "work_item_url": "https://dev.azure.com/myorg/MyProject/_workitems/edit/12345",
      "work_item_type": "Epic",
      "organization": "myorg",
      "project": "MyProject"
    }
  }
}
```

**Example**:
```
ADO Epic #12345: "User Authentication"
  ↓
SpecWeave: .specweave/increments/0005-user-authentication/
```

---

## Feature/User Story → PRD or RFC (Context-Dependent)

**Critical Decision Tree** (use this EXACTLY):

```
Is the Feature/User Story primarily a business requirement?
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

**Detection Rules** (use ADO fields):
1. **Business Feature/Story → PRD**:
   - Work item type: Feature or User Story
   - Tags: `business`, `requirement`, `user-story`
   - Description contains: "As a user", "I want to", "so that"

2. **Technical Feature/Story → RFC**:
   - Work item type: Feature or User Story
   - Tags: `technical`, `design`, `api`, `architecture`
   - Description contains: "Design", "Implement", "API", "Technical"

3. **Architecture Decision → ADR**:
   - Work item type: Task or Feature
   - Tags: `decision`, `adr`, `architecture-decision`
   - Title starts with: "Decide", "Choose", "Select", "Evaluate"

4. **Implementation Task → Task**:
   - Work item type: Task
   - No special tags
   - Specific, actionable work

---

## State Mapping (MUST BE EXACT)

| ADO State | SpecWeave Status | Notes |
|-----------|------------------|-------|
| `New` | `planned` | Not started |
| `Active` | `in_progress` | Active development |
| `Resolved` | `in_progress` | Awaiting deployment, still in progress |
| `Closed` | `completed` | Fully complete |
| `Removed` | `cancelled` | Decided not to do |

**Custom States** (map to closest standard):
- `Proposed` → `planned`
- `Committed` → `planned`
- `In Progress` → `in_progress`
- `In Review` → `in_progress`
- `Done` → `completed`
- `Cut` → `cancelled`

**Why "Resolved" → "in_progress"?**
- In ADO, "Resolved" typically means code complete but not deployed
- SpecWeave considers work incomplete until deployed/verified
- Use `completed` only when fully done (deployed + verified)

---

## Priority Mapping

| ADO Priority | SpecWeave Priority | Description |
|--------------|-------------------|-------------|
| `1` | `P1` | Critical, must do now |
| `2` | `P2` | High priority |
| `3` | `P3` | Medium priority |
| `4` | `P4` | Low priority, nice-to-have |
| (unset) | `P3` | Default to medium |

---

## Sprint/Iteration → Release Plan Mapping

**Mapping Rule**: 1 ADO Sprint/Iteration = 1 SpecWeave Release Plan

**Example**:
```
ADO: Sprint 1 "Jan 1-14" (Path: MyProject\Sprint 1)
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

**Mapping Rule**: ADO Tasks map directly to SpecWeave Tasks

**Format**:
```markdown
# tasks.md

## Implementation Tasks

- [ ] **T-001**: Set up OAuth 2.0 client config (ADO: #45678)
- [ ] **T-002**: Implement login endpoint (ADO: #45679)
- [ ] **T-003**: Write unit tests (ADO: #45680)
- [ ] **T-004**: Write E2E tests (ADO: #45681)
- [ ] **T-005**: Deploy to staging (ADO: #45682)
```

**Bidirectional Link**:
```json
// metadata.json
{
  "external_ids": {
    "ado": {
      "tasks": [
        {"id": "T-001", "work_item_id": 45678},
        {"id": "T-002", "work_item_id": 45679},
        {"id": "T-003", "work_item_id": 45680}
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
**ADO Bug**: #99999
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

- [ ] Set up SSL cert expiration monitoring (created ADO Feature #100000)
- [ ] Automate cert renewal
```

---

## Area → Module Mapping

**ADO Area** maps to **SpecWeave Module** (architecture folder)

**Example**:
```
ADO Area: "MyProject\Frontend\Authentication"
  ↓
SpecWeave: .specweave/docs/internal/architecture/frontend-auth/
```

**Module Contents**:
- HLD (High-Level Design)
- Component diagrams
- API contracts
- Data models

---

## Test Case → Test Mapping

**ADO Test Case** maps to **SpecWeave Test** (automated or manual)

**Mapping Options**:

1. **Automated Tests**:
   ```
   ADO Test Case #55555: "Verify login with valid credentials"
     ↓
   Code: tests/e2e/auth/login.spec.ts
   Function: test('should login with valid credentials', ...)
   ```

2. **Manual Tests** (v0.7.0+):
   ```
   ADO Test Case #55555: "Manual smoke test for production"
     ↓
   SpecWeave: .specweave/increments/0005-user-authentication/tasks.md
   Test Case: AC-US1-01 (BDD format: Given/When/Then)
   ```

---

## Sync Scenarios (Step-by-Step)

### Scenario 1: New ADO Epic Created

**What Happens**:
1. ADO: Epic #12345 "Payment Integration" created
2. SpecWeave sync detects new Epic
3. SpecWeave creates new increment:
   ```bash
   .specweave/increments/0005-payment-integration/
   ├── metadata.json  # external_ids.ado.work_item_id = 12345
   ├── spec.md
   ├── plan.md
   └── tasks.md
   ```
4. SpecWeave creates PRD stub:
   ```bash
   .specweave/docs/internal/strategy/prd-payment-integration.md
   ```
5. SpecWeave logs sync in `.specweave/logs/ado-sync.json`

### Scenario 2: ADO Epic State Changed

**What Happens**:
1. ADO: Epic #12345 state changed from "New" → "Active"
2. SpecWeave sync detects state change
3. SpecWeave updates `metadata.json`:
   ```json
   {
     "status": "in_progress",
     "started": "2025-11-04T10:00:00Z",
     "updated": "2025-11-04T10:00:00Z"
   }
   ```
4. SpecWeave commits change: `sync: ADO Epic #12345 state → in_progress`

### Scenario 3: New Feature Added to Epic

**What Happens**:
1. ADO: Feature #45600 created, linked to Epic #12345
2. SpecWeave sync detects new Feature
3. SpecWeave analyzes feature:
   - Is it business requirement? → Create PRD
   - Is it technical design? → Create RFC
4. SpecWeave updates `metadata.json`:
   ```json
   {
     "external_ids": {
       "ado": {
         "features": [45600]
       }
     },
     "docs": {
       "prd": ".specweave/docs/internal/strategy/prd-payment-integration.md"
     }
   }
   ```

### Scenario 4: SpecWeave ADR Created → Sync to ADO

**What Happens**:
1. Developer creates ADR locally:
   ```bash
   .specweave/docs/internal/architecture/adr/0001-use-stripe.md
   ```
2. Developer commits and pushes
3. SpecWeave post-commit hook detects new ADR
4. SpecWeave finds related increment (via `metadata.json` → docs.adrs)
5. SpecWeave creates ADO Feature:
   - Title: "ADR 0001: Use Stripe for Payments"
   - Type: Feature
   - Parent: Epic #12345
   - Link: URL to ADR in repo
6. SpecWeave updates `metadata.json`:
   ```json
   {
     "external_ids": {
       "ado": {
         "features": [45600, 45700]
       }
     },
     "docs": {
       "adrs": [
         ".specweave/docs/internal/architecture/adr/0001-use-stripe.md"
       ]
     }
   }
   ```

---

## Conflict Resolution

### Conflict: Both ADO and SpecWeave Changed State

**Scenario**:
- ADO Epic #12345: State changed from "Active" → "Resolved" (at 10:00 AM)
- SpecWeave Increment 0005: Status changed from "in_progress" → "on_hold" (at 10:05 AM)
- Last sync: 9:00 AM

**Detection**:
- Sync runs at 10:15 AM
- Finds both changed since last sync

**Resolution Options**:

1. **Prompt User** (default):
   ```
   Conflict detected for increment 0005-payment-integration:
   - ADO Epic #12345: Resolved (changed at 10:00 AM)
   - SpecWeave: on_hold (changed at 10:05 AM)

   Which version to keep?
   1) Use ADO (Resolved → in_progress)
   2) Use SpecWeave (on_hold)
   3) Merge manually
   ```

2. **Auto-Resolve (configured)**:
   - SpecWeave wins (local is source of truth)
   - ADO wins (team collaboration via ADO)

3. **Log Conflict**:
   ```json
   // .specweave/logs/ado-sync.json
   {
     "conflicts": [
       {
         "increment": "0005",
         "field": "status",
         "ado_value": "Resolved",
         "specweave_value": "on_hold",
         "timestamp": "2025-11-04T10:15:00Z",
         "resolution": "manual",
         "resolved_by": "@john-doe",
         "resolved_at": "2025-11-04T10:20:00Z",
         "final_value": "on_hold"
       }
     ]
   }
   ```

---

## Traceability Examples

### Example 1: From ADO Epic to Code

**Start**: ADO Epic #12345 "Payment Integration"

**Trace** (`specweave trace --ado 12345`):
```
ADO Epic: #12345 "Payment Integration"
  ↓
SpecWeave Increment: 0005-payment-integration
  ↓
PRD: .specweave/docs/internal/strategy/prd-payment-integration.md
  (ADO Feature: #45600)
  ↓
HLD: .specweave/docs/internal/architecture/hld-payment-integration.md
  ↓
ADR: .specweave/docs/internal/architecture/adr/0001-use-stripe.md
  (ADO Feature: #45700)
  ↓
RFC: .specweave/docs/internal/architecture/rfc/0001-payment-api.md
  (ADO Feature: #45650)
  ↓
Code: src/services/payment/
  ↓
Tests: tests/e2e/payment.spec.ts
  ↓
Runbook: .specweave/docs/internal/operations/runbook-payment-service.md
```

### Example 2: From Code to ADO Epic

**Start**: Code file `src/services/payment/stripe.ts`

**Trace** (`specweave trace --file src/services/payment/stripe.ts`):
```
File: src/services/payment/stripe.ts
  ↓
Increment: 0005-payment-integration
  ↓
ADO Epic: #12345 "Payment Integration"
  URL: https://dev.azure.com/myorg/MyProject/_workitems/edit/12345
  ↓
PRD: .specweave/docs/internal/strategy/prd-payment-integration.md
HLD: .specweave/docs/internal/architecture/hld-payment-integration.md
ADRs:
  - 0001-use-stripe.md (ADO Feature: #45700)
RFCs:
  - 0001-payment-api.md (ADO Feature: #45650)
```

---

## Validation Checklist

**Before syncing, verify**:
- [ ] ADO Epic exists and is accessible
- [ ] Increment metadata has valid ADO link
- [ ] State mapping follows rules above (no custom mappings)
- [ ] Priority mapped correctly (P1/P2/P3/P4)
- [ ] Feature/Story type detection used decision tree (PRD vs RFC vs ADR vs Task)
- [ ] Bidirectional links are valid (Epic ↔ Increment)
- [ ] Task IDs match between ADO and SpecWeave
- [ ] Conflicts resolved (if any)

---

## Security: Azure DevOps Personal Access Token (PAT)

**Required**:
- Personal Access Token (from https://dev.azure.com/{org}/_usersSettings/tokens)
- Organization name
- Project name

**Scopes Needed**:
- Work Items (Read & Write)
- Comments (Read & Write)

**Storage**:
```bash
# .env (gitignored)
AZURE_DEVOPS_PAT=your-token-here
AZURE_DEVOPS_ORG=myorg
AZURE_DEVOPS_PROJECT=MyProject
```

**Authentication**:
```bash
# Basic Auth: base64(:token)
AUTH=$(echo -n ":$AZURE_DEVOPS_PAT" | base64)
```

**Never**:
- ❌ Log or commit PAT
- ❌ Share PAT via Slack/email
- ❌ Use PAT with excessive permissions

---

## API Rate Limits

**Azure DevOps Limits**:
- 200 requests per minute per PAT
- 5000 requests per hour per PAT

**Strategy**:
- Track request count
- Implement token bucket algorithm
- Queue requests if approaching limit
- Warn user if rate limit hit

---

## Related Documentation

- **Full Mapping Guide**: [.specweave/docs/internal/delivery/guides/tool-concept-mapping.md](../../../.specweave/docs/internal/delivery/guides/tool-concept-mapping.md)
- **ADO Sync Skill**: [../skills/ado-sync/SKILL.md](../skills/ado-sync/SKILL.md)
- **ADO Manager Agent**: [../agents/ado-manager/AGENT.md](../agents/ado-manager/AGENT.md)

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
**Plugin**: specweave-ado
