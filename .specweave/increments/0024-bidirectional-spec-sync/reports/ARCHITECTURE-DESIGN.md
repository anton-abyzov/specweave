# GitHub Sync Architecture Fix

**Date**: 2025-11-12
**Increment**: 0024-bidirectional-spec-sync
**Status**: Design Complete - Ready for Implementation

---

## Problem Statement

### What's Wrong Now

**Current (INCORRECT) Architecture**:
```
GitHub Issue #1 → .specweave/increments/0001-instant-polls-voting/spec.md (TEMPORARY)
```

**What SHOULD Be**:
```
GitHub Issue #1 → .specweave/docs/internal/specs/spec-001-instant-polls-voting.md (PERMANENT)
```

**Why This Matters**:

1. **Increments are TEMPORARY** - They can be deleted after completion
2. **Specs are PERMANENT** - They're the source of truth for entire feature areas
3. **Increments are FOCUSED** - Just 3-5 user stories for one iteration
4. **Specs are COMPREHENSIVE** - ALL 10-50 user stories across multiple increments

**Visual Example** (see user screenshots):

Image #1: GitHub Issues page shows "🚀 Increment 0001: Instant Polls & Voting #1"
Image #2: Issue details show:
- Tasks (35 total) - ❌ WRONG! These are increment tasks, not ALL user stories
- Links to `.specweave/increments/0001-instant-polls-voting/` - ❌ WRONG! Temporary location
- Links to `.specweave/docs/internal/specs/instant-polls-voting.md` - ✅ RIGHT! But not synced

**The Core Problem**:
- GitHub issue created for increment (temporary context)
- But actual permanent knowledge lives in spec (permanent context)
- No automatic sync between spec and GitHub
- When increment is deleted, GitHub issue reference breaks

---

## Architecture Comparison

### Current (WRONG) Flow

```
1. User runs: /specweave:increment "Instant Polls & Voting"
   ↓
2. PM agent creates:
   - .specweave/increments/0001-instant-polls-voting/spec.md
   - .specweave/increments/0001-instant-polls-voting/plan.md
   - .specweave/increments/0001-instant-polls-voting/tasks.md
   ↓
3. post-increment-planning.sh hook fires
   ↓
4. Hook creates GitHub issue for INCREMENT ❌
   - Title: "[INC-0001] Instant Polls & Voting"
   - Body: 35 increment tasks
   - Links to: .specweave/increments/0001-*/spec.md
   ↓
5. Metadata stored in increment folder ❌
   - .specweave/increments/0001-*/metadata.json
   ↓
6. Task completion updates INCREMENT issue ❌
   - Hook syncs to wrong location
   ↓
7. Result:
   - ❌ Increment is temporary (can be deleted)
   - ❌ GitHub issue references temporary location
   - ❌ Living docs spec NOT synced to GitHub
   - ❌ Permanent source of truth ignored
```

### Correct (NEW) Flow

```
1. User runs: /specweave:increment "Instant Polls & Voting"
   ↓
2. PM agent creates:
   A. PERMANENT LIVING DOCS SPEC ✅
      - .specweave/docs/internal/specs/spec-001-instant-polls-voting.md
      - Contains ALL 35 user stories (comprehensive, feature-level)
      - Maps to 3-4 increments (0001, 0002, 0003, 0004)

   B. TEMPORARY INCREMENT SPEC ✅
      - .specweave/increments/0001-instant-polls-voting/spec.md
      - References living docs: "See: SPEC-001-instant-polls-voting"
      - Contains ONLY US-001 to US-005 (focused, this iteration)
   ↓
3. PM agent syncs spec to GitHub ✅
   - Calls: /specweave-github:sync-spec spec-001
   - Creates GitHub issue with ALL 35 user stories
   - Title: "[SPEC-001] Instant Polls & Voting"
   - Body: ALL user stories (not just increment tasks)
   - Links to: .specweave/docs/internal/specs/spec-001-*.md
   ↓
4. Metadata stored in LIVING DOCS folder ✅
   - .specweave/docs/internal/specs/.metadata/spec-001.json
   - Contains: { "github": { "issueNumber": 1, "url": "..." } }
   ↓
5. Task completion updates SPEC ✅
   - post-task-completion hook finds which spec increment belongs to
   - Updates spec user stories based on completed tasks
   - Syncs spec to GitHub (not increment)
   ↓
6. Result:
   - ✅ Spec is permanent (never deleted)
   - ✅ GitHub issue references permanent location
   - ✅ ALL user stories visible in GitHub
   - ✅ Progress tracked across ALL increments (0001, 0002, 0003, 0004)
   - ✅ Permanent source of truth synced automatically
```

