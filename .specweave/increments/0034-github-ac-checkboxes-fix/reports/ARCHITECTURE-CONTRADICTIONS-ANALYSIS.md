# GitHub Sync Architecture Contradictions Analysis

**Date**: 2025-11-15
**Issue**: Multiple conflicting architectures causing Feature-level issues instead of User Story issues
**Root Cause**: Documentation and code disagree on Universal Hierarchy mapping

---

## The Core Principle (CORRECT) ✅

**User's Core Principle**:
- ✅ **User Story** (US-001, US-002, etc.) → GitHub **Issue**
- ✅ **Feature** (FS-033) → GitHub **Milestone**
- ✅ **Tasks** (T-001, T-002, etc.) → **Checkboxes** in User Story issue

**Living Docs Structure**:
```
.specweave/docs/internal/specs/
├── _features/
│   └── FS-033/
│       └── FEATURE.md          ← Feature overview
└── default/
    └── FS-033/
        ├── us-001-*.md         ← User Story → Should be GitHub Issue!
        ├── us-002-*.md         ← User Story → Should be GitHub Issue!
        ├── us-003-*.md         ← User Story → Should be GitHub Issue!
        └── us-004-*.md         ← User Story → Should be GitHub Issue!
```

---

## Problem: Issue #506

**What Was Created** (WRONG):
- **Title**: `[FS-033] Duplicate Increment Prevention System`
- **Type**: GitHub Issue (not Milestone!)
- **Content**: All 4 User Stories as checkboxes in the body

**What Should Exist** (CORRECT):
- **FS-033** → GitHub **Milestone** (Container for all User Stories)
- **US-001** → GitHub **Issue** `[FS-033][US-001] Prevent Duplicate Locations`
- **US-002** → GitHub **Issue** `[FS-033][US-002] Auto-Detect and Resolve Conflicts`
- **US-003** → GitHub **Issue** `[FS-033][US-003] Manual Archive with Configurable Threshold`
- **US-004** → GitHub **Issue** `[FS-033][US-004] Comprehensive Test Coverage`

---

## Contradiction #1: CLAUDE.md Documentation

**Location**: `CLAUDE.md:827-829` and `src/templates/CLAUDE.md.template:136`

**Current Table** (WRONG):
```markdown
| Context | Format | Example | Code Location |
|---------|--------|---------|---------------|
| **Feature/Epic Issue** | `[FS-NNN] Title` | `[FS-031] External Tool Status Sync` | `github-epic-sync.ts:542` |
| **User Story Issue** | `[FS-NNN][US-NNN] Title` | `[FS-031][US-002] Task Mapping` | `spec-distributor.ts` |
| **Increment Issue** | `[FS-NNN] Title` | `[FS-031] External Tool Status Sync` | `post-increment-planning.sh:409` |
```

**Problems**:
- ❌ Row 1: "Feature/Epic Issue" implies Features create Issues (WRONG! They should create Milestones)
- ❌ Row 3: "Increment Issue" uses same format as Feature (confusing!)
- ❌ Both Feature and Increment use `[FS-NNN]` format (ambiguous!)

**Correct Table** (should be):
```markdown
| Context | Format | Example | Maps To |
|---------|--------|---------|---------|
| **Feature** | N/A (Milestone) | FS-033 | GitHub Milestone (Container) |
| **User Story** | `[FS-NNN][US-NNN] Title` | `[FS-033][US-001] Prevent Duplicates` | GitHub Issue |
| **Task** | N/A (Checkbox) | T-001 | Checkbox in User Story issue |
```

---

## Contradiction #2: github-epic-sync.ts Architecture

**Location**: `plugins/specweave-github/lib/github-epic-sync.ts:1-9`

**Current Comment** (WRONG):
```typescript
/**
 * Architecture:
 * - Epic (FS-001) → GitHub Milestone
 * - Increment (0001-core-framework) → GitHub Issue (linked to Milestone)
 */
```

**Current Code** (line 542):
```typescript
const title = `[${epicId}] ${increment.title}`;
// Creates: "[FS-033] Duplicate Increment Prevention System"
```

