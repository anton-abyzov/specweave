# Architecture Fix Summary: Specs Not Increments

**Date**: 2025-11-11
**Status**: Phase 1 Complete - Increment Sync Disabled ✅
**Remaining Work**: Spec-level sync implementation (Phases 2-6)

---

## What I Fixed (Phase 1) ✅

### 1. Disabled Increment-Level GitHub Sync

**Problem**: I mistakenly implemented increment-level GitHub issue creation, which is architecturally wrong.

**Fix**: Commented out the increment-level sync code in `post-increment-planning.sh`

**File Modified**:
- `plugins/specweave/hooks/post-increment-planning.sh` (lines 649-675)

**Changes**:
```bash
# BEFORE (WRONG):
# 7. Auto-create GitHub issue (if configured)
if [ "$auto_create" = "true" ]; then
  create_github_issue "$increment_id" "$increment_dir"
fi

# AFTER (CORRECT):
# 7. Increment-level GitHub sync (DISABLED - See architecture note below)
log_info "ℹ️  Increment-level GitHub sync disabled (by design)"
log_debug "Increments are INTERNAL work units, not synced to external tools"
log_debug "External sync happens at SPEC level (.specweave/docs/internal/specs/)"

# TODO: Implement spec-level sync instead
```

**Result**: New increments will NOT create GitHub issues (correct behavior)

---

## Correct Architecture (What Should Happen)

### The Key Principle

**External tools (GitHub, JIRA, ADO) track PERMANENT specs, not TEMPORARY increments.**

```
✅ CORRECT:
.specweave/docs/internal/specs/
├── spec-001-core-framework.md → GitHub Project #5
│   ├── US-001 → GitHub Issue #130
│   ├── US-002 → GitHub Issue #131
│   └── ...
└── spec-002-intelligent-capabilities.md → GitHub Project #6
    ├── US-001 → GitHub Issue #150
    └── ...

❌ WRONG:
.specweave/increments/
├── 0001-core-framework → GitHub Issue #1 ❌
├── 0002-core-enhancements → GitHub Issue #2 ❌
└── ...
```

### Why This Matters

**Specs** (`.specweave/docs/internal/specs/`):
- ✅ Permanent documentation
- ✅ Source of truth for entire feature
- ✅ Track progress across multiple increments
- ✅ Persist forever
- ✅ Should sync to external tools

**Increments** (`.specweave/increments/`):
- ❌ Temporary work units
- ❌ Can be deleted after completion
- ❌ Implementation details only
- ❌ Internal tracking only
- ❌ Should NOT sync to external tools

### The Mapping

```
SPEC-001 (Core Framework Architecture)
├── Increment 0001 → Implements US-001, US-002
├── Increment 0002 → Implements US-003, US-004
└── Increment 0004 → Implements US-005, US-006

GitHub Project #5 "[SPEC-001] Core Framework"
├── Issue #130 → US-001 (completed via increment 0001)
├── Issue #131 → US-002 (completed via increment 0001)
├── Issue #132 → US-003 (completed via increment 0002)
├── Issue #133 → US-004 (completed via increment 0002)
├── Issue #134 → US-005 (completed via increment 0004)
└── Issue #135 → US-006 (completed via increment 0004)
```

---

## What Still Needs Implementation (Phases 2-6)

### Phase 2: Spec Sync CLI Command

**Create**: `src/cli/commands/sync-spec-content.ts`

**What It Should Do**:
1. Parse spec.md (extract user stories, acceptance criteria)
2. Call provider-specific sync (GitHub, JIRA, ADO)
3. Create/update external project/epic/feature
4. Create/update issues (one per user story)
5. Handle bidirectional sync (external status → spec)

**Usage**:
```bash
node dist/cli/commands/sync-spec-content.js --spec .specweave/docs/internal/specs/spec-001-core-framework.md --provider github
```

### Phase 3: GitHub Spec Sync Implementation

**Create**: `plugins/specweave-github/lib/spec-sync.ts`

**What It Should Do**:
1. GitHub Projects API integration
2. Create GitHub Project for spec
3. Create GitHub Issues for user stories
4. Link issues to project
5. Sync status bidirectionally

**API Calls**:
- `gh api /repos/{owner}/{repo}/projects` - Create project
- `gh issue create` - Create issues for user stories
- `gh api /projects/{project_id}/columns/{column_id}/cards` - Link issues

### Phase 4: Add Spec Linking to Increments

**Modify**: PM agent to link increments to specs

**Frontmatter Addition**:
```yaml
---
increment: 0015
parent_spec: spec-003-authentication  # ← NEW: Link to parent spec
implements:
  - US-001  # Basic login
  - US-002  # Password validation
---
```

