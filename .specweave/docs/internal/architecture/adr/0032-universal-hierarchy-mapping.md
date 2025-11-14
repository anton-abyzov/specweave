# ADR-0032: Universal Hierarchy Mapping (Jira ↔ ADO ↔ SpecWeave ↔ GitHub)

**Status**: Accepted
**Date**: 2025-11-14
**Deciders**: SpecWeave Core Team
**Priority**: P0 (Critical - Affects entire framework architecture)

---

## Context

SpecWeave currently uses a simplified hierarchy where features are named by concept (e.g., `external-tool-status-sync/`) and stored under a single project folder (`specs/default/`). While this works for single-project scenarios, it creates several critical gaps:

### Problems with Current Architecture

1. **No Cross-Project Features**
   - One feature often spans multiple projects (backend, frontend, mobile)
   - Current structure forces duplicating feature folders or creating artificial boundaries
   - Example: "User Authentication" requires backend API + frontend UI + mobile app changes

2. **No Hierarchy for Strategic Planning**
   - Missing Epic/Theme level (strategic initiatives spanning multiple features)
   - Cannot model: "2025 Q4 Platform Improvements" → "Feature A, B, C"
   - Limits enterprise-scale planning

3. **Inconsistent External Tool Mapping**
   - Jira uses: Theme → Epic → Story → Task
   - Azure DevOps uses: Epic → Feature → User Story → Task
   - GitHub uses: Milestone → Issue → Checkbox
   - SpecWeave only maps to middle tier (Feature/Epic)

4. **Multi-Project Confusion**
   - Where do cross-project specs go? `default/` is misleading
   - How to organize backend vs frontend user stories?
   - No clear answer in current structure

### Work Item Type Matrix Analysis

Based on enterprise patterns from Atlassian/Microsoft documentation:

| Jira Type | ADO (Agile) | ADO (Scrum) | ADO (CMMI) | ADO (SAFe) |
|-----------|-------------|-------------|------------|------------|
| **Theme** | Epic | Epic | Epic | Strategic Theme |
| **Portfolio Initiative** | Epic | Epic | Epic | Portfolio Epic |
| **Initiative** | Epic | Epic | Epic | Capability ✅ |
| **Capability** | Feature | Feature | Feature | Capability ✅ |
| **Epic** | Feature | Feature | Feature | Epic |
| **Story** | User Story | Product Backlog Item | Requirement | User Story |
| **Task** | Task | Task | Task | Task |
| **Sub-task** | Task | Task | Task | Task |

**Key Insight**: We need TWO hierarchy levels:
1. **Epic/Initiative/Capability** (cross-project strategic level)
2. **Feature** (implementation level, can be cross-project OR single-project)

---

## Decision

We will adopt a **Universal Hierarchy** architecture that supports:

### 1. Four-Level Hierarchy

```
Epic (Cross-Project Theme)
  └─ Feature (Cross-Project or Single-Project)
      └─ User Story (Project-Specific)
          └─ Task (Increment-Specific)
```

### 2. New Directory Structure

```
.specweave/docs/internal/specs/
├── _epics/                                # Cross-project epics (themes)
│   └── EPIC-2025-Q4-platform/
│       └── EPIC.md                        # Epic overview + linked features
│
├── _features/                             # Cross-project features (high-level)
│   └── FS-25-11-12-external-tool-sync/    # Feature folder (date-based naming)
│       └── FEATURE.md                     # Feature overview (cross-project)
│
├── backend/                               # Backend project
│   ├── README.md                          # Project overview
│   └── FS-25-11-12-external-tool-sync/    # Feature implementation for backend
│       ├── README.md                      # Feature context (backend-specific)
│       ├── us-001-backend-api.md          # User stories for backend
│       ├── us-002-backend-service.md
│       └── us-003-backend-database.md
│
├── frontend/                              # Frontend project
│   ├── README.md                          # Project overview
│   ├── FS-25-11-12-external-tool-sync/    # SAME feature, different implementation
│   │   ├── README.md                      # Feature context (frontend-specific)
│   │   ├── us-001-frontend-ui.md          # User stories for frontend
│   │   └── us-002-frontend-components.md
│   └── FS-25-11-10-dashboard-redesign/    # Frontend-only feature
│       └── (user stories...)
│
└── mobile/                                # Mobile project (optional)
    └── FS-25-11-12-external-tool-sync/    # SAME feature, mobile implementation
        └── (user stories...)
```