---

## What Already Exists (Infrastructure)

**Good news**: Most infrastructure is already in place! (v0.17.0+)

### ✅ Already Implemented

1. **Spec Sync Command** (`/specweave-github:sync-spec`)
   - File: `plugins/specweave-github/commands/specweave-github-sync-spec.md`
   - Purpose: Sync spec to GitHub Project (documented)
   - Status: ✅ Documentation complete, ready to use

2. **Spec Content Sync CLI** (`sync-spec-content.ts`)
   - File: `src/cli/commands/sync-spec-content.ts`
   - Purpose: Sync spec content to GitHub/JIRA/ADO
   - Status: ✅ Fully implemented, working

3. **GitHub Spec Content Sync Library** (`github-spec-content-sync.ts`)
   - File: `plugins/specweave-github/lib/github-spec-content-sync.ts`
   - Purpose: Create/update GitHub issues from specs
   - Status: ✅ Fully implemented
   - Methods:
     - `syncSpecContentToGitHub()` - Main sync function
     - `createGitHubIssue()` - Create new issue
     - `updateGitHubIssue()` - Update existing issue
     - `detectContentChanges()` - Compare spec vs GitHub
     - `updateSpecWithExternalLink()` - Update spec frontmatter

4. **GitHub Client** (`github-client-v2.ts`)
   - File: `plugins/specweave-github/lib/github-client-v2.ts`
   - Purpose: GitHub CLI wrapper
   - Status: ✅ Fully implemented
   - Methods:
     - `createEpicIssue()` - Create issue
     - `getIssue()` - Fetch issue
     - `updateIssueBody()` - Update issue
     - `addComment()` - Add progress comments

5. **Hook Infrastructure** (`post-task-completion.sh`)
   - File: `plugins/specweave-github/hooks/post-task-completion.sh`
   - Purpose: Sync changes after task completion
   - Status: ⚠️  Partially implemented
   - Comments: Already has CORRECT ARCHITECTURE comment (lines 6-9)
   - Logic: Tries to detect spec from increment (lines 98-127)
   - Sync: Calls sync-spec-content CLI (lines 130-171)
   - Issue: Still incomplete implementation

### ❌ What Needs to Change

1. **PM Agent Workflow**
   - File: `plugins/specweave/agents/pm/AGENT.md`
   - Change: Add step to create living docs spec + sync to GitHub
   - Current: Only creates increment spec (temporary)
   - New: Create living docs spec (permanent) + sync to GitHub

2. **Increment Planning Hook** (`post-increment-planning.sh`)
   - File: `plugins/specweave/hooks/post-increment-planning.sh`
   - Change: REMOVE GitHub issue creation for increments
   - Current: Lines 275-477 create increment issues (WRONG!)
   - New: Do nothing (PM agent handles spec sync)

3. **Task Completion Hook** (`post-task-completion.sh`)
   - File: `plugins/specweave-github/hooks/post-task-completion.sh`
   - Change: Complete the spec sync implementation
   - Current: Incomplete (tries to detect spec but not robust)
   - New: Robust spec detection + sync to GitHub

4. **Increment-Based Commands** (DEPRECATE)
   - `/specweave-github:create-issue` - Creates increment issue (wrong!)
   - `/specweave-github:sync` - Syncs increment (wrong!)
   - Action: Mark as deprecated, show migration message

5. **Metadata Storage Location**
   - Current: `.specweave/increments/####/metadata.json` (temporary)
   - New: `.specweave/docs/internal/specs/.metadata/spec-###.json` (permanent)

---

## Implementation Plan

### Phase 1: Update PM Agent Workflow

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Changes**:

```markdown
### Step 7: Create Living Docs Spec (NEW!)

After creating increment spec, also create permanent living docs spec:

1. **Detect if spec already exists**:
   - Check: `.specweave/docs/internal/specs/spec-{id}-{slug}.md`
   - If exists: Update with new user stories from this increment
   - If not exists: Create new spec

2. **Create/Update living docs spec**:
   - Location: `.specweave/docs/internal/specs/spec-{id}-{slug}.md`
   - Content: ALL user stories for entire feature area
   - Frontmatter:
     ```yaml
     ---
     id: spec-001
     title: Instant Polls & Voting
     status: in-progress
     priority: P0
     increments: ["0001-instant-polls-voting", "0002-polls-enhancements"]
     externalLinks:
       github:
         issueNumber: null  # Will be filled by sync
         issueUrl: null
         syncedAt: null
     ---
     ```

3. **Sync to GitHub**:
   - Call: `/specweave-github:sync-spec spec-001`
   - This creates GitHub issue with ALL user stories
   - Updates spec frontmatter with GitHub issue number

4. **Link increment to spec**:
   - Update increment spec.md:
     ```markdown
     **Implements**: SPEC-001-instant-polls-voting (US-001 to US-005 only)
     **Complete Specification**: See ../../docs/internal/specs/spec-001-instant-polls-voting.md
     ```
```

