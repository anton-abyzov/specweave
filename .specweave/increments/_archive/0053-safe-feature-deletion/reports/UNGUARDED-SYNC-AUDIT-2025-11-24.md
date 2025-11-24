# Unguarded Sync Pattern Audit (2025-11-24)

**Date**: 2025-11-24
**Tool**: `scripts/detect-unguarded-sync.sh`
**Total Issues Found**: 28 dangerous patterns

---

## Executive Summary

After fixing the TodoWrite crash (v0.25.1), I ran a comprehensive audit of the codebase to find similar dangerous patterns that could lead to infinite hook recursion and Claude Code crashes.

**Result**: Found **28 additional issues** that need to be addressed in v0.26.0.

---

## Pattern 1: Unguarded syncToExternalTools() Calls (3 issues)

### Issue 1.1: living-docs-sync.ts:232
**Location**: `src/core/living-docs/living-docs-sync.ts` line 232
**Problem**: Calls `syncToExternalTools()` without checking `SKIP_EXTERNAL_SYNC`

```typescript
// Step 7: Sync to external tools (GitHub, JIRA, ADO)
if (!options.dryRun) {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

**Fix Required** (v0.26.0):
```typescript
// Step 7: Sync to external tools (GitHub, JIRA, ADO)
if (!options.dryRun && process.env.SKIP_EXTERNAL_SYNC !== 'true') {
  await this.syncToExternalTools(incrementId, featureId, projectPath);
}
```

### Issue 1.2: living-docs-sync.ts:792
**Location**: Method definition (private method)
**Status**: ✅ OK (this is the method definition, not a call)

### Issue 1.3: us-completion-orchestrator.js:84
**Location**: Comment explaining external tool sync
**Status**: ✅ OK (this is a comment, not a call)

---

## Pattern 2: Unguarded livingDocsSync.syncIncrement() Calls (2 issues)

### Issue 2.1: us-completion-orchestrator.js:76
**Location**: `plugins/specweave/lib/hooks/us-completion-orchestrator.js` line 76
**Problem**: Calls `syncIncrement()` without checking flags
**Status**: ✅ FIXED in v0.25.1 (SKIP_US_SYNC check exists on line 42, but orchestrator is now skipped entirely)

### Issue 2.2: us-completion-orchestrator.js:83
**Location**: Duplicate detection (same call)
**Status**: ✅ FIXED in v0.25.1

---

## Pattern 3: Hooks Missing Recursion Guard (24 issues)

### Critical Hooks (High Risk)

1. **plugins/specweave-ado/hooks/post-task-completion.sh**
   - **Risk**: HIGH - Could trigger infinite loops on task completion
   - **Fix Priority**: P0 (v0.26.0)

2. **plugins/specweave-github/hooks/post-task-completion.sh**
   - **Risk**: HIGH - Could trigger infinite loops on task completion
   - **Fix Priority**: P0 (v0.26.0)

3. **plugins/specweave-jira/hooks/post-task-completion.sh**
   - **Risk**: HIGH - Could trigger infinite loops on task completion
   - **Fix Priority**: P0 (v0.26.0)

4. **plugins/specweave-release/hooks/post-task-completion.sh**
   - **Risk**: HIGH - Could trigger infinite loops on task completion
   - **Fix Priority**: P0 (v0.26.0)

5. **plugins/specweave/hooks/post-increment-planning.sh**
   - **Risk**: MEDIUM - Triggered during planning
   - **Fix Priority**: P1 (v0.26.0)

6. **plugins/specweave/hooks/post-increment-status-change.sh**
   - **Risk**: MEDIUM - Triggered on status changes
   - **Fix Priority**: P1 (v0.26.0)

### Other Hooks (Medium/Low Risk)

7. post-living-docs-update.sh
8. docs-changed.sh
9. human-input-required.sh
10. post-edit-spec.sh (deprecated, use consolidated)
11. post-first-increment.sh
12. post-increment-change.sh
13. post-spec-update.sh
14. post-user-story-complete.sh
15. post-write-spec.sh (deprecated, use consolidated)
16. pre-command-deduplication.sh
17. pre-edit-spec.sh (deprecated, use consolidated)
18. pre-implementation.sh
19. pre-increment-start.sh
20. pre-task-completion.sh
21. pre-tool-use.sh
22. pre-write-spec.sh (deprecated, use consolidated)
23. test-pretooluse-env.sh
24. user-prompt-submit.sh
25. validate-increment-completion.sh

---

## Pattern 4: Hooks Using Dangerous 'set -e' (2 issues)

### Issue 4.1: specweave-release/hooks/post-task-completion.sh
**Problem**: Uses `set -e` without `set +e`
**Risk**: Any error in hook will crash Claude Code
**Fix Required**:
```bash
# BEFORE:
set -e

