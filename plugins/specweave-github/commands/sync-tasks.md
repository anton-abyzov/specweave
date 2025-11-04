---
name: sync-tasks
description: Sync SpecWeave increment tasks to GitHub issues (task-level granularity). Creates milestone, epic issue, and individual issues for each task.
---

# Sync Tasks to GitHub

**Purpose**: Create or update GitHub issues for all tasks in a SpecWeave increment. Each task becomes a separate GitHub issue linked to an epic.

**When to Use**:
- After creating a new increment (sync all tasks at once)
- To create GitHub visibility for team collaboration
- When you need granular task assignment and tracking
- For GitHub Projects / Kanban board integration

---

## Usage

```bash
/specweave:github:sync-tasks <increment-id> [options]
```

## Arguments

- `increment-id` - The increment ID (e.g., `0004` or `0004-plugin-architecture`)

## Options

- `--force` - Overwrite existing issues (⚠️ WARNING: creates duplicates!)
- `--dry-run` - Show what would be created without actually creating issues
- `--batch-size <N>` - Number of issues per batch (default: 10)
- `--batch-delay <ms>` - Delay between batches in milliseconds (default: 6000)
- `--milestone-days <N>` - Days until milestone due (default: 2 - SpecWeave AI velocity)
- `--fast-mode` - Skip rate limiting (auto-enabled for < 10 tasks)
- `--project <name>` - Add issues to GitHub Project (e.g., "SpecWeave v0.4.0") [TODO]

---

## Examples

### Basic Sync (Recommended)

```bash
/specweave:github:sync-tasks 0004
```

**Output**:
```
🔄 Syncing increment to GitHub...
📦 Increment: 0004-plugin-architecture - Plugin Architecture
📋 Found 54 tasks

📍 Creating milestone: v0.4.0
   ✅ Milestone #1: v0.4.0

🎯 Creating epic issue for increment 0004-plugin-architecture...
   ✅ Epic issue #42: https://github.com/owner/repo/issues/42

📝 Creating 54 task issues...
Creating issues 1-10 of 54...
   ✅ #43: [T-001] Create plugin type definitions
   ✅ #44: [T-002] Create plugin manifest schema
   ...
Waiting 6s to avoid rate limits...
Creating issues 11-20 of 54...
   ✅ #53: [T-011] Create config schema
   ...

📄 Updating tasks.md with GitHub issue numbers...
   ✅ Updated tasks.md

💾 Saving sync mapping...
   ✅ Saved to .github-sync.yaml

🎉 GitHub sync complete!
   📍 Milestone: #1 v0.4.0
   🎯 Epic: #42 https://github.com/owner/repo/issues/42
   📝 Tasks: #43-#96 (54 issues)
```

### Dry Run (Preview)

```bash
/specweave:github:sync-tasks 0004 --dry-run
```

Shows what would be created without actually creating anything.

### Force Re-Sync

```bash
/specweave:github:sync-tasks 0004 --force
```

⚠️ **WARNING**: This will create duplicate issues! Only use if you know what you're doing.

### Custom Rate Limiting

```bash
/specweave:github:sync-tasks 0004 --batch-size 5 --batch-delay 10000
```

Creates 5 issues at a time with 10 second delays (slower, safer for rate limits).

### Custom Milestone Timeline

```bash
# 1-day sprint (aggressive AI velocity)
/specweave:github:sync-tasks 0004 --milestone-days 1

# 7-day sprint (traditional scrum)
/specweave:github:sync-tasks 0004 --milestone-days 7
```

**SpecWeave Default**: 2 days (assumes AI-assisted development)
**Rationale**: With Claude Code + SpecWeave, 54 tasks = 1-2 days (not weeks!)

### Fast Mode (No Rate Limiting)

```bash
/specweave:github:sync-tasks 0004 --fast-mode
```

Skips all delays between issue creation. **Auto-enabled** for increments < 10 tasks.

---

## What Gets Created

### 1. GitHub Milestone

**Title**: Based on increment version or ID
**Example**: `v0.4.0` or `Increment 0004-plugin-architecture`
**Description**: Auto-generated summary

### 2. Epic Issue (Increment-Level)

