# ULTRATHINK: Folder Pollution Analysis & Cleanup Plan

**Date**: 2025-11-17
**Increment**: 0040-vitest-living-docs-mock-fixes
**Objective**: Identify and clean up root folder pollution and organize scripts

---

## Executive Summary

The repository has accumulated:
- **3 backup directories** in root (temporary, should be deleted)
- **1 test directory** in root (should be deleted)
- **1 old config file** in root (should be deleted)
- **~74 scripts** in `scripts/` folder (many are one-time migrations, should be moved to increments)

**Total Cleanup Impact**: ~50+ files to reorganize, ~5 directories to delete

---

## Root Folder Pollution

### Untracked Files/Directories (To DELETE)

1. **`.fix-double-js-backup-20251117-142055/`**
   - **Type**: Temporary backup
   - **Created by**: fix-double-js-extensions.sh script
   - **Purpose**: Backup before fixing .js/.js.js extensions
   - **Action**: ❌ DELETE (backup no longer needed, changes committed)
   - **Command**: `rm -rf .fix-double-js-backup-20251117-142055/`

2. **`.migration-backup-20251117-140958/`**
   - **Type**: Temporary backup
   - **Created by**: Jest→Vitest migration
   - **Purpose**: Backup before migration
   - **Action**: ❌ DELETE (migration complete, changes committed)
   - **Command**: `rm -rf .migration-backup-20251117-140958/`

3. **`.test-fix-duplicates/`**
   - **Type**: Test directory
   - **Purpose**: Test data for duplicate detection tests
   - **Issue**: Should be in tests/fixtures/ NOT root
   - **Action**: ❌ DELETE (proper test isolation exists in tests/)
   - **Command**: `rm -rf .test-fix-duplicates/`

4. **`jest.config.cjs.OLD`**
   - **Type**: Old configuration file
   - **Purpose**: Backup of Jest config before Vitest migration
   - **Action**: ❌ DELETE (Vitest migration complete, no rollback needed)
   - **Command**: `rm jest.config.cjs.OLD`

### Root Folder - KEEP (Legitimate Files)

✅ These are correct and should stay:
- `CHANGELOG.md` - Project changelog
- `CLAUDE.md` - Development guide
- `CODE_OF_CONDUCT.md` - Community guidelines
- `README.md` - Project README
- `SECURITY.md` - Security policy

---

## Scripts Folder Analysis

**Total Scripts**: 74 files
**Categories**: Infrastructure (keep), Migrations (move to increments), Tests (evaluate), Obsolete (delete)

### Category 1: Infrastructure Scripts (KEEP in scripts/)

**Build & Development**:
- ✅ `fix-js-extensions.js` - Build utility (fixes .js imports)
- ✅ `copy-plugin-js.js` - Build step
- ✅ `copy-locales.js` - Build step
- ✅ `install-git-hooks.sh` - Setup utility
- ✅ `setup-dev-plugins.sh` - Development setup
- ✅ `validate-local-dev-setup.sh` - Development validation
- ✅ `check-plugin-health.sh` - Plugin validation
- ✅ `run-all-tests.sh` - Test runner

**Documentation**:
- ✅ `generate-diagram-svgs.sh` - Docs generation
- ✅ `add-glossary-links.cjs` - Docs processing
- ✅ `convert-mermaid-to-svg.cjs` - Docs processing
- ✅ `extract-cli-strings.cjs` - i18n support
- ✅ `validate-plugin-manifests.cjs` - Plugin validation

**External Integrations**:
- ✅ `setup-sync-credentials.sh` - Setup utility
- ✅ `validate-parent-repo-setup.sh` - Multi-repo setup
- ✅ `validate-platforms.ts` - Platform validation

**Total to Keep**: ~16 scripts

### Category 2: Migration Scripts (MOVE to increment folders)

These are ONE-TIME scripts that were used for specific migrations/fixes:

**Jest→Vitest Migration** (Move to 0040):
- 📦 `migrate-jest-to-vitest.sh` → `.specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/`
- 📦 `fix-double-js-extensions.sh` → `.specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/`
- 📦 `fix-test-imports.ts` → `.specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/`
- 📦 `fix-import-meta-tests.cjs` → `.specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/`

**Living Docs Migrations** (Find appropriate increment or create 00XX-living-docs-migrations):
- 📦 `migrate-living-docs-to-english.sh`
- 📦 `migrate-living-docs-to-new-format.ts`
- 📦 `migrate-to-intelligent-living-docs.ts`
- 📦 `migrate-to-copy-based-sync.ts`

