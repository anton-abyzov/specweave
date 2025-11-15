# Living Docs Sync Architecture Design

**Date**: 2025-11-12
**Status**: 🎯 Design Phase
**Goal**: Create solid, consistent sync logic for living docs

---

## Problem Analysis

### Current Architecture (BROKEN)

```
.specweave/docs/internal/specs/default/
└── SPEC-031-external-tool-status-sync.md  (346 lines - TOO MUCH!)
    ├── Epic-level summary
    ├── 7 detailed user stories
    │   ├── US-001: Rich External Issue Content (7 AC)
    │   ├── US-002: Task-Level Mapping (6 AC)
    │   ├── US-003: Status Mapping Config (5 AC)
    │   ├── US-004: Bidirectional Status Sync (6 AC)
    │   ├── US-005: User Prompts on Completion (8 AC)
    │   ├── US-006: Conflict Resolution (7 AC)
    │   └── US-007: Multi-Tool Workflow (4 AC)
    ├── Architecture & Design (links only)
    ├── Related Documentation
    ├── Success Metrics
    └── Technical Highlights
```

**Issues**:
- ❌ Mixing epic-level and user-story-level content
- ❌ 43 acceptance criteria in one file
- ❌ 17 task-level implementation links
- ❌ No separation of concerns
- ❌ Hard to navigate and maintain
- ❌ Doesn't match external tool structure (Epic → Stories → Tasks)

---

## Correct Architecture (PROPOSED)

### Hierarchy Levels

```
Level 1: EPIC (SPEC-031)
  ↓
Level 2: USER STORIES (US-001 through US-007)
  ↓
Level 3: TASKS (T-001 through T-024 in tasks.md)
```

### File Structure

```
.specweave/docs/internal/specs/default/
├── SPEC-031-external-tool-status-sync.md     ← EPIC (50-80 lines)
└── user-stories/
    ├── us-001-rich-external-issue-content.md       (US-001 + 7 AC + task links)
    ├── us-002-task-level-mapping.md                (US-002 + 6 AC + task links)
    ├── us-003-status-mapping-config.md             (US-003 + 5 AC + task links)
    ├── us-004-bidirectional-status-sync.md         (US-004 + 6 AC + task links)
    ├── us-005-user-prompts-completion.md           (US-005 + 8 AC + task links)
    ├── us-006-conflict-resolution.md               (US-006 + 7 AC + task links)
    └── us-007-multi-tool-workflow.md               (US-007 + 4 AC + task links)
```

---

## Epic-Level File (SPEC-031.md)

### Content (50-80 lines)

```markdown
---
id: SPEC-031
title: "External Tool Status Synchronization"
type: epic
status: complete
priority: P1
created: 2025-11-12
last_updated: 2025-11-12
---

# SPEC-031: External Tool Status Synchronization

Bidirectional status sync between SpecWeave and external tools (GitHub, JIRA, Azure DevOps).

## Quick Overview

Enhance external tool integration with:
- Rich content sync (full user stories, AC, tasks)
- Bidirectional status synchronization
- Task-level traceability

**Business Value**:
- Eliminate Manual Work: Save 5-10 minutes per increment
- Complete Visibility: Stakeholders see full context
- Perfect Traceability: Answer "Which increment implemented US-001?"
- Team Synchronization: Keep entire team aligned

---

## Implementation History

| Increment | Stories Implemented | Status | Completion Date |
|-----------|-------------------|--------|----------------|
| [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/tasks.md) | US-001 through US-007 (all) | ✅ Complete | 2025-11-12 |

---

## User Stories

### Phase 1: Enhanced Content Sync

- [US-001: Rich External Issue Content](user-stories/us-001-rich-external-issue-content.md) - ✅ Complete
- [US-002: Task-Level Mapping & Traceability](user-stories/us-002-task-level-mapping.md) - ✅ Complete

### Phase 2: Status Synchronization

- [US-003: Status Mapping Configuration](user-stories/us-003-status-mapping-config.md) - ✅ Complete
- [US-004: Bidirectional Status Sync](user-stories/us-004-bidirectional-status-sync.md) - ✅ Complete
- [US-005: User Prompts on Completion](user-stories/us-005-user-prompts-completion.md) - ✅ Complete
- [US-006: Conflict Resolution](user-stories/us-006-conflict-resolution.md) - ✅ Complete

### Phase 3: Advanced Features

- [US-007: Multi-Tool Workflow Support](user-stories/us-007-multi-tool-workflow.md) - ✅ Complete

---

## External Tool Integration

**GitHub Project**: N/A (internal increment)
**JIRA Epic**: N/A
**Azure DevOps Feature**: N/A

---

## Related Documentation

- [Technical Plan](../../../../increments/0031-external-tool-status-sync/plan.md)
- [Architecture](../../architecture/hld-external-tool-status-sync.md)
- [Status Sync Guide](../../public/guides/status-sync-guide.md)

---

**Overall Progress**: 7/7 user stories complete (100%)
```

