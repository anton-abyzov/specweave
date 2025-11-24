# Feature-Level GitHub Sync Removal Plan

**Date**: 2025-11-20
**Incident**: Duplicate Feature-level GitHub issues (`[SP-FS-023-specweave]`) created
**Root Cause**: Two competing GitHub sync implementations
**Severity**: High (violates Universal Hierarchy Mapping)

---

## Problem Statement

GitHub issues are being created at the **Feature level** (Level 1) instead of the **User Story level** (Level 2), violating the Universal Hierarchy Mapping architecture defined in ADR-0032.

**Evidence** (from screenshot):
```
[SP-FS-023-specweave] SpecWeave Implementation: Release Management Plugin Enhancements
```

This issue format indicates Feature-level sync, which should NOT exist in GitHub.

---

## Universal Hierarchy Mapping (ADR-0032)

**Correct Architecture**:

| Level | SpecWeave | GitHub | JIRA | Azure DevOps |
|-------|-----------|--------|------|--------------|
| 0 | Project | N/A | Project | Project |
| 1 | Feature (FS-XXX) | **Milestone** | Epic | Feature |
| 2 | User Story (US-XXX) | **Issue** | Story | User Story |
| 3 | Task (T-XXX) | **Checkbox** | Subtask | Task |

**Key Principle**: GitHub issues should ONLY represent User Stories (Level 2), never Features (Level 1).

---

## Root Cause Analysis

### Two Competing Implementations

**1. ✅ CORRECT: `github-feature-sync.ts`**
```typescript
// plugins/specweave-github/lib/github-feature-sync.ts
/**
 * Architecture (CORRECT):
 * - Feature (FS-033) → GitHub Milestone (Container)
 * - User Story (US-001, US-002, etc.) → GitHub Issue (Trackable item)
 * - Tasks (T-001, T-002, etc.) → Checkboxes in User Story issue body
 */
async syncFeatureToGitHub(featureId: string): Promise<{...}> {
  // 1. Create/update GitHub Milestone for Feature
  // 2. Find all us-*.md files across all projects
  // 3. Create/update GitHub Issue for EACH user story
}
```
- **Creates**: Milestone for Feature, Issues for User Stories
- **Issue Format**: `[FS-XXX][US-YYY] User Story Title`
- **Status**: Active, CORRECT implementation

**2. ❌ WRONG: `github-epic-sync.ts`**
```typescript
// plugins/specweave-github/lib/github-epic-sync.ts
/**
 * Architecture:
 * - Epic (FS-001) → GitHub Milestone
 * - Increment (0001-core-framework) → GitHub Issue (linked to Milestone)
 */
async syncEpicToGitHub(epicId: string): Promise<{...}> {
  // Creates GitHub Issues for INCREMENTS (Feature-level)
}
```
- **Creates**: Milestone + Issues for FEATURES/EPICS (WRONG!)
- **Issue Format**: `[FS-XXX]` (missing US-YYY!)
- **Status**: Deprecated but still callable

### How Feature-Level Issues Get Created

**Active Pathways** (can still be triggered):

1. **Manual Scripts** (still exist, can be run):
   ```bash
   # These scripts call github-epic-sync.ts
   npx tsx scripts/bulk-epic-sync.ts
   npx tsx scripts/test-epic-sync.ts
   ```

2. **Deprecated Hook** (disabled by default):
   ```bash
   # plugins/specweave-github/hooks/post-task-completion.sh:218
   # Only runs if: export SPECWEAVE_ENABLE_EPIC_SYNC=true
   if [ "$SPECWEAVE_ENABLE_EPIC_SYNC" = "true" ]; then
     ./scripts/update-epic-github-issue.sh "$INCREMENT_ID"
   fi
   ```

3. **Deprecated Script** (called by hook):
   ```bash
   # scripts/update-epic-github-issue.sh:214
   npx tsx scripts/generate-epic-issue-body.ts "$EPIC_ID" "$INCREMENT_ID"
   gh issue edit "$GITHUB_ISSUE" --body-file "$TEMP_BODY"
   ```

