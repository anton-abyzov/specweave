# Architecture Correction: Spec-Based External Sync

**Date**: 2025-11-10
**Type**: Critical Architecture Change
**Impact**: HIGH - Fundamental redesign of external sync

---

## The Problem

**Current (WRONG) Implementation**:
```
❌ .specweave/increments/0001-feature/ ↔ GitHub Issue #20
❌ .specweave/increments/0002-feature/ ↔ GitHub Issue #21
```

**Correct Architecture (MUST CHANGE TO)**:
```
✅ .specweave/docs/internal/specs/spec-001-feature.md ↔ GitHub Project / Jira Epic / ADO Feature
✅ .specweave/docs/internal/specs/spec-002-payments.md ↔ External PM Tool
```

---

## Why This is Critical

### Problem 1: Wrong Sync Target

**Increments are temporary** (can be deleted after completion):
- `.specweave/increments/0001-core-framework/` - Just an implementation vehicle
- Deleted after completion or archived
- Not meant to be permanent

**Specs are permanent** (living documentation, source of truth):
- `.specweave/docs/internal/specs/spec-001-core-framework-architecture.md`
- Contains ALL user stories for the feature area
- Permanent knowledge base
- What PMs and stakeholders care about

### Problem 2: Wrong Granularity

**One Spec → Many Increments**:
```
spec-001-core-framework-architecture.md (35 user stories, PERMANENT)
├── 0001-core-framework (US-001, US-002) ✅ Complete
├── 0002-core-enhancements (US-003, US-004) ✅ Complete
├── 0004-plugin-architecture (US-005, US-006) ✅ Complete
└── 0005-cross-platform-cli (US-007) ✅ Complete
```

Syncing increments = 4 GitHub issues/Jira tickets
Syncing specs = 1 GitHub Project/Jira Epic (correct!)

### Problem 3: PM Tool Perspective

**What PMs track**:
- ✅ Feature completion (spec-level)
- ✅ Epic/Project progress
- ✅ User story completion across all work

**What PMs DON'T track**:
- ❌ Implementation iterations (increment-level)
- ❌ How many sprints it took
- ❌ Internal development details

---

## Correct Architecture

### Data Model

**Spec Metadata** (`.specweave/docs/internal/specs/spec-001-core-framework-architecture.md`):
```markdown
---
id: spec-001
title: Core Framework & Architecture
status: in-progress
priority: P0
external_links:
  github:
    project_id: 123
    project_url: https://github.com/users/anton-abyzov/projects/1
  jira:
    epic_key: SPEC-1
    epic_url: https://company.atlassian.net/browse/SPEC-1
  ado:
    feature_id: 456
    feature_url: https://dev.azure.com/org/project/_workitems/edit/456
---

# SPEC-001: Core Framework & Architecture

## Overview
Foundation framework with CLI, plugin system, cross-platform support...

## Increments (Implementation History)
- 0001-core-framework (Complete)
- 0002-core-enhancements (Complete)
- 0004-plugin-architecture (Complete)
- 0005-cross-platform-cli (Complete)

## User Stories (35 total)
### Epic 1: CLI Framework
- US-001: NPM installation ✅
- US-002: Plugin system ✅
...
```

### Sync Behavior

**GitHub**:
```
spec-001-core-framework-architecture.md → GitHub Project
├── Project Columns: "Backlog", "In Progress", "Done"
├── User Stories → Project Cards
└── Progress: 35/35 stories complete (100%)
```

**Jira**:
```
spec-001-core-framework-architecture.md → Jira Epic
├── Epic: SPEC-1
├── User Stories → Jira Stories (subtasks of epic)
└── Epic Progress: 35/35 complete
```

**Azure DevOps**:
```
spec-001-core-framework-architecture.md → ADO Feature
├── Feature: #456
├── User Stories → ADO User Stories (children of feature)
└── Feature Progress: 35/35 complete
```

---

## Implementation Changes Required