**Key Points**:
- ✅ Epic-level summary only (50-80 lines)
- ✅ Links to user story files (not detailed AC)
- ✅ Implementation history
- ✅ External tool links
- ✅ Overall progress metrics

---

## User Story File (us-001-rich-external-issue-content.md)

### Content (~80-120 lines)

```markdown
---
id: us-001
epic: SPEC-031
title: "Rich External Issue Content"
status: complete
priority: P1
created: 2025-11-12
completed: 2025-11-12
---

# US-001: Rich External Issue Content

**Epic**: [SPEC-031: External Tool Status Synchronization](../SPEC-031-external-tool-status-sync.md)

**As a** stakeholder viewing GitHub/JIRA/ADO
**I want** to see full spec content (user stories, AC, tasks) in the external issue
**So that** I don't need to navigate to the repository to understand the feature

---

## Acceptance Criteria

- [x] **AC-US1-01**: External issues show executive summary (P1, testable)
- [x] **AC-US1-02**: External issues show all user stories with descriptions (P1, testable)
- [x] **AC-US1-03**: External issues show acceptance criteria (P1, testable)
- [x] **AC-US1-04**: External issues show linked tasks with GitHub issue numbers (P1, testable)
- [x] **AC-US1-05**: User stories collapsed by default in GitHub UI (P2, testable)
- [x] **AC-US1-06**: Content updates when spec.md changes (P2, testable)
- [x] **AC-US1-07**: Architecture diagrams embedded (if available) (P3, testable)

---

## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)

**Tasks**:
- [T-001: Create Enhanced Content Builder](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001-create-enhanced-content-builder)
- [T-002: Create Spec-to-Increment Mapper](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-002-create-spec-to-increment-mapper)
- [T-003: Enhance GitHub Content Sync](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-003-enhance-github-content-sync)
- [T-004: Enhance JIRA Content Sync](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-004-enhance-jira-content-sync)
- [T-005: Enhance ADO Content Sync](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-005-enhance-ado-content-sync)

---

## Business Rationale

External stakeholders (PM, clients, executives) need complete context without developer access to repository.

**Before**: External issues show only file path reference
**After**: External issues show full user stories, AC, and task links

**Impact**:
- Stakeholders understand features without repository access
- Reduced back-and-forth communication
- Better visibility for non-technical stakeholders

---

## Test Coverage

**Unit Tests**: 90% coverage
- enhanced-content-builder.test.ts (7 test cases)

**Integration Tests**: 85% coverage
- content-sync-integration.test.ts (5 scenarios)

**E2E Tests**: 100% critical paths
- status-sync.spec.ts (user flow validation)

---

## Related User Stories

- [US-002: Task-Level Mapping](us-002-task-level-mapping.md) - Builds on this for traceability
- [US-004: Bidirectional Status Sync](us-004-bidirectional-status-sync.md) - Uses rich content

---

**Status**: ✅ Complete
**Completed**: 2025-11-12
```

**Key Points**:
- ✅ One user story per file (~80-120 lines)
- ✅ Links to epic (parent)
- ✅ Links to tasks in tasks.md (implementation)
- ✅ Links to related user stories (siblings)
- ✅ Business rationale and test coverage
- ✅ Self-contained and navigable

---

## Distribution Algorithm

### Step 1: Parse Increment Spec

