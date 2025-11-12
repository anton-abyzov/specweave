# Increment Duplicates Analysis & Fix Plan

**Date**: 2025-11-12
**Analysis**: Comprehensive audit of all increments

---

## Duplicates Found

### 1. Duplicate 0015

**0015-hierarchical-external-sync**:
- Status: ✅ Completed (2025-11-10)
- Files: spec.md, plan.md, tasks.md, metadata.json (392 bytes)
- GitHub Issue: #29
- JIRA Epic: SCRUM-33
- Reports: 16 files

**0015-intelligent-living-docs**:
- Status: ⚠️  Empty (no spec/plan/tasks, only reports)
- Files: reports/ only (2 files)
  - FINAL-VALIDATION-REPORT.md (16KB)
  - PERFORMANCE-BENCHMARK.md (5.6KB)
- Created: 2025-11-12 (recent session work)

**Analysis**:
- 0015-hierarchical-external-sync is a complete, legitimate increment
- 0015-intelligent-living-docs is work done in current session without proper increment setup
- Intelligent living docs work should have been a new increment (0030)

**Fix Plan**:
```bash
# Rename 0015-intelligent-living-docs to 0030-intelligent-living-docs
mv .specweave/increments/0015-intelligent-living-docs \
   .specweave/increments/0030-intelligent-living-docs

# Create proper increment structure for 0030
# (spec.md, plan.md, tasks.md will be generated)
```

---

### 2. Duplicate 0026

**0026-multi-repo-unit-tests**:
- Status: ❌ ABANDONED (2025-11-11)
- Files: spec.md, plan.md, tasks.md, metadata.json (515 bytes)
- Progress: 0/4 tasks (0%)
- Reason: "Incomplete implementation, superseded by increment 0028"
- ABANDONED.md: Present

**0026-multiproject-structure-fix**:
- Status: ⚠️  Incomplete (no metadata, plan, tasks)
- Files: spec.md only (2.4KB), reports/ (3 files)
- Created: 2025-11-11
- Focus: Fix repository location + internal docs structure

**Analysis**:
- 0026-multi-repo-unit-tests is properly abandoned with documentation
- 0026-multiproject-structure-fix was started after 0026 was abandoned (same day)
- Both are related to multi-repo improvements
- 0026-multiproject-structure-fix is a simpler, more focused fix

**Fix Plan - Option 1: Keep 0026-multiproject-structure-fix**:
```bash
# 1. Archive abandoned increment
mv .specweave/increments/0026-multi-repo-unit-tests \
   .specweave/increments/_archive/0026-multi-repo-unit-tests-ABANDONED

# 2. Keep 0026-multiproject-structure-fix as the canonical 0026
# (already in correct location)

# 3. Add metadata to 0026-multiproject-structure-fix
# Create metadata.json, mark as completed or active
```

**Fix Plan - Option 2: Merge Both (Recommended)**:
```bash
# 1. Move 0026-multiproject-structure-fix reports to 0026-multi-repo-unit-tests
cp .specweave/increments/0026-multiproject-structure-fix/reports/* \
   .specweave/increments/0026-multi-repo-unit-tests/reports/

# 2. Update 0026-multi-repo-unit-tests spec to include structure fix requirements
# (merge spec.md content)

# 3. Keep 0026-multi-repo-unit-tests as canonical (has proper metadata)

# 4. Delete 0026-multiproject-structure-fix
rm -rf .specweave/increments/0026-multiproject-structure-fix
```

---

## Recommended Actions

### Priority 1: Fix 0015 Duplicate

**Action**: Rename 0015-intelligent-living-docs to 0030-intelligent-living-docs

