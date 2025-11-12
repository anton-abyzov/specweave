# Final Architecture: Multi-Project Spec Sync with Flexible IDs

**Date**: 2025-11-12
**Status**: FINAL DESIGN - Ready for Implementation
**Consolidates**: All previous design iterations

---

## Executive Summary

### The Problem

**Current (WRONG)**:
```
GitHub Issue #1 → .specweave/increments/0001-*/spec.md (TEMPORARY ❌)
- Increments are temporary (can be deleted)
- Single spec per feature (ignores multi-project reality)
- Sequential IDs forced on brownfield projects
```

### The Solution

**New (CORRECT)**:
```
Feature: "Instant Polls & Voting"
├── Backend: specs/backend/JIRA-AUTH-123.md → GH issue in backend-api repo ✅
├── Frontend: specs/frontend/user-polls-ui.md → GH issue in frontend-ui repo ✅
└── Parent: specs/_parent/polls-overview.md → NOT synced (coordination only) ✅

Flexible IDs:
- Brownfield: JIRA-AUTH-123, ADO-12345, GH-456, or title-slug
- Greenfield: spec-001 or custom prefix (AUTH-001)
```

**Key Principles**:
1. ✅ **Specs are permanent** (never deleted)
2. ✅ **Multi-project aware** (backend, frontend, mobile, infra)
3. ✅ **Flexible identifiers** (adapt to existing JIRA/ADO/GitHub or generate new)
4. ✅ **Per-project GitHub repos** (backend spec → backend repo)
5. ✅ **Parent overview optional** (coordination doc, not synced)

---

## Architecture Components

### 1. File Structure

```
.specweave/docs/internal/specs/
├── backend/                    # Backend project specs
│   ├── JIRA-AUTH-123.md       # ✅ Brownfield: Existing JIRA ID
│   ├── user-authentication.md  # ✅ Brownfield: Title-slug ID
│   ├── spec-001.md            # ✅ Greenfield: Sequential ID
│   └── .metadata/
│       ├── JIRA-AUTH-123.json # Per-spec metadata
│       └── spec-001.json
│
├── frontend/                   # Frontend project specs
│   ├── GH-456.md              # ✅ Imported from GitHub issue #456
│   ├── user-login-ui.md       # ✅ Title-slug ID
│   └── .metadata/
│       └── user-login-ui.json
│
├── mobile/                     # Mobile project specs (optional)
│   └── push-notifications.md
│
└── _parent/                    # Cross-project coordination (optional)
    └── instant-polls-overview.md  # ✅ NOT synced to GitHub
```

### 2. Spec Identifier System

**Four Priority Levels** (auto-detected in order):

| Priority | Strategy | Format | Example | Use When |
|----------|----------|--------|---------|----------|
| **1** | External Tool | `{tool}-{id}` | `JIRA-AUTH-123` | Imported from JIRA/ADO/GitHub |
| **2** | Custom ID | `{custom}` | `auth-mvp-v2` | User defines in frontmatter |
| **3** | Title Slug | `{kebab-case}` | `user-authentication` | Brownfield without IDs |
| **4** | Sequential | `spec-{number}` | `spec-001` | Greenfield |

**Full Identifier**: `{project}/{id}` (e.g., `backend/JIRA-AUTH-123`)

**Display Format**: `{PROJECT_CODE}-{id}` (e.g., `BE-JIRA-AUTH-123`)

### 3. Spec Frontmatter

```yaml
---
# Identity (REQUIRED)
id: JIRA-AUTH-123  # ✅ Flexible: can be JIRA-*, spec-001, title-slug, etc.
project: backend   # ✅ Which project (backend, frontend, mobile, infra)
title: "User Authentication System"

# Status & Priority
status: in-progress
priority: P0

# External Links
externalLinks:
  # Original source (if imported)
  jira:
    issueKey: AUTH-123
    url: https://company.atlassian.net/browse/AUTH-123
    syncedAt: "2025-11-12T10:00:00Z"

  # GitHub sync (auto-populated)
  github:
    owner: myorg
    repo: backend-api
    issueNumber: 45
    issueUrl: https://github.com/myorg/backend-api/issues/45
    syncedAt: "2025-11-12T10:05:00Z"

# Cross-Project References
relatedSpecs:
  - frontend/user-login-ui
  - _parent/authentication-overview

# Increments (which increments implement this spec)
increments:
  - 0001-user-auth-mvp
  - 0005-auth-enhancements
---

# User Authentication System

## User Stories

**US-001**: As a user, I want to log in with email/password
- [x] **AC-US1-01**: User can enter email and password (P1, testable)
- [ ] **AC-US1-02**: Invalid credentials show error (P1, testable)
- [ ] **AC-US1-03**: Account locks after 5 failed attempts (P2, testable)

**US-002**: As a user, I want to reset my password
...
```