**Extract**:
- Epic-level metadata (title, overview, business value)
- User stories (7 total)
- Acceptance criteria per user story
- Implementation references (tasks)

### Step 2: Classify Content

**Epic-level** (goes to SPEC-031.md):
- Title and ID
- Quick overview
- Business value summary
- Implementation history
- User story list (with links)
- External tool links
- Overall progress

**User-story-level** (goes to us-###.md files):
- User story title and description
- Acceptance criteria (detailed)
- Implementation tasks (with links to tasks.md)
- Business rationale
- Test coverage
- Related user stories

**Task-level** (stays in tasks.md):
- Task definitions
- Test plans (BDD format)
- Implementation details

### Step 3: Generate Files

**Create**:
1. Epic file: `SPEC-031-external-tool-status-sync.md` (~50-80 lines)
2. User story folder: `user-stories/`
3. 7 user story files: `us-001.md` through `us-007.md` (~80-120 lines each)

### Step 4: Cross-Link

**Epic → User Stories**: Links to user story files
**User Stories → Epic**: Links back to epic
**User Stories → Tasks**: Links to tasks.md with anchors
**User Stories → User Stories**: Links to related stories

---

## Implementation Plan

### Phase 1: Core Distribution Engine

**File**: `src/core/living-docs/spec-distributor.ts`

```typescript
interface DistributionResult {
  epic: EpicFile;
  userStories: UserStoryFile[];
  crossLinks: CrossLink[];
}

class SpecDistributor {
  // Parse increment spec into structured data
  parseIncrementSpec(specPath: string): ParsedSpec;

  // Classify content into epic vs user-story level
  classifyContent(parsed: ParsedSpec): ClassifiedContent;

  // Generate epic file
  generateEpicFile(classified: ClassifiedContent): EpicFile;

  // Generate user story files
  generateUserStoryFiles(classified: ClassifiedContent): UserStoryFile[];

  // Generate cross-links
  generateCrossLinks(epic: EpicFile, stories: UserStoryFile[]): CrossLink[];

  // Write files to disk
  writeDistribution(result: DistributionResult): void;
}
```

### Phase 2: Update spec-parser.ts

**Changes**:
- Extract `formatEpicFile()` function
- Extract `formatUserStoryFile()` function
- Update `writeLivingDocsSpec()` to support both formats

### Phase 3: Update sync-living-docs.ts

**Changes**:
- Replace `extractAndMergeLivingDocs()` with `distributeIncrementSpec()`
- Use `SpecDistributor` for content distribution
- Handle existing epic/user-story files (merge vs create)

### Phase 4: Migration Script

**File**: `scripts/migrate-living-docs-to-hierarchy.ts`

**Purpose**: Migrate existing flat specs to hierarchical structure

**Algorithm**:
1. Read existing SPEC-###.md file
2. Parse into epic + user stories
3. Generate new structure
4. Move old file to `_archive/`
5. Write new files

---

## Success Criteria

### Correct Structure

✅ Each epic has 1 SPEC-###.md file (~50-80 lines)
✅ Each user story has 1 us-###.md file (~80-120 lines)
✅ All task links point to tasks.md with anchors
✅ Cross-links work bidirectionally

### Maintainability

✅ Easy to find specific user story
✅ Easy to update individual user stories
✅ Easy to add new user stories without touching epic

### External Tool Mapping

✅ SPEC-031 → GitHub Project / JIRA Epic / ADO Feature
✅ US-001 → GitHub Issue / JIRA Story / ADO User Story
✅ T-001 → GitHub subtask / JIRA subtask / ADO Task

---

## Next Steps

1. **Implement SpecDistributor** - Core distribution engine
2. **Update spec-parser.ts** - Support epic + user story formats
3. **Update sync-living-docs.ts** - Use new distribution logic
4. **Refactor SPEC-031** - Split into epic + 7 user story files
5. **Test end-to-end** - Verify sync works correctly
6. **Create migration script** - Migrate existing specs
7. **Document architecture** - Update CLAUDE.md and docs

---

**Status**: 🎯 Design Complete, Ready for Implementation
**Next**: Start implementing SpecDistributor class
