# SP- Prefix Bug - Root Cause Analysis (2025-11-22)

**Date**: 2025-11-22
**Severity**: CRITICAL - Architecture Violation
**Status**: ✅ Issues closed, ❌ Root cause still exists

---

## Problem Statement

**8 GitHub issues created with WRONG format**:
- #703-#710: `[SP-US-XXX]` format
- Created: 2025-11-22 07:19:21-32 (11-second batch)
- Status: ALL CLOSED (by user immediately after creation)

**Expected format (ADR-0032, v0.24.0+)**:
```
[FS-048][US-001] Smart Pagination During Init (50-Project Limit)
[FS-048][US-002] CLI-First Defaults (Select All by Default)
...
```

**Actual format (DEPRECATED, WRONG)**:
```
[SP-US-001] Smart Pagination During Init (50-Project Limit)
[SP-US-002] CLI-First Defaults (Select All by Default)
...
```

---

## Root Cause: OLD Deprecated Code Path

### Finding 1: Current Code is CORRECT

**UserStoryIssueBuilder** (line 115):
```typescript
const title = `[${this.featureId}][${frontmatter.id}] ${frontmatter.title}`;
// ✅ Generates: [FS-048][US-001] Title
```

**Validation** (lines 69-75):
```typescript
if (!/^FS-\d{3}$/.test(featureId)) {
  throw new Error(`Invalid featureId format "${featureId}"`);
}
// ✅ Blocks: undefined, SP-US-, etc.
```

**Safety Check** (lines 118-127):
```typescript
const titlePattern = /^\[FS-\d{3}\]\[US-\d{3}\] .+$/;
if (!titlePattern.test(title)) {
  throw new Error(`Generated issue title has incorrect format: "${title}"`);
}
// ✅ Final validation before returning
```

### Finding 2: Where Did `[SP-US-XXX]` Come From?

**HYPOTHESIS**: Old code path OR manual `gh` command that bypassed `UserStoryIssueBuilder`.

**Evidence**:
1. **No code found** generating `SP-` prefix in current codebase
2. **No recent commits** creating this format (checked git log)
3. **Batch creation** (8 issues in 11 seconds) suggests automated script
4. **All 8 issues** reference Feature FS-048 correctly in body, but title is wrong

**Likely sources**:
- OLD version of `GitHubEpicSync` (deprecated, but still exists!)
- OLD version of `GitHubSpecSync` (syncs specs, not user stories)
- Manual `gh issue create` with wrong title format
- A hook or script that wasn't updated

### Finding 3: Code That SHOULD Be Removed

**`github-epic-sync.ts` (Line 542)**:
```typescript
const title = `[${epicId}] ${increment.title}`;
// ❌ Generates: [FS-048] Title (Feature-only, WRONG!)
```

**Issue**: Creates Feature-level issues instead of User Story issues (violates ADR-0032).

**`github-spec-sync.ts`**:
- Syncs SPECS → GitHub Projects
- Not User Stories → GitHub Issues
- Wrong architecture!

---

## Impact

