---
name: specweave-github:sync-epic
description: Sync SpecWeave Epic folder to GitHub (Milestone + Issues). Implements Universal Hierarchy architecture - Epic → Milestone, Increments → Issues.
---

# Sync Epic to GitHub (Universal Hierarchy)

**Architecture**: Hierarchical sync using Epic folder structure

- **Epic (FS-001)** → **GitHub Milestone**
- **Increment (0001-core-framework)** → **GitHub Issue** (linked to Milestone)

## Usage

```bash
/specweave-github:sync-epic <epic-id>
```

## What It Does

**Hierarchical Sync Process**:

1. **Load Epic folder** from `.specweave/docs/internal/specs/FS-XXX-name/`
2. **Parse Epic README.md** to get Epic metadata (title, increments, status)
3. **Create or update GitHub Milestone**:
   - Title: `[FS-001] Epic Title`
   - Description: Epic overview + progress stats
   - State: Open (active/planning) or Closed (complete)
4. **Sync each increment as GitHub Issue**:
   - Title: `[FS-031] Title` (Feature ID from Epic folder)
   - Body: Increment overview + link to tasks.md
   - Milestone: Linked to Epic Milestone
   - Labels: `increment`, `epic-sync`
   - **Note**: Uses Epic's FS-XXX ID, not increment number!
5. **Update frontmatter** in Epic README.md and increment files

## Examples

### Sync Epic FS-001 (Core Framework Architecture)

```bash
/specweave-github:sync-epic FS-001
```

**Output**:
```
🔄 Syncing Epic FS-001 to GitHub...
   📦 Epic: Core Framework Architecture
   📊 Increments: 4
   🚀 Creating GitHub Milestone...
   ✅ Created Milestone #10

   📝 Syncing 4 increments...
   ✅ Created Issue #130 for 0001-core-framework
   ✅ Created Issue #131 for 0002-core-enhancements
   ✅ Created Issue #132 for 0004-plugin-architecture
   ✅ Created Issue #133 for 0005-cross-platform-cli

✅ Epic sync complete!
   Milestone: https://github.com/owner/repo/milestone/10
   Issues created: 4
   Issues updated: 0
```

### Sync Epic with short ID

```bash
/specweave-github:sync-epic 031
# Resolves to FS-031
```

### Re-sync Epic (updates existing Milestone/Issues)

```bash
/specweave-github:sync-epic FS-001
```

**Output**:
```
🔄 Syncing Epic FS-001 to GitHub...
   ♻️  Updating existing Milestone #10...
   ✅ Updated Milestone #10

   📝 Syncing 4 increments...
   ♻️  Updated Issue #130 for 0001-core-framework
   ♻️  Updated Issue #131 for 0002-core-enhancements
   ♻️  Updated Issue #132 for 0004-plugin-architecture
   ♻️  Updated Issue #133 for 0005-cross-platform-cli

✅ Epic sync complete!
   Milestone: https://github.com/owner/repo/milestone/10
   Issues created: 0
   Issues updated: 4
```

## Arguments

- `<epic-id>` - Epic ID (e.g., `FS-001` or just `001`)

## What Gets Created

### GitHub Milestone (Epic-level)

```
Title: [FS-001] Core Framework Architecture
Description:
  Epic: Core Framework Architecture

  Progress: 4/4 increments (100%)

  Priority: P0
  Status: complete

State: Closed (if complete) or Open (if active/planning)
```

### GitHub Issues (Increment-level)

```markdown
Title: [FS-031] External Tool Status Sync

# External Tool Status Sync

Bidirectional sync between SpecWeave and external issue trackers...

---

**Increment**: 0031-external-tool-status-sync
**Milestone**: See milestone for Epic progress
**Feature**: FS-031 (External Tool Status Synchronization)

🤖 Auto-created by SpecWeave Epic Sync
```

**Note**: Issue title uses Feature ID ([FS-031]), not increment number!
**Legacy Format** (deprecated): `[INC-0001]` - No longer used!

