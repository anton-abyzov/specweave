---
increment: 0125-cross-project-user-story-targeting
title: "Cross-Project User Story Targeting"
type: feature
priority: P1
status: completed
created: 2025-12-08
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Cross-Project User Story Targeting

## Problem Statement

**Current State**: `activeProject` in config.json is a flawed concept because:

1. **Real-world increments are cross-cutting** - A single feature like "OAuth Implementation" touches:
   - Frontend team (login UI)
   - Backend team (auth API)
   - Security team (security audit - potentially different JIRA project!)
   - Shared library (types, validators)
   - Infrastructure (IAM policies, secrets management)

2. **User stories inherit increment's project** - All USs in an increment sync to the SAME project/board, which is incorrect for cross-cutting work.

3. **External sync is increment-level** - GitHub/JIRA/ADO issues are created for the entire increment, not per-US to the correct project/board.

### Real-World Example: OAuth Implementation

```
Increment: 0125-oauth-implementation

US-001: Login Form UI
  → Should sync to: GitHub repo "frontend-app" OR JIRA board "frontend-team"

US-002: Auth API Endpoints
  → Should sync to: GitHub repo "backend-api" OR JIRA board "backend-team"

US-003: JWT Token Types (shared)
  → Should sync to: GitHub repo "shared-lib" OR JIRA board "platform-team"

US-004: Security Audit Requirements
  → Should sync to: DIFFERENT JIRA PROJECT "security-compliance"!

US-005: IAM Policy Updates
  → Should sync to: ADO area path "infrastructure/security"
```

**Current Behavior**: ALL 5 USs sync to `activeProject` (e.g., "frontend-app") - WRONG!

**Desired Behavior**: Each US syncs to its declared project/board.

## Solution Overview

### Core Principle: Per-User-Story Targeting

**Each User Story MUST declare its sync target:**

```markdown
### US-001: Login Form UI
**Project**: frontend-app
**Board**: web-team          <!-- For 2-level structures -->
**External**: github         <!-- Optional: specify provider -->

As a user, I want to see a login form...
```

### Architecture Changes

1. **Deprecate `activeProject`** - No longer used for sync decisions
2. **Per-US project/board fields** - Required in spec.md
3. **Multi-target sync** - Single increment creates issues in MULTIPLE projects/boards
4. **Cross-project tracking** - Living docs maintain links across projects

### Backward Compatibility

- Existing increments without per-US targeting: Use increment-level `project:` as default
- USs without explicit project: Inherit from increment's default
- `activeProject` is **removed entirely** - no migration, just delete

## User Stories

### US-001: Per-US Project Declaration in spec.md (P1)
**Project**: specweave

**As a** developer working on cross-cutting features
**I want** to declare `**Project**:` and `**Board**:` per user story in spec.md
**So that** each US syncs to the correct external tool project/board

#### Acceptance Criteria

- [x] **AC-US1-01**: spec.md parser extracts `**Project**:` field from each US section
- [x] **AC-US1-02**: spec.md parser extracts `**Board**:` field from each US section (2-level)
- [x] **AC-US1-03**: Missing project field falls back to increment's default `project:`
- [x] **AC-US1-04**: Validation warns if US has no project (neither explicit nor default)
- [x] **AC-US1-05**: Project/board values are validated against config (must exist)

---

### US-002: Multi-Project Living Docs Sync (P1)
**Project**: specweave

**As a** user with cross-cutting increments
**I want** living docs to organize USs by their declared project
**So that** each project's docs folder contains only relevant USs

#### Acceptance Criteria

- [x] **AC-US2-01**: `syncIncrement()` groups USs by their `project` field
- [x] **AC-US2-02**: Each project gets its own FS-XXX folder with relevant USs
- [x] **AC-US2-03**: Cross-project USs create symlinks/references (not duplicates)
- [x] **AC-US2-04**: FEATURE.md includes "Related Projects" section listing all involved
- [x] **AC-US2-05**: US files include `related_to:` frontmatter linking other projects

**Example Output:**
```
.specweave/docs/internal/specs/
├── frontend-app/
│   └── FS-125/
│       ├── FEATURE.md (references backend-api, security-compliance)
│       └── us-001-login-form-ui.md
├── backend-api/
│   └── FS-125/
│       ├── FEATURE.md (references frontend-app, security-compliance)
│       └── us-002-auth-api-endpoints.md
└── security-compliance/
    └── FS-125/
        ├── FEATURE.md (references frontend-app, backend-api)
        └── us-004-security-audit.md
```

---

### US-003: Multi-Target External Sync (P1)
**Project**: specweave

**As a** user with USs targeting different GitHub repos/JIRA boards
**I want** external sync to create issues in the correct project per US
**So that** each team sees only their relevant work items

#### Acceptance Criteria