**Spec/Epic Migrations** (Find appropriate increment):
- 📦 `migrate-specs-to-domains.ts`
- 📦 `migrate-specs-to-sequential.ts`
- 📦 `migrate-to-epic-folders.ts`
- 📦 `migrate-to-hierarchical.ts`
- 📦 `populate-epic-increments.ts`
- 📦 `classify-specs.ts`
- 📦 `generate-spec-indices.ts`

**GitHub Issue Migrations** (Move to GitHub sync increment):
- 📦 `migrate-feature-issues-to-user-stories.ts`
- 📦 `fix-feature-github-issues.ts`
- 📦 `close-duplicate-feature-issues.ts`
- 📦 `create-feature-github-issue.js`
- 📦 `create-feature-github-issue.ts`
- 📦 `create-github-issue-with-protection.js`
- 📦 `update-epic-github-issue.sh`
- 📦 `generate-epic-issue-body.ts`

**Metadata Migrations**:
- 📦 `migrate-metadata.ts`
- 📦 `backfill-metadata.sh`
- 📦 `migrate-to-profiles.ts`

**Multi-repo/Project Migrations**:
- 📦 `split-spec-by-project.ts`
- 📦 `clean-increment-files.ts`

**Total to Move**: ~30 scripts

### Category 3: Test/Debug Scripts (EVALUATE)

These scripts test integrations or debug issues. Evaluate if still needed or superseded:

**External Tool Tests**:
- 🔍 `test-epic-sync.ts` - Epic sync testing (superseded by integration tests?)
- 🔍 `test-github-sync.ts` - GitHub sync testing
- 🔍 `test-spec-distribution.ts` - Spec distribution testing
- 🔍 `run-ado-test.sh` - ADO testing
- 🔍 `run-jira-bidirectional-sync.sh` - JIRA testing
- 🔍 `run-jira-incremental-test.sh` - JIRA testing
- 🔍 `run-jira-test.sh` - JIRA testing

**Feature Tests**:
- 🔍 `test-archive.ts` - Archive testing
- 🔍 `test-feature-archiving.ts` - Feature archive testing
- 🔍 `test-intelligent-sync.js` - Intelligent sync testing

**Debug Scripts**:
- 🔍 `debug-ado-detector.js` - ADO debugging
- 🔍 `discover-ado-config.ts` - ADO discovery
- 🔍 `diagnose-windows-detection.js` - Windows debugging
- 🔍 `test-windows-debug.ps1` - Windows debugging

**Build/Import Tests**:
- 🔍 `check-deduplication.js` - Deduplication checking

**Bulk Operations**:
- 🔍 `bulk-epic-sync.ts` - Bulk epic sync
- 🔍 `bulk-spec-sync.ts` - Bulk spec sync

**Recommendation**:
- If superseded by proper integration tests → DELETE
- If still useful for manual testing → KEEP or MOVE to scripts/dev/ subfolder
- If Windows-specific → MOVE to scripts/windows/

**Total to Evaluate**: ~18 scripts

### Category 4: Git Hooks (Special - Already in place)

These are git hook scripts:
- ✅ `pre-commit-specweave-protection.sh` - Installed via install-git-hooks.sh
- ✅ `pre-commit-test-pattern-check.sh` - Installed via install-git-hooks.sh

**Action**: KEEP (needed for git hooks installation)

### Category 5: Other Scripts

- 🔍 `generate-tests.ts` - Test generation utility (evaluate if still used)
- 🔍 `install-brownfield.sh` - Brownfield setup (keep if feature still active)
- 🔍 `generate-freshness-report.ts` - Reporting utility (evaluate)
- 🔍 `validate-template-enhancements.cjs` - Template validation (keep?)
- 🔍 `validate-template-enhancements.ts` - Template validation (keep?)
- 🔍 `epic-classification.json` - Data file (move to appropriate increment?)

**Total**: ~6 scripts

---

## Summary Statistics

| Category | Count | Action |
|----------|-------|--------|
| Root pollution (backup dirs) | 3 | ❌ DELETE |
| Root pollution (test dir) | 1 | ❌ DELETE |
| Root pollution (old config) | 1 | ❌ DELETE |
| Infrastructure scripts | 16 | ✅ KEEP in scripts/ |
| Migration scripts | 30 | 📦 MOVE to increments |
| Test/debug scripts | 18 | 🔍 EVALUATE |
| Other scripts | 6 | 🔍 EVALUATE |

