# Correct Sync Architecture: Specs Not Increments

**Date**: 2025-11-11
**Status**: Architecture Redesign Required
**Priority**: CRITICAL - Fixes Fundamental Misunderstanding

---

## The Critical Mistake

I just implemented **increment-level GitHub sync**, but this is **ARCHITECTURALLY WRONG**!

**What I did (WRONG)**:
```
Increment 0001 → GitHub Issue #1
Increment 0002 → GitHub Issue #2
Increment 0020 → GitHub Issue #20
```

**What SHOULD happen (CORRECT)**:
```
SPEC-001 (Core Framework) → GitHub Project/Issue
  ├── Increment 0001 (implements US-001, US-002)
  ├── Increment 0002 (implements US-003, US-004)
  └── Increment 0004 (implements US-005, US-006)

SPEC-002 (Intelligent Capabilities) → GitHub Project/Issue
  ├── Increment 0003 (implements US-001, US-002)
  ├── Increment 0007 (implements US-003)
  └── Increment 0009 (implements US-005)
```

---

## Why This Matters

### The User's Insight

External tools (GitHub, JIRA, ADO) should sync with **PERMANENT living docs**, not **temporary increments**:

**Increments**:
- ❌ Temporary implementation units
- ❌ Can be deleted after completion
- ❌ Internal tracking only
- ❌ Ephemeral work breakdown

**Specs** (`.specweave/docs/internal/specs/`):
- ✅ Permanent feature documentation
- ✅ Source of truth for external tools
- ✅ Track entire feature lifecycle
- ✅ Persist forever

### The Architectural Principle

```
PERMANENT (External Tracking)
└── Specs (.specweave/docs/internal/specs/)
    ├── GitHub Projects/Issues
    ├── JIRA Epics
    └── Azure DevOps Features

TEMPORARY (Internal Tracking)
└── Increments (.specweave/increments/)
    └── tasks.md, plan.md
```

---

## Correct Architecture

### Level 1: Spec-Level Sync (External)

**What**: Sync `.specweave/docs/internal/specs/spec-NNN-name.md` to external tools

**How**:
1. Create GitHub Project (or Issue) for SPEC
2. Sync user stories as GitHub Issues
3. Track acceptance criteria as checklist items
4. Link all issues to parent project

**When**:
- When spec is created (PM agent)
- When spec is updated (living docs sync)
- Manual: `/specweave-github:sync-spec spec-001`

**Example**:
```
File: .specweave/docs/internal/specs/spec-001-core-framework-architecture.md

Syncs to:
→ GitHub Project #5: "[SPEC-001] Core Framework & Architecture"
  → Issue #130: US-001: NPM Installation
  → Issue #131: US-002: Plugin System
  → Issue #132: US-003: Context Optimization
  ... (35 issues total, one per user story)
```

### Level 2: Increment-Level (Internal Only)

**What**: Increments are INTERNAL work units, NOT synced externally

**How**:
- Increment spec references parent spec (frontmatter)
- Tasks map to user stories from parent spec
- Progress tracked internally

**Example**:
```
File: .specweave/increments/0001-core-framework/spec.md

Frontmatter:
---
increment: 0001
parent_spec: spec-001-core-framework-architecture  # ← Links to spec
implements: [US-001, US-002]                        # ← Which user stories
status: completed
---
```

### Sync Flow

```
1. PM Agent Creates Spec:
   User: "I want authentication"
   PM: Creates .specweave/docs/internal/specs/spec-003-authentication.md
   Sync: Creates GitHub Project #10 "[SPEC-003] Authentication"
         Creates 15 issues (one per user story)

2. User Creates Increment:
   User: "/specweave:increment 0015-basic-login"
   PM: Creates increment referencing spec-003
       - parent_spec: spec-003-authentication
       - implements: [US-001, US-002, US-003]
   Sync: NO EXTERNAL SYNC (internal only)

3. User Completes Tasks:
   User: Completes tasks in increment 0015
   Hook: Copies spec to living docs (auto-sync)
   Hook: Updates GitHub Project progress
         - Issue #200 (US-001) → Marked completed
         - Issue #201 (US-002) → Marked completed
         - Issue #202 (US-003) → Marked completed

4. Multiple Increments:
   User: "/specweave:increment 0018-oauth"
   PM: Creates another increment for same spec
       - parent_spec: spec-003-authentication
       - implements: [US-004, US-005]
   Sync: Updates SAME GitHub Project #10
         (not creating new project/issues)
```

---

## What Needs to Change

### 1. Remove Increment-Level GitHub Sync ❌

**Files to Modify**:
- `plugins/specweave/hooks/post-increment-planning.sh` - Remove GitHub issue creation
- `plugins/specweave/hooks/hooks.json` - Keep hook but change behavior