**Problems**:
- ❌ Maps **Increment** to GitHub Issue (WRONG! Should map **User Stories**)
- ❌ Uses terminology "Epic" instead of "Feature" (inconsistent with Universal Hierarchy)
- ❌ Creates a **SINGLE issue per increment** with User Stories as checkboxes
- ❌ The `EpicContentBuilder` is used to build a monolithic issue body (wrong usage!)

**Correct Architecture** (should be):
```typescript
/**
 * Architecture:
 * - Feature (FS-033) → GitHub Milestone
 * - User Story (US-001, US-002, etc.) → GitHub Issue (under Milestone)
 * - Tasks (T-001, T-002, etc.) → Checkboxes in User Story issue
 */

// For each user story:
const title = `[${featureId}][${userStoryId}] ${userStory.title}`;
// Creates: "[FS-033][US-001] Prevent Duplicate Locations"
```

---

## Contradiction #3: create-feature-github-issue.ts Script

**Location**: `scripts/create-feature-github-issue.ts:1-12`

**Current Comment** (COMPLETELY WRONG):
```typescript
/**
 * Create GitHub Issue for Feature Spec (Living Docs)
 *
 * Properly maps SpecWeave hierarchy to GitHub:
 * - FS-* (Epic/Feature) → GitHub Issue (Type: Feature)
 * - US-* (User Story) → Checkbox in issue body
 * - T-* (Task) → Not synced (temporary, in increments)
 */
```

**Problems**:
- ❌ Maps **Feature → GitHub Issue** (WRONG! Should be Milestone)
- ❌ Maps **User Story → Checkbox** (WRONG! Should be Issue)
- ❌ This entire script violates the Universal Hierarchy!

**Correct Approach**:
- ✅ Delete this script OR repurpose to create Milestones
- ✅ Create separate script for User Story → Issue mapping

---

## Contradiction #4: Universal Hierarchy Table (CORRECT)

**Location**: `CLAUDE.md` (Living Docs Sync section)

**Table** (THIS IS CORRECT!):
```markdown
| SpecWeave | GitHub | Jira | ADO | Description |
|-----------|--------|------|-----|-------------|
| **Epic** | - | Initiative | Epic | Optional: Strategic theme |
| **Feature (FS-*)** | Milestone | Epic | Feature | Required: Cross-project feature |
| **US-* (User Story)** | Issue | Story | User Story | Project-specific requirement |
| **T-* (Task)** | Checkbox | Sub-task | Task | Implementation unit |
```

**This table is CORRECT** - but the code doesn't follow it!

---

## What Went Wrong

**User ran** (most likely):
```bash
/specweave-github:sync 0033
# OR
/specweave-github:sync-epic FS-033
```

**What happened**:
1. `github-epic-sync.ts` detected Epic FS-033
2. Created GitHub Milestone for FS-033 ✅ CORRECT
3. Created GitHub Issue #506 with title `[FS-033] Duplicate...` ❌ WRONG
4. Used `EpicContentBuilder` to put all 4 User Stories as checkboxes ❌ WRONG

**What should have happened**:
1. Create GitHub Milestone for FS-033 ✅
2. Read all `us-*.md` files in `.specweave/docs/internal/specs/default/FS-033/`
3. For **each** user story file:
   - Create separate GitHub Issue: `[FS-033][US-001]`, `[FS-033][US-002]`, etc.
   - Link issue to Milestone FS-033
   - Extract tasks from tasks.md and add as checkboxes in issue body

---

## Files That Need Fixing

### Critical (Must Fix):

1. **`plugins/specweave-github/lib/github-epic-sync.ts`** (Lines 1-9, 532-581)
   - ❌ Change architecture comment to use "Feature" not "Epic"
   - ❌ Change from "Increment → Issue" to "User Story → Issue"
   - ❌ Refactor `createIssue()` to create ONE issue PER user story
   - ❌ Remove single monolithic issue approach

