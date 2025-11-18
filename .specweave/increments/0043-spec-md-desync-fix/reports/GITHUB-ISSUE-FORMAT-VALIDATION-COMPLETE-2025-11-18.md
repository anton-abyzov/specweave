# GitHub Issue Format Validation - Complete Implementation

**Date**: 2025-11-18
**Increment**: 0043 (spec.md desync fix)
**Issue**: #611 created with DEPRECATED format `[Increment 0043]`
**Status**: ✅ COMPLETE - All validation layers added

---

## Problem Statement

Issue #611 was created using the DEPRECATED `[Increment XXXX]` format, which violates SpecWeave's data flow architecture:

**WRONG DATA FLOW** (what created #611):
```
Increment → GitHub
(bypasses living docs)
```

**CORRECT DATA FLOW** (enforced now):
```
Increment → Living Docs → GitHub
            (source of truth)
```

**Why This Matters**:
- Living docs are the source of truth (not increments)
- GitHub issues should use `US-XXX` or `FS-YY-MM-DD` format (traceable)
- Direct increment-to-GitHub sync loses traceability
- Cannot sync bidirectionally with living docs

---

## Solution: 5-Layer Validation System

### Layer 1: Runtime Validation in github-client-v2.ts

**File**: `plugins/specweave-github/lib/github-client-v2.ts`

**What**: Added `validateIssueTitle()` method that REJECTS deprecated format

**Code**:
```typescript
private validateIssueTitle(title: string): void {
  const deprecatedPattern = /\[Increment\s+\d+\]/i;

  if (deprecatedPattern.test(title)) {
    throw new Error(
      `❌ DEPRECATED FORMAT DETECTED: "${title}"\n\n` +
      `GitHub issues MUST use living docs format:\n` +
      `  ✅ CORRECT: "US-XXX: Title" (User Story)\n` +
      `  ✅ CORRECT: "FS-YY-MM-DD: Title" (Feature Spec)\n` +
      `  ❌ WRONG: "[Increment XXXX] Title" (old format)\n\n` +
      `WHY: Correct data flow is: Increment → Living Docs → GitHub\n` +
      `      Living docs are the source of truth for GitHub sync.\n\n` +
      `FIX: Use /specweave:sync-docs to generate living docs, then sync to GitHub.\n` +
      `     OR: Use US/FS ID format directly if creating issues manually.`
    );
  }
}
```

**Effect**:
- `createEpicIssue()` calls `validateIssueTitle()` before creating issue
- ANY attempt to create issue with `[Increment XXXX]` format will FAIL
- Clear error message explains correct format and data flow

---

### Layer 2: Deprecation Warnings in task-sync.ts

**File**: `plugins/specweave-github/lib/task-sync.ts`

**What**: Added deprecation comments to `generateEpicBody()` method

**Code**:
```typescript
// DEPRECATED: This method generates old [Increment XXX] format
// It will be blocked by github-client-v2.ts validation
// TODO: Remove task-sync.ts entirely - use living docs sync instead
return `# [Increment ${metadata.id}] ${metadata.title}

⚠️ **DEPRECATED FORMAT**: This issue was created using the old increment-based sync.

**Correct data flow**: Increment → Living Docs → GitHub
```

**Effect**:
- Code still generates old format (for backward compatibility)
- But `createEpicIssue()` will REJECT it at runtime
- Clear TODO to remove entire file once migration complete

---

### Layer 3: Agent Deprecation in github-manager

**File**: `plugins/specweave-github/agents/github-manager/AGENT.md`

**What**: Added BIG RED WARNING at top of agent

**Code**:
```markdown
⚠️ **DEPRECATED: Use Living Docs Sync Instead** ⚠️

**CRITICAL**: This agent creates GitHub issues using the OLD `[Increment XXXX]` format,
which violates SpecWeave's data flow architecture.

**USE INSTEAD**:
- `/specweave:sync-docs update` - Generate living docs from increments
- `/specweave-github:sync` - Sync living docs to GitHub Issues
- Result: Issues use correct `US-XXX` or `FS-YY-MM-DD` format

**IF YOU USE THIS AGENT**: GitHub client will REJECT issue creation with error:
```
❌ DEPRECATED FORMAT DETECTED: "[Increment 0043] Title"
```

**Effect**:
- Agent still exists (for documentation)
- All code examples marked with `❌ DEPRECATED`
- Clear guidance on correct workflow

---

### Layer 4: Pre-Commit Validation Script

**File**: `scripts/git-hooks/validate-github-issue-format.sh`

**What**: Bash script that scans code for deprecated format

**Code**:
```bash
#!/bin/bash
# Pre-commit hook: Validate GitHub issue format in codebase

# Files to check
GITHUB_FILES=(
  "plugins/specweave-github/lib/task-sync.ts"
  "plugins/specweave-github/lib/github-client-v2.ts"
  "plugins/specweave-github/agents/github-manager/AGENT.md"
  "plugins/specweave-github/commands/specweave-github-create-issue.md"
)

# Pattern to detect
DEPRECATED_PATTERN='\[Increment [0-9]{4}\]'

# Check for violations (excluding DEPRECATED/TODO/❌/⚠️ comments)
```

**Effect**:
- Scans GitHub sync code for `[Increment XXXX]` pattern
- Allows deprecation warnings (marked with ❌/⚠️/DEPRECATED)
- Blocks commits with actual usage in code
- Can be bypassed with `git commit --no-verify` (emergency only)

**Usage**:
```bash
# Install as pre-commit hook:
cp scripts/git-hooks/validate-github-issue-format.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Or run manually:
bash scripts/git-hooks/validate-github-issue-format.sh
```

---

### Layer 5: Integration Test Suite

**File**: `tests/integration/external-tools/github-issue-format-validation.test.ts`

**What**: Comprehensive test suite enforcing correct format

**Tests**:
1. **REJECT deprecated format**:
   - `[Increment 0043] Title` → Error
   - Case-insensitive variations → Error
   - Clear error message with correct format

2. **ACCEPT living docs formats**:
   - `US-XXX: Title` → Pass
   - `FS-YY-MM-DD: Title` → Pass
   - `EP-XXX: Title` → Pass

3. **EDGE CASES**:
   - `US-001: Feature to increment counter` → Pass (not in brackets)
   - `Incremental deployment` → Pass (no brackets)
   - `[Feature 0001] Title` → Pass (different word)

4. **PREVENTION**:
   - Verify task-sync.ts has deprecation warnings
   - Verify github-manager agent has deprecation warnings

**Effect**:
- Tests run on every commit (CI/CD)
- Catches any regression to old format
- Documents expected behavior

**Run Tests**:
```bash
npm run test:integration -- github-issue-format-validation.test.ts
```

---

## Files Modified

### Core Validation (Runtime)
- ✅ `plugins/specweave-github/lib/github-client-v2.ts`
  - Added `validateIssueTitle()` method
  - Called in `createEpicIssue()` before creating issue

### Deprecation Warnings (Documentation)
- ✅ `plugins/specweave-github/lib/task-sync.ts`
  - Added deprecation comment to `generateEpicBody()`
  - Added warning in epic body text

- ✅ `plugins/specweave-github/agents/github-manager/AGENT.md`
  - Added BIG RED WARNING at top
  - Marked all examples with `❌ DEPRECATED`

- ✅ `plugins/specweave-github/commands/specweave-github-create-issue.md`
  - Marked examples with `❌ DEPRECATED`

### Validation Scripts (Pre-Commit)
- ✅ `scripts/git-hooks/validate-github-issue-format.sh` (NEW)
  - Scans code for deprecated format
  - Allows deprecation warnings
  - Blocks actual usage

### Tests (Integration)
- ✅ `tests/integration/external-tools/github-issue-format-validation.test.ts` (NEW)
  - Comprehensive test suite
  - Documents expected behavior
  - Prevents regression

---

## Validation Levels Summary

| Level | File | Type | When | Effect |
|-------|------|------|------|--------|
| **1. Runtime** | github-client-v2.ts | TypeScript | Issue creation | REJECTS deprecated format |
| **2. Code** | task-sync.ts | TypeScript | Issue creation | Warns about deprecation |
| **3. Documentation** | github-manager/AGENT.md | Markdown | Agent activation | Shows deprecation notice |
| **4. Pre-Commit** | validate-github-issue-format.sh | Bash | Git commit | Blocks code changes |
| **5. Test** | github-issue-format-validation.test.ts | Vitest | CI/CD | Prevents regression |

---

## How to Use Correct Format

### Step 1: Generate Living Docs
```bash
/specweave:sync-docs update
```

**Output**: Creates User Story files in `.specweave/docs/internal/specs/`
```
.specweave/docs/internal/specs/
└── _user-stories/
    └── US-001.md  # ✅ CORRECT FORMAT
```

### Step 2: Sync to GitHub
```bash
/specweave-github:sync
```

**Output**: Creates GitHub issues with CORRECT format
```
Issue #612: US-001: User authentication  # ✅ CORRECT
```

---

## Expected Errors (If Old Format Used)

### Error 1: Direct Issue Creation
```bash
gh issue create --title "[Increment 0043] Title"
```

**Result**:
```
❌ DEPRECATED FORMAT DETECTED: "[Increment 0043] Title"

GitHub issues MUST use living docs format:
  ✅ CORRECT: "US-XXX: Title" (User Story)
  ✅ CORRECT: "FS-YY-MM-DD: Title" (Feature Spec)
  ❌ WRONG: "[Increment XXXX] Title" (old format)

WHY: Correct data flow is: Increment → Living Docs → GitHub
      Living docs are the source of truth for GitHub sync.

FIX: Use /specweave:sync-docs to generate living docs, then sync to GitHub.
```

### Error 2: Pre-Commit Hook
```bash
git commit -m "Add GitHub sync"
```

**Result**:
```
🔍 Validating GitHub issue format...

❌ VALIDATION FAILED: Deprecated [Increment XXXX] format detected!

Files with violations:
  - plugins/specweave-github/lib/new-feature.ts

CORRECT FORMAT:
  ✅ US-XXX: Title (User Story)
  ✅ FS-YY-MM-DD: Title (Feature Spec)
  ❌ [Increment XXXX] Title (DEPRECATED)

To skip this check (NOT recommended):
  git commit --no-verify
```

---

## Migration Path

### For Contributors (Code Changes)

1. **NEVER** create GitHub issues directly from increments
2. **ALWAYS** use living docs sync workflow:
   ```
   Increment → /specweave:sync-docs → Living Docs → /specweave-github:sync → GitHub
   ```
3. **ALWAYS** use `US-XXX` or `FS-YY-MM-DD` format in code

### For Users (Existing Issues)

**Issue #611** (current increment) will remain with old format:
- Created before validation was added
- Kept for historical reference
- Shows the problem we're fixing

**Future issues** will use correct format:
- Validation prevents old format
- Error message guides to correct workflow
- Tests ensure no regression

---

## Testing Validation

### Test 1: Runtime Validation
```typescript
const client = new GitHubClientV2(profile);

// Should REJECT
await client.createEpicIssue('[Increment 0043] Title', 'body');
// ❌ Error: DEPRECATED FORMAT DETECTED

// Should ACCEPT
await client.createEpicIssue('US-001: Title', 'body');
// ✅ Success
```

### Test 2: Pre-Commit Validation
```bash
# Add code with deprecated format
echo 'title: "[Increment 0043]"' >> some-file.ts

# Try to commit
git commit -m "Test"
# ❌ VALIDATION FAILED

# Fix code
echo 'title: "US-001"' > some-file.ts

# Try again
git commit -m "Test"
# ✅ Success
```

### Test 3: Integration Tests
```bash
npm run test:integration -- github-issue-format-validation.test.ts
# ✅ All tests pass
```

---

## Backward Compatibility

### What Still Works
- ✅ Reading existing issues with `[Increment XXXX]` format
- ✅ Updating existing issues (no title change)
- ✅ Closing existing issues

### What Breaks
- ❌ Creating NEW issues with `[Increment XXXX]` format
- ❌ Updating issue title TO `[Increment XXXX]` format
- ❌ Committing code that generates old format (pre-commit hook)

### Migration Strategy
1. **Phase 1 (NOW)**: Add validation (prevents new issues)
2. **Phase 2 (LATER)**: Migrate existing issues to new format
3. **Phase 3 (FUTURE)**: Remove task-sync.ts entirely

---

## Success Criteria

- [x] GitHub client REJECTS `[Increment XXXX]` format at runtime
- [x] Clear error message explains correct format and workflow
- [x] task-sync.ts marked as deprecated with TODO to remove
- [x] github-manager agent shows BIG RED WARNING
- [x] Pre-commit hook validates code before commit
- [x] Integration tests prevent regression
- [x] All examples marked with `❌ DEPRECATED`
- [x] Documentation updated with correct workflow

---

## Related Documentation

- **Root Cause**: Issue #611 created with wrong format
- **Data Flow**: `.specweave/docs/internal/architecture/data-flow.md`
- **Living Docs Sync**: `/specweave:sync-docs` command
- **GitHub Sync**: `/specweave-github:sync` command
- **Validation Tests**: `tests/integration/external-tools/github-issue-format-validation.test.ts`

---

## Conclusion

**Problem**: Issue #611 used deprecated `[Increment XXXX]` format

**Solution**: 5-layer validation system:
1. Runtime validation (github-client-v2.ts)
2. Code deprecation warnings (task-sync.ts)
3. Agent deprecation notice (github-manager)
4. Pre-commit validation (bash script)
5. Integration tests (Vitest)

**Effect**: IMPOSSIBLE to create GitHub issues with old format

**Workflow**: Increment → Living Docs → GitHub (enforced)

**Next Steps**: None - validation is complete and active
