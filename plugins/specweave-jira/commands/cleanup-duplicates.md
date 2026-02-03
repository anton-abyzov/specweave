---
name: cleanup-duplicates
description: Clean up duplicate JIRA issues for a Feature. Finds issues with duplicate titles and closes all except the first created issue.
justification: |
  CRITICAL INCIDENT RESPONSE TOOL - DO NOT DELETE!

  Why This Command Exists:
  - Prevention systems work for single-process execution
  - Multiple parallel Claude Code instances bypass all prevention (file-based cache, no distributed locking)
  - JIRA API race conditions: Time gap between "check exists" and "create issue" allows duplicates
  - Historical duplicates from pre-v0.33.0 users (before prevention was added)

  Evidence of Need:
  - GitHub had 123 duplicate issues incident (cleaned to 29 unique) - same risk exists for JIRA
  - Parallel execution creates race conditions that prevention CANNOT solve
  - Industry standard: Prevention + Detection + Cleanup (defense in depth)

  When to Delete:
  - ONLY if distributed locking implemented
  - AND parallel execution tested (100+ concurrent syncs with zero duplicates)
  - AND zero duplicates for 6+ months in production
---

# Clean Up Duplicate JIRA Issues

**CRITICAL**: This command detects and closes duplicate JIRA issues created by multiple syncs.

## Usage

```bash
/sw-jira:cleanup-duplicates <feature-id> [--dry-run]
```

## What It Does

**Duplicate Detection & Cleanup**:

1. **Find all issues** for the Feature (JQL search by Feature ID in summary)
2. **Group by summary** (detect duplicates)
3. **For each duplicate group**:
   - Keep the **FIRST created** issue (oldest created date)
   - Close all **LATER** issues with comment: "Duplicate of PROJ-XXX"
4. **Update Feature README** with correct issue keys

## Examples

### Dry Run (No Changes)

```bash
/sw-jira:cleanup-duplicates FS-031 --dry-run
```

**Output**:
```
Scanning for duplicates in Feature FS-031...
   Found 25 total issues
   Detected 10 duplicate groups:

   Group 1: "[FS-031] External Tool Status Synchronization"
      - PROJ-250 (KEEP) - Created 2025-11-10
      - PROJ-255 (CLOSE) - Created 2025-11-11 - DUPLICATE
      - PROJ-260 (CLOSE) - Created 2025-11-12 - DUPLICATE

   Group 2: "[FS-031] Multi-Project JIRA Sync"
      - PROJ-251 (KEEP) - Created 2025-11-10
      - PROJ-256 (CLOSE) - Created 2025-11-11 - DUPLICATE

   ...

Dry run complete!
   Total issues: 25
   Duplicate groups: 10
   Issues to close: 15

This was a DRY RUN - no changes made.
   Run without --dry-run to actually close duplicates.
```

### Actual Cleanup

```bash
/sw-jira:cleanup-duplicates FS-031
```

**Output**:
```
Scanning for duplicates in Feature FS-031...
   Found 25 total issues
   Detected 10 duplicate groups

CONFIRM: Close 15 duplicate issues? [y/N]
> y

Closing duplicates...
   Closed PROJ-255 (duplicate of PROJ-250)
   Closed PROJ-256 (duplicate of PROJ-251)
   Closed PROJ-260 (duplicate of PROJ-250)
   ...

Updating Feature README frontmatter...
   Updated frontmatter with correct issue keys

Cleanup complete!
   Closed: 15 duplicates
   Kept: 10 original issues
```

## Arguments

- `<feature-id>` - Feature ID (e.g., `FS-031` or just `031`)
- `--dry-run` - Preview changes without actually closing issues (optional)

## Safety Features

- **Confirmation prompt**: Asks before closing issues (unless --dry-run)
- **Dry run mode**: Preview changes safely
- **Keeps oldest issue**: Preserves the first created issue
- **Adds closure comment**: Links to the original issue
- **Updates metadata**: Fixes Feature README frontmatter

## What Gets Closed

**Closed issues**:
- Duplicate summaries (second, third, etc. occurrences)
- Transitioned to "Won't Do" or "Closed" with comment: "Duplicate of PROJ-XXX"
- Original issue kept open (or maintains its status)

**Example comment on closed duplicate**:
```markdown
h2. Duplicate of PROJ-250

This issue was automatically closed by SpecWeave cleanup because it is a duplicate.

The original issue (PROJ-250) contains the same content and should be used for tracking instead.

Auto-closed by SpecWeave Duplicate Cleanup
```

## Requirements

1. **JIRA API token** configured (`JIRA_API_TOKEN`)
2. **JIRA email** configured (`JIRA_EMAIL`)
3. **JIRA domain** configured (`JIRA_DOMAIN`)
4. **Write access** to project (for closing issues)
5. **Feature folder exists** at `.specweave/docs/internal/specs/FS-XXX-name/`

## When to Use

**Use this command when**:
- You see multiple issues with the same summary in JIRA
- Feature sync ran multiple times and created duplicates
- Feature README frontmatter got corrupted and reset
- Post-sync validation warns about duplicates

**Example warning that triggers this**:
```
WARNING: 10 duplicate(s) detected!
   Run cleanup command to resolve:
   /sw-jira:cleanup-duplicates FS-031
```

## Architecture

**Duplicate Detection Logic**:
1. JQL query for issues with Feature ID in summary
2. Group issues by **exact summary match**
3. Within each group, sort by **created date** (ascending)
4. Keep **first issue** (oldest = first created)
5. Transition **all others** to closed status

**Why oldest created?**:
- Older issues were created first
- Preserves chronological order
- Maintains links from old documentation
- JIRA keys can be reordered, created date is immutable

## JQL Query Pattern

```jql
summary ~ "[FS-031]" ORDER BY created ASC
```

## Related Commands

- `/sw-jira:sync` - Sync Feature to JIRA (with duplicate detection)
- `/sw-jira:reconcile` - Reconcile issue states
- `/sw:validate` - Validate increment completeness

## Implementation

**File**: `plugins/specweave-jira/lib/jira-duplicate-detector.ts`

**Class**: `JiraDuplicateDetector`

**Algorithm** (3-phase protection):
1. **Detection**: JQL query for existing issues matching pattern
2. **Verification**: Count check to detect duplicates after creation
3. **Reflection**: Auto-close duplicates automatically

For manual cleanup:
1. JQL query for all issues with Feature ID
2. Group by summary (Map<string, JiraIssue[]>)
3. Filter groups with >1 issue (duplicates)
4. For each duplicate group:
   - Keep first issue (oldest created)
   - Transition others to "Won't Do" via JIRA REST API

## Next Steps

After cleanup:

1. **Verify cleanup**: JQL query `summary ~ "[FS-031]"`
2. **Check Feature FEATURE.md**: Verify frontmatter has correct issue keys
3. **Re-run sync**: `/sw-jira:sync` (should show no duplicates)
4. **Duplicate detection**: Automatically enabled via JiraDuplicateDetector

---

**SAFE TO USE**: This command is idempotent and safe to run multiple times.