**Justification**:
- 0015-hierarchical-external-sync is completed and has external references (GitHub #29, JIRA SCRUM-33)
- Intelligent living docs is new work that deserves its own increment number
- 0030 is the next available increment number after 0029

**Commands**:
```bash
# Rename directory
mv .specweave/increments/0015-intelligent-living-docs \
   .specweave/increments/0030-intelligent-living-docs

# Update references in reports if any
find .specweave/increments/0030-intelligent-living-docs/reports -type f -exec \
  sed -i '' 's/0015-intelligent-living-docs/0030-intelligent-living-docs/g' {} \;
```

**Post-Fix**:
- Create proper spec.md, plan.md, tasks.md for 0030
- Add metadata.json
- Link to ADR-0030 (Intelligent Living Docs Sync)

---

### Priority 2: Fix 0026 Duplicate

**Action**: Merge 0026-multiproject-structure-fix into 0026-multi-repo-unit-tests

**Justification**:
- 0026-multi-repo-unit-tests is properly abandoned with metadata
- 0026-multiproject-structure-fix is incomplete (no metadata, plan, tasks)
- Both address multi-repo improvements
- Keep abandoned increment as historical record, merge reports

**Commands**:
```bash
# 1. Copy reports from 0026-multiproject-structure-fix
mkdir -p .specweave/increments/0026-multi-repo-unit-tests/reports
cp .specweave/increments/0026-multiproject-structure-fix/reports/* \
   .specweave/increments/0026-multi-repo-unit-tests/reports/ 2>/dev/null || true

# 2. Append spec content to ABANDONED.md
echo "\n## Related Work: Multi-Project Structure Fix\n" >> \
  .specweave/increments/0026-multi-repo-unit-tests/ABANDONED.md
cat .specweave/increments/0026-multiproject-structure-fix/spec.md >> \
  .specweave/increments/0026-multi-repo-unit-tests/ABANDONED.md

# 3. Archive 0026-multiproject-structure-fix
mkdir -p .specweave/increments/_archive
mv .specweave/increments/0026-multiproject-structure-fix \
   .specweave/increments/_archive/0026-multiproject-structure-fix-MERGED
```

**Post-Fix**:
- 0026-multi-repo-unit-tests remains as canonical abandoned increment
- All work related to 0026 is in one place
- Historical record preserved in _archive/

---

## Verification Steps

After fixes:
```bash
# 1. List all increments - should have no duplicates
ls -1 .specweave/increments/ | grep -E '^[0-9]{4}' | sort | uniq -d
# Expected: (empty output)

# 2. Verify 0015 canonical
ls .specweave/increments/ | grep 0015
# Expected: 0015-hierarchical-external-sync (only)

# 3. Verify 0026 canonical
ls .specweave/increments/ | grep 0026
# Expected: 0026-multi-repo-unit-tests (only)

# 4. Verify 0030 exists
ls .specweave/increments/ | grep 0030
# Expected: 0030-intelligent-living-docs

# 5. Check archive
ls .specweave/increments/_archive/
# Expected:
#   - 0026-multiproject-structure-fix-MERGED
```

---

## Impact Assessment

**0015 Fix**:
- ✅ No breaking changes (just renaming empty directory)
- ✅ No external references to update (no GitHub issue, no JIRA)
- ✅ Clean increment numbering

**0026 Fix**:
- ✅ No breaking changes (merging into abandoned increment)
- ✅ Preserves historical record
- ⚠️  May have references in code/docs that mention 0026-multiproject-structure-fix
  - Search: `grep -r "0026-multiproject-structure-fix" .`

**Post-Fix Numbering**:
- Next increment: 0031 (after merging 0030)
- Clean sequence: 0001-0030 with one abandoned (0026)

---

## Execution Timeline

**Phase 1: Fix 0015** (5 minutes)
- Rename 0015-intelligent-living-docs to 0030-intelligent-living-docs
- Update references in reports
- Verify no duplicates

**Phase 2: Fix 0026** (10 minutes)
- Merge 0026-multiproject-structure-fix into 0026-multi-repo-unit-tests
- Archive merged directory
- Update ABANDONED.md with merged content
- Search for references to update

**Phase 3: Verification** (5 minutes)
- Run verification steps
- Check git status
- Commit changes with clear message

**Total Time**: 20 minutes

---

## Conclusion

**Current State**:
- 2 duplicate increment numbers (0015, 0026)
- 4 total increment folders affected

**Post-Fix State**:
- 0 duplicate increment numbers
- Clean sequence 0001-0030 (one abandoned: 0026)
- All work preserved (reports, specs, historical record)
- Ready for next increment: 0031

**Benefits**:
- ✅ Clean increment numbering
- ✅ No data loss
- ✅ Preserved historical record
- ✅ Clear audit trail
- ✅ Consistent structure

---

**Status**: Ready to execute
**Risk**: Low (all changes are renames/moves, no code changes)
**Rollback**: Easy (git revert or manual undo)