### 4. Project Configuration

**File**: `.specweave/config.json`

```json
{
  "projects": {
    "backend": {
      "id": "backend",
      "displayName": "Backend API",
      "description": "ASP.NET Core + PostgreSQL",
      "github": {
        "owner": "myorg",
        "repo": "backend-api"
      },
      "defaultLabels": ["backend", "api"],
      "team": "Backend Team",
      "syncEnabled": true
    },
    "frontend": {
      "id": "frontend",
      "displayName": "Frontend UI",
      "description": "React 18 + TypeScript + Vite",
      "github": {
        "owner": "myorg",
        "repo": "frontend-ui"
      },
      "defaultLabels": ["frontend", "ui"],
      "team": "Frontend Team",
      "syncEnabled": true
    },
    "_parent": {
      "id": "_parent",
      "displayName": "Parent Repository",
      "description": "Cross-project coordination",
      "github": null,
      "syncEnabled": false  // ✅ Parent specs NOT synced
    }
  }
}
```

### 5. GitHub Issue Format

**Title**: `[{PROJECT_CODE}-{SPEC_ID}] {Title}`

**Examples**:
- `[BE-JIRA-AUTH-123] User Authentication System`
- `[FE-user-login-ui] User Login Interface`
- `[BE-001] Payment Processing`

**Body**:
```markdown
# [BE-JIRA-AUTH-123] User Authentication System

**Project**: Backend API
**Spec**: [JIRA-AUTH-123.md](../../tree/main/.specweave/docs/internal/specs/backend/JIRA-AUTH-123.md)
**Status**: In Progress
**Priority**: P0

## Summary

User authentication system with email/password login, session management, and password reset.

## User Stories

### US-001: Login with Email/Password
- [x] AC-US1-01: User can enter email and password
- [ ] AC-US1-02: Invalid credentials show error
- [ ] AC-US1-03: Account locks after 5 failed attempts

### US-002: Password Reset
- [ ] AC-US2-01: User can request password reset email
- [ ] AC-US2-02: Reset link expires after 24 hours

## Increments

- [0001-user-auth-mvp](../../tree/main/.specweave/increments/0001-user-auth-mvp) - MVP implementation
- [0005-auth-enhancements](../../tree/main/.specweave/increments/0005-auth-enhancements) - Additional features

## Related Specs

- Frontend: [FE-user-login-ui](../frontend-ui/issues/78) - User login UI
- Parent: [Authentication Overview](../../tree/main/.specweave/docs/internal/specs/_parent/authentication-overview.md)

---

🤖 Auto-synced with SpecWeave | Updated: 2025-11-12
```

---

## Workflow

### Scenario 1: Multi-Project Feature (Greenfield)

**User**: "I want to build instant polls and voting"

**SpecWeave**:
1. **PM Agent analyzes**:
   - Detects keywords: "polls", "voting"
   - Identifies projects: backend + frontend

2. **Prompts user**:
   ```
   🤔 This feature spans multiple projects:

   - Backend: Poll API (CRUD, voting logic)
   - Frontend: Poll UI (create poll, vote, results)

   How should we split?
   1. Separate specs per project (Recommended) ✅
   2. Single spec (you split manually)
   3. Backend only (frontend later)

   Your choice: [1]
   ```

3. **Creates specs** (Option 1 chosen):
   - `specs/backend/spec-001-polls-api.md` (sequential, greenfield)
   - `specs/frontend/spec-001-polls-ui.md` (sequential, greenfield)
   - `specs/_parent/instant-polls-overview.md` (optional coordination)

4. **Syncs to GitHub**:
   - Backend spec → Creates issue #45 in `myorg/backend-api`
   - Frontend spec → Creates issue #78 in `myorg/frontend-ui`
   - Parent spec → NOT synced

5. **Creates increment**:
   - `increments/0001-instant-polls-voting/spec.md`:
     ```markdown
     **Implements**:
     - Backend: SPEC-BE-001 (specs/backend/spec-001-polls-api.md)
     - Frontend: SPEC-FE-001 (specs/frontend/spec-001-polls-ui.md)
     - Overview: specs/_parent/instant-polls-overview.md
     ```