**Total Cleanup Impact**:
- **5 items** to delete from root
- **30+ scripts** to move to increments
- **24 scripts** to evaluate (keep, move, or delete)

---

## Recommended Action Plan

### Phase 1: Delete Root Pollution (SAFE - Immediate)

```bash
# Remove backup directories (changes are committed)
rm -rf .fix-double-js-backup-20251117-142055/
rm -rf .migration-backup-20251117-140958/
rm -rf .test-fix-duplicates/

# Remove old config
rm jest.config.cjs.OLD

# Verify clean
git status
```

### Phase 2: Organize Migration Scripts (Requires increment folder checks)

**For increment 0040** (Jest→Vitest migration):
```bash
mkdir -p .specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/

# Move Vitest migration scripts
mv scripts/migrate-jest-to-vitest.sh .specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/
mv scripts/fix-double-js-extensions.sh .specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/
mv scripts/fix-test-imports.ts .specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/
mv scripts/fix-import-meta-tests.cjs .specweave/increments/0040-vitest-living-docs-mock-fixes/scripts/
```

**For other migrations**: Identify appropriate increments and move

### Phase 3: Evaluate Test Scripts

1. Check if superseded by integration tests in `tests/integration/`
2. If still needed, organize into:
   - `scripts/dev/` - Development utilities
   - `scripts/test/` - Test helpers
   - Or DELETE if obsolete

### Phase 4: Commit Cleanup

```bash
git add -A
git commit -m "chore: clean up root folder pollution and organize scripts

- Remove temporary backup directories from migrations
- Remove old Jest config file
- Move migration scripts to appropriate increment folders
- Organize development utilities

Reduces root pollution and improves repository organization."
```

---

## Increment Folder Health Check

### Increment 0040 Status

**Location**: `.specweave/increments/0040-vitest-living-docs-mock-fixes/`

**Files**:
- ✅ `spec.md` - Present
- ✅ `plan.md` - Present
- ✅ `tasks.md` - Present
- ✅ `metadata.json` - Present
- ✅ `reports/` - 6 reports present

**Reports**:
1. DELETION-PROTECTION-COMPLETE-2025-11-17.md
2. GENERATION-SUMMARY.md
3. JEST-VITEST-CONFLICT-RESOLUTION.md
4. PM-VALIDATION-REPORT-2025-11-17.md
5. ULTRATHINK-DELETION-ROOT-CAUSE-2025-11-17.md
6. ULTRATHINK-LIVING-DOCS-TESTS-ANALYSIS.md

**Assessment**: ✅ Properly organized, no pollution detected

### Other Increments (Spot Check)

Quick check of recent increments shows proper organization. No root-level pollution in increment folders detected.

---

## Risk Assessment

### Low Risk (Phase 1 - Delete backups)

- ✅ All changes from migrations are committed
- ✅ Backups are temporary and no longer needed
- ✅ Test directory can be safely removed (proper test isolation exists)
- ✅ Old Jest config not needed (Vitest is working)

**Rollback**: N/A (untracked files, not in git)

### Medium Risk (Phase 2 - Move migration scripts)

- ⚠️ Scripts moved to increment folders are still accessible
- ⚠️ Some scripts might be referenced by documentation
- ⚠️ Check if any scripts are called by CI/CD pipelines

**Rollback**: `git reset --hard HEAD` (if committed)

### Medium Risk (Phase 3 - Evaluate test scripts)

- ⚠️ Need to verify scripts are truly superseded
- ⚠️ Some scripts might be used by contributors
- ⚠️ Windows-specific scripts might still be needed

**Recommendation**: Move to scripts/dev/ first, DELETE later if confirmed obsolete

---

## Next Steps

1. ✅ Get approval for Phase 1 (immediate cleanup)
2. 🔍 Execute Phase 1 cleanup
3. 🔍 Identify appropriate increment folders for migration scripts
4. 🔍 Execute Phase 2 (move migrations)
5. 🔍 Evaluate test scripts usage
6. 🔍 Execute Phase 3 (reorganize tests)
7. ✅ Commit all changes
8. ✅ Update this report with actual actions taken

---

**Analysis Complete**: 2025-11-17
**Next Action**: Await approval and execute Phase 1 cleanup
