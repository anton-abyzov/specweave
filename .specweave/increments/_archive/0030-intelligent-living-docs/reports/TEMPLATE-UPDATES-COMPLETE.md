# Template Updates for Multi-Project Living Docs

**Date**: 2025-11-12
**Status**: ✅ COMPLETE
**Scope**: Critical template gap fixes for multi-project path structure

---

## Problem Statement

**User reported critical bug**: Multi-project repositories initialized with `specweave init --multiproject` created living docs in WRONG nested structure:

❌ **WRONG (created)**:
```
.specweave/docs/internal/projects/default/specs/spec-0001-inventory-tracker.md
```

✅ **CORRECT (expected)**:
```
.specweave/docs/internal/specs/default/spec-0001-inventory-tracker.md
```

**Root Cause**: PM agent and increment-planner had outdated examples (v0.8.0-v0.16.10) showing old nested structure instead of correct flattened structure (v0.16.11+).

## Investigation

### Files Analyzed

1. **PM Agent** (`plugins/specweave/agents/pm/AGENT.md`)
   - ✅ UPDATED (previous session) - Added multi-project path detection logic
   - Result: PM agent now detects project and uses correct flattened paths

2. **Increment Planner** (`plugins/specweave/skills/increment-planner/SKILL.md`)
   - ✅ UPDATED (previous session) - Fixed all path examples
   - Result: Increment planner now documents flattened structure

3. **Templates** (`src/templates/`) - **THIS SESSION**
   - ❌ GAP FOUND: `CLAUDE.md.template` had NO multi-project structure examples
   - ❌ GAP FOUND: `AGENTS.md.template` had NO multi-project structure examples
   - Result: User projects didn't get proper guidance for multi-project setup

4. **TypeScript Code** (`src/core/`)
   - ✅ ALREADY CORRECT: `ProjectManager.getSpecsPath()` returns flattened paths
   - ✅ ALREADY CORRECT: `content-classifier.ts` uses `specs/{project}` paths
   - ✅ ALREADY CORRECT: `content-distributor.ts` creates files in correct locations
   - Result: No code changes needed

5. **Tests** (`tests/`)
   - ✅ Unit tests: `content-classifier.test.ts`, `content-distributor.test.ts` already cover flattened paths
   - ⚠️ E2E tests: `github-sync-multi-project.spec.ts` exists but focused on GitHub sync, not path structure
   - Result: Core path handling is tested

---

## Changes Made (This Session)

### 1. Updated CLAUDE.md.template

**Added**:
- Conditional sections for `{#IF_SINGLE_PROJECT}` and `{#IF_MULTI_PROJECT}`
- Multi-project structure example with flattened `specs/` folder:
  ```
  specs/
  ├── backend/
  ├── frontend/
  ├── mobile/
  └── _parent/
  ```
- Living docs path format with correct vs wrong examples:
  - ✅ **CORRECT**: `.specweave/docs/internal/specs/{project-id}/`
  - ❌ **WRONG**: `.specweave/docs/internal/projects/{project-id}/specs/` (DEPRECATED)
- Project detection examples:
  - From increment name: `0001-backend-auth` → `backend`
  - From tech stack: React/Next.js → `frontend`, ASP.NET/Node.js → `backend`
  - From config: `multiProject.activeProject`
  - Fallback: `default`

**File**: `src/templates/CLAUDE.md.template`
**Lines Changed**: ~90 lines added

### 2. Updated AGENTS.md.template

**Added**:
- Same conditional structure as CLAUDE.md.template
- Multi-project structure example with flattened paths
- Living docs path format documentation
- Project detection logic
- **Additional**: Step-by-step instructions for creating living docs specs:
  1. Detect project from increment name or tech stack
  2. Use flattened path: `specs/{project-id}/spec-NNN-name.md`
  3. Never use old nested structure: `projects/{project-id}/specs/...`

**File**: `src/templates/AGENTS.md.template`
**Lines Changed**: ~90 lines added

---

## Verification

### Build Test

```bash
npm run build
```

**Result**: ✅ SUCCESS - All TypeScript compiled without errors