**Title**: `[INC-####] Increment Title`
**Example**: `[INC-0004] Plugin Architecture`
**Labels**: `increment`, `specweave`, priority (`p0`/`p1`/`p2`/`p3`)
**Body**:
- Executive summary from `spec.md`
- Task checklist (all tasks grouped by phase)
- Links to spec, plan, tasks files

### 3. Task Issues (One Per Task)

**Title**: `[T-###] Task Title`
**Example**: `[T-001] Create plugin type definitions`
**Labels**: `task`, priority, phase slug
**Body**:
- Link to epic issue (`Part of #42`)
- Priority, estimate, phase
- Description
- Subtasks (as checkboxes)
- Files to create/modify
- Implementation snippets
- Acceptance criteria
- Dependencies (links to other task issues)
- Blocks (tasks waiting on this)

**Example Task Issue**:
```markdown
# [T-001] Create Plugin Type Definitions

**Part of**: #42 (Increment 0004 - Plugin Architecture)
**Priority**: P0
**Estimate**: 2 hours
**Phase**: Phase 1: Foundation

## Description

Create TypeScript interfaces and types for plugin system.

## Subtasks

- [ ] S-001-01: Define PluginManifest interface (30min)
- [ ] S-001-02: Define Plugin interface (30min)
- [ ] S-001-03: Define Skill, Agent, Command types (45min)
- [ ] S-001-04: Add JSDoc documentation (15min)

## Files to Create

- `src/core/types/plugin.ts`

## Acceptance Criteria

- ✅ All interfaces defined
- ✅ TypeScript compiles without errors
- ✅ JSDoc on all exports
- ✅ Unit tests pass

## Dependencies

None (foundation task)

## Blocks

- T-003 (PluginLoader needs types)
- T-004 (PluginManager needs types)

---
🤖 Synced from SpecWeave increment `0004-plugin-architecture`
- **Tasks**: [`tasks.md`](link)
```

---

## Workflow

### Step 1: Parse tasks.md

Reads and parses `.specweave/increments/####/tasks.md` to extract:
- Task ID, title, description
- Priority, estimate, status
- Subtasks (with IDs and estimates)
- Dependencies and blocks
- Files to create/modify
- Acceptance criteria
- Phase grouping

### Step 2: Create Milestone

Creates or retrieves existing milestone:
- Title: `v{version}` or `Increment {id}`
- Description: Auto-generated
- State: `open`

### Step 3: Create Epic Issue

Creates increment-level epic issue:
- Contains executive summary from `spec.md`
- Shows all tasks as checkboxes (grouped by phase)
- Links to increment files (spec, plan, tasks)
- Labels: `increment`, `specweave`, priority

### Step 4: Create Task Issues (Batched)

Creates individual issues for each task:
- Batch size: 10 issues per batch (configurable)
- Delay: 6 seconds between batches (configurable)
- Rate limit awareness: Checks GitHub rate limit before each batch
- Each issue links back to epic via `Part of #42`

### Step 5: Link Dependencies

For tasks with dependencies or blocks:
- Adds "Depends on" links to dependency task issues
- Adds "Blocks" links to blocked task issues
- GitHub shows these as issue references

### Step 6: Update tasks.md

Updates each task in `tasks.md` with:
- `**GitHub Issue**: #NNN` field
- Preserves all other task content

**Before**:
```markdown
### T-001: Create Plugin Type Definitions
**Priority**: P0
**Estimate**: 2 hours
**Status**: pending

**Description**:
...
```

**After**:
```markdown
### T-001: Create Plugin Type Definitions
**Priority**: P0
**Estimate**: 2 hours
**Status**: pending
**GitHub Issue**: #43

**Description**:
...
```

### Step 7: Save Sync Mapping

Creates `.specweave/increments/####/.github-sync.yaml`:
```yaml
milestone: 1
epic_issue: 42
task_issues:
  T-001: 43
  T-002: 44
  T-003: 45
  # ... all tasks
last_sync: '2025-11-01T10:30:00.000Z'
```

---

## Prerequisites