2. **`CLAUDE.md`** (Lines 827-829)
   - ❌ Remove "Feature/Epic Issue" row
   - ❌ Remove "Increment Issue" row
   - ❌ Keep ONLY "User Story Issue" row
   - ❌ Add "Feature → Milestone" clarification

3. **`src/templates/CLAUDE.md.template`** (Line 136)
   - ❌ Same fixes as CLAUDE.md

### Medium Priority:

4. **`scripts/create-feature-github-issue.ts`**
   - ❌ Delete entire script OR repurpose to create Milestones
   - ❌ If kept, rename to `create-feature-milestone.ts`

5. **`scripts/bulk-spec-sync.ts`**
   - ⚠️  Review to ensure it's not creating Feature-level issues

6. **`plugins/specweave-github/lib/epic-content-builder.ts`**
   - ⚠️  Repurpose for creating User Story issue bodies
   - ⚠️  OR keep for Milestone descriptions (aggregated view)

---

## Recommended Fix Approach

### Phase 1: Documentation Cleanup (Quick)

1. Update `CLAUDE.md` table:
   - Remove "Feature/Epic Issue" and "Increment Issue" rows
   - Keep only "User Story Issue" row
   - Add clarification: "Features create Milestones, not Issues"

2. Update `github-epic-sync.ts` comment header

### Phase 2: Code Refactoring (Complex)

1. Create new method: `createUserStoryIssues()`
   - Read all `us-*.md` files from `.specweave/docs/internal/specs/{project}/FS-XXX/`
   - For each user story:
     - Create GitHub Issue: `[FS-XXX][US-001] Title`
     - Link to Milestone
     - Add tasks as checkboxes
     - Update user story frontmatter with GitHub issue link

2. Update `syncEpicToGitHub()`:
   - Step 1: Create/update Milestone ✅ (already works)
   - Step 2: Create User Story Issues (NEW!)
   - Step 3: Update Epic FEATURE.md with links

3. Delete or repurpose:
   - `create-feature-github-issue.ts` → Delete or rename to `create-feature-milestone.ts`
   - `epic-content-builder.ts` → Repurpose for User Story bodies

### Phase 3: Migration

1. Close existing Feature-level issues (like #506)
2. Create proper User Story issues for active Features
3. Update all frontmatter references

---

## Testing Strategy

1. **Test Case 1**: New Feature
   - Create new Feature FS-099 with 3 User Stories
   - Run `/specweave-github:sync-epic FS-099`
   - Verify: 1 Milestone + 3 Issues created

2. **Test Case 2**: Existing Feature
   - Update existing Feature FS-033 with 1 new User Story
   - Run sync
   - Verify: New User Story issue created, existing issues untouched

3. **Test Case 3**: Status Updates
   - Mark US-001 as completed
   - Run sync
   - Verify: GitHub issue #XXX closed automatically

---

## Impact Analysis

### Benefits of Fix:
- ✅ **Correct traceability**: Each User Story = 1 GitHub Issue
- ✅ **Better visibility**: Team can comment/discuss individual User Stories
- ✅ **Granular tracking**: Close User Stories independently
- ✅ **Consistent architecture**: Matches Universal Hierarchy everywhere
- ✅ **Scalability**: Large Features with 20+ User Stories won't have unwieldy single issue

### Risks:
- ⚠️  **Breaking change**: Existing syncs using old format will break
- ⚠️  **Migration needed**: Must close old Feature-level issues
- ⚠️  **More API calls**: N User Stories = N GitHub API calls (rate limiting!)

---

## Next Steps

**Immediate** (User Action):
1. Close issue #506 manually: `gh issue close 506 --comment "Migrating to User Story-based issues"`
2. Run proper sync: `/specweave-github:sync-epic FS-033` (after code is fixed)

**Development** (Contributor Action):
1. Fix `CLAUDE.md` documentation (2 locations)
2. Refactor `github-epic-sync.ts` to create User Story issues
3. Test with FS-033 (4 User Stories)
4. Update migration guide for existing users

---

**Analysis Complete** ✅