**Implementation**:
- Add new step between "Create plan.md" and "Create tasks.md"
- Call `sync-spec-content` CLI after creating spec
- Update increment spec to reference living docs spec

### Phase 2: Remove Increment Issue Creation

**File**: `plugins/specweave/hooks/post-increment-planning.sh`

**Changes**:

```bash
# ============================================================================
# GITHUB ISSUE CREATION (REMOVED - NOW HANDLED BY PM AGENT)
# ============================================================================

# OLD CODE (LINES 275-477) - DELETE THIS ENTIRE SECTION
# create_github_issue() { ... }

# NEW CODE:
# GitHub issue creation is now handled by PM agent workflow
# The PM agent creates specs and syncs to GitHub automatically
# This hook no longer needs to create issues

log_debug "GitHub issue creation handled by PM agent (spec-based, not increment-based)"
```

**Implementation**:
- Delete lines 275-477 entirely
- Add comment explaining new architecture
- Test that post-increment-planning still works without this

### Phase 3: Complete Task Completion Hook

**File**: `plugins/specweave-github/hooks/post-task-completion.sh`

**Current (Incomplete)**:
```bash
# Lines 98-171: Tries to detect spec but incomplete
```

**New (Complete)**:
```bash
# ============================================================================
# DETECT CURRENT SPEC (ROBUST)
# ============================================================================

detect_spec_from_increment() {
  local increment_id="$1"
  local spec_file=".specweave/increments/$increment_id/spec.md"

  if [ ! -f "$spec_file" ]; then
    return 1
  fi

  # Strategy 1: Look for "Implements: SPEC-XXX" pattern
  local spec_ref=$(grep -E "^(\*\*Implements\*\*:|Implements:|See:).*SPEC-[0-9]+" "$spec_file" | head -1)

  if [ -n "$spec_ref" ]; then
    echo "$spec_ref" | grep -oE "SPEC-[0-9]+" | tr 'A-Z' 'a-z' | head -1
    return 0
  fi

  # Strategy 2: Look in frontmatter
  local spec_id=$(awk '/^---$/,/^---$/ {if (/^spec_id:/) {print $2; exit}}' "$spec_file")

  if [ -n "$spec_id" ]; then
    echo "$spec_id"
    return 0
  fi

  # Strategy 3: Infer from increment name
  # e.g., "0001-instant-polls-voting" → "spec-001-instant-polls-voting"
  local inc_number=$(echo "$increment_id" | grep -o '^[0-9]*')
  local inc_slug=$(echo "$increment_id" | sed 's/^[0-9]*-//')

  # Check if spec exists with this naming
  local spec_path=$(find .specweave/docs/internal/specs -name "spec-${inc_number}*.md" -o -name "spec-*${inc_slug}*.md" 2>/dev/null | head -1)

  if [ -n "$spec_path" ]; then
    basename "$spec_path" .md
    return 0
  fi

  return 1
}

# ============================================================================
# SYNC SPEC TO GITHUB
# ============================================================================

# Detect current increment
CURRENT_INCREMENT=$(ls -t .specweave/increments/ 2>/dev/null | grep -v "_backlog" | head -1)

if [ -z "$CURRENT_INCREMENT" ]; then
  log_debug "No active increment, skipping spec sync"
  exit 0
fi

# Detect which spec this increment belongs to
SPEC_ID=$(detect_spec_from_increment "$CURRENT_INCREMENT")

if [ -z "$SPEC_ID" ]; then
  log_warning "Could not detect spec for increment $CURRENT_INCREMENT"
  log_warning "Make sure increment spec.md has 'Implements: SPEC-XXX' reference"
  exit 0
fi

# Find spec file
SPEC_FILE=$(find .specweave/docs/internal/specs -name "${SPEC_ID}*.md" -o -name "${SPEC_ID}.md" 2>/dev/null | head -1)

if [ -z "$SPEC_FILE" ]; then
  log_error "Spec file not found for $SPEC_ID"
  exit 1
fi

log_info "🔄 Syncing spec $SPEC_ID to GitHub..."

# Sync spec to GitHub
node "$PROJECT_ROOT/dist/src/cli/commands/sync-spec-content.js" \
  --spec "$SPEC_FILE" \
  --provider github \
  2>&1 | tee -a "$DEBUG_LOG"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  log_success "✅ Spec synced to GitHub"
else
  log_warning "⚠️  Spec sync failed (non-blocking)"
fi
```