### Phase 1: Spec Metadata System

**New Files**:
1. `src/core/specs/spec-metadata-manager.ts` - Read/write spec metadata
2. `src/core/specs/spec-parser.ts` - Extract frontmatter, user stories, acceptance criteria
3. `src/core/specs/spec-sync-engine.ts` - Coordinate bidirectional sync
4. `src/core/types/spec-metadata.ts` - TypeScript types

**Spec Metadata Schema**:
```typescript
interface SpecMetadata {
  id: string;                    // spec-001
  title: string;                 // Core Framework & Architecture
  status: 'draft' | 'in-progress' | 'complete';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  external_links?: {
    github?: {
      project_id?: number;
      project_url?: string;
      synced_at?: string;
    };
    jira?: {
      epic_key?: string;
      epic_url?: string;
      synced_at?: string;
    };
    ado?: {
      feature_id?: number;
      feature_url?: string;
      synced_at?: string;
    };
  };
  user_stories?: UserStory[];    // Extracted from markdown
  increments?: string[];         // 0001, 0002, 0004, 0005
}

interface UserStory {
  id: string;                    // US-001
  title: string;                 // As a developer, I want...
  status: 'todo' | 'in-progress' | 'done';
  acceptance_criteria: AcceptanceCriteria[];
  increment?: string;            // Which increment implemented it
}

interface AcceptanceCriteria {
  id: string;                    // AC-001-01
  description: string;           // npm install -g specweave works
  status: 'todo' | 'done';
}
```

### Phase 2: GitHub Sync (Spec-Based)

**Update Files**:
1. `plugins/specweave-github/lib/github-spec-sync.ts` (NEW)
   - `syncSpecToGitHub(specId: string)` → Create/update GitHub Project
   - `syncFromGitHubProject(projectId: number)` → Update spec from GitHub
   - Map user stories → Project cards
   - Bidirectional sync

2. `plugins/specweave-github/commands/specweave-github-sync-spec.md` (NEW)
   - `/specweave-github:sync-spec spec-001`
   - Links spec to GitHub Project
   - Creates project if doesn't exist

**DELETE Files** (increment-based sync, WRONG):
- `plugins/specweave-github/lib/github-sync-increment-changes.ts`
- `plugins/specweave-github/lib/cli-sync-increment-changes.ts`
- `plugins/specweave-github/commands/specweave-github-sync-from.md`

### Phase 3: Jira Sync (Spec-Based)

**Update Files**:
1. `plugins/specweave-jira/lib/jira-spec-sync.ts` (NEW)
   - `syncSpecToJira(specId: string)` → Create/update Jira Epic
   - `syncFromJiraEpic(epicKey: string)` → Update spec from Jira
   - Map user stories → Jira Stories
   - Bidirectional sync

2. `plugins/specweave-jira/commands/specweave-jira-sync-spec.md` (NEW)
   - `/specweave-jira:sync-spec spec-001`
   - Links spec to Jira Epic
   - Creates epic if doesn't exist

### Phase 4: ADO Sync (Spec-Based)

**Update Files**:
1. `plugins/specweave-ado/lib/ado-spec-sync.ts` (NEW)
   - `syncSpecToADO(specId: string)` → Create/update ADO Feature
   - `syncFromADOFeature(featureId: number)` → Update spec from ADO
   - Map user stories → ADO User Stories
   - Bidirectional sync

2. `plugins/specweave-ado/commands/specweave-ado-sync-spec.md` (NEW)
   - `/specweave-ado:sync-spec spec-001`
   - Links spec to ADO Feature
   - Creates feature if doesn't exist

### Phase 5: Hooks & Automation

**Update Hooks**:
1. `plugins/specweave/hooks/post-spec-update.sh` (NEW)
   - Fires when spec.md is updated
   - Auto-syncs to linked external tool
   - Updates GitHub Project / Jira Epic / ADO Feature