### 3. Naming Conventions

| Level | Format | Example | Location |
|-------|--------|---------|----------|
| **Epic** | `EPIC-YYYY-QN-{name}` | `EPIC-2025-Q4-platform` | `_epics/` |
| **Feature** | `FS-YY-MM-DD-{name}` | `FS-25-11-12-external-tool-sync` | `_features/` + `{project}/` |
| **User Story** | `us-NNN-{name}.md` | `us-001-backend-api.md` | `{project}/FS-*/` |
| **Task** | `T-NNN: {name}` | `T-001: Implement API` | `.specweave/increments/####/tasks.md` |

**Why Date-Based Feature Naming?**
- Aligns with increment creation dates
- Prevents duplicates (one feature per day is reasonable)
- Matches GitHub issue format: `[FS-25-11-12] External Tool Status Sync`
- Easy to sort chronologically
- Clear when feature was started

### 4. Cross-Project Feature Support

**Key Innovation**: Same `FS-*` folder name appears in multiple projects!

**Example**: Feature "User Authentication" (FS-25-11-10-user-auth)
```
_features/
└── FS-25-11-10-user-auth/
    └── FEATURE.md                     # High-level: What is user auth?

backend/
└── FS-25-11-10-user-auth/
    ├── README.md                      # Backend context: OAuth API, JWT tokens
    ├── us-001-oauth-api.md            # Backend user stories
    └── us-002-jwt-tokens.md

frontend/
└── FS-25-11-10-user-auth/
    ├── README.md                      # Frontend context: Login UI, session mgmt
    ├── us-001-login-form.md           # Frontend user stories
    └── us-002-session-handling.md

mobile/
└── FS-25-11-10-user-auth/
    ├── README.md                      # Mobile context: Biometric auth
    └── us-001-biometric-login.md      # Mobile user stories
```

**Result**:
- ✅ One feature spans multiple projects
- ✅ Each project has its own user stories
- ✅ Clear separation of concerns
- ✅ Easy to find related work across projects

---

## Mapping to External Tools

### Universal Hierarchy → External Tool Mapping

| SpecWeave Level | GitHub | Jira | Azure DevOps (Agile) | Azure DevOps (SAFe) |
|-----------------|--------|------|---------------------|-------------------|
| **Epic** (Theme) | **NO SYNC** (internal only) | Theme/Initiative | Epic | Strategic Theme |
| **Feature** (Cross-Project) | **NO SYNC** (internal only) | Epic | Feature | Capability ✅ |
| **User Story** (Project-Specific) | **Issue** ✅ | Story | User Story | User Story |
| **Task** (Increment-Specific) | Issue Checkbox | Sub-task | Task | Task |

### Example Mapping

**SpecWeave**:
```
EPIC-2025-Q4-platform
  └─ FS-25-11-12-external-tool-sync (Feature)
      ├─ backend/FS-25-11-12-external-tool-sync/
      │   └─ us-001-backend-api.md (User Story)
      │       └─ T-001: Implement API (Task in tasks.md)
      └─ frontend/FS-25-11-12-external-tool-sync/
          └─ us-001-frontend-ui.md (User Story)
              └─ T-010: Create UI component (Task in tasks.md)
```

**GitHub** (Only User Stories sync):
```
No Epic or Feature sync to GitHub (internal documentation only)
  ├─ Issue #45: "[US-001] Backend API for Status Sync"
  │   ├─ Link to Feature: .specweave/docs/internal/specs/_features/FS-25-11-12/
  │   └─ Checkbox: "T-001: Implement API endpoint"
  └─ Issue #46: "[US-001] Frontend UI for Status Display"
      ├─ Link to Feature: .specweave/docs/internal/specs/_features/FS-25-11-12/
      └─ Checkbox: "T-010: Create status component"
```

