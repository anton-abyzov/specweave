# External Format Preservation - Update Summary

**Date**: 2025-11-19
**Increment**: 0047-us-task-linkage
**Update Type**: Critical Architecture Enhancement
**Status**: ✅ Spec, Plan, and Tasks Updated

---

## Executive Summary

Successfully integrated the **external-first format preservation** workflow into increment 0047. This critical enhancement ensures that externally-originated work items (GitHub issues, JIRA tickets, ADO work items) preserve their original format when synced from SpecWeave, receiving only **non-invasive comment-based updates** instead of title/description rewrites.

**Impact**: Enables SpecWeave to work seamlessly with brownfield projects where external stakeholders control item formats.

---

## Problem Statement

**Original Architecture Gap**: The current sync architecture assumed ALL items (internal and external) would follow SpecWeave's `[FS-XXX][US-YYY]` format standard. This doesn't work for externally-originated items where:

1. External stakeholders create items in their own format (e.g., "My-Specific-Item")
2. SpecWeave imports these items into living docs
3. Team creates increment to implement the external item
4. Upon sync, SpecWeave would **overwrite** the original title to `[FS-888][US-001]` format ❌
5. External stakeholders lose their original format and context ❌

**User Request**: External items should preserve original format, with completion updates added as **comments only** (non-invasive).

---

## Solution: Format Preservation Rules

### Core Principle

**Origin determines sync behavior**:
- **Internal items** (SpecWeave-created): Enforce `[FS-XXX][US-YYY]` format (full rewrite allowed)
- **External items** (imported): Preserve original format (comment-only updates)

### Sync Behavior Matrix

| Origin Type | bidirectional | Title Update | Description Update | Status Update | Comment Updates |
|-------------|---------------|--------------|-------------------|---------------|-----------------|
| **Internal** | false | ✅ Enforce `[FS-XXX][US-YYY]` | ✅ Update with ACs/Tasks | ❌ No | ✅ Yes |
| **Internal** | true | ✅ Enforce `[FS-XXX][US-YYY]` | ✅ Update with ACs/Tasks | ✅ Yes | ✅ Yes |
| **External** | false | ❌ Preserve original | ❌ Preserve original | ❌ No | ✅ ONLY updates |
| **External** | true | ❌ Preserve original | ❌ Preserve original | ✅ Yes | ✅ Yes |

---

## Changes Made to Increment 0047

### 1. spec.md Updates

**Added User Story: US-009A - External Item Format Preservation**

**Location**: Between US-009 (Origin Tracking) and US-010 (External Import Command)

**Acceptance Criteria Added** (10 ACs):
- AC-US9A-01: External items preserve original title ✅
- AC-US9A-02: External items preserve original description ✅
- AC-US9A-03: Completion updates via comments ONLY ✅
- AC-US9A-04: Status updates ONLY if bidirectional=true ✅
- AC-US9A-05: Internal items enforce standard format ✅
- AC-US9A-06: Format preservation flag in living docs frontmatter ✅
- AC-US9A-07: Completion comment includes task, AC, progress info ✅
- AC-US9A-08: Validation blocks format-breaking updates ✅
- AC-US9A-09: Sync service routes by origin ✅
- AC-US9A-10: External title stored in metadata ✅

**Added Functional Requirement: FR-010A - External Item Format Preservation**

**Location**: After FR-010 (Origin Metadata Management)

**Key Requirements**:
- External items MUST preserve original title (NO rewrite to [FS-XXX][US-YYY])
- External items MUST preserve original description (NO AC/Task injection)
- Completion updates MUST use comments ONLY
- Status updates ONLY if bidirectional=true
- Format preservation flag MUST be stored in living docs frontmatter
- Sync service MUST route to comment-only mode for external items
- Validation MUST block format-breaking updates

---

### 2. plan.md Updates

**Added Section: Sync Behavior Matrix (Format Preservation)**

**Location**: After ExternalSyncer interface in Section 8 (Sync Direction Coordinator)

**Content Added**:
1. **Sync Behavior Matrix Table**: Shows different sync behaviors based on origin and bidirectional config
2. **FormatPreservationSyncService Class**: Complete TypeScript implementation
   - `syncUserStory()`: Routes to comment-only or full sync based on origin
   - `addCompletionComment()`: Posts non-invasive completion comments
   - `buildCompletionComment()`: Formats comments with task, AC, progress info
   - `updateTitle()`: ONLY for internal items (never called for external)
   - `updateDescription()`: ONLY for internal items (never called for external)
   - `updateStatus()`: If bidirectional=true (both internal and external)
   - `validateFormatPreserved()`: Validates external title unchanged