**Confirmed in CLAUDE.md Section 10**:
> **Deprecated Mechanisms**:
> - ❌ `post-increment-planning.sh` hook (disabled by default)
> - ❌ `update-epic-github-issue.sh` script (deprecated)
> - ❌ `generate-epic-issue-body.ts` script (deprecated)

---

## Impact Analysis

### Issues Created

**Feature-Level Issues** (WRONG):
- Format: `[SP-FS-023-specweave]` (missing User Story ID)
- Type: Feature/Epic-level (Level 1)
- Should be: Milestone, NOT Issue

**User Story Issues** (CORRECT):
- Format: `[FS-047][US-001]` (includes both Feature and User Story)
- Type: User Story-level (Level 2)
- Correct representation in GitHub

### Consequences

1. **Architecture Violation**: GitHub has Feature-level issues when they should only have User Story issues
2. **Duplicate Tracking**: Same Feature tracked as both Milestone AND Issue
3. **Broken Traceability**: Feature issues don't link to User Stories/Tasks
4. **Confusing Reports**: Progress tracking shows both Feature and US issues
5. **Inconsistent Mapping**: Different hierarchy levels synced to same GitHub entity type

---

## Solution

### Phase 1: Prevent New Feature-Level Issues (IMMEDIATE)

**1. Document the Violation**
- ✅ Create this analysis document
- ✅ Update CLAUDE.md with strict prohibition
- ✅ Add pre-commit hook to detect usage

**2. Block Manual Script Execution**
```bash
# scripts/bulk-epic-sync.ts
console.error('❌ DEPRECATED: This script creates Feature-level GitHub issues.');
console.error('   Use GitHubFeatureSync instead to create User Story issues.');
console.error('   See: .specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-REMOVAL-PLAN.md');
process.exit(1);
```

**3. Add Warning Comments**
```typescript
// github-epic-sync.ts:1
/**
 * ⚠️  DEPRECATED - DO NOT USE
 * This class creates Feature-level GitHub issues, which VIOLATES Universal Hierarchy Mapping.
 * Use GitHubFeatureSync instead (creates User Story issues).
 * @deprecated since v0.24.0
 * @see .specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-REMOVAL-PLAN.md
 */
```

### Phase 2: Remove Feature-Level Sync Code (v0.25.0)

**Files to Remove/Deprecate**:
```bash
# Complete removal
rm scripts/bulk-epic-sync.ts
rm scripts/test-epic-sync.ts
rm scripts/update-epic-github-issue.sh
rm scripts/generate-epic-issue-body.ts

# Deprecate (keep for reference)
mv plugins/specweave-github/lib/github-epic-sync.ts \
   plugins/specweave-github/lib/deprecated/github-epic-sync.ts.deprecated
```

**Hook Cleanup**:
```bash
# plugins/specweave-github/hooks/post-task-completion.sh
# REMOVE lines 210-248 (entire Epic sync section)
# Replace with comment:
# Epic sync removed in v0.25.0. Use /specweave-github:sync for User Story sync.
```

### Phase 3: Update Documentation (IMMEDIATE)

**CLAUDE.md Section 10 Enhancement**:
```markdown
### 10. GitHub Issue Format Policy (v0.24.0+)

**CRITICAL**: ALL GitHub issues MUST use User Story-level format.

**ONLY Correct Format**:
```
[FS-XXX][US-YYY] User Story Title
```

**NEVER Create Feature-Level Issues**:
- ❌ `[FS-047]` (Feature-only, missing US-ID) - PROHIBITED!
- ❌ `[SP-FS-047-specweave]` (SP prefix, project name) - PROHIBITED!

**Why This Matters**:
- Features are tracked via GitHub **Milestones** (containers)
- User Stories are tracked via GitHub **Issues** (work items)
- Tasks are tracked as **checkboxes** in User Story issue body

**Enforcement**:
- Pre-commit hook blocks usage of `github-epic-sync.ts`
- Scripts that create Feature-level issues will exit with error
- Only `GitHubFeatureSync` class is allowed (creates US issues)
```

---

## ADO/JIRA Hierarchy Configuration

**JIRA** (configurable levels):
```json
{
  "jira": {
    "hierarchy": {
      "level1": "Epic",       // Feature (FS-XXX)
      "level2": "Story",      // User Story (US-XXX)
      "level3": "Subtask"     // Task (T-XXX)
    }
  }
}
```
- **4-Level Support**: Some JIRA projects use Portfolio → Epic → Story → Subtask
- **Flexible Mapping**: SpecWeave can map to any level via configuration