- [x] **AC-US3-01**: `syncToExternalTools()` iterates USs, grouping by project/board
- [x] **AC-US3-02**: For each unique project, call provider-specific sync
- [ ] **AC-US3-03**: GitHub: Create issue in correct repo (from project mapping) [DEFERRED - external plugin]
- [ ] **AC-US3-04**: JIRA: Create issue in correct project/board [DEFERRED - external plugin]
- [ ] **AC-US3-05**: ADO: Create work item in correct project/area path [DEFERRED - external plugin]
- [x] **AC-US3-06**: metadata.json stores external_refs per US (not per increment)
- [ ] **AC-US3-07**: Rate limiting applies per-provider, not per-US [DEFERRED - external plugin]

**Example metadata.json:**
```json
{
  "id": "0125-oauth-implementation",
  "external_refs": {
    "US-001": {
      "github": { "repo": "frontend-app", "issue": 45 }
    },
    "US-002": {
      "jira": { "project": "BACKEND", "issue": "BACKEND-123" }
    },
    "US-004": {
      "jira": { "project": "SECURITY", "issue": "SEC-789" }
    }
  }
}
```

---

### US-004: Project Mapping Configuration (P1)
**Project**: specweave

**As an** admin setting up multi-project sync
**I want** to configure mappings between project names and external tool targets
**So that** USs with `**Project**: frontend-app` sync to the correct repo/board

#### Acceptance Criteria

- [x] **AC-US4-01**: config.json supports `projectMappings` section
- [x] **AC-US4-02**: Mapping includes: projectId, github repo, jira project/board, ado project/area
- [x] **AC-US4-03**: Missing mapping falls back to default profile
- [x] **AC-US4-04**: Validation error if US references unmapped project (with external sync enabled)
- [ ] **AC-US4-05**: `specweave init` prompts for project mappings during setup [DEFERRED]

**Example config:**
```json
{
  "projectMappings": {
    "frontend-app": {
      "github": { "owner": "myorg", "repo": "frontend-app" },
      "jira": { "project": "FE", "board": "web-team" }
    },
    "backend-api": {
      "github": { "owner": "myorg", "repo": "backend-api" },
      "jira": { "project": "BE", "board": "api-team" }
    },
    "security-compliance": {
      "jira": { "project": "SECURITY" }
    }
  }
}
```

---

### US-005: Remove activeProject Completely (P1)
**Project**: specweave

**As a** framework maintainer
**I want** to remove `activeProject` from config and all code
**So that** the codebase has one clear model: per-US project targeting

#### Acceptance Criteria

- [x] **AC-US5-01**: Remove `multiProject.activeProject` from config schema
- [x] **AC-US5-02**: Remove all code references to `activeProject`
- [x] **AC-US5-03**: Remove `/specweave:switch-project` command (no longer needed)
- [x] **AC-US5-04**: Update `specweave init` to NOT create activeProject
- [x] **AC-US5-05**: Clean up any tests referencing activeProject

---

### US-006: Cross-Project Increment Dashboard (P2)
**Project**: specweave

**As a** user managing cross-cutting work
**I want** `/specweave:status` to show per-US sync status across projects
**So that** I can see which USs synced where and their status in each system

#### Acceptance Criteria

- [x] **AC-US6-01**: Status shows USs grouped by target project
- [x] **AC-US6-02**: Each US shows its external tool status (open/closed/in-progress)
- [x] **AC-US6-03**: Aggregate status: "3/5 USs synced, 2 pending"
- [x] **AC-US6-04**: Links to external issues per US
- [x] **AC-US6-05**: Warning for USs without project mapping

**Example Output:**
```
Increment: 0125-oauth-implementation

Cross-Project Status:
├── frontend-app (GitHub)
│   └── US-001: Login Form UI → #45 (open)
├── backend-api (GitHub)
│   └── US-002: Auth API → #78 (in-progress)
├── security-compliance (JIRA)
│   └── US-004: Security Audit → SEC-789 (blocked)
└── ⚠️  No project mapping
    └── US-003: JWT Types (not synced)
```

---

### US-007: Increment Planner Project Selection per US (P1)
**Project**: specweave

**As a** user creating a new increment
**I want** the planner to ask for project per user story (if cross-cutting detected)
**So that** specs are generated with correct per-US targeting from the start

#### Acceptance Criteria

- [x] **AC-US7-01**: Keyword detection identifies cross-cutting increments
- [x] **AC-US7-02**: For cross-cutting: prompt project selection per US
- [x] **AC-US7-03**: For single-project: auto-assign all USs to same project
- [x] **AC-US7-04**: Generated spec.md includes `**Project**:` per US
- [x] **AC-US7-05**: Validation ensures all USs have project before saving

**Cross-Cutting Detection Keywords:**
- Multiple tech stacks mentioned: "React frontend", "Node API", "shared types"
- Team keywords: "frontend team", "backend team", "security team"
- Multi-repo indicators: "deploy to X and Y", "shared between services"