**Jira**:
```
Initiative: "2025 Q4 Platform Improvements"
  └─ Epic: "FS-25-11-12: External Tool Status Sync"
      ├─ Story: "Backend API for Status Sync"
      │   └─ Sub-task: "Implement API endpoint"
      └─ Story: "Frontend UI for Status Display"
          └─ Sub-task: "Create status component"
```

**Azure DevOps (SAFe)**:
```
Strategic Theme: "2025 Q4 Platform Improvements"
  └─ Capability: "External Tool Status Sync"
      ├─ User Story: "Backend API for Status Sync"
      │   └─ Task: "Implement API endpoint"
      └─ User Story: "Frontend UI for Status Display"
          └─ Task: "Create status component"
```

---

## File Structure Details

### Epic File (`_epics/EPIC-*/EPIC.md`)

```yaml
---
id: EPIC-2025-Q4-platform
title: "2025 Q4 Platform Improvements"
type: epic
status: in-progress
priority: P0
created: 2025-10-01
last_updated: 2025-11-14
quarter: 2025-Q4
external_tools:
  # GitHub: NO SYNC for Epics (internal only)
  jira:
    type: initiative
    key: null
    url: null
  ado:
    type: epic
    id: null
    url: null
---

# EPIC-2025-Q4-platform: 2025 Q4 Platform Improvements

## Strategic Overview

[High-level strategic goal - why this epic matters to the business]

## Features in This Epic

- [FS-25-11-12: External Tool Status Sync](../../_features/FS-25-11-12-external-tool-sync/FEATURE.md)
- [FS-25-11-10: User Authentication](../../_features/FS-25-11-10-user-auth/FEATURE.md)
- [FS-25-11-05: Dashboard Redesign](../../_features/FS-25-11-05-dashboard-redesign/FEATURE.md)

## Success Metrics

[How we measure epic success]

## Timeline

**Start**: 2025-10-01
**Target Completion**: 2025-12-31 (Q4 end)
```

### Feature File (`_features/FS-*/FEATURE.md`)

```yaml
---
id: FS-25-11-12-external-tool-sync
title: "External Tool Status Synchronization"
type: feature
status: in-progress
priority: P1
created: 2025-11-12
last_updated: 2025-11-14
epic: EPIC-2025-Q4-platform
projects:                                # NEW: Which projects implement this?
  - backend
  - frontend
external_tools:
  # GitHub: NO SYNC for Features (internal only)
  # User Stories will sync to GitHub Issues
  jira:
    type: epic
    key: SPEC-123
    url: https://company.atlassian.net/browse/SPEC-123
  ado:
    type: feature
    id: 456
    url: https://dev.azure.com/org/project/_workitems/edit/456
---

# FS-25-11-12: External Tool Status Synchronization

## Feature Overview

[High-level description - what problem does this solve?]

## Business Value

[Why this feature matters]

## Projects Implementing This Feature

- **Backend**: API endpoints for status sync, webhook handlers
- **Frontend**: UI for displaying sync status, manual sync triggers

## User Stories (Cross-Project View)

### Backend User Stories
- [US-001: Backend API for Status Sync](../../backend/FS-25-11-12-external-tool-sync/us-001-backend-api.md)
- [US-002: Webhook Handler](../../backend/FS-25-11-12-external-tool-sync/us-002-webhook-handler.md)

### Frontend User Stories
- [US-001: Status Display UI](../../frontend/FS-25-11-12-external-tool-sync/us-001-status-ui.md)
- [US-002: Manual Sync Button](../../frontend/FS-25-11-12-external-tool-sync/us-002-manual-sync.md)

## Implementation History

| Increment | Projects | Stories Implemented | Status | Completion Date |
|-----------|----------|---------------------|--------|-----------------|
| [0031](../../../../increments/0031-external-tool-status-sync/) | Backend, Frontend | 7 stories | ✅ Complete | 2025-11-14 |

## External Tool Integration

**GitHub**: No direct sync (User Stories sync to GitHub Issues)
**Jira Epic**: https://company.atlassian.net/browse/SPEC-123
**Azure DevOps Feature**: https://dev.azure.com/org/project/_workitems/edit/456
```

### Project-Specific Feature Context (`{project}/FS-*/README.md`)

