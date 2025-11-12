# Multi-Project Living Docs Path Fix

**Date**: 2025-11-12
**Issue**: Living docs created in WRONG nested structure (`projects/default/specs/`) instead of CORRECT flattened structure (`specs/default/`)
**Severity**: Critical - Breaks multi-project living docs sync

---

## Problem Analysis

### Root Cause

The PM agent and increment-planner skill were documenting the OLD nested structure (v0.8.0-v0.16.10) instead of the CORRECT flattened structure (v0.16.11+):

**❌ WRONG (OLD)**:
```
.specweave/docs/internal/
└── projects/
    └── default/
        └── specs/
            └── spec-0001-inventory-tracker.md
```

**✅ CORRECT (v0.16.11+)**:
```
.specweave/docs/internal/
└── specs/
    ├── default/
    │   └── spec-0001-inventory-tracker.md
    ├── backend/
    │   └── spec-0002-api-auth.md
    ├── frontend/
    │   └── spec-0003-dark-mode.md
    └── _parent/
        └── spec-0004-system-architecture.md
```

### Why This Happened

1. **PM agent had NO multi-project awareness**:
   - No instructions for detecting multi-project mode
   - No instructions for determining project ID
   - Used old path structure in examples

2. **increment-planner skill had outdated paths**:
   - Multiple references to `projects/{project-id}/specs/`
   - Examples showing old nested structure
   - No mention of flattened structure

3. **Code was CORRECT**, but documentation was WRONG:
   - `ProjectManager.getSpecsPath()` already returns flattened paths
   - `content-classifier.ts` uses correct paths
   - But PM agent didn't know to use these!

---

## Changes Made

### 1. PM Agent (`plugins/specweave/agents/pm/AGENT.md`)

**Added multi-project detection section**:

```markdown
**⚠️ CRITICAL: Multi-Project Path Detection**

1. **Check if multi-project mode enabled**:
   - Read `.specweave/config.json`
   - Look for `multiProject.enabled: true`

2. **Determine project ID** (one of these methods):
   - **From increment name**: `0001-backend-auth` → project: `backend`
   - **From tech stack**: React/TypeScript → `frontend`, ASP.NET/C# → `backend`
   - **From config**: `multiProject.activeProject` field
   - **Fallback**: Use `default` project

3. **Use CORRECT flattened path** (v0.16.11+):
   - ✅ **CORRECT**: `.specweave/docs/internal/specs/{project-id}/spec-{number}-{name}.md`
   - ❌ **WRONG**: `.specweave/docs/internal/projects/{project-id}/specs/...` (OLD nested structure)

**Examples**:
- Single project: `.specweave/docs/internal/specs/default/spec-0001-inventory-tracker.md`
- Backend project: `.specweave/docs/internal/specs/backend/spec-0002-api-auth.md`
- Frontend project: `.specweave/docs/internal/specs/frontend/spec-0003-dark-mode.md`
- Parent repo: `.specweave/docs/internal/specs/_parent/spec-0004-system-architecture.md`
```

**Updated increment spec template**:
- Changed path from `../../docs/internal/specs/spec-{number}-{name}.md`
- To: `../../docs/internal/specs/{project-id}/spec-{number}-{name}.md`
- Added note: "Replace `{project-id}` with actual project"

### 2. Increment Planner Skill (`plugins/specweave/skills/increment-planner/SKILL.md`)

**Updated multi-project section**:
- Marked old paths as DEPRECATED
- Added v0.16.11+ flattened structure
- Updated all examples to use correct paths

**Before**:
```markdown
- Specs are now organized by project: `.specweave/docs/internal/projects/{project-id}/specs/`
```

**After**:
```markdown
- ✅ **CORRECT** (v0.16.11+): Specs organized with FLATTENED structure: `.specweave/docs/internal/specs/{project-id}/`
- ❌ **OLD** (v0.8.0-v0.16.10): `.specweave/docs/internal/projects/{project-id}/specs/` (DEPRECATED nested structure)
```

**Updated examples**:
```markdown
# Examples (v0.16.11+ Flattened):
# Single project: specs/default/spec-001-user-auth.md
# Multi-project: specs/web-app/spec-001-user-auth.md
#                specs/mobile/spec-001-push-notifications.md
# Parent repo:   specs/_parent/spec-002-system-architecture.md

# OLD (v0.8.0-v0.16.10): projects/default/specs/... ← DEPRECATED
```

---

## Testing Steps

### 1. Clean Up Existing Wrong Files

```bash
# In user repo (sw-gh-inventory)
cd /Users/antonabyzov/Projects/github/sw-gh-inventory

# Remove wrongly placed file
rm -rf .specweave/docs/internal/projects/

# Verify correct structure exists
ls -la .specweave/docs/internal/specs/
# Should show: backend/ frontend/ (empty for now)
```

### 2. Re-run Increment Planning

```bash
# In specweave repo
cd /Users/antonabyzov/Projects/github/specweave
npm run build

# In user repo - simulate new increment
# PM agent will now use CORRECT paths
```

### 3. Verify Correct Path

Living docs spec should be created at:
- ✅ `.specweave/docs/internal/specs/default/spec-0001-inventory-tracker.md` (CORRECT)
- OR based on tech stack detection:
  - ✅ `.specweave/docs/internal/specs/backend/spec-0001-inventory-tracker.md` (C# API detected)
  - ✅ `.specweave/docs/internal/specs/frontend/spec-0001-inventory-tracker.md` (React UI detected)

NOT at:
- ❌ `.specweave/docs/internal/projects/default/specs/spec-0001-inventory-tracker.md` (WRONG)

---

## Impact

### Files Changed
1. `plugins/specweave/agents/pm/AGENT.md` - PM agent instructions
2. `plugins/specweave/skills/increment-planner/SKILL.md` - Increment planner documentation

### No Code Changes Needed
- All TypeScript code already uses correct paths
- `ProjectManager.getSpecsPath()` already returns flattened structure
- This was purely a documentation fix

### Benefits
- ✅ Multi-project living docs now work correctly
- ✅ Specs organized by project (backend/frontend/mobile)
- ✅ Consistent with v0.16.11+ architecture
- ✅ Parent repo content properly separated
- ✅ No more nested `projects/` folder confusion

---

## Next Steps

1. **Update CLAUDE.md.template** - Ensure user-facing docs explain multi-project structure
2. **Update E2E tests** - Test multi-project living docs sync
3. **Migration script** - Help users migrate from old nested structure to new flattened
4. **Increment 0026 fixes** - Complete multi-project structure validation

---

## References

- **ADR-0017**: Multi-project internal structure (flattened v0.16.11)
- **Increment 0026**: Multi-project structure fix
- **ProjectManager**: `src/core/project-manager.ts` (already correct)
- **Content Classifier**: `src/core/living-docs/content-classifier.ts` (already correct)