---

### US-008: Archive Sync Respects Per-US Projects (P2)
**Project**: specweave

**As a** user archiving completed increments
**I want** archive to preserve per-US project structure
**So that** archived docs remain organized by original project

#### Acceptance Criteria

- [x] **AC-US8-01**: Archive creates project-specific archive folders
- [x] **AC-US8-02**: Each project's archive contains only its USs
- [x] **AC-US8-03**: Cross-references (symlinks) are removed during archive
- [x] **AC-US8-04**: Archive metadata includes original project mapping
- [x] **AC-US8-05**: Restore recreates cross-project structure

---

### US-009: Hooks Support Per-US Context (P2)
**Project**: specweave

**As a** hook developer
**I want** post-task-completion hooks to receive US project context
**So that** hooks can perform project-specific actions

#### Acceptance Criteria

- [x] **AC-US9-01**: `post_task_completion` hook receives `us.project` in context
- [x] **AC-US9-02**: Hook can trigger project-specific pipelines (e.g., deploy frontend)
- [x] **AC-US9-03**: Hook context includes `increment.crossProjectMode: true` flag
- [ ] **AC-US9-04**: Example hook: "Notify Slack channel per project team" [DEFERRED - optional example]

## Functional Requirements

### FR-001: spec.md Per-US Project Format

```markdown
### US-001: Login Form UI
**Project**: frontend-app
**Board**: web-team
**External**: github

As a user, I want...

#### Acceptance Criteria
- [ ] **AC-US1-01**: ...
```

### FR-002: Backward Compatibility Rules

1. **No explicit US project** → Use increment's `project:` field
2. **No increment project** → Use `activeProject` from config (deprecated path)
3. **No activeProject** → Error: "Cannot determine sync target"

### FR-003: Cross-Project Feature Folder

When an increment spans multiple projects:
- Each project gets its own `FS-XXX/` folder
- All folders share the same FS number (derived from increment)
- FEATURE.md in each links to related projects

### FR-004: External Ref Storage Change

**Current (increment-level):**
```json
{ "external_ref": { "github": { "issue": 45 } } }
```

**New (per-US):**
```json
{
  "external_refs": {
    "US-001": { "github": { "owner": "org", "repo": "fe", "issue": 45 } },
    "US-002": { "jira": { "project": "BE", "key": "BE-123" } }
  }
}
```

## Non-Functional Requirements

### NFR-001: Sync Performance

- Multi-project sync must batch requests per provider
- Rate limiting per provider, not per US
- Parallel sync across providers (GitHub + JIRA simultaneously)

### NFR-002: Error Handling

- Partial sync success: Report which USs succeeded/failed
- Retry logic per US, not per increment
- Clear error messages: "US-002 failed to sync to JIRA: 401 Unauthorized"

## Out of Scope

- **US spanning multiple projects** - A single US targets exactly ONE project
- **Dynamic project detection** - Projects must be explicitly declared or configured
- **Cross-org sync** - All projects must be accessible with configured credentials

## Migration Plan

### Phase 1: Add per-US fields (backward compatible)
- Parser reads new `**Project**:` field if present
- Falls back to increment-level project (existing behavior)

### Phase 2: Update sync logic
- Group USs by project before sync
- Create issues in correct targets

### Phase 3: Update increment planner
- Detect cross-cutting increments
- Prompt for per-US project selection

### Phase 4: Deprecate activeProject
- Warn on usage in sync context
- Document migration path

## Success Criteria

1. **Zero incorrect syncs** - USs sync to declared project, not global activeProject
2. **Cross-project visibility** - Status shows all involved projects
3. **Backward compatible** - Existing single-project increments work unchanged
4. **Clear errors** - Misconfigured projects show actionable messages

## Technical Notes

### Files to Modify

1. `src/core/living-docs/living-docs-sync.ts` - Multi-project sync logic
2. `src/core/living-docs/types.ts` - Add `UserStoryData.project` field
3. `src/core/living-docs/sync-helpers/` - Per-US grouping utilities
4. `src/external-tools/github/` - Repo-aware issue creation
5. `src/external-tools/jira/` - Project-aware issue creation
6. `src/external-tools/ado/` - Area-path-aware work item creation
7. `plugins/specweave/skills/increment-planner/SKILL.md` - Cross-cutting detection
8. `plugins/specweave/commands/specweave-status.md` - Cross-project status

### New Files

1. `src/core/living-docs/cross-project-sync.ts` - Multi-project orchestration
2. `src/core/schemas/project-mapping.schema.json` - Config schema
3. `src/utils/cross-cutting-detector.ts` - Keyword-based detection

## Dependencies

- 0119-project-board-context-enforcement (completed)
- structure-level-detector.ts (exists)
- External sync infrastructure (exists)