# AFTER:
set +e  # NEVER use set -e in hooks - it causes crashes
```

### Issue 4.2: specweave/hooks/pre-increment-start.sh
**Problem**: Uses `set -e` without `set +e`
**Risk**: Any error in hook will crash Claude Code
**Fix Priority**: P0 (v0.26.0)

---

## Pattern 5: Missing SKIP Flag Exports (1 issue)

### Issue 5.1: post-increment-completion.sh
**Location**: `plugins/specweave/hooks/post-increment-completion.sh`
**Problem**: Missing `SKIP_US_SYNC=true` export
**Risk**: MEDIUM - Could trigger US sync on increment completion (though this might be intentional)
**Status**: ⚠️ NEEDS REVIEW - Determine if US sync should run on increment completion

**Recommendation**: Add the flag for consistency, but this might be a legitimate use case where US sync IS desired.

---

## Pattern 6: External Tool Sync in Wrong Hooks (0 issues)

✅ NO ISSUES FOUND

post-task-completion.sh does NOT contain direct GitHub/JIRA/ADO sync calls (good!)

---

## Remediation Plan (v0.26.0)

### Phase 1: Critical Fixes (Week 1)

**Priority 0 - Immediate**:
1. Add recursion guard to all post-task-completion.sh hooks (4 files)
2. Replace `set -e` with `set +e` in all hooks (2 files)
3. Add `SKIP_EXTERNAL_SYNC` check to living-docs-sync.ts

**Priority 1 - Important**:
4. Add recursion guard to all post-increment hooks (6 files)
5. Add recursion guard to all pre-* hooks (7 files)

### Phase 2: Comprehensive Hardening (Week 2)

**Priority 2 - Nice to have**:
6. Add recursion guard to remaining hooks (13 files)
7. Create automated pre-commit hook to prevent new violations
8. Add regression tests for each pattern

### Phase 3: Documentation (Week 3)

9. Update hook development guide with mandatory patterns
10. Create hook template with all safety checks included
11. Update ADR-0129 with comprehensive remediation plan

---

## Automated Prevention

### Pre-Commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Run unguarded sync detector before commit
if ! bash scripts/detect-unguarded-sync.sh; then
  echo ""
  echo "⛔ COMMIT BLOCKED: Dangerous sync patterns detected!"
  echo ""
  echo "Fix the issues above before committing."
  echo "See: .specweave/increments/0053-safe-feature-deletion/reports/UNGUARDED-SYNC-AUDIT-2025-11-24.md"
  exit 1
fi
```

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Detect Unguarded Sync Patterns
  run: bash scripts/detect-unguarded-sync.sh
```

---

## Success Criteria

**v0.26.0 Release**:
- ✅ Zero unguarded syncToExternalTools() calls
- ✅ Zero unguarded livingDocsSync.syncIncrement() calls
- ✅ All hooks have recursion guard checks
- ✅ Zero hooks using 'set -e'
- ✅ All critical hooks export SKIP flags
- ✅ Pre-commit hook prevents new violations
- ✅ 100% test coverage for recursion guard logic

**Verification**:
```bash
bash scripts/detect-unguarded-sync.sh
# Expected: ✅ NO DANGEROUS PATTERNS FOUND
```

---

## Related Documents

- **Emergency Hotfix**: `.specweave/increments/0053-safe-feature-deletion/reports/EXECUTIVE-SUMMARY-CRASH-FIX-2025-11-24.md`
- **Root Cause Analysis**: `.specweave/increments/0053-safe-feature-deletion/reports/ROOT-CAUSE-ANALYSIS-TODOWRITE-CRASH-2025-11-24.md`
- **ADR-0129**: `.specweave/docs/internal/architecture/adr/0129-us-sync-guard-rails.md`
- **Detection Script**: `scripts/detect-unguarded-sync.sh`

---

**STATUS**: Audit complete. 28 issues found. Remediation plan created for v0.26.0.