**Labels**: `increment`, `epic-sync`
**Milestone**: Linked to Epic Milestone

## Frontmatter Updates

### Epic README.md (after sync)

```yaml
---
id: FS-001
title: "Core Framework Architecture"
external_tools:
  github:
    type: milestone
    id: 10                              # ← Added
    url: https://github.com/.../milestone/10  # ← Added
increments:
  - id: 0001-core-framework
    external:
      github: 130                       # ← Added
  - id: 0002-core-enhancements
    external:
      github: 131                       # ← Added
---
```

### Increment file (0001-core-framework.md)

```yaml
---
id: 0001-core-framework
epic: FS-001
external:
  github:
    issue: 130                          # ← Added
    url: https://github.com/.../issues/130  # ← Added
---
```

## Benefits

✅ **Hierarchical tracking**: GitHub Milestones group related increments
✅ **Epic-level progress**: See completion percentage in Milestone
✅ **Automatic linking**: All Issues linked to Milestone
✅ **Idempotent**: Safe to re-run (updates existing Milestone/Issues)
✅ **Brownfield-ready**: Links existing GitHub Milestones/Issues

## Requirements

1. **GitHub CLI** (`gh`) installed and authenticated
2. **Git repository** with GitHub remote
3. **Write access** to repository (for creating Milestones/Issues)
4. **Epic folder exists** at `.specweave/docs/internal/specs/FS-XXX-name/`

## Architecture: Why Milestones?

**GitHub's Hierarchy**:
- GitHub Milestones = Epic-level grouping
- GitHub Issues = Increment-level work items
- GitHub Projects = Optional (cross-Epic tracking)

**Comparison with JIRA/ADO**:
- JIRA: Epic → Epic, Increment → Story (with Epic Link field)
- ADO: Epic → Feature, Increment → User Story (with Parent link)
- GitHub: Epic → Milestone, Increment → Issue (with Milestone link)

All three implement the same Universal Hierarchy, just with different terminology.

## Troubleshooting

**"Epic FS-001 not found"**:
- Check Epic folder exists: `ls .specweave/docs/internal/specs/`
- Verify Epic ID format: `FS-001-epic-name/`

**"Epic README.md missing YAML frontmatter"**:
- Ensure Epic was migrated with `migrate-to-epic-folders.ts`
- Frontmatter must start with `---` on line 1

**"Failed to create GitHub Milestone"**:
- Check GitHub CLI auth: `gh auth status`
- Verify write access: `gh repo view`
- Check rate limits: `gh api rate_limit`

**"Could not extract issue number"**:
- GitHub CLI output format may have changed
- Check CLI version: `gh --version` (need v2.0.0+)

## Related Commands

- `/specweave-github:sync-spec` - OLD (flat spec → project) - DEPRECATED for Epic architecture
- `/specweave-jira:sync-epic` - Sync to JIRA Epic + Stories
- `/specweave-ado:sync-epic` - Sync to ADO Feature + User Stories

## Implementation

**File**: `plugins/specweave-github/lib/github-epic-sync.ts`

**Core Class**: `GitHubEpicSync`

**Methods**:
- `syncEpicToGitHub(epicId)` - Main sync logic
- `createMilestone(epic)` - Create GitHub Milestone
- `updateMilestone(number, epic)` - Update existing Milestone
- `createIssue(increment, milestone)` - Create GitHub Issue
- `updateIssue(number, increment, milestone)` - Update existing Issue
- `updateEpicReadme(path, github)` - Update frontmatter
- `updateIncrementExternalLink(...)` - Update increment frontmatter

## Next Steps

After syncing Epic to GitHub:

1. **View Milestone progress**: `gh milestone view 10`
2. **List Issues in Milestone**: `gh issue list --milestone 10`
3. **Track completion**: GitHub automatically calculates Milestone progress
4. **Close Milestone**: When all increments complete, Milestone auto-closes
