# CRITICAL: Remove Metadata Header from GitHub Issue Bodies

**Status**: ACTIVE BUG 🔴
**Severity**: P0 (Critical - UX violation + Redundancy)
**Discovered**: 2025-12-10
**Affects**: ALL GitHub issue creation/update scripts

---

## Problem Statement

**GitHub issues contain REDUNDANT metadata header in body:**

```
**Feature**: FS-135
**Status**: Not_started
**Priority**: P1
**Project**: specweave

## Progress
Acceptance Criteria: 0/0 (0%)
...
```

**Why This Is Wrong**:
1. ❌ **Redundant**: GitHub has NATIVE fields for these (labels, milestones)
2. ❌ **Confusing**: Two sources of truth (body text vs. GitHub UI)
3. ❌ **Unmaintained**: Body text gets stale when labels change
4. ❌ **Visual Clutter**: Wastes precious screen space
5. ❌ **Not Semantic**: Robots/APIs can't parse plain text reliably

**User explicitly requested**: "MUST exclude the section in the description at the top"

---

## Current Behavior (WRONG)

### What GitHub Issue Body Looks Like Now:

```markdown
**Feature**: FS-135              ← REDUNDANT (already in milestone)
**Status**: Not_started          ← REDUNDANT (already in labels)
**Priority**: P1                 ← REDUNDANT (already in labels)
**Project**: specweave           ← REDUNDANT (already in labels)

## Progress                       ← OK (this should stay)
Acceptance Criteria: 0/0 (0%)
Tasks: 0/6 (0%)
Overall: 0%

░░░░░░░░░░░░░░░░░░░░ 0%

## User Story                     ← GOOD START

**As a** developer integrating with JIRA
**I want** JIRA_DOMAIN to be read from config.json instead of .env
**So that** I can share JIRA configuration with my team via git

## Tasks                          ← GOOD (this is actual content)

- [ ] **T-002**: Add ConfigManager to JiraReconciler
...
```

### Where This Information SHOULD Be:

| Data | Current (WRONG) | Correct Location (GitHub Native) |
|------|-----------------|----------------------------------|
| Feature ID | `**Feature**: FS-135` in body | **Milestone**: "FS-135: Feature Name" |
| Status | `**Status**: Not_started` in body | **Label**: `status:not_started` |
| Priority | `**Priority**: P1` in body | **Label**: `p1` |
| Project | `**Project**: specweave` in body | **Label**: `project:specweave` |

**GitHub UI shows all of these already!** No need to repeat in body.

---

## Desired Behavior (CORRECT)

### Issue Body Should Start With:

```markdown
## Progress
Acceptance Criteria: 0/0 (0%)
Tasks: 0/6 (0%)
Overall: 0%

░░░░░░░░░░░░░░░░░░░░ 0%

## User Story

**As a** developer integrating with JIRA
**I want** JIRA_DOMAIN to be read from config.json instead of .env
**So that** I can share JIRA configuration with my team via git

## Acceptance Criteria

- [ ] **AC-US1-01**: System reads domain from config.json
- [ ] **AC-US1-02**: System validates config.json structure
...

## Tasks

- [ ] **T-002**: Add ConfigManager to JiraReconciler
- [ ] **T-005**: Refactor JiraMapper to accept domain via constructor
...
```

**Benefits**:
- ✅ No redundancy
- ✅ Body focuses on actual work (ACs, tasks, user story)
- ✅ Single source of truth (GitHub native fields)
- ✅ Cleaner UI (more content visible above fold)
- ✅ Easier to maintain (labels auto-sync, body stays stable)

---

## Root Cause

### Files Generating Metadata Header:

**Found 4 files** (via grep):
1. [plugins/specweave-github/lib/user-story-issue-builder.ts:401-408](plugins/specweave-github/lib/user-story-issue-builder.ts#L401-L408)
2. [plugins/specweave-github/lib/user-story-content-builder.ts](plugins/specweave-github/lib/user-story-content-builder.ts)
3. [plugins/specweave-github/lib/increment-issue-builder.ts](plugins/specweave-github/lib/increment-issue-builder.ts)
4. [plugins/specweave-github/lib/github-increment-sync-cli.ts](plugins/specweave-github/lib/github-increment-sync-cli.ts)

### Code Pattern (ALL 4 FILES):

```typescript
// ❌ WRONG - Lines 401-408 in user-story-issue-builder.ts
// Header with metadata
sections.push(`**Feature**: ${this.featureId}`);
sections.push(`**Status**: ${this.capitalize(data.frontmatter.status)}`);
sections.push(`**Priority**: ${data.frontmatter.priority || 'P2'}`);
// ✅ FIX: Only output Project if defined and not "default"
if (data.frontmatter.project && data.frontmatter.project !== 'default') {
  sections.push(`**Project**: ${data.frontmatter.project}`);
}
sections.push('');
```

**Why This Exists**:
- Historical artifact from when GitHub sync was first implemented
- Copied across all issue builders
- Never questioned until now

---

## Solution

### Phase 1: Remove Metadata Header (IMMEDIATE)

**File 1**: [plugins/specweave-github/lib/user-story-issue-builder.ts:400-412](plugins/specweave-github/lib/user-story-issue-builder.ts#L400-L412)

```typescript
// BEFORE (lines 400-412):
// Header with metadata
sections.push(`**Feature**: ${this.featureId}`);
sections.push(`**Status**: ${this.capitalize(data.frontmatter.status)}`);
sections.push(`**Priority**: ${data.frontmatter.priority || 'P2'}`);
// ✅ FIX: Only output Project if defined and not "default"
if (data.frontmatter.project && data.frontmatter.project !== 'default') {
  sections.push(`**Project**: ${data.frontmatter.project}`);
}
sections.push('');

// Progress section (NEW)
sections.push(IssueStateManager.formatProgressMarkdown(progress));
sections.push('');

// AFTER (REMOVE lines 400-408, keep only progress):
// ❌ REMOVED: Metadata header (Feature, Status, Priority, Project)
// ✅ KEEP: Progress section (actual content, not redundant)
sections.push(IssueStateManager.formatProgressMarkdown(progress));
sections.push('');
```

**File 2**: [plugins/specweave-github/lib/user-story-content-builder.ts](plugins/specweave-github/lib/user-story-content-builder.ts)

```typescript
// Search for similar pattern:
// body += `**Feature**: ...
// body += `**Status**: ...
// body += `**Priority**: ...
// body += `**Project**: ...

// REMOVE ALL metadata header lines
// KEEP progress section if present
```

**File 3**: [plugins/specweave-github/lib/increment-issue-builder.ts](plugins/specweave-github/lib/increment-issue-builder.ts)

```typescript
// Search for similar pattern
// REMOVE metadata header
// START body with Progress or User Story section
```

**File 4**: [plugins/specweave-github/lib/github-increment-sync-cli.ts](plugins/specweave-github/lib/github-increment-sync-cli.ts)

```typescript
// This is deprecated (brownfield-only)
// Still fix for consistency
// REMOVE metadata header
```

### Phase 2: Ensure Labels/Milestones Set Correctly (VALIDATE)

**CRITICAL**: Metadata must move to GitHub native fields!

```typescript
// ✅ ENSURE labels are set when creating issue:
const labels = [
  'user-story',
  'specweave',
  `status:${frontmatter.status}`,  // e.g., status:not_started
  frontmatter.priority.toLowerCase(),  // e.g., p1
  `project:${frontmatter.project}`  // e.g., project:specweave
];

await client.createIssue({
  title: `[${featureId}][${usId}] ${title}`,
  body: bodyWithoutMetadataHeader,  // ← No redundant metadata!
  labels: labels,  // ← Use GitHub labels!
  milestone: milestoneNumber  // ← Use GitHub milestone!
});
```

**File**: [plugins/specweave-github/lib/user-story-issue-builder.ts:572-615](plugins/specweave-github/lib/user-story-issue-builder.ts#L572-L615)

```typescript
/**
 * Build labels for the issue
 *
 * CRITICAL: Label names must match repository labels exactly!
 * Repository uses: status:complete, status:active, status:not_started
 */
private buildLabels(frontmatter: UserStoryFrontmatter): string[] {
  const labels: string[] = ['user-story', 'specweave'];

  // Add status label with proper mapping
  // Map living docs status values to GitHub repository label names
  if (frontmatter.status) {
    let statusLabel: string;

    // Map status values to correct GitHub labels
    switch (frontmatter.status) {
      case 'completed':
      case 'complete':
        statusLabel = 'status:complete'; // Repository uses "complete" not "completed"
        break;

      case 'active':
      case 'in-progress':
        statusLabel = 'status:active'; // Repository uses "active" not "in-progress"
        break;

      case 'planning':
      case 'not-started':
        statusLabel = 'status:not_started'; // Note: underscore, not dash!
        break;

      default:
        // Defensive: Use original value if unknown
        statusLabel = `status:${frontmatter.status}`;
    }

    labels.push(statusLabel);
  }

  // Add priority label
  if (frontmatter.priority) {
    labels.push(frontmatter.priority.toLowerCase());
  }

  // Add project label
  if (frontmatter.project && frontmatter.project !== 'default') {
    labels.push(`project:${frontmatter.project}`);
  }

  return labels;
}
```

**✅ GOOD NEWS**: This code ALREADY EXISTS and works correctly!
- Labels are set properly
- Milestone is set properly
- **We just need to REMOVE the redundant body text**

### Phase 3: Add Validation (PREVENT REGRESSION)

**Add Pre-Tool-Use Hook** (v0.34.0+):

```bash
# plugins/specweave/hooks/github-metadata-guard.sh

#!/usr/bin/env bash
# GitHub Metadata Guard - Prevents redundant metadata in issue bodies
# Blocks: **Feature**, **Status**, **Priority**, **Project** at start of body

# Check if operation involves GitHub issue body
if [[ "$TOOL_NAME" == "Write" ]] && [[ "$file_path" == *"github"* ]] && [[ "$file_path" == *".ts" ]]; then
  # Check if content contains metadata header pattern
  if echo "$content" | grep -qE '^\*\*Feature\*\*:|^\*\*Status\*\*:|^\*\*Priority\*\*:|^\*\*Project\*\*:'; then
    echo "❌ BLOCKED: GitHub issue body MUST NOT contain metadata header!"
    echo ""
    echo "FORBIDDEN PATTERN:"
    echo "  **Feature**: FS-XXX"
    echo "  **Status**: ..."
    echo "  **Priority**: ..."
    echo "  **Project**: ..."
    echo ""
    echo "WHY: This information belongs in GitHub NATIVE FIELDS:"
    echo "  - Feature → Milestone"
    echo "  - Status → Label (status:not_started)"
    echo "  - Priority → Label (p1, p2, p3)"
    echo "  - Project → Label (project:specweave)"
    echo ""
    echo "SOLUTION: Remove metadata header, start with ## Progress or ## User Story"
    echo ""
    echo "See: .specweave/docs/internal/troubleshooting/CRITICAL-remove-metadata-header-from-github-issues.md"
    exit 1
  fi
fi
```

**Add to hooks.json**:

```json
{
  "preToolUse": [
    {
      "name": "github-metadata-guard",
      "path": "plugins/specweave/hooks/github-metadata-guard.sh",
      "description": "Prevents redundant metadata header in GitHub issue bodies",
      "enabled": true,
      "version": "0.34.0"
    }
  ]
}
```

### Phase 4: Update Documentation (GUIDELINES)

**Add to CLAUDE.md**:

```markdown
### GitHub Issue Body Format (v0.34.0+)

**FORBIDDEN**: Metadata header in issue body

```
❌ WRONG:
**Feature**: FS-135
**Status**: Not_started
**Priority**: P1
**Project**: specweave

✅ CORRECT:
## Progress
Acceptance Criteria: 0/0 (0%)
...
```

**WHY**: GitHub has NATIVE fields for metadata (labels, milestones).
Body should contain ONLY actual work content (ACs, tasks, user story).

**Files**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts` (lines 400-408 REMOVED)
- `plugins/specweave-github/lib/user-story-content-builder.ts` (metadata header REMOVED)
- `plugins/specweave-github/lib/increment-issue-builder.ts` (metadata header REMOVED)

**Validation**: Pre-tool-use hook `github-metadata-guard.sh` blocks metadata header.
```

---

## Testing Strategy

### Test Case 1: New Issue Creation

```bash
# Given: User story with frontmatter
us_file=".specweave/docs/internal/specs/specweave/FS-135/us-001-jira-domain-configuration-migration.md"

# When: Create GitHub issue
node plugins/specweave-github/cli/sync-feature.js FS-135

# Then: Issue body should NOT start with metadata
gh issue view 830 --json body -q .body | head -n 5

# Expected: ## Progress (first line)
# NOT: **Feature**: FS-135
```

### Test Case 2: Issue Update

```bash
# Given: Existing issue #830
# When: Update issue body
/specweave-github:update-issue 830

# Then: Body should still NOT have metadata header
gh issue view 830 --json body -q .body | grep -E '^\*\*Feature\*\*:'

# Expected: No match (exit code 1)
# NOT: **Feature**: FS-135
```

### Test Case 3: Hook Validation

```bash
# Given: Developer tries to add metadata header
cat > test-issue-builder.ts << 'EOF'
const body = `**Feature**: FS-135
**Status**: active
**Priority**: P1

## User Story
...`;
EOF

# When: Write file
Write({file_path: "test-issue-builder.ts", content: "..."})

# Then: Hook should BLOCK
# Expected: "❌ BLOCKED: GitHub issue body MUST NOT contain metadata header!"
# Action: Fails before write
```

### Test Case 4: Label Verification

```bash
# Given: Issue created with removed metadata header
# Then: Labels should contain metadata

gh issue view 830 --json labels -q '.labels[].name'

# Expected:
# user-story
# specweave
# p1
# project:specweave
# status:not_started

# Verify: ALL metadata present in labels, NONE in body
```

---

## Migration Plan

### Backward Compatibility: MEDIUM RISK

**Breaking Change?**: NO (existing issues unchanged)

**Impacts**:
- ✅ **New issues**: Start clean (no metadata header)
- ✅ **Existing closed issues**: Remain unchanged (GitHub doesn't allow editing closed issues)
- ⚠️ **Existing open issues**: Will have stale metadata header until next update

**Migration Strategy**:

```bash
# Option 1: Update ALL open issues (RECOMMENDED)
gh issue list --state open --label user-story --json number -q '.[].number' | \
while read issue; do
  echo "Updating issue #$issue..."
  /specweave-github:update-issue $issue
done

# Option 2: Let natural updates happen (LOW EFFORT)
# Issues get updated when:
# - User story status changes
# - Tasks completed
# - ACs marked done
# Over time, all issues will be updated naturally

# Option 3: Archive old issues (CLEAN SLATE)
# Close completed issues
# New work starts with new format
```

### Rollout Timeline

**Week 1** (IMMEDIATE):
- Remove metadata header from all 4 files
- Deploy to production
- New issues use correct format

**Week 2** (SHORT TERM):
- Add validation hook
- Update documentation (CLAUDE.md)
- Test all sync paths

**Week 3-4** (MEDIUM TERM):
- Batch update open issues (Option 1)
- OR let natural updates happen (Option 2)
- Monitor for regressions

---

## Affected Files

### Files to Modify (REMOVE metadata header):

| File | Lines | Change |
|------|-------|--------|
| [user-story-issue-builder.ts](plugins/specweave-github/lib/user-story-issue-builder.ts) | 400-408 | DELETE metadata header (Feature, Status, Priority, Project) |
| [user-story-content-builder.ts](plugins/specweave-github/lib/user-story-content-builder.ts) | TBD | DELETE metadata header |
| [increment-issue-builder.ts](plugins/specweave-github/lib/increment-issue-builder.ts) | TBD | DELETE metadata header |
| [github-increment-sync-cli.ts](plugins/specweave-github/lib/github-increment-sync-cli.ts) | TBD | DELETE metadata header (deprecated, but fix for consistency) |

### Files to Add (VALIDATION):

| File | Purpose |
|------|---------|
| `plugins/specweave/hooks/github-metadata-guard.sh` | Pre-tool-use hook to block metadata header |
| `plugins/specweave/hooks/hooks.json` | Register new hook |

### Files to Update (DOCUMENTATION):

| File | Change |
|------|--------|
| `CLAUDE.md` | Add GitHub issue body format guidelines |
| `.specweave/docs/internal/troubleshooting/` | This document (reference guide) |

---

## Action Items

### P0 (IMMEDIATE - TODAY)

- [ ] **AC-001**: Remove metadata header from user-story-issue-builder.ts (lines 400-408)
- [ ] **AC-002**: Remove metadata header from user-story-content-builder.ts
- [ ] **AC-003**: Remove metadata header from increment-issue-builder.ts
- [ ] **AC-004**: Remove metadata header from github-increment-sync-cli.ts
- [ ] **AC-005**: Test new issue creation (no metadata header)

### P1 (SHORT TERM - THIS WEEK)

- [ ] **AC-006**: Add validation hook (github-metadata-guard.sh)
- [ ] **AC-007**: Register hook in hooks.json
- [ ] **AC-008**: Update CLAUDE.md with guidelines
- [ ] **AC-009**: Test hook blocks metadata header
- [ ] **AC-010**: Verify labels/milestones set correctly

### P2 (MEDIUM TERM - NEXT 2 WEEKS)

- [ ] **AC-011**: Batch update open issues (remove stale metadata)
- [ ] **AC-012**: Add integration test for all sync paths
- [ ] **AC-013**: Document migration for existing projects
- [ ] **AC-014**: Add ADR documenting this decision

---

## Success Criteria

### Definition of Done

✅ **New issues**:
- Body starts with "## Progress" or "## User Story"
- NO metadata header (Feature, Status, Priority, Project)
- Labels contain ALL metadata (status:*, p1, project:*)
- Milestone set correctly (Feature ID)

✅ **Existing issues**:
- Open issues gradually updated (natural flow)
- Closed issues remain unchanged (archived state)
- No regressions (labels/milestones still work)

✅ **Code**:
- All 4 files modified (metadata header removed)
- Validation hook deployed (blocks future violations)
- Documentation updated (CLAUDE.md guidelines)

✅ **User Experience**:
- Cleaner issue UI (more content above fold)
- Single source of truth (GitHub native fields)
- No confusion (body vs. labels)

---

## Related

- **Root Cause Analysis**: [CRITICAL-github-sync-closes-without-completion.md](CRITICAL-github-sync-closes-without-completion.md)
- **GitHub Issue**: https://github.com/anton-abyzov/specweave/issues/830
- **Discovery Date**: 2025-12-10
- **User Request**: "exclude the section in the description at the top"

---

**Author**: Claude (Ultrathink Analysis)
**Reviewed**: Pending
**Priority**: P0 - CRITICAL (User-Requested + UX Improvement)