### Immediate Impact (Mitigated)
✅ All 8 wrong-format issues (#703-#710) are CLOSED
✅ User added closure comments explaining the violation

### Long-Term Risk (Unmitigated)
❌ Old code paths still exist and could be triggered again
❌ No pre-commit validation to prevent this
❌ Documentation doesn't explicitly forbid SP- prefix
❌ Cleanup scripts still show old examples

---

## Prevention Plan (6 Actions)

### 1. Update CLAUDE.md (CRITICAL)

**Current** (Line 223):
```markdown
❌ [SP-FS-048-specweave] (SP prefix - DEPRECATED!)
```

**Add explicit BLOCK**:
```markdown
### 10. GitHub Issue Format Policy (v0.24.0+)

**CRITICAL RULE**: User Story issues MUST use `[FS-XXX][US-YYY]` format.

**PROHIBITED Formats** (PRE-COMMIT HOOK BLOCKS THESE):
- ❌ `[SP-US-XXX]` - OLD deprecated SP- prefix (removed v0.24.0)
- ❌ `[SP-FS-XXX]` - OLD deprecated SP- prefix (removed v0.24.0)
- ❌ `[FS-048]` - Feature-only (Features use Milestones, NOT Issues!)
- ❌ `[FS-048-specweave]` - Project suffix (README.md only, NOT GitHub!)
- ❌ `[undefined][US-XXX]` - Missing Feature ID (validation error)

**ONLY CORRECT Format**:
```
✅ [FS-XXX][US-YYY] User Story Title
```

**Examples**:
```
✅ [FS-048][US-001] Smart Pagination During Init
✅ [FS-048][US-002] CLI-First Defaults
❌ [SP-US-001] Smart Pagination During Init  ← WRONG! Pre-commit hook blocks!
❌ [FS-048] Smart Pagination During Init     ← WRONG! Feature-only (use Milestone)!
```

**If you see wrong format**:
1. Close the issue immediately
2. Add comment: "WRONG FORMAT: Violates ADR-0032. Use [FS-XXX][US-YYY] format."
3. Report bug (should never happen with pre-commit hook!)
```

### 2. Update Cleanup Script

**File**: `scripts/cleanup-duplicate-github-issues.sh`

**Change lines 33-37**:
```bash
# OLD (WRONG examples):
"[SP-US-006]"
"[SP-US-007]"
"[SP-US-008]"
"[SP-US-009]"

# NEW (CORRECT examples):
"[FS-048][US-001]"
"[FS-048][US-002]"
"[FS-048][US-003]"
```

**Change line 54 (help text)**:
```bash
# OLD:
Default: [SP-US-006],[SP-US-007],[SP-US-008],[SP-US-009],[SP-FS-023-specweave]

# NEW:
Default: [FS-048][US-001],[FS-048][US-002],[FS-048][US-003]
```

### 3. Deprecate Old Code Paths

**`github-epic-sync.ts`** - ADD WARNING:
```typescript
export class GitHubEpicSync {
  constructor(client: GitHubClientV2, specsDir: string) {
    console.warn(`
⚠️  WARNING: GitHubEpicSync is DEPRECATED!
⚠️  This class creates Feature-level issues (violates ADR-0032).
⚠️  Use GitHubFeatureSync instead.
⚠️  Creating User Story issues with [FS-XXX][US-YYY] format.
    `);
    this.client = client;
    this.specsDir = specsDir;
  }
}
```

**`github-spec-sync.ts`** - ADD WARNING:
```typescript
export class GitHubSpecSync {
  constructor(projectRoot: string = process.cwd()) {
    console.warn(`
⚠️  WARNING: GitHubSpecSync syncs SPECS → GitHub Projects.
⚠️  For User Stories → GitHub Issues, use GitHubFeatureSync instead.
    `);
    this.projectRoot = projectRoot;
    // ...
  }
}
```

### 4. Add Pre-Commit Hook Validation

**File**: `.git/hooks/pre-commit` (or `scripts/pre-commit-hooks.sh`)

**Add check**:
```bash
#!/bin/bash
# Validate no deprecated GitHub issue title formats in code

echo "🔍 Checking for deprecated GitHub issue title formats..."

# Check for hardcoded SP- prefixes in code (not in comments/docs)
if git diff --cached --name-only | xargs grep -l "\"\\[SP-" 2>/dev/null | grep -v ".md$\|.sh$\|test\|spec"; then
  echo "❌ ERROR: Deprecated [SP-XXX] issue title format detected in code!"
  echo ""
  echo "Found in:"
  git diff --cached --name-only | xargs grep -n "\"\\[SP-" 2>/dev/null | grep -v ".md$\|.sh$\|test\|spec"
  echo ""
  echo "✅ CORRECT format: [FS-XXX][US-YYY] User Story Title"
  echo "❌ WRONG format: [SP-US-XXX] or [SP-FS-XXX]"
  echo ""
  echo "See CLAUDE.md Section 10 for details."
  exit 1
fi

# Check for Feature-only format (missing US-ID)
if git diff --cached --name-only | xargs grep -l "\"\\[FS-[0-9]\\{3\\}\\]\\s\\+[^\\[]" 2>/dev/null | grep -v ".md$\|test\|spec"; then
  echo "❌ ERROR: Feature-only issue title format detected!"
  echo ""
  echo "Found in:"
  git diff --cached --name-only | xargs grep -n "\"\\[FS-[0-9]\\{3\\}\\]\\s\\+[^\\[]" 2>/dev/null | grep -v ".md$\|test\|spec"
  echo ""
  echo "✅ CORRECT: [FS-XXX][US-YYY] User Story Title"
  echo "❌ WRONG: [FS-XXX] Feature Title (Features use Milestones, not Issues!)"
  exit 1
fi

echo "✅ No deprecated GitHub issue title formats found."
```

### 5. Document Correct Workflow

**Create**: `.specweave/docs/internal/workflows/github-issue-creation.md`

```markdown
# GitHub Issue Creation - Correct Workflow

## ONLY Correct Method (v0.24.0+)

**Use GitHubFeatureSync to sync User Stories**:

\`\`\`bash
# Sync ALL user stories for a feature
/specweave-github:sync FS-048

# This creates:
# - GitHub Milestone: "FS-048: Feature Title"
# - GitHub Issues:
#   - #XXX: [FS-048][US-001] User Story 1 Title
#   - #YYY: [FS-048][US-002] User Story 2 Title
#   - #ZZZ: [FS-048][US-003] User Story 3 Title
\`\`\`

## Architecture (ADR-0032)

\`\`\`
Feature FS-048 (Living Docs)
  ↓
GitHub Milestone "FS-048: Feature Title"
  ├─ Issue #XXX: [FS-048][US-001] User Story 1
  ├─ Issue #YYY: [FS-048][US-002] User Story 2
  └─ Issue #ZZZ: [FS-048][US-003] User Story 3
\`\`\`

## ❌ WRONG Methods (Deprecated)

**DO NOT use**:
- ❌ `GitHubEpicSync` - Creates Feature-level issues (wrong!)
- ❌ `GitHubSpecSync` - Syncs specs to Projects (wrong!)
- ❌ Manual `gh issue create` - No validation, easy to get format wrong
- ❌ `/specweave-github:sync 0048` - Syncs INCREMENTS, not User Stories (wrong!)

## Title Format Rules

**ONLY allowed**:
```
[FS-XXX][US-YYY] User Story Title
```

**Explicitly FORBIDDEN**:
```
[SP-US-XXX] ...             ← Deprecated SP- prefix
[SP-FS-XXX-specweave] ...   ← Deprecated SP- prefix + project suffix
[FS-XXX] ...                ← Feature-only (use Milestone!)
[FS-XXX-specweave] ...      ← Project suffix (internal README.md only!)
[undefined][US-XXX] ...     ← Missing Feature ID (validation error)
```

## Enforcement

1. **Pre-commit hook**: Blocks commits with wrong format in code
2. **UserStoryIssueBuilder**: Throws error if featureId invalid
3. **Runtime validation**: Pattern check before creating issue
4. **Manual review**: Close any wrong-format issues immediately

## Recovery from Wrong Format

If you find wrong-format issues:

\`\`\`bash
# 1. Close them
gh issue close 703 --comment "WRONG FORMAT: [SP-US-XXX]. Use [FS-XXX][US-YYY] per ADR-0032."

# 2. Create correct issues
/specweave-github:sync FS-048

# 3. Report bug
# (Should never happen with pre-commit hook!)
\`\`\`
```

### 6. Add Integration Test

**File**: `tests/integration/github-issue-title-validation.test.ts`

```typescript
import { UserStoryIssueBuilder } from '../../../plugins/specweave-github/lib/user-story-issue-builder.js';

describe('GitHub Issue Title Validation', () => {
  it('should REJECT deprecated SP- prefix', async () => {
    // Attempt to create with SP- prefix should throw
    expect(() => {
      new UserStoryIssueBuilder(
        '/path/to/us-001.md',
        '/project/root',
        'SP-FS-048', // ❌ WRONG featureId
        { owner: 'test', repo: 'test' }
      );
    }).toThrow('Invalid featureId format');
  });

  it('should ACCEPT correct FS-XXX format', async () => {
    // Correct format should work
    const builder = new UserStoryIssueBuilder(
      '/path/to/us-001.md',
      '/project/root',
      'FS-048', // ✅ CORRECT featureId
      { owner: 'test', repo: 'test' }
    );
    expect(builder).toBeDefined();
  });

  it('should generate correct [FS-XXX][US-YYY] title', async () => {
    const builder = new UserStoryIssueBuilder(
      'tests/fixtures/us-001-test.md',
      process.cwd(),
      'FS-048',
      { owner: 'test', repo: 'test' }
    );

    const result = await builder.buildIssueBody();
    expect(result.title).toMatch(/^\[FS-\d{3}\]\[US-\d{3}\] .+$/);
    expect(result.title).not.toContain('SP-');
  });
});
```

---

## Immediate Actions (Required)

1. ✅ **DONE**: Close all `[SP-US-XXX]` issues (#703-#710)
2. ✅ **DONE**: Scan codebase for SP- references
3. ⏳ **TODO**: Update CLAUDE.md with explicit BLOCK policy
4. ⏳ **TODO**: Update cleanup script examples
5. ⏳ **TODO**: Add pre-commit hook validation
6. ⏳ **TODO**: Deprecate old code paths with warnings
7. ⏳ **TODO**: Create workflow documentation
8. ⏳ **TODO**: Add integration test

---

## Timeline

| Time | Event | Action |
|------|-------|--------|
| 07:19:21-32 | 8 issues created with `[SP-US-XXX]` format | Unknown trigger |
| 07:34:31 | User closed #703 with deprecation comment | Manual cleanup |
| 07:35-40 | User closed #704-#710 | Manual cleanup |
| Current | All wrong-format issues closed | ✅ Mitigated |
| Next | Implement prevention plan | ❌ In progress |

---

## References

- **ADR-0032**: Universal Hierarchy Mapping
- **CLAUDE.md Section 10**: GitHub Issue Format Policy
- **Increment 0047**: US-Task Linkage Architecture
- **Increment 0050**: External Tool Import (this incident)
- **File**: `plugins/specweave-github/lib/user-story-issue-builder.ts:115` (correct implementation)
- **File**: `plugins/specweave-github/lib/github-epic-sync.ts:542` (deprecated, wrong implementation)

---

**Status**: 🚨 CRITICAL BUG - Root cause unknown, prevention plan ready
**Next**: Implement 6-step prevention plan
**Owner**: @anton-abyzov