**Implementation**:
- Replace lines 98-171 with robust detection logic
- Add three fallback strategies for spec detection
- Improve logging and error handling

### Phase 4: Deprecate Increment Commands

**Files**:
- `plugins/specweave-github/commands/specweave-github-create-issue.md`
- `plugins/specweave-github/commands/specweave-github-sync.md`

**Changes**:

Add deprecation warning at top of each command:

```markdown
---
name: specweave-github:create-issue
description: ⚠️  DEPRECATED: Use /specweave-github:sync-spec instead. This command creates issues for increments (temporary), but you should sync specs (permanent).
---

# ⚠️  DEPRECATED COMMAND

**This command is deprecated as of v0.17.0**

**Why?**
- Increments are TEMPORARY (can be deleted after completion)
- Specs are PERMANENT (source of truth for entire feature area)
- GitHub issues should sync to specs, not increments

**Migration**:
```bash
# OLD (deprecated):
/specweave-github:create-issue 0001

# NEW (correct):
/specweave-github:sync-spec spec-001
```

**What This Command Does** (for backward compatibility):
[... rest of documentation ...]
```

**Implementation**:
- Add deprecation warning to both commands
- Keep commands functional for backward compatibility
- Show migration guidance in output
- Plan removal in v0.18.0 or v0.19.0

### Phase 5: Update Metadata Storage

**Current**:
```
.specweave/increments/0001-instant-polls-voting/metadata.json
```

**New**:
```
.specweave/docs/internal/specs/.metadata/spec-001-instant-polls-voting.json
```

**Changes to `github-spec-content-sync.ts`**:

```typescript
// OLD:
await updateSpecWithExternalLink(
  specPath,
  'github',
  issue.number.toString(),
  issue.html_url
);

// NEW:
await updateSpecWithExternalLink(
  specPath,
  'github',
  issue.number.toString(),
  issue.html_url,
  { useMetadataFolder: true } // NEW option
);
```

**Implementation in `src/core/spec-content-sync.ts`**:

```typescript
export async function updateSpecWithExternalLink(
  specPath: string,
  provider: 'github' | 'jira' | 'ado',
  externalId: string,
  externalUrl: string,
  options: { useMetadataFolder?: boolean } = {}
): Promise<void> {
  const { useMetadataFolder = true } = options;

  if (useMetadataFolder) {
    // NEW: Store in .metadata/ folder
    const specDir = path.dirname(specPath);
    const metadataDir = path.join(specDir, '.metadata');
    const specBasename = path.basename(specPath, '.md');
    const metadataPath = path.join(metadataDir, `${specBasename}.json`);

    await fs.mkdir(metadataDir, { recursive: true });

    const metadata = {
      specId: specBasename,
      externalLinks: {
        [provider]: {
          id: externalId,
          url: externalUrl,
          syncedAt: new Date().toISOString(),
        },
      },
    };

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  } else {
    // OLD: Update spec frontmatter (deprecated)
    // ...
  }
}
```