### 1. GitHub CLI Installed

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
choco install gh
```

### 2. GitHub CLI Authenticated

```bash
gh auth login
```

Follow prompts to authenticate with your GitHub account.

### 3. Git Repository with GitHub Remote

```bash
git remote get-url origin
# Should output: git@github.com:owner/repo.git
```

### 4. Permissions

You need **write access** to the repository to create issues and milestones.

---

## Error Handling

### Rate Limiting

GitHub API has rate limits (5000 requests/hour for authenticated users).

**Automatic Handling**:
- Batches issues (10 per batch by default)
- Delays between batches (6 seconds default)
- Checks rate limit before proceeding
- Fails gracefully if rate limit exceeded

**If Rate Limited**:
```
❌ Sync failed: Rate limit exceeded. Try again in X minutes.
```

**Solution**: Wait or adjust batch settings:
```bash
/specweave:github:sync-tasks 0004 --batch-size 5 --batch-delay 12000
```

### Duplicate Issues

If you run sync twice without `--force`, you'll see:
```
⚠️  Increment already synced to GitHub (epic #42)
   Use --force to re-sync (WARNING: will create duplicate issues)
```

**Solution**: Only use `--force` if you truly want duplicates (e.g., testing).

### Network Errors

If GitHub is unreachable:
```
❌ Sync failed: Failed to create epic issue: network timeout
```

**Solution**: Check internet connection, retry.

### Authentication Errors

If not authenticated:
```
❌ Sync failed: GitHub CLI not authenticated. Run: gh auth login
```

**Solution**: Run `gh auth login`.

---

## Integration with Workflow

### After Creating Increment

```bash
# 1. Create increment
/specweave:inc "0005-user-authentication"

# PM agent generates: spec.md, plan.md, tasks.md, tests.md

# 2. Review and approve

# 3. Sync to GitHub
/specweave:github:sync-tasks 0005

# Now team can see all tasks in GitHub!
```

### During Development

```bash
# Tasks are completed via /specweave:do
/specweave:do

# Automatically:
# - Closes task GitHub issue
# - Checks off task in epic
# - Posts completion comment
# - Updates epic progress
```

### Team Collaboration

**On GitHub**:
- Team members assign themselves to task issues
- Discuss implementation in issue comments
- Link pull requests to task issues
- Track progress in GitHub Projects (Kanban)

**In SpecWeave**:
- Developer works locally with `/specweave:do`
- Progress automatically syncs to GitHub
- Team sees real-time updates

---

## Advanced Usage

### Selective Task Sync

Currently syncs all tasks. For selective sync, manually create issues:
```bash
/specweave:github:create-issue 0004 T-001
```

### Multi-Repo Projects

For monorepos with multiple GitHub repositories, each increment can specify repo:
```yaml
# .specweave/config.yaml
plugins:
  settings:
    specweave-github:
      repo: "org/frontend"  # Override auto-detected repo
```

### Custom Labels

Edit labels after sync in GitHub or pre-configure in plugin settings:
```yaml
plugins:
  settings:
    specweave-github:
      default_labels:
        - "specweave"
        - "increment"
      priority_labels:
        P0: "critical"
        P1: "high"
        P2: "medium"
        P3: "low"
```

---

## Troubleshooting

### "Could not detect GitHub repository"

**Problem**: Not in a git repo or no GitHub remote.

**Solution**:
```bash
# Check remote
git remote get-url origin

# Add remote if missing
git remote add origin git@github.com:owner/repo.git
```

### "GitHub CLI not installed"

**Solution**: Install `gh` CLI (see Prerequisites).

### "Permission denied"

**Problem**: No write access to repository.

**Solution**: Request write access from repository owner or use repository you own.

### Tasks.md Parse Errors

**Problem**: tasks.md format doesn't match expected structure.

**Solution**: Ensure tasks.md follows template format. Check for:
- Task headers: `### T-XXX: Title`
- Required fields: `**Priority**`, `**Estimate**`, `**Status**`
- Proper markdown formatting

---

## See Also

- `/specweave:github:create-issue` - Create issue for single task
- `/specweave:github:sync` - Sync increment metadata only
- `/specweave:github:status` - Check sync status
- `/specweave:github:close-issue` - Close task issue

---

**Pro Tip**: Run with `--dry-run` first to preview what will be created!

```bash
/specweave:github:sync-tasks 0004 --dry-run
```

Then run for real:

```bash
/specweave:github:sync-tasks 0004
```

---

🤖 **SpecWeave GitHub Plugin** - Task-level sync for better team collaboration