```yaml
---
id: FS-25-11-12-external-tool-sync-backend
title: "External Tool Status Sync - Backend Implementation"
feature: FS-25-11-12-external-tool-sync
project: backend
type: feature-context
status: in-progress
priority: P1
created: 2025-11-12
last_updated: 2025-11-14
---

# Backend Implementation: External Tool Status Sync

## Backend-Specific Context

This feature requires:
- **OAuth API endpoints** for authentication
- **Webhook handlers** for external tool events
- **Database schema** for sync state tracking
- **Background jobs** for retry logic

## Tech Stack

- Node.js 18+
- PostgreSQL 14+
- Redis (for job queue)
- OAuth 2.0 (GitHub, Jira, ADO)

## User Stories (Backend)

- [US-001: Backend API for Status Sync](./us-001-backend-api.md)
- [US-002: Webhook Handler for External Events](./us-002-webhook-handler.md)
- [US-003: Database Schema for Sync State](./us-003-database-schema.md)

## Dependencies

- **External APIs**: GitHub API, Jira REST API, Azure DevOps REST API
- **Internal Services**: Auth service, Notification service

## Related Features

- [FS-25-11-10: User Authentication](../FS-25-11-10-user-auth/) (provides OAuth)
```

### User Story File (`{project}/FS-*/us-NNN-{name}.md`)

```yaml
---
id: us-001-backend-api
title: "Backend API for Status Sync"
feature: FS-25-11-12-external-tool-sync
project: backend
type: user-story
status: completed
priority: P1
created: 2025-11-12
completed: 2025-11-14
external_tools:
  github:
    type: issue
    number: 45
    url: https://github.com/owner/repo/issues/45
  jira:
    type: story
    key: SPEC-124
    url: https://company.atlassian.net/browse/SPEC-124
  ado:
    type: user-story
    id: 457
    url: https://dev.azure.com/org/project/_workitems/edit/457
---

# US-001: Backend API for Status Sync

**Feature**: [FS-25-11-12: External Tool Status Sync](../../../_features/FS-25-11-12-external-tool-sync/FEATURE.md)

## User Story

**As a** SpecWeave user
**I want** a backend API that syncs status with external tools
**So that** my increments are always in sync with GitHub/Jira/ADO

## Acceptance Criteria

- [ ] **AC-US1-01**: POST /api/sync/status endpoint accepts increment ID and status (P1, testable)
- [ ] **AC-US1-02**: Endpoint validates status against configured mappings (P1, testable)
- [ ] **AC-US1-03**: Successful sync returns 200 with sync confirmation (P1, testable)
- [ ] **AC-US1-04**: Failed sync returns 4xx/5xx with error details (P1, testable)

## Implementation

Implemented in:
- **Increment**: [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/)
- **Tasks**:
  - [T-001: Create API endpoint](../../../../increments/0031-external-tool-status-sync/tasks.md#t-001-create-api-endpoint)
  - [T-002: Add validation](../../../../increments/0031-external-tool-status-sync/tasks.md#t-002-add-validation)
  - [T-003: Write tests](../../../../increments/0031-external-tool-status-sync/tasks.md#t-003-write-tests)

## Related Stories

- [US-002: Webhook Handler](./us-002-webhook-handler.md) (receives external events)
- [Frontend US-001](../../frontend/FS-25-11-12-external-tool-sync/us-001-status-ui.md) (consumes this API)

## External Tool Links

- **GitHub Issue #45**: https://github.com/owner/repo/issues/45
- **Jira Story SPEC-124**: https://company.atlassian.net/browse/SPEC-124
- **ADO User Story #457**: https://dev.azure.com/org/project/_workitems/edit/457
```

---

## Consequences

### Positive

1. **Universal Mapping**: Seamless sync between Jira, ADO, GitHub, and SpecWeave
2. **Cross-Project Features**: One feature can span multiple projects naturally
3. **Clear Hierarchy**: Epic → Feature → User Story → Task (matches enterprise patterns)
4. **Better Organization**: `_features/` for cross-project, `{project}/` for project-specific
5. **Traceability**: Complete path from epic to task across all tools
6. **Scalability**: Supports enterprise-scale planning (themes, initiatives)

### Negative

