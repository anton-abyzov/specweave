# GitHub Epic Sync - Task Extraction Issue Analysis

**Date**: 2025-11-14
**Increment**: 0031-external-tool-status-sync
**Issue**: GitHub issues showing 0/0 tasks despite having user stories

---

## Problem Statement

When syncing specs to GitHub using `/specweave-github:sync-spec`, some issues display "Progress: 0/0 tasks complete (0%)" even though they have user stories and increments.

**Affected Issue**: [#390 - LLM-Native Multilingual Support](https://github.com/anton-abyzov/specweave/issues/390)
**Working Issue**: [#375 - External Tool Status Synchronization](https://github.com/anton-abyzov/specweave/issues/375)

---

## Root Cause Analysis

### Issue #390 - NO Tasks Displayed

**User Story File**: `.specweave/docs/internal/specs/default/FS-25-11-03-llm-native-i18n/us-001-russian-developer-initializes-project.md`

```markdown
## Implementation

**Increment**: [0006-llm-native-i18n](undefined)  ← ❌ BROKEN LINK!

**Tasks**:  ← ❌ EMPTY - NO TASK LINKS!
```

**Why?**
1. Increment link is broken: `(undefined)` because `userStory.implementation.tasks[0]?.path` is `undefined` (line 822 in spec-distributor.ts)
2. No task links because `userStory.implementation.tasks` is EMPTY array

### Issue #375 - WITH Tasks Displayed

**User Story File**: `.specweave/docs/internal/specs/default/FS-25-11-12-external-tool-status-sync/us-001-rich-external-issue-content.md`

```markdown
## Implementation

**Increment**: [0031-external-tool-status-sync](../../../../../increments/0031-external-tool-status-sync/tasks.md)  ← ✅ VALID!

**Tasks**:
- [T-001: Create Enhanced Content Builder](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-001-create-enhanced-content-builder)
- [T-003: Enhance GitHub Content Sync](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-003-enhance-github-content-sync)
- [T-004: Enhance JIRA Content Sync](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-004-enhance-jira-content-sync)
- [T-005: Enhance ADO Content Sync](../../../../../increments/0031-external-tool-status-sync/tasks.md#t-005-enhance-ado-content-sync)
```

---

## Technical Deep Dive

### How Task Extraction Works

**File**: `src/core/living-docs/spec-distributor.ts`

**Flow**:
1. `extractUserStories()` (line 303) - Creates user stories with EMPTY task arrays (line 340)
2. `generateUserStoryFiles()` (line 451) - Populates task arrays:
   - Line 455: `const taskMap = await this.loadTaskReferences(incrementId);`
   - Line 459: `const tasks = this.findTasksForUserStory(userStory.id, taskMap);`
3. `loadTaskReferences()` (line 498) - Reads tasks.md and creates taskMap
4. `findTasksForUserStory()` (line 542) - Maps tasks to user stories using AC-IDs

**Critical Pattern** (line 510):
```typescript
const taskPattern = /^##+ (T-\d+):\s+(.+?)$[\s\S]*?\*\*AC\*\*:\s*([^\n]+)?/gm;
```

This pattern **requires** tasks to have a `**AC**:` field with AC-IDs like `AC-US1-01, AC-US1-02`.

### The Problem

**Increment 0006 (LLM Native i18n)**:
- **AC fields**: `0` ❌
- **Format**: OLD format without AC-IDs
- **Result**: NO tasks extracted → Empty task arrays → "0/0 tasks"

```markdown
### T-000: Create IncrementStatusDetector Utility

**Status**: [x] Completed
**Priority**: P0
**Dependencies**: None

**Acceptance Criteria**:  ← ❌ BULLET POINTS, NOT AC-IDs!
- ✅ Detects incomplete increments
- ✅ Parses tasks.md correctly
```

**Increment 0031 (External Tool Status Sync)**:
- **AC fields**: `24` ✅
- **Format**: NEW format with AC-IDs
- **Result**: Tasks extracted successfully → "6/19 tasks complete (32%)"

```markdown
### T-001: Create Enhanced Content Builder
**Status**: [x] (100% - Completed)

**User Story**: [US-001: Rich External Issue Content](...)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04  ← ✅ AC-IDs!
```

---

## Impact Analysis

### Affected Increments

**Likely affected**: ALL increments using the OLD tasks.md format (pre-v0.16.0)

| Increment ID | Format | AC Fields | Epic Sync Impact |
|--------------|--------|-----------|------------------|
| 0001-0005 | OLD | 0 | ❌ NO tasks in GitHub issues |
| 0006 | OLD | 0 | ❌ NO tasks in GitHub issues |
| 0031 | NEW | 24 | ✅ Tasks displayed correctly |

### User Experience Impact

**GitHub Issues Without Tasks**:
- Show "0/0 tasks complete (0%)"
- No task-level progress tracking
- No task checkboxes for stakeholders
- Looks incomplete/empty to external viewers

**EpicContentBuilder** (`plugins/specweave-github/lib/epic-content-builder.ts`):
- Line 184: Looks for task links in user story Implementation section
- Line 156-158: Returns empty array if no increment ID found
- Result: "Tasks by User Story" section is empty

---

## Solutions

### Option 1: Migrate Old Increments (Recommended for Active Work)

**When**: Converting old increments to new format for active development

**Steps**:
1. Add **AC**: fields to tasks in tasks.md
2. Re-run living docs sync: `/specweave:sync-docs update 0006`
3. Re-sync to GitHub: `/specweave-github:sync-spec 0006`

**Example Migration**:
```markdown
### T-001: Create Language Detector

**Status**: [x] Completed
**Priority**: P1

**User Story**: [US-001: Russian Developer Initializes Project](../../docs/internal/specs/default/llm-native-i18n/us-001-russian-developer-initializes-project.md)

**AC**: AC-US1-01, AC-US1-02  ← ✅ ADD THIS!

**Test Plan** (BDD):
- **Given** project config → **When** detecting language → **Then** returns correct language code
```

### Option 2: Fallback Pattern for Old Format (Quick Fix)

**When**: Backward compatibility for legacy increments

**Implementation**: Update `SpecDistributor.loadTaskReferences()` to support BOTH formats:

```typescript
// NEW format (with AC): ^##+ (T-\d+):\s+(.+?)$[\s\S]*?\*\*AC\*\*:\s*([^\n]+)?
// OLD format (without AC): ^##+ (T-\d+):\s+(.+?)$[\s\S]*?\*\*Status\*\*:

const newFormatPattern = /^##+ (T-\d+):\s+(.+?)$[\s\S]*?\*\*AC\*\*:\s*([^\n]+)?/gm;
const oldFormatPattern = /^##+ (T-\d+):\s+(.+?)$/gm;

// Try new format first, fallback to old format
```

**Trade-offs**:
- ✅ Works with old increments
- ❌ Can't map tasks to user stories (no AC-IDs)
- ❌ All tasks show under "Tasks" section (not grouped by user story)

### Option 3: Do Nothing (Archive-Only Approach)

**When**: Old increments are complete and archived

**Rationale**:
- Old increments are already complete
- Living docs already distributed to specs/
- GitHub issues are for visibility only
- Don't need task-level tracking for completed work

**Result**: Accept that old increments show "0/0 tasks" in GitHub

---

## Recommendations

### For This Issue (#390)

**Recommendation**: **Option 3 - Do Nothing**

**Reasoning**:
- Increment 0006 is COMPLETE (status shows complete user stories)
- Living docs already synced to `FS-25-11-03-llm-native-i18n/`
- GitHub issue is for historical tracking only
- User stories are visible in GitHub (that's sufficient)

**Alternative**: If stakeholders need task-level detail:
- Migrate increment 0006 to new format (Option 1)
- Takes ~30 minutes to add AC-IDs to 53 tasks

### For Future Increments

**Requirement**: ALL new increments MUST use the NEW format:
- **AC**: field with AC-IDs (e.g., `AC-US1-01, AC-US1-02`)
- **User Story**: link to user story file
- **Test Plan** (BDD): Given/When/Then format

**Enforcement**:
- Update increment planning templates
- Add validation to `/specweave:increment` command
- Document in CLAUDE.md

### For Legacy Increments (0001-0006)

**Decision Required**: Choose one:
1. Migrate all to new format (12+ hours of work)
2. Accept "0/0 tasks" in GitHub issues (no work required)
3. Implement fallback pattern (3 hours of dev work)

**My Recommendation**: **Option 2 - Accept as-is**
- Old increments are complete
- Living docs already archived
- Migration effort not justified

---

## Code Locations

| File | Lines | Description |
|------|-------|-------------|
| `src/core/living-docs/spec-distributor.ts` | 510-537 | Task extraction with AC-ID pattern |
| `src/core/living-docs/spec-distributor.ts` | 542-560 | Task-to-user-story mapping |
| `src/core/living-docs/spec-distributor.ts` | 822-827 | User story file generation (Tasks section) |
| `plugins/specweave-github/lib/epic-content-builder.ts` | 151-217 | Task extraction for GitHub issues |
| `plugins/specweave-github/lib/epic-content-builder.ts` | 252-283 | Tasks section rendering |

---

## Validation

**Test Cases**:
1. ✅ Increment 0031 (NEW format): 24 AC fields → 19 tasks extracted → GitHub issue shows "6/19 tasks (32%)"
2. ❌ Increment 0006 (OLD format): 0 AC fields → 0 tasks extracted → GitHub issue shows "0/0 tasks (0%)"

**Expected Behavior After Fix**:
- Option 1 (Migration): Increment 0006 → 53 tasks extracted → "0/53 tasks (0%)"
- Option 2 (Fallback): Increment 0006 → 53 tasks extracted (ungrouped) → "0/53 tasks (0%)"
- Option 3 (Do Nothing): Increment 0006 → 0 tasks extracted → "0/0 tasks (0%)" (unchanged)

---

## Conclusion

**Root Cause**: SpecDistributor task extraction requires `**AC**:` field with AC-IDs. Old increments (0001-0006) use bullet-point format without AC-IDs, resulting in ZERO tasks extracted.

**Impact**: GitHub epic issues for old increments show "0/0 tasks complete (0%)" instead of actual task count.

**Recommended Solution**: Accept as-is for archived increments. Enforce new format for all future increments.

**Action Items**:
1. ❌ Do NOT migrate old increments (not worth the effort)
2. ✅ Document new format requirement in CLAUDE.md
3. ✅ Update increment planning templates
4. ✅ Add validation to `/specweave:increment` command

---

**Status**: ✅ Analysis Complete
**Next Steps**: Document format requirements, update templates