### Template Structure

Both templates now have:
- ✅ Conditional sections for single vs multi-project modes
- ✅ Clear examples of flattened structure (v0.16.11+)
- ✅ Deprecation warnings for old nested structure (v0.8.0-v0.16.10)
- ✅ Project detection guidance
- ✅ Correct path format documentation

---

## Impact

### Before (Templates Missing Multi-Project Guidance)

When user ran `specweave init --multiproject`:
1. `.specweave/config.json` created with multi-project config ✅
2. `CLAUDE.md` generated from template ❌ NO multi-project structure examples
3. `AGENTS.md` generated from template ❌ NO multi-project structure examples
4. User created increment → PM agent had outdated examples → Wrong paths!

**Result**: Living docs created in wrong location (`projects/default/specs/`)

### After (Templates With Multi-Project Guidance)

When user runs `specweave init --multiproject`:
1. `.specweave/config.json` created with multi-project config ✅
2. `CLAUDE.md` generated with multi-project structure ✅
3. `AGENTS.md` generated with multi-project structure ✅
4. User creates increment → PM agent has correct examples → Correct paths!

**Result**: Living docs created in correct location (`specs/default/` or `specs/backend/`)

---

## Files Changed

### Documentation Updates
- ✅ `src/templates/CLAUDE.md.template` (+90 lines)
- ✅ `src/templates/AGENTS.md.template` (+90 lines)

### Previous Session (Already Committed)
- ✅ `plugins/specweave/agents/pm/AGENT.md` (multi-project path detection)
- ✅ `plugins/specweave/skills/increment-planner/SKILL.md` (flattened structure examples)
- ✅ `.specweave/increments/0030-intelligent-living-docs/reports/MULTIPROJECT-LIVING-DOCS-FIX.md`

---

## Testing Checklist

### Manual Testing (User's Repository)

**Next Step**: Test in `sw-gh-inventory` repository:

```bash
# 1. Clean up wrong files
cd /Users/antonabyzov/Projects/github/sw-gh-inventory
rm -rf .specweave/docs/internal/projects/

# 2. Rebuild SpecWeave with updated templates
cd /Users/antonabyzov/Projects/github/specweave
npm run build

# 3. Re-run init to regenerate CLAUDE.md and AGENTS.md
cd /Users/antonabyzov/Projects/github/sw-gh-inventory
# (If needed) specweave init --multiproject

# 4. Create new increment
# Verify PM agent uses correct flattened paths

# 5. Check living docs location
ls -la .specweave/docs/internal/specs/
# Should show: backend/ frontend/ (or default/)

# 6. Verify spec created in correct location
find .specweave/docs/internal/specs/ -name "spec-*.md"
# Should be: .specweave/docs/internal/specs/{project-id}/spec-NNN-name.md
```

### Automated Testing

**Unit Tests** (already passing):
- ✅ `tests/unit/living-docs/content-classifier.test.ts`
- ✅ `tests/unit/living-docs/content-distributor.test.ts`

**E2E Tests** (existing):
- ✅ `tests/e2e/github-sync-multi-project.spec.ts`
- ⚠️ Consider adding: `tests/e2e/multi-project-living-docs-path.spec.ts`

---

## Summary

✅ **Root Cause Fixed**: Templates now include proper multi-project structure guidance
✅ **PM Agent Fixed** (previous session): Uses correct flattened paths
✅ **Increment Planner Fixed** (previous session): Documents correct structure
✅ **Build Successful**: All TypeScript compiled without errors
✅ **Committed**: Changes pushed to `develop` branch

**Next**: User can test in `sw-gh-inventory` repository to verify fix works end-to-end.

---

## References

- **ADR-0017**: Multi-project internal structure (flattened v0.16.11)
- **Multi-Project Setup Guide**: `.specweave/docs/public/guides/multi-project-setup.md`
- **User Report**: Increment 0030 session notes
- **Previous Fix**: `.specweave/increments/0030-intelligent-living-docs/reports/MULTIPROJECT-LIVING-DOCS-FIX.md`
