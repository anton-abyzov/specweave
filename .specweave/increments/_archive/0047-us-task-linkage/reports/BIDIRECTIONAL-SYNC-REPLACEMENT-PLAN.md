# Bidirectional Sync → Three-Permission Architecture Replacement Plan

**Date**: 2025-11-20
**Status**: In Progress
**Total Occurrences**: 65 across 20+ files

---

## Executive Summary

The old "bidirectional sync" terminology is being replaced with the new "three-permission architecture" (canUpsertInternalItems, canUpdateExternalItems, canUpdateStatus). This document tracks all occurrences and their replacements.

---

## Replacement Strategy

### Context-Dependent Replacements

| Old Term | New Term | Context |
|----------|----------|---------|
| `bidirectional sync` | `full sync (all permissions enabled)` | Test descriptions |
| `bidirectional: true` | `canUpsertInternalItems: true, canUpdateExternalItems: true, canUpdateStatus: true` | Code |
| `syncDirection: "bidirectional"` | Three permission flags | Config files |
| `bidirectional linking` | ⚠️  **KEEP AS IS** - refers to Task ↔ US links | Documentation |

---

## Files Completed ✅

1. ✅ `.specweave/config.json` - Updated settings object
2. ✅ `scripts/migrate-to-profiles.ts` - Updated default settings (2 occurrences)
3. ✅ `src/cli/commands/init.ts` - Updated user-facing message
4. ✅ `.specweave/increments/0047-us-task-linkage/spec.md` - Updated AC-US9-04
5. ✅ `.specweave/increments/0047-us-task-linkage/plan.md` - Updated sync methods and behavior matrix
6. ✅ `.specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md` - Updated Question 2
7. ✅ `src/core/types/sync-settings.ts` - Updated JSDoc comments
8. ✅ `src/core/utils/permission-checker.ts` - Updated JSDoc comments

---

## Files Pending 🔄

### Critical Code Files

- [ ] `plugins/specweave-github/lib/types.ts` - Update type definitions
- [ ] `src/core/living-docs/task-project-specific-generator.ts` - Update comments
- [ ] `src/adapters/claude/README.md` - Update documentation

### Test Files (Update test descriptions)

- [ ] `tests/integration/external-tools/github/github-sync.test.ts`
- [ ] `tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts` (consider renaming file)
- [ ] `tests/integration/external-tools/jira/jira-sync.test.ts`
- [ ] `tests/integration/core/spec-content-sync/spec-content-sync.test.ts`
- [ ] `tests/integration/fixtures/specs/FS-043/FEATURE.md`
- [ ] `tests/e2e/bidirectional-sync.test.ts` (consider renaming file)
- [ ] `tests/e2e/status-sync/status-sync-github.test.ts`
- [ ] `tests/e2e/status-sync/status-sync-conflict.test.ts`
- [ ] `tests/e2e/living-docs-sync-bidirectional.test.ts` (consider renaming file)
- [ ] `tests/e2e/advanced-features.test.ts`

### Documentation Files

- [ ] `CHANGELOG.md` - Update historical references with migration note
- [ ] `.specweave/docs/internal/specs/specweave/FS-047/us-003-automatic-living-docs-sync.md`
- [ ] `.specweave/increments/0047-us-task-linkage/reports/SYNC-DIRECTION-ARCHITECTURE-ANALYSIS.md`
- [ ] `.specweave/increments/0047-us-task-linkage/reports/BIDIRECTIONAL-SYNC-ARCHITECTURE-ANALYSIS.md`
- [ ] `.specweave/increments/0047-us-task-linkage/reports/SESSION-3-IMPLEMENTATION-REPORT.md`
- [ ] `.specweave/increments/0047-us-task-linkage/reports/PRODUCT-STRATEGY.md`
- [ ] `.specweave/increments/0043-spec-md-desync-fix/reports/INCREMENT-CLOSURE-2025-11-19.md`
- [ ] `.specweave/increments/0043-spec-md-desync-fix/reports/COMPLETION-SUMMARY-FINAL-2025-11-19.md`
- [ ] `.specweave/increments/0043-spec-md-desync-fix/reports/PM-VALIDATION-REPORT-2025-11-19.md`
- [ ] `.specweave/increments/0043-spec-md-desync-fix/reports/ULTRATHINK-TASK-SYNC-ARCHITECTURE-2025-11-18.md`

