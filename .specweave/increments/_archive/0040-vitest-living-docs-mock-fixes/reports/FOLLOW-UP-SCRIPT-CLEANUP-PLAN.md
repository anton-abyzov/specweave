# Follow-up: Script Cleanup Plan

**Date**: 2025-11-17
**Increment**: 0040-vitest-living-docs-mock-fixes
**Status**: Phase 1 & 2 Complete, Phase 3 Pending

---

## Completed Actions ✅

### Phase 1: Root Cleanup (COMPLETE)
- ✅ Deleted `.fix-double-js-backup-20251117-142055/`
- ✅ Deleted `.migration-backup-20251117-140958/`
- ✅ Deleted `.test-fix-duplicates/`
- ✅ Deleted `jest.config.cjs.OLD`

### Phase 2: Vitest Migration Scripts (COMPLETE)
- ✅ Moved `migrate-jest-to-vitest.sh` → increment 0040
- ✅ Moved `fix-double-js-extensions.sh` → increment 0040
- ✅ Moved `fix-test-imports.ts` → increment 0040
- ✅ Moved `fix-import-meta-tests.cjs` → increment 0040

**Result**: Root folder is clean, Vitest migration scripts properly organized

---

## Pending Actions 🔄

### Phase 3: Remaining Migration Scripts

**Total Scripts to Evaluate**: 13 migration scripts + ~18 test/debug scripts

#### 3.1 GitHub/Issue Migration Scripts

**Candidates for increment 0034** (github-ac-checkboxes-fix):
- [ ] `fix-feature-github-issues.ts`
- [ ] `migrate-feature-issues-to-user-stories.ts`
- [ ] `create-feature-github-issue.js`
- [ ] `create-feature-github-issue.ts`
- [ ] `create-github-issue-with-protection.js`
- [ ] `update-epic-github-issue.sh`
- [ ] `generate-epic-issue-body.ts`
- [ ] `close-duplicate-feature-issues.ts`

**Action**: Review increment 0034 to confirm these scripts belong there

#### 3.2 Living Docs Migration Scripts

**Create new increment or move to existing**:
- [ ] `migrate-living-docs-to-english.sh`
- [ ] `migrate-living-docs-to-new-format.ts`
- [ ] `migrate-to-intelligent-living-docs.ts`
- [ ] `migrate-to-copy-based-sync.ts`

**Options**:
1. Create `.specweave/increments/00XX-living-docs-migrations/` (if no existing increment)
2. Or move to increment that introduced these features

#### 3.3 Spec/Epic Organization Scripts

**Older organizational migrations**:
- [ ] `migrate-specs-to-domains.ts`
- [ ] `migrate-specs-to-sequential.ts`
- [ ] `migrate-to-epic-folders.ts`
- [ ] `migrate-to-hierarchical.ts`
- [ ] `classify-specs.ts`
- [ ] `generate-spec-indices.ts`

**Options**:
1. Create `.specweave/increments/00XX-spec-organization/` archive folder
2. Or move to increments that introduced these organizational changes

#### 3.4 External Tool Sync Scripts

**Candidates for increment 0031** (external-tool-status-sync):
- [ ] `migrate-to-profiles.ts`
- [ ] `bulk-epic-sync.ts`
- [ ] `bulk-spec-sync.ts`

**Action**: Review increment 0031 to confirm

#### 3.5 Metadata & Multi-repo Scripts

**Older infrastructure migrations**:
- [ ] `migrate-metadata.ts`
- [ ] `backfill-metadata.sh`
- [ ] `populate-epic-increments.ts`
- [ ] `clean-increment-files.ts`
- [ ] `split-spec-by-project.ts`

**Options**:
1. Move to appropriate multi-repo increments (0022, 0028)
2. Or create general `.specweave/increments/00XX-infrastructure-migrations/`

### Phase 4: Test/Debug Scripts Evaluation

**Scripts to Evaluate** (~18 scripts):

#### Keep or Move to scripts/dev/
- [ ] `test-github-sync.ts` - Still useful?
- [ ] `test-epic-sync.ts` - Superseded by integration tests?
- [ ] `test-spec-distribution.ts` - Still needed?
- [ ] `test-archive.ts` - Still useful?
- [ ] `test-feature-archiving.ts` - Still useful?
- [ ] `test-intelligent-sync.js` - Superseded?