**Benefits**:
- Metadata separate from spec content (cleaner)
- Easier to gitignore metadata (don't commit GitHub issue numbers)
- Metadata survives spec file moves/renames
- Standard location across all specs

### Phase 6: Update Documentation

**Files to Update**:

1. `CLAUDE.md` - Update "GitHub Sync Architecture" section
2. `README.md` - Update GitHub integration examples
3. `.specweave/docs/internal/architecture/adr/` - Create ADR for this change
4. `plugins/specweave-github/README.md` - Update plugin documentation

**ADR Template**:

```markdown
# ADR-0XX: Living Docs Specs as GitHub Sync Source

## Status: Accepted

## Context

Previously, GitHub issues were created for increments (temporary). This was architecturally wrong because:
- Increments are temporary (can be deleted)
- Specs are permanent (source of truth)
- GitHub issues should track entire feature areas, not individual iterations

## Decision

Sync living docs specs (`.specweave/docs/internal/specs/spec-*.md`) to GitHub issues, not increments.

## Consequences

**Positive**:
- ✅ Permanent GitHub links (never break)
- ✅ Feature-level tracking (not iteration-level)
- ✅ ALL user stories visible in GitHub
- ✅ Progress tracked across multiple increments

**Negative**:
- ⚠️  Migration required for existing projects
- ⚠️  Existing increment issues need to be closed/migrated

## Implementation

See `.specweave/increments/0024-bidirectional-spec-sync/reports/ARCHITECTURE-DESIGN.md`
```

---

## Migration Strategy

### For Existing Projects

**Problem**: Existing projects have GitHub issues for increments

**Solution**: Migration script

**File**: `scripts/migrate-increment-issues-to-specs.ts`

**Workflow**:

```bash
# 1. Detect all increments with GitHub issues
# 2. For each increment:
#    a. Find which spec it belongs to (or create spec if doesn't exist)
#    b. Migrate user stories from increment issue to spec issue
#    c. Close old increment issue with comment: "Migrated to spec-XXX #YYY"
#    d. Update spec with GitHub issue number
# 3. Clean up increment metadata.json files
```

**Example**:

```
Before:
- Increment 0001 → GitHub Issue #1 (increment-based)
- Increment 0002 → GitHub Issue #5 (increment-based)
- Increment 0003 → GitHub Issue #10 (increment-based)

After:
- SPEC-001 → GitHub Issue #15 (spec-based, all user stories from 0001, 0002, 0003)
- GitHub Issues #1, #5, #10 closed with migration comment
```

---

## Testing Plan

### Test 1: End-to-End New Spec Creation

```bash
# 1. Create new increment
/specweave:increment "User Authentication System"

# Expected:
# - Living docs spec created: .specweave/docs/internal/specs/spec-002-user-auth.md
# - GitHub issue created: #20 with ALL user stories
# - Increment references spec: "See: SPEC-002"
# - Metadata stored: .specweave/docs/internal/specs/.metadata/spec-002.json
```

### Test 2: Task Completion Updates Spec

```bash
# 1. Complete a task in increment
# 2. Hook should detect spec from increment
# 3. Hook should update spec user story status
# 4. Hook should sync spec to GitHub

# Expected:
# - Spec updated with completed user story
# - GitHub issue updated with progress
# - NO new increment issue created
```

### Test 3: Multiple Increments → Same Spec

```bash
# 1. Create increment 0001 for spec-003
# 2. Complete some tasks
# 3. Create increment 0002 for same spec-003
# 4. Complete more tasks

# Expected:
# - Both increments reference same spec-003
# - Both increments update same GitHub issue #25
# - Progress tracked across both increments
# - No duplicate GitHub issues
```

### Test 4: Migration Script

```bash
# 1. Run migration script on project with increment issues
# 2. Check that specs created correctly
# 3. Check that GitHub issues migrated
# 4. Check that old issues closed with migration comment
```

---

## Summary

**What's Changing**:
- ❌ Increment → GitHub Issue (wrong!)
- ✅ Spec → GitHub Issue (correct!)

**Why It Matters**:
- Increments are temporary, specs are permanent
- GitHub issues should track entire features, not iterations
- Permanent links, better traceability, proper architecture

**Infrastructure**:
- ✅ Most code already exists! (v0.17.0+)
- ❌ Just need to wire it up correctly

**Implementation**:
1. Update PM agent to create specs + sync to GitHub
2. Remove increment issue creation from hooks
3. Complete task completion hook spec sync
4. Deprecate increment commands
5. Update metadata storage location
6. Create migration script

**Timeline**:
- Phase 1-3: Core implementation (4-6 hours)
- Phase 4: Deprecation warnings (1 hour)
- Phase 5: Metadata storage (2 hours)
- Phase 6: Documentation (2 hours)
- Migration script: (3 hours)
- Testing: (2 hours)

**Total Estimate**: 14-16 hours of focused work

---

## Next Steps

1. ✅ **Design Complete** - This document
2. ⏳ **Phase 1**: Update PM agent workflow
3. ⏳ **Phase 2**: Remove increment issue creation
4. ⏳ **Phase 3**: Complete task completion hook
5. ⏳ **Phase 4**: Deprecate increment commands
6. ⏳ **Phase 5**: Update metadata storage
7. ⏳ **Phase 6**: Update documentation
8. ⏳ **Migration**: Create migration script
9. ⏳ **Testing**: End-to-end validation

---

**Status**: Ready for implementation!
**Reviewed By**: Claude (AI) + Anton (Human)
**Approved**: 2025-11-12