### Phase 5: Update Living Docs Sync

**Modify**: `plugins/specweave/lib/hooks/sync-living-docs.ts`

**Add**:
1. Detect parent spec from increment
2. Trigger spec sync after living docs copy
3. Update GitHub Project progress

**Flow**:
```bash
Task completes → Living docs sync
→ Copy increment spec to living docs ✅
→ Detect parent spec (NEW)
→ Trigger: sync-spec-content.js spec-003 (NEW)
→ GitHub Project updated (NEW)
```

### Phase 6: Replicate for JIRA and ADO

**Create**:
- `plugins/specweave-jira/lib/spec-sync.ts`
- `plugins/specweave-ado/lib/spec-sync.ts`

**Same pattern as GitHub but different APIs**

---

## Current State

### What Works Now ✅

1. **Living Docs Sync** ✅
   - Increment specs auto-copy to `.specweave/docs/internal/specs/spec-{4-digit-id}.md`
   - Works perfectly

2. **Increment-Level Sync Disabled** ✅
   - Increments no longer create GitHub issues
   - Correct architectural behavior

### What Doesn't Work Yet ❌

1. **Spec-Level Sync** ❌
   - Specs don't create GitHub Projects
   - User stories don't create GitHub Issues
   - No bidirectional sync with external tools

2. **Increment→Spec Linking** ❌
   - Increments don't reference parent specs
   - Can't track which increment implemented which user story

3. **Progress Tracking** ❌
   - No way to see overall feature progress
   - External tools not updated with completion status

---

## How to Use SpecWeave Right Now

### Option 1: Internal Only (Works Today)

```bash
# Create specs manually
vim .specweave/docs/internal/specs/spec-001-core-framework.md

# Create increments
/specweave:increment "implement US-001 and US-002"

# Complete tasks
/specweave:do

# Living docs auto-sync ✅
# (increment spec copied to living docs automatically)
```

### Option 2: Manual External Sync (Workaround)

```bash
# Create GitHub Project manually
gh project create --title "[SPEC-001] Core Framework" --body "See spec-001"

# Create issues manually for each user story
gh issue create --title "US-001: NPM Installation" --body "..."
gh issue create --title "US-002: Plugin System" --body "..."

# Link to project manually
gh project item-add {project-id} --content-id {issue-id}
```

### Option 3: Wait for Phase 2-6 (Automated)

```bash
# Once implemented, this will work:
/specweave-github:sync-spec spec-001

# Output:
# ✅ Created GitHub Project #5
# ✅ Created 35 issues (one per user story)
# ✅ Linked all issues to project
```

---

## Files Modified/Created in Phase 1

### Modified (1 file)
1. `plugins/specweave/hooks/post-increment-planning.sh` (+27 lines, -42 lines)

### Created (2 files)
1. `.specweave/increments/0025-per-project-resource-config/reports/CORRECT-SYNC-ARCHITECTURE.md` (design doc)
2. `.specweave/increments/0025-per-project-resource-config/reports/ARCHITECTURE-FIX-SUMMARY.md` (this file)

---

## Next Steps

**Immediate**:
1. ✅ Phase 1 complete (increment sync disabled)
2. ✅ Architecture documented
3. ✅ User informed of correct approach

**Future Work** (Phases 2-6, ~14 hours):
1. Implement spec sync CLI command
2. Implement GitHub spec sync
3. Add increment→spec linking
4. Update living docs sync to trigger spec sync
5. Replicate for JIRA and ADO
6. Test end-to-end

**Timeline**: Can be implemented autonomously over 14 hours

---

## User Impact

**Before Phase 1**:
- ❌ Increments creating GitHub issues (wrong!)
- ❌ No spec-level tracking
- ❌ Architectural confusion

**After Phase 1**:
- ✅ Increments correctly NOT creating issues
- ✅ Architecture clarified and documented
- ⏳ Spec-level sync to be implemented

**After Phases 2-6** (future):
- ✅ Specs create GitHub Projects
- ✅ User stories create GitHub Issues
- ✅ Bidirectional sync with external tools
- ✅ Complete traceability

---

## Conclusion

**Phase 1 is COMPLETE** ✅

The architectural mistake has been corrected - increments no longer create GitHub issues. The system now correctly understands that:

- **Specs** = Permanent, external tracking
- **Increments** = Temporary, internal tracking

Phases 2-6 will implement the correct spec-level sync architecture. For now, users can:
1. Use SpecWeave for internal tracking (works perfectly)
2. Manually sync to external tools (workaround)
3. Wait for automated spec sync (future)

**The foundation is now correct. The implementation can be built on top.**