6. **Task completion**:
   - Backend task completes → Updates `specs/backend/spec-001-polls-api.md`
   - Hook syncs to GitHub → Updates issue #45 in backend-api repo
   - Frontend task completes → Updates `specs/frontend/spec-001-polls-ui.md`
   - Hook syncs to GitHub → Updates issue #78 in frontend-ui repo

### Scenario 2: Brownfield Import from JIRA

**User**: "Import JIRA epic AUTH-123 into SpecWeave"

**SpecWeave**:
1. **Fetches JIRA epic**:
   ```bash
   /specweave:import-from-jira AUTH-123
   ```

2. **Detects project** from epic content:
   - Keywords: "API", "database", "authentication"
   - Project detected: `backend`

3. **Creates spec**:
   - `specs/backend/JIRA-AUTH-123.md`
   - Frontmatter:
     ```yaml
     id: JIRA-AUTH-123  # ✅ Preserves JIRA ID
     project: backend
     externalLinks:
       jira:
         issueKey: AUTH-123
         url: https://company.atlassian.net/browse/AUTH-123
     ```

4. **Syncs to GitHub**:
   - Creates issue #45 in `myorg/backend-api`
   - Title: `[BE-JIRA-AUTH-123] User Authentication System`
   - Body includes: "Imported from JIRA AUTH-123"
   - Links back to JIRA epic

5. **Bidirectional sync**:
   - JIRA epic AUTH-123 ↔ SpecWeave spec ↔ GitHub issue #45
   - Changes in any system sync to others

### Scenario 3: Brownfield without IDs

**User**: "Import existing docs/features/authentication.md"

**SpecWeave**:
1. **Reads file**:
   ```bash
   /specweave:import-doc docs/features/authentication.md
   ```

2. **Extracts title**: "User Authentication System"

3. **Generates slug**: `user-authentication-system`

4. **Creates spec**:
   - `specs/backend/user-authentication-system.md`
   - Frontmatter:
     ```yaml
     id: user-authentication-system  # ✅ Title-based slug
     project: backend
     slug: user-authentication-system
     source: title-slug
     ```

5. **Syncs to GitHub**:
   - Creates issue #45 in `myorg/backend-api`
   - Title: `[BE-user-authentication-system] User Authentication System`

---

## Implementation Plan

### Phase 1: Config & ID System (2 hours)

**Files**:
- `src/core/types/spec-identifier.ts` (new)
- `src/core/spec-identifier-detector.ts` (new)
- `src/core/schemas/specweave-config.schema.json` (update)

**Changes**:
1. Add `projects` section to config schema
2. Implement `detectSpecIdentifier()` function (4 priority levels)
3. Implement `slugify()` helper
4. Add project code mapping (`BE`, `FE`, `MB`, etc.)

### Phase 2: Multi-Spec Detection (3 hours)

**Files**:
- `plugins/specweave-github/hooks/post-task-completion.sh` (update)
- `src/core/spec-detector.ts` (new)

**Changes**:
1. Replace single spec detection with multi-spec detection
2. Detect ALL specs referenced in increment
3. For each spec:
   - Get project from spec frontmatter
   - Get GitHub repo from project config
   - Sync spec to correct GitHub repo

### Phase 3: Flexible Sync (2 hours)

**Files**:
- `plugins/specweave-github/lib/github-spec-content-sync.ts` (update)
- `src/core/spec-content-sync.ts` (update)

**Changes**:
1. Update sync to handle flexible IDs (not just sequential)
2. Support project-based GitHub repo mapping
3. Format GitHub issue title with flexible ID
4. Store metadata in `specs/{project}/.metadata/{spec-id}.json`

### Phase 4: Smart Project Detection (2 hours)

**Files**:
- `src/core/project-detector.ts` (new)

**Changes**:
1. Keyword-based project detection
2. Suggest backend vs frontend vs mobile split
3. Interactive prompt for user confirmation
4. Create multiple specs based on user choice

### Phase 5: Import & Migration (3 hours)

**Files**:
- `src/cli/commands/import-from-jira.ts` (new)
- `src/cli/commands/import-doc.ts` (new)
- `scripts/migrate-single-to-multi-spec.ts` (new)

**Changes**:
1. JIRA import command (fetch epic, create spec with JIRA ID)
2. Doc import command (read file, generate slug ID, create spec)
3. Migration script (single spec → multi-project specs)

### Phase 6: Testing & Documentation (2 hours)

**Files**:
- `tests/integration/multi-project-spec-sync.test.ts` (new)
- `CLAUDE.md` (update)
- `.specweave/docs/internal/architecture/adr/0XX-multi-project-specs.md` (new)

**Changes**:
1. E2E tests for multi-project sync
2. Update CLAUDE.md with new architecture
3. Create ADR documenting decision