**Azure DevOps** (fixed levels):
```json
{
  "ado": {
    "hierarchy": {
      "level1": "Feature",    // Feature (FS-XXX)
      "level2": "User Story", // User Story (US-XXX)
      "level3": "Task"        // Task (T-XXX)
    }
  }
}
```
- **Fixed Mapping**: ADO has built-in hierarchy (Epic → Feature → User Story → Task)
- **No Configuration Needed**: SpecWeave uses standard ADO hierarchy

**Key Difference from GitHub**:
- GitHub has only 2 hierarchy levels (Milestone → Issue)
- JIRA/ADO have 3-4 levels (can accommodate all SpecWeave levels)
- GitHub MUST collapse Feature → Milestone, cannot create Feature issues

---

## Validation & Prevention

### Pre-Commit Hook

```bash
# .git/hooks/pre-commit
# Check for prohibited Feature-level sync usage

PROHIBITED_FILES=(
  "github-epic-sync.ts"
  "bulk-epic-sync.ts"
  "update-epic-github-issue.sh"
  "generate-epic-issue-body.ts"
)

CHANGED_FILES=$(git diff --cached --name-only)

for file in $CHANGED_FILES; do
  for prohibited in "${PROHIBITED_FILES[@]}"; do
    if [[ "$file" == *"$prohibited"* ]]; then
      echo "❌ ERROR: Prohibited Feature-level sync file: $file"
      echo "   Feature-level GitHub issues are PROHIBITED (see ADR-0032)"
      echo "   Use GitHubFeatureSync instead (creates User Story issues)"
      exit 1
    fi
  done
done
```

### Runtime Validation

```typescript
// plugins/specweave-github/lib/github-epic-sync.ts (DEPRECATED)
export class GitHubEpicSync {
  constructor() {
    throw new Error(
      'GitHubEpicSync is DEPRECATED and creates Feature-level issues (violates ADR-0032). ' +
      'Use GitHubFeatureSync instead to create User Story issues. ' +
      'See: .specweave/increments/0047-us-task-linkage/reports/FEATURE-LEVEL-GITHUB-SYNC-REMOVAL-PLAN.md'
    );
  }
}
```

### Documentation Updates

**Required Updates**:
1. ✅ CLAUDE.md Section 10 - Add prohibition of Feature-level issues
2. ✅ ADR-0032 - Add GitHub-specific constraints
3. ✅ .specweave/docs/public/guides/external-tool-sync.md - Clarify hierarchy mapping
4. ✅ plugins/specweave-github/README.md - Document User Story-only sync

---

## Migration Plan for Existing Feature-Level Issues

**Current State** (from screenshot):
- Multiple `[SP-FS-023-specweave]` issues exist
- These are Feature-level issues (WRONG format)

**Migration Steps**:

1. **Identify Feature-Level Issues**:
   ```bash
   gh issue list --search "[SP-FS-" --json number,title --limit 100
   gh issue list --search "[FS-" --json number,title --limit 100 | \
     jq '.[] | select(.title | test("\\[FS-[0-9]+\\]") and (test("\\[US-") | not))'
   ```

2. **Close Feature-Level Issues**:
   ```bash
   # Add comment explaining closure
   gh issue close $ISSUE_NUMBER --comment "Closing Feature-level issue (deprecated). \
   Feature FS-XXX is now tracked as GitHub Milestone #YYY. \
   User Stories are tracked as separate issues: [FS-XXX][US-001], [FS-XXX][US-002], etc."
   ```

3. **Verify Milestones Exist**:
   ```bash
   # Ensure each Feature has a corresponding Milestone
   gh api repos/:owner/:repo/milestones --jq '.[] | .title'
   ```