**Why**: Increments should NOT create GitHub issues

### 2. Implement Spec-Level Sync ✅

**Files to Create/Modify**:
- `dist/cli/commands/sync-spec-content.js` - Implement spec→ external tool sync
- `plugins/specweave-github/lib/spec-sync.ts` - GitHub Project API integration
- `plugins/specweave-jira/lib/spec-sync.ts` - JIRA Epic API integration
- `plugins/specweave-ado/lib/spec-sync.ts` - ADO Feature API integration

**What It Should Do**:
1. Parse spec.md (extract user stories, acceptance criteria)
2. Create/update GitHub Project
3. Create/update GitHub Issues (one per user story)
4. Link issues to project
5. Sync bidirectionally (GitHub status → spec status)

### 3. Update Increment→Spec Linking ✅

**Files to Modify**:
- PM agent templates - Add `parent_spec` field
- Increment spec frontmatter - Link to parent spec

**Example**:
```yaml
---
increment: 0015
parent_spec: spec-003-authentication
implements:
  - US-001  # Basic login
  - US-002  # Password validation
  - US-003  # Session management
---
```

### 4. Update Living Docs Sync ✅

**Current**: Copies increment spec to living docs (correct!)
**Add**: Trigger spec sync after copy

**Flow**:
```bash
1. Task completes → post-task-completion hook
2. Copy increment spec → living docs (DONE ✅)
3. Detect parent spec from increment frontmatter (NEW)
4. Trigger spec sync: sync-spec-content.js spec-003 (NEW)
5. GitHub Project updated (NEW)
```

---

## Implementation Plan

### Phase 1: Disable Increment-Level Sync (1 hour)

**Tasks**:
1. Comment out GitHub issue creation in `post-increment-planning.sh`
2. Add TODO comment: "Spec-level sync to be implemented"
3. Update hook to log that increment-level sync is disabled
4. Test that increments still create without GitHub issues

**Files**:
- `plugins/specweave/hooks/post-increment-planning.sh` (modify 30 lines)

### Phase 2: Implement Spec Sync CLI (3 hours)

**Tasks**:
1. Create `src/cli/commands/sync-spec-content.ts`
2. Parse spec.md (user stories, acceptance criteria)
3. Call provider-specific sync (GitHub, JIRA, ADO)
4. Handle bidirectional sync
5. Update spec frontmatter with external links

**Files**:
- `src/cli/commands/sync-spec-content.ts` (new, ~300 lines)
- Build: `npm run build`

### Phase 3: Implement GitHub Spec Sync (4 hours)

**Tasks**:
1. Create `plugins/specweave-github/lib/spec-sync.ts`
2. GitHub Projects API integration
3. Create/update project
4. Create/update issues (one per user story)
5. Link issues to project
6. Handle status sync (GitHub → Spec)

**Files**:
- `plugins/specweave-github/lib/spec-sync.ts` (new, ~400 lines)

### Phase 4: Add Spec Linking to Increments (2 hours)

**Tasks**:
1. Update PM agent to detect parent spec
2. Add `parent_spec` field to increment frontmatter
3. Map increment tasks to spec user stories
4. Test increment→spec linking

**Files**:
- `plugins/specweave/agents/pm/AGENT.md` (modify prompt)
- Increment template (modify frontmatter)

### Phase 5: Update Living Docs Sync (1 hour)

**Tasks**:
1. Modify `sync-living-docs.ts` to detect parent spec
2. Trigger spec sync after living docs copy
3. Test end-to-end flow

**Files**:
- `plugins/specweave/lib/hooks/sync-living-docs.ts` (modify 20 lines)

### Phase 6: Replicate for JIRA and ADO (3 hours)

**Tasks**:
1. Copy GitHub implementation to JIRA plugin
2. Copy GitHub implementation to ADO plugin
3. Test all three providers

**Files**:
- `plugins/specweave-jira/lib/spec-sync.ts` (new)
- `plugins/specweave-ado/lib/spec-sync.ts` (new)

---

## Total Estimated Time

**14 hours autonomous work** to fully implement correct architecture

---

## Success Criteria

- ✅ Increments do NOT create GitHub issues
- ✅ Specs DO create GitHub Projects
- ✅ User stories sync as GitHub Issues
- ✅ Bidirectional sync works (GitHub status → Spec)
- ✅ Multiple increments update SAME GitHub Project
- ✅ Living docs sync triggers spec sync
- ✅ Same pattern for GitHub, JIRA, ADO

---

## Next Steps

1. Get user confirmation this is correct architecture
2. Implement Phase 1 (disable increment sync) immediately
3. Proceed with Phases 2-6 autonomously
4. Test end-to-end with existing specs

**Ready to implement!**