**Total Estimate**: 14 hours

---

## Testing Plan

### Test 1: Greenfield Multi-Project

```bash
# Create increment
/specweave:increment "Instant Polls & Voting"

# PM agent detects: backend + frontend
# Creates:
# - specs/backend/spec-001-polls-api.md
# - specs/frontend/spec-001-polls-ui.md
# - specs/_parent/instant-polls-overview.md

# Syncs:
# - Backend → Issue #45 in myorg/backend-api ✅
# - Frontend → Issue #78 in myorg/frontend-ui ✅
# - Parent → NOT synced ✅

# Complete backend task
# → Updates backend spec
# → Syncs to issue #45 ✅

# Complete frontend task
# → Updates frontend spec
# → Syncs to issue #78 ✅
```

### Test 2: Brownfield JIRA Import

```bash
# Import JIRA epic
/specweave:import-from-jira AUTH-123

# Creates:
# - specs/backend/JIRA-AUTH-123.md ✅
# - ID: JIRA-AUTH-123 (preserved) ✅
# - Syncs to GitHub issue #45 ✅
# - Title: [BE-JIRA-AUTH-123] User Authentication ✅

# Complete task
# → Updates spec
# → Syncs to JIRA AUTH-123 ✅
# → Syncs to GitHub #45 ✅
```

### Test 3: Brownfield Title-Slug

```bash
# Import doc without ID
/specweave:import-doc docs/features/payment.md

# Creates:
# - specs/backend/payment-processing-system.md ✅
# - ID: payment-processing-system (slug) ✅
# - Syncs to GitHub issue #46 ✅
# - Title: [BE-payment-processing-system] Payment Processing ✅
```

---

## Migration Strategy

### For Existing SpecWeave Projects

**Script**: `scripts/migrate-to-multi-project-specs.ts`

```bash
# Run migration
npm run migrate-specs

# Detects:
# 1. Existing specs in specs/*.md
# 2. Analyzes content for project keywords
# 3. Suggests split: backend vs frontend

# User confirms:
# "Split spec-001-instant-polls into backend + frontend? [Y/n]"

# Migrates:
# - specs/spec-001-instant-polls.md (old)
# → specs/backend/spec-001-polls-api.md (new)
# → specs/frontend/spec-001-polls-ui.md (new)

# Updates:
# - GitHub issues (close old #1, create #45 backend + #78 frontend)
# - Increment references (update to new spec paths)
# - Metadata (move to project/.metadata/)
```

---

## Benefits

### Why This Architecture Wins

1. **Brownfield-Friendly** ✅
   - Preserves existing JIRA/ADO/GitHub IDs
   - No forced ID migration
   - Teams use familiar identifiers

2. **Multi-Project Native** ✅
   - Backend, frontend, mobile specs separate
   - Each syncs to correct GitHub repo
   - Parent overview for coordination

3. **Flexible & Adaptable** ✅
   - Auto-detects ID strategy (4 priority levels)
   - Works for greenfield and brownfield
   - Title-slug fallback for projects without IDs

4. **Permanent & Stable** ✅
   - Specs never deleted (permanent source of truth)
   - IDs don't change with content
   - GitHub links never break

5. **Smart & Automated** ✅
   - Auto-detects projects from keywords
   - Suggests backend vs frontend split
   - Syncs to correct repos automatically

---

## Summary

### What We're Building

**Core Concept**: Multi-project specs with flexible identifiers that sync to the correct GitHub repos

**Key Components**:
1. ✅ File structure: `specs/{project}/{flexible-id}.md`
2. ✅ ID system: 4 priority levels (external, custom, slug, sequential)
3. ✅ Project config: Maps projects to GitHub repos
4. ✅ Smart detection: Auto-detects backend vs frontend from keywords
5. ✅ Multi-spec sync: Each project spec syncs to its own GitHub repo
6. ✅ Parent overview: Optional coordination doc (not synced)

**Timeline**: 14 hours total

**Risk**: Low (existing infrastructure + incremental changes)

---

## Next Steps

**Awaiting your approval on**:

1. ✅ Multi-project spec split (backend, frontend, mobile, _parent)
2. ✅ Flexible ID system (JIRA-*, title-slug, spec-NNN)
3. ✅ Per-project GitHub repo mapping
4. ✅ Smart project detection from keywords
5. ✅ 14-hour implementation plan

**Ready to implement once you confirm!**

---

**Status**: FINAL DESIGN - Awaiting Approval
**Date**: 2025-11-12
**Implementation Time**: 14 hours