4. **Re-sync User Stories**:
   ```bash
   # Use GitHubFeatureSync to create correct User Story issues
   node -e "
   const { GitHubFeatureSync } = require('./dist/plugins/specweave-github/lib/github-feature-sync.js');
   const { GitHubClientV2 } = require('./dist/plugins/specweave-github/lib/github-client-v2.js');

   const client = GitHubClientV2.fromRepo('anton-abyzov', 'specweave');
   const sync = new GitHubFeatureSync(client, '.specweave/docs/internal/specs', process.cwd());
   sync.syncFeatureToGitHub('FS-023').then(console.log).catch(console.error);
   "
   ```

---

## Testing Plan

### Test Cases

1. **Verify Feature → Milestone Mapping**:
   ```bash
   # Feature FS-047 should create Milestone, not Issue
   gh api repos/:owner/:repo/milestones | jq '.[] | select(.title | contains("FS-047"))'
   ```

2. **Verify User Story → Issue Mapping**:
   ```bash
   # User Stories should create Issues with [FS-XXX][US-YYY] format
   gh issue list --search "[FS-047][US-" --json number,title
   ```

3. **Verify No Feature-Level Issues**:
   ```bash
   # Should return EMPTY (no results)
   gh issue list --search "[FS-047]" --json number,title | \
     jq '.[] | select(.title | test("\\[FS-[0-9]+\\]") and (test("\\[US-") | not))'
   ```

### Success Criteria

- ✅ All Features have Milestones (not Issues)
- ✅ All User Stories have Issues with `[FS-XXX][US-YYY]` format
- ✅ No Feature-level issues exist (only Milestones)
- ✅ Pre-commit hook blocks deprecated sync usage
- ✅ Scripts exit with error if run

---

## Timeline

| Phase | Tasks | Target Date | Status |
|-------|-------|-------------|--------|
| **Phase 1: Prevention** | Document, block scripts, add warnings | 2025-11-20 | ✅ In Progress |
| **Phase 2: Cleanup** | Remove deprecated code, update hooks | v0.25.0 | Planned |
| **Phase 3: Migration** | Close Feature issues, re-sync User Stories | v0.25.0 | Planned |
| **Phase 4: Validation** | Test suite, pre-commit hooks | v0.25.0 | Planned |

---

## References

- **ADR-0032**: Universal Hierarchy Mapping
- **ADR-0007**: GitHub-First Task-Level Synchronization
- **CLAUDE.md Section 10**: GitHub Issue Format Policy
- **Increment 0047**: US-Task Linkage Architecture
- **Incident Report**: 2025-11-20 Duplicate Feature-Level Issues

---

## Appendix: Correct Sync Usage

### Creating User Story Issues (CORRECT)

```typescript
import { GitHubFeatureSync } from './plugins/specweave-github/lib/github-feature-sync.js';
import { GitHubClientV2 } from './plugins/specweave-github/lib/github-client-v2.js';

// ✅ CORRECT: Creates Milestone + User Story Issues
const client = GitHubClientV2.fromRepo('owner', 'repo');
const sync = new GitHubFeatureSync(client, '.specweave/docs/internal/specs', process.cwd());

// Syncs Feature FS-047:
// 1. Creates/updates Milestone "FS-047: Feature Title"
// 2. Creates/updates Issues: [FS-047][US-001], [FS-047][US-002], etc.
const result = await sync.syncFeatureToGitHub('FS-047');

console.log(`Milestone: #${result.milestoneNumber}`);
console.log(`User Stories synced: ${result.userStoriesProcessed}`);
```

### Slash Command (CORRECT)

```bash
# ✅ CORRECT: Use slash command for User Story sync
/specweave-github:sync 0047

# This internally calls GitHubFeatureSync, not GitHubEpicSync
```

### What NOT to Do (WRONG)

```typescript
// ❌ WRONG: Creates Feature-level issues (DEPRECATED!)
import { GitHubEpicSync } from './plugins/specweave-github/lib/github-epic-sync.js';

// This will throw error in v0.25.0+
const epicSync = new GitHubEpicSync(client, specsDir);
await epicSync.syncEpicToGitHub('FS-047'); // ERROR!
```

```bash
# ❌ WRONG: Manual scripts (will be removed)
npx tsx scripts/bulk-epic-sync.ts      # DEPRECATED!
npx tsx scripts/test-epic-sync.ts       # DEPRECATED!
./scripts/update-epic-github-issue.sh   # DEPRECATED!
```

---

**End of Report**