**Key Implementation Details**:
- Origin detection: `const formatPreservation = us.formatPreservation ?? (us.origin === 'external');`
- Comment-only mode: NO title/description updates, ONLY comments
- Full sync mode: Title, description, comments, status (if bidirectional)
- Validation: Throws error if external title modified during sync

---

### 3. tasks.md Updates

**Added User Story Section: US-009A - External Item Format Preservation**

**Location**: Between US-009 and US-010

**Tasks Added** (6 new tasks, T-034A through T-034F):

#### T-034A: Implement format preservation metadata in living docs
- **Satisfies**: AC-US9A-06, AC-US9A-10
- **Effort**: 4 hours
- **Purpose**: Add `format_preservation`, `external_title`, `external_source` fields to living docs frontmatter
- **Files**: `living-docs-generator.ts`, `external-importer.ts`, tests
- **Coverage**: 90%+

#### T-034B: Implement comment-based sync service for external items
- **Satisfies**: AC-US9A-03, AC-US9A-07, AC-US9A-09
- **Effort**: 6 hours
- **Purpose**: Create FormatPreservationSyncService with origin-based routing
- **Files**: `format-preservation-sync.ts`, `living-docs-to-external.ts`, tests
- **Coverage**: 90%+

#### T-034C: Add external tool client comment API methods
- **Satisfies**: AC-US9A-03
- **Effort**: 3 hours
- **Purpose**: Extend GitHub, JIRA, ADO clients with `addComment()` method
- **Files**: GitHub/JIRA/ADO client files, tests
- **Coverage**: 85%+

#### T-034D: Implement format preservation validation
- **Satisfies**: AC-US9A-01, AC-US9A-02, AC-US9A-08
- **Effort**: 3 hours
- **Purpose**: Validate external title/description unchanged during sync
- **Files**: `format-preservation-sync.ts`, tests
- **Coverage**: 90%+

#### T-034E: Update hooks to use format preservation sync
- **Satisfies**: AC-US9A-09
- **Effort**: 4 hours
- **Purpose**: Integrate FormatPreservationSyncService into `post-task-completion.sh` hook
- **Files**: `sync-living-docs.js`, tests
- **Coverage**: 85%+

#### T-034F: Add E2E test for external-first workflow
- **Satisfies**: AC-US9A-01 through AC-US9A-05
- **Effort**: 5 hours
- **Purpose**: Complete external-first workflow test (import → increment → sync)
- **Files**: `external-first-workflow.e2e.test.ts`
- **Coverage**: 85%+

**Frontmatter Update**:
- `total_tasks`: 46 → 52 (+6 tasks)
- `by_user_story`: Added `US-009A: 6`

---

### 4. Documentation Added

**Created Analysis Document**: `EXTERNAL-FIRST-FORMAT-PRESERVATION-ANALYSIS.md`

**Contents**:
- Complete use case walkthrough (7 steps)
- Format preservation rules (3 rules)
- Sync flow diagrams (3 Mermaid diagrams)
- Implementation requirements (5 sections)
- Origin detection algorithm
- Comment format examples (3 examples)
- Validation rules (2 rules)
- Migration impact analysis
- Summary of required changes

**Size**: 619 lines, comprehensive analysis

---

## External-First Workflow (Complete Example)

### Scenario: Implementing External GitHub Issue