### Scripts & Templates

- [ ] `scripts/run-jira-bidirectional-sync.sh` (consider renaming)
- [ ] `src/templates/CLAUDE.md.template` - ⚠️  Review carefully (contains bidirectional LINKING references)
- [ ] `src/templates/AGENTS.md.template`

### Low Priority

- [ ] `.claude-plugin/README.md`
- [ ] `.claude-plugin/marketplace.json` (3 occurrences)
- [ ] `README.md`
- [ ] `CLAUDE.md` - ⚠️  Contains bidirectional LINKING references
- [ ] `scripts/run-all-tests.sh`
- [ ] `scripts/epic-classification.json`
- [ ] `.specweave/docs/public/overview/plugins-ecosystem.md`
- [ ] `scripts/archive/migrate-tests.sh` (3 occurrences)
- [ ] `.specweave/increments/0042-test-infrastructure-cleanup/reports/HIGH-RISK-TESTS-AUDIT-2025-11-18.md` (2 occurrences)

---

## File Renaming Candidates

Consider renaming these files to remove "bidirectional" from filenames:

1. `tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts` → `jira-full-sync.test.ts`
2. `tests/e2e/bidirectional-sync.test.ts` → `full-sync.test.ts` or `three-permission-sync.test.ts`
3. `tests/e2e/living-docs-sync-bidirectional.test.ts` → `living-docs-full-sync.test.ts`
4. `scripts/run-jira-bidirectional-sync.sh` → `run-jira-full-sync.sh`
5. `.specweave/increments/0047-us-task-linkage/reports/BIDIRECTIONAL-SYNC-ARCHITECTURE-ANALYSIS.md` → Keep for historical reference

---

## Automated Replacement Script

```bash
#!/usr/bin/env bash
# Replace "bidirectional sync" with "full sync (all permissions enabled)" in test descriptions

# Test files only (avoid touching bidirectional LINKING references)
find tests/ -name "*.test.ts" -type f -exec sed -i '' \
  -e 's/bidirectional sync/full sync (all permissions enabled)/g' \
  -e 's/Bidirectional sync/Full sync (all permissions enabled)/g' \
  -e 's/bidirectional synchronization/full synchronization with all permissions enabled/g' \
  {} +

# Update code comments
find src/ -name "*.ts" -type f -exec sed -i '' \
  -e 's/bidirectional sync/three-permission sync/g' \
  -e 's/Bidirectional sync/Three-permission sync/g' \
  {} +

echo "✅ Automated replacement complete. Review changes with: git diff"
```

---

## Manual Review Required

These files require careful manual review to distinguish between:
- **Bidirectional SYNC** (SpecWeave ↔ External Tool) → Replace with three-permission architecture
- **Bidirectional LINKING** (Task ↔ User Story) → Keep as is

Files requiring manual review:
1. `src/templates/CLAUDE.md.template` (5 occurrences)
2. `CLAUDE.md` (1 occurrence)
3. `src/templates/AGENTS.md.template` (4 occurrences)

---

## Progress Tracking

- **Total**: 65 occurrences
- **Completed**: 12 occurrences (18%)
- **Remaining**: 53 occurrences (82%)
- **Critical Path**: Code files, init command, config files (DONE)
- **Next Priority**: Test files, then documentation

---

## Migration Note for CHANGELOG.md

Add this entry when complete:

```markdown
### Breaking Change: Bidirectional Sync → Three-Permission Architecture (v0.24.0)

**Migration Required**: The old `syncDirection: "bidirectional"` configuration has been replaced with three independent permission flags:

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,  // CREATE + UPDATE internal items
      "canUpdateExternalItems": true,  // UPDATE external items (full content)
      "canUpdateStatus": true          // UPDATE status (both types)
    }
  }
}
```

**Automatic Migration**: Existing configs with `syncDirection: "bidirectional"` will be automatically migrated to all three permissions set to `true`.

**See Also**: `.specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md`
```

---

## Completion Checklist

Before marking this task complete:

- [ ] All code files updated and tested
- [ ] All test files updated and passing
- [ ] All documentation updated
- [ ] CHANGELOG.md entry added
- [ ] File renames committed (if applicable)
- [ ] Migration script tested on sample configs
- [ ] No remaining "bidirectional sync" references (verify with: `git grep -i "bidirectional sync"`)