1. **Migration Required**: Must migrate existing `specs/default/` structure
2. **Breaking Change**: All existing living docs sync logic must be updated
3. **Increased Complexity**: More folders and files to manage
4. **Learning Curve**: Users must understand epic vs feature vs user story
5. **Tool Sync Complexity**: Must map to 4 different external tool hierarchies

### Neutral

1. **More Folders**: More structure means more navigation
2. **Date-Based Naming**: Requires extracting dates from increment metadata
3. **README.md Proliferation**: Each project + feature needs context file

---

## Implementation Plan

### Phase 1: Core Structure (Week 1)
1. Create `_epics/` and `_features/` folders
2. Update `HierarchyMapper` to support new structure
3. Update `SpecDistributor` to write to correct locations
4. Write migration script for existing specs

### Phase 2: External Tool Sync (Week 2)
1. Update GitHub sync to support milestone (feature) + issue (user story)
2. Update Jira sync to support epic (feature) + story (user story)
3. Update ADO sync to support feature/capability + user story
4. Test cross-project sync

### Phase 3: Migration & Testing (Week 3)
1. Migrate existing `specs/default/` to new structure
2. Update all tests (unit, integration, E2E)
3. Update documentation (public + internal)
4. Create migration guide for users

---

## Alternatives Considered

### Alternative 1: Keep Current Structure (Rejected)
**Pros**: No migration, no breaking changes
**Cons**: Can't support cross-project features, no epic level, inconsistent with external tools

### Alternative 2: Flat Structure with Tags (Rejected)
**Pros**: Simple, no hierarchy
**Cons**: Doesn't match external tool hierarchies, hard to navigate, poor traceability

### Alternative 3: Increment-Based Naming (FS-031) (Rejected)
**Pros**: Matches increment numbers
**Cons**: Features aren't numbered, creates duplicates when multiple increments contribute to same feature

### Alternative 4: Date-Based Naming (FS-YY-MM-DD) (✅ SELECTED)
**Pros**: Chronological, prevents duplicates, matches increment creation dates, aligns with GitHub issue format
**Cons**: Requires extracting dates from metadata

---

## Migration Strategy

### Automated Migration Script

```bash
# Run migration script
npm run migrate-to-universal-hierarchy

# What it does:
# 1. Create _epics/ and _features/ folders
# 2. Detect which features are cross-project vs single-project
# 3. Move features to appropriate locations
# 4. Create project-specific README.md files
# 5. Update all user story links
# 6. Update increment metadata
# 7. Validate structure
```

### Manual Migration (if needed)

1. **Identify Cross-Project Features**
   - Review existing features in `specs/default/`
   - Determine which span multiple projects

2. **Create Feature in _features/**
   ```bash
   mkdir -p .specweave/docs/internal/specs/_features/FS-25-11-12-{name}
   # Create FEATURE.md with cross-project overview
   ```

3. **Create Project-Specific Implementations**
   ```bash
   mkdir -p .specweave/docs/internal/specs/backend/FS-25-11-12-{name}
   mkdir -p .specweave/docs/internal/specs/frontend/FS-25-11-12-{name}
   # Create README.md and move user stories
   ```

4. **Update Links**
   - Update user story links to point to new locations
   - Update increment frontmatter to reference new feature paths

---

## Success Criteria

1. **Structure**: All features organized under `_features/` and `{project}/`
2. **Migration**: 100% of existing specs migrated without data loss
3. **Tests**: All tests pass with new structure
4. **Sync**: GitHub, Jira, and ADO sync work with new hierarchy
5. **Documentation**: Complete migration guide and user documentation
6. **Performance**: No degradation in sync or query performance

---

## References

- **Work Item Type Matrix**: [Complete Work Item Type Matrix (Jira ↔ ADO)](https://community.atlassian.com/t5/Jira-Software-questions/Azure-DevOps-to-JIRA-migration/qaq-p/1234567)
- **ADR-0017**: Multi-Project Internal Structure
- **ADR-0024**: Bidirectional Spec Sync
- **ADR-0030**: Intelligent Living Docs Sync
- **Increment 0031**: External Tool Status Synchronization

---

**Decision Date**: 2025-11-14
**Review Date**: 2025-12-01 (after implementation)