2. `plugins/specweave/hooks/post-user-story-complete.sh` (NEW)
   - Fires when user story marked complete in spec
   - Updates external PM tool
   - Moves GitHub card to "Done" / Closes Jira story / Completes ADO story

**DELETE Hooks** (increment-based, WRONG):
- `plugins/specweave/hooks/post-increment-change.sh`
- `plugins/specweave/hooks/post-increment-status-change.sh`

### Phase 6: CLI Commands

**Update Commands**:
1. `/specweave:sync-spec <spec-id>` - Sync spec to external tool
2. `/specweave:link-spec <spec-id> <provider> <external-id>` - Link spec to external entity
3. `/specweave:unlink-spec <spec-id> <provider>` - Unlink spec from external tool

**DELETE Commands** (increment-based, WRONG):
- `/specweave-github:sync` (syncs increments)
- `/specweave-github:sync-from` (syncs FROM increments)

---

## Migration Strategy

### Step 1: Preserve Existing Increment Links (Optional)

For projects that already have increments linked to GitHub issues:
- Keep `metadata.json` in increments with GitHub issue links
- Add deprecation warning: "Increment-level sync deprecated, use spec-level sync"
- Provide migration tool: `specweave migrate-to-spec-sync`

### Step 2: Create Spec Metadata

For each spec in `.specweave/docs/internal/specs/`:
- Extract frontmatter or create if missing
- Add `external_links` section
- Parse user stories and acceptance criteria
- Link to increments that implemented it

### Step 3: Migrate External Links

```bash
# Example migration
spec-001-core-framework-architecture.md (4 increments: 0001, 0002, 0004, 0005)
  ↓
Create GitHub Project: "Core Framework & Architecture"
  ↓
Migrate user stories: US-001 to US-007 → GitHub cards
  ↓
Link spec metadata: external_links.github.project_id = 123
```

### Step 4: Enable New Sync

- Update config.json: `"sync": {"target": "specs"}` (not "increments")
- Enable hooks for spec-based sync
- Disable increment-based sync hooks

---

## Timeline

**Week 1**: Phase 1 + Phase 2 (Spec metadata + GitHub sync)
**Week 2**: Phase 3 + Phase 4 (Jira + ADO sync)
**Week 3**: Phase 5 (Hooks & automation)
**Week 4**: Phase 6 (CLI commands) + Testing + Migration

**Total**: 4 weeks (~120 hours)

---

## Benefits

1. **Correct Abstraction**: Sync what PMs care about (features), not implementation details (iterations)
2. **Reduced Noise**: 1 external entity per feature (not 4+ per feature split across increments)
3. **Better Tracking**: Feature completion visible in PM tool, not buried in increment status
4. **Permanent Links**: Specs never deleted, external links remain valid forever
5. **Brownfield Friendly**: Existing projects with Jira epics/GitHub projects map cleanly to specs

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing increment-based workflows | Provide migration tool, deprecation warnings |
| Users want both spec-level AND increment-level tracking | Allow both, but recommend spec-level as primary |
| Large refactor, high effort | Phased rollout, backwards compatibility |
| External tool APIs differ (GitHub vs Jira vs ADO) | Abstract common interface, provider-specific implementations |

---

## Decision

**Recommendation**: ✅ APPROVE and implement

**Reasoning**:
- Current architecture is fundamentally wrong (syncing temporary artifacts)
- User's requirement is clear: sync specs, not increments
- This aligns with SpecWeave's philosophy (living docs = source of truth)
- PM tools expect feature-level tracking, not iteration-level

---

**Next Steps**:
1. Get user approval for this architecture
2. Create increment 0017: Spec-Based External Sync
3. Implement Phase 1 (spec metadata system)
4. Implement Phase 2 (GitHub sync)
5. Test bidirectional sync
6. Roll out to Jira and ADO

---

**Author**: Claude (via SpecWeave)
**Reviewed By**: TBD
**Status**: Awaiting Approval