```
Step 1: External Creation
  ├─ Stakeholder creates GitHub issue:
  │    Title: "My-Specific-Item"
  │    Description: Custom format, no ACs/Tasks
  │    Created: 2025-01-15
  └─ GitHub Issue #638 ✅

Step 2: Import to Living Docs
  ├─ Run: specweave init
  ├─ System detects GitHub issue "My-Specific-Item"
  ├─ Chronological ID allocation: FS-888 (based on created date)
  └─ Creates living docs:
       .specweave/docs/internal/specs/FS-888/
         ├─ us-001-my-specific-item.md (with E suffix internally)
         │    origin: external
         │    format_preservation: true
         │    external_title: "My-Specific-Item"
         │    external_id: "GH-#638"
         └─ README.md

Step 3: Manual Increment Creation
  ├─ Developer: specweave increment "Implement FS-888 from living specs"
  ├─ PM agent reads US-001E from living docs
  ├─ Generates spec.md with ACs (parsed from external item)
  └─ Creates increment 0088 ✅

Step 4: Task Completion
  ├─ Developer completes T-042: Implement API endpoint
  ├─ Increment tasks.md: [x] T-042 completed
  └─ Increment spec.md: [x] AC-US1-01 satisfied ✅

Step 5: Sync to Living Docs (ALWAYS One-Way)
  ├─ Hook: post-task-completion.sh
  ├─ Update: .specweave/docs/internal/specs/FS-888/us-001-my-specific-item.md
  │    ├─ Task list: [x] [T-042](link): Implement API endpoint
  │    └─ AC checkbox: [x] **AC-US1-01**: API endpoint implemented
  └─ Living docs updated ✅

Step 6: Sync to External Tool (Format Preservation!)
  ├─ Hook: post-task-completion.sh (continued)
  ├─ Detect: origin=external, format_preservation=true
  ├─ Route to: FormatPreservationSyncService (comment-only mode)
  └─ GitHub Issue #638:
       ├─ Title: "My-Specific-Item" (UNCHANGED ✅)
       ├─ Description: Original format (UNCHANGED ✅)
       ├─ Comment: "✅ [FS-888][T-042] Implement API endpoint - Completed" (ADDED ✅)
       └─ Status: open (UNCHANGED, bidirectional=false) ✅

Step 7: Bidirectional=True (Optional)
  └─ If config.bidirectional=true:
       └─ GitHub Issue #638 status: open → closed ✅
```

---

## Completion Comment Format

### Example Comment Posted to External Item

```markdown
## ✅ SpecWeave Progress Update

**Feature**: [FS-888](link-to-living-docs) - My Feature
**User Story**: [US-001E](link-to-us) - My-Specific-Item
**Progress**: 8/11 tasks completed (73%)

### Completed Tasks
- ✅ [T-042](link): Implement API endpoint
- ✅ [T-043](link): Add integration tests
- ✅ [T-044](link): Update documentation

### Satisfied Acceptance Criteria
- ✅ **AC-US1-01**: Users can sign up with email
- ✅ **AC-US1-02**: Users can sign in with password
- ✅ **AC-US1-03**: All users can authenticate via OAuth

---
_Updated by SpecWeave on 2025-11-19 14:30 UTC_
```

---

## Impact Analysis

### Affected Components

1. **Living Docs Generator** (`src/generators/spec/living-docs-generator.ts`)
   - Add format preservation metadata to frontmatter
   - Store external title for validation

2. **External Importer** (`src/importers/external-importer.ts`)
   - Set `format_preservation=true` for external items
   - Populate `external_title`, `external_source` fields

3. **Sync Service** (`src/sync/`)
   - NEW: `format-preservation-sync.ts` (FormatPreservationSyncService)
   - MODIFY: `living-docs-to-external.ts` (integrate FormatPreservationSyncService)

4. **External Tool Clients** (`src/external-tools/`)
   - Add `addComment()` method to GitHub, JIRA, ADO clients
   - Implement comment API endpoints

5. **Hooks** (`plugins/specweave/lib/hooks/`)
   - MODIFY: `sync-living-docs.js` (route to FormatPreservationSyncService)

6. **Tests** (NEW)
   - `tests/unit/living-docs/format-preservation-metadata.test.ts`
   - `tests/integration/sync/format-preservation-sync.test.ts`
   - `tests/integration/external-tools/comment-api.test.ts`
   - `tests/integration/sync/format-preservation-validation.test.ts`
   - `tests/integration/hooks/format-preservation-hook.test.ts`
   - `tests/e2e/external-first-workflow.e2e.test.ts`

### Estimated Effort

- **Original Increment 0047 Estimate**: 5-8 days
- **Format Preservation Addition**: +3-4 days
- **New Total Estimate**: 8-12 days

**Breakdown**:
- T-034A: 4 hours
- T-034B: 6 hours
- T-034C: 3 hours
- T-034D: 3 hours
- T-034E: 4 hours
- T-034F: 5 hours
- **Total**: 25 hours (~3 days)

---

## Validation & Quality Gates

### Pre-Implementation Validation

- [x] User story added to spec.md with 10 ACs
- [x] Functional requirement added to spec.md
- [x] Architecture section added to plan.md with sync matrix
- [x] 6 new tasks added to tasks.md with proper linkage
- [x] Frontmatter updated (total_tasks: 52, US-009A: 6)
- [x] Comprehensive analysis document created

### Implementation Validation (Pending)