#### External Tool Integration Tests
- [ ] `run-ado-test.sh` - Move to scripts/test/?
- [ ] `run-jira-test.sh` - Move to scripts/test/?
- [ ] `run-jira-bidirectional-sync.sh` - Move to scripts/test/?
- [ ] `run-jira-incremental-test.sh` - Move to scripts/test/?

#### Debug Scripts
- [ ] `debug-ado-detector.js` - Move to scripts/debug/?
- [ ] `discover-ado-config.ts` - Keep or move?
- [ ] `diagnose-windows-detection.js` - Move to scripts/windows/?
- [ ] `test-windows-debug.ps1` - Move to scripts/windows/?

#### Other
- [ ] `check-deduplication.js` - Still needed?
- [ ] `generate-tests.ts` - Still used?
- [ ] `generate-freshness-report.ts` - Keep?
- [ ] `validate-template-enhancements.cjs/.ts` - Keep?

**Evaluation Criteria**:
1. Is it superseded by proper integration tests?
2. Is it still useful for manual testing/debugging?
3. Should it be in a subfolder (scripts/dev/, scripts/test/, scripts/debug/)?

---

## Recommended Next Steps

### Option A: Incremental Cleanup (Recommended)
1. Create GitHub issue: "Organize remaining migration scripts"
2. Break down into smaller PRs:
   - PR 1: GitHub/issue migration scripts
   - PR 2: Living docs migration scripts
   - PR 3: Spec/epic organization scripts
   - PR 4: Test/debug script evaluation
3. Each PR: Move scripts + update analysis report

### Option B: Batch Cleanup
1. Create all necessary increment folders
2. Move all migration scripts in one commit
3. Evaluate all test scripts
4. Commit everything together

**Recommendation**: Option A (incremental) is safer and easier to review

---

## Script Organization Patterns

### Infrastructure Scripts (KEEP in scripts/)
```
scripts/
├── install-git-hooks.sh          ✅ Keep
├── setup-dev-plugins.sh          ✅ Keep
├── fix-js-extensions.js          ✅ Keep (actively used)
├── copy-plugin-js.js             ✅ Keep
├── validate-plugin-manifests.cjs ✅ Keep
└── ... (other infrastructure)
```

### Migration Scripts (MOVE to increments)
```
.specweave/increments/
├── 0034-github-ac-checkboxes-fix/
│   └── scripts/
│       ├── migrate-feature-issues-to-user-stories.ts
│       ├── fix-feature-github-issues.ts
│       └── ... (other GitHub migrations)
├── 00XX-living-docs-migrations/
│   └── scripts/
│       ├── migrate-living-docs-to-english.sh
│       ├── migrate-to-intelligent-living-docs.ts
│       └── ... (other living docs migrations)
└── 00XX-spec-organization/
    └── scripts/
        ├── migrate-specs-to-domains.ts
        ├── migrate-to-epic-folders.ts
        └── ... (other spec migrations)
```

### Test/Debug Scripts (ORGANIZE by type)
```
scripts/
├── dev/
│   ├── test-github-sync.ts
│   ├── test-archive.ts
│   └── ... (development utilities)
├── test/
│   ├── run-ado-test.sh
│   ├── run-jira-test.sh
│   └── ... (integration test helpers)
├── debug/
│   ├── debug-ado-detector.js
│   └── ... (debugging utilities)
└── windows/
    ├── diagnose-windows-detection.js
    └── test-windows-debug.ps1
```

---

## Risk Assessment

### Low Risk
- Moving migration scripts to increments (preserves history)
- Creating new increment folders for historical migrations
- Organizing test scripts into subfolders

### Medium Risk
- Deleting test scripts (verify not used in CI/CD)
- Removing debug scripts (might be needed for troubleshooting)

### High Risk
- None identified

---

## Success Criteria

- [ ] All migration scripts organized into appropriate increment folders
- [ ] Test/debug scripts evaluated and organized
- [ ] Scripts folder has clear structure
- [ ] No loss of git history
- [ ] Documentation updated (if needed)

---

## References

- **Main Analysis**: `ULTRATHINK-FOLDER-POLLUTION-ANALYSIS.md`
- **Commit**: ebe2b52 (chore: clean up root folder pollution)
- **Branch**: develop
- **Status**: Phase 1 & 2 complete, Phase 3+ pending

---

**Next Action**: Create GitHub issue or choose Option A/B above

**Estimated Effort**:
- Option A: ~2-4 hours spread across multiple sessions
- Option B: ~1-2 hours in one session

**Recommendation**: Option A (better reviewability, safer)