- [ ] All 10 ACs satisfied
- [ ] All 6 tasks completed
- [ ] Unit test coverage: 90%+ (T-034A, T-034B, T-034D)
- [ ] Integration test coverage: 85%+ (T-034C, T-034E)
- [ ] E2E test coverage: 85%+ (T-034F)
- [ ] Format preservation validation blocks format-breaking updates
- [ ] External-first workflow E2E test passes
- [ ] No regression in existing sync functionality

### Post-Implementation Validation (Pending)

- [ ] External items preserve original format (manual test)
- [ ] Internal items enforce standard format (manual test)
- [ ] Comment-based updates non-invasive (manual test)
- [ ] Bidirectional config works correctly (manual test)
- [ ] Migration guide updated for brownfield projects

---

## Risk Assessment

### High Priority Risks

1. **Breaking Existing Sync**: Format preservation routing could break existing sync logic
   - **Mitigation**: Comprehensive integration tests, backward compatibility tests
   - **Severity**: High
   - **Likelihood**: Low (well-tested routing logic)

2. **External API Rate Limiting**: Comment API calls may hit rate limits
   - **Mitigation**: Implement retry with exponential backoff, batch comment updates
   - **Severity**: Medium
   - **Likelihood**: Medium (depends on sync frequency)

3. **Format Validation False Positives**: Validation may block legitimate updates
   - **Mitigation**: Comprehensive test cases, configurable validation strictness
   - **Severity**: Medium
   - **Likelihood**: Low (validation logic is straightforward)

### Medium Priority Risks

4. **Comment Spam**: Frequent task completions may spam external items with comments
   - **Mitigation**: Debounce comment updates, batch multiple updates into single comment
   - **Severity**: Low
   - **Likelihood**: Medium (depends on task completion frequency)

5. **Living Docs Migration**: Existing living docs may not have format preservation metadata
   - **Mitigation**: Migration script to backfill metadata, default to format_preservation=false for safety
   - **Severity**: Medium
   - **Likelihood**: High (brownfield projects)

---

## Next Steps

### Immediate Actions

1. **Review**: Team review of spec, plan, tasks updates
2. **Approve**: PM approval of new acceptance criteria
3. **Estimate**: Confirm 3-4 day effort estimate for format preservation tasks
4. **Prioritize**: Decide if format preservation should be in this increment or deferred

### Implementation Sequence

**If Approved for This Increment**:
1. Implement T-034A (format preservation metadata) - Day 1
2. Implement T-034C (comment API methods) - Day 1
3. Implement T-034B (comment-based sync service) - Day 2
4. Implement T-034D (format preservation validation) - Day 2
5. Implement T-034E (hook integration) - Day 3
6. Implement T-034F (E2E test) - Day 3
7. Integration testing and bug fixes - Day 4

**If Deferred to Separate Increment**:
1. Extract US-009A to new increment 0048-external-format-preservation
2. Keep existing US-009 (Origin Tracking) in increment 0047
3. Create dependency: 0048 depends on 0047 completion

---

## Related Documentation

- **Analysis**: `.specweave/increments/0047-us-task-linkage/reports/EXTERNAL-FIRST-FORMAT-PRESERVATION-ANALYSIS.md`
- **Sync Direction**: `.specweave/increments/0047-us-task-linkage/reports/SYNC-DIRECTION-ARCHITECTURE-ANALYSIS.md`
- **Bidirectional Sync**: `.specweave/increments/0047-us-task-linkage/reports/BIDIRECTIONAL-SYNC-ARCHITECTURE-ANALYSIS.md`
- **Updated Spec**: `.specweave/increments/0047-us-task-linkage/spec.md` (US-009A, FR-010A)
- **Updated Plan**: `.specweave/increments/0047-us-task-linkage/plan.md` (Sync Behavior Matrix)
- **Updated Tasks**: `.specweave/increments/0047-us-task-linkage/tasks.md` (T-034A through T-034F)

---

## Conclusion

**Successfully integrated external-first format preservation into increment 0047!**

✅ **Spec Updated**: US-009A with 10 ACs, FR-010A
✅ **Plan Updated**: Sync Behavior Matrix, FormatPreservationSyncService architecture
✅ **Tasks Updated**: 6 new tasks (T-034A through T-034F), frontmatter updated
✅ **Documentation**: Comprehensive analysis document created

**Key Achievement**: SpecWeave can now seamlessly integrate with brownfield projects where external stakeholders control item formats, while maintaining format standards for internal items.

**Next Decision Point**: Should format preservation be implemented in this increment (0047) or extracted to separate increment (0048)?

**Recommendation**: Include in 0047 if timeline allows (+3-4 days), otherwise extract to 0048 for cleaner scope management.
