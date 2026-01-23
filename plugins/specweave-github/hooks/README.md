# SpecWeave GitHub Plugin Hooks

**Plugin**: `specweave-github`
**Location**: `plugins/specweave-github/hooks/`

---

## Purpose

This hook provides GitHub Issues sync functionality for SpecWeave increments.

**Key Features**:
- ✅ Updates GitHub issue checkboxes based on `tasks.md` completion status
- ✅ Posts progress comments with percentage completion
- ✅ Bidirectional sync (local → GitHub)
- ✅ Non-blocking (failures don't stop core workflow)
- ✅ Self-contained (no dependencies on core plugin)

**IMPORTANT CHANGE (v0.26.0)**: This hook is NO LONGER automatically triggered on task completion. GitHub sync should be done manually or on increment completion to avoid excessive API calls and performance overhead.

---

## Available Hooks

### 1. `post-task-completion.sh`

**Triggers**: Manual invocation or increment completion (NOT on task completion)

**Preconditions**:
- ✅ Active increment exists (`.specweave/increments/####/`)
- ✅ `metadata.json` has `.github.issue` field
- ✅ GitHub CLI (`gh`) installed and authenticated
- ✅ `tasks.md` file exists in increment

**Actions**:
1. Reads completed tasks from `tasks.md`
2. Fetches GitHub issue body
3. Updates checkboxes for completed tasks
4. Posts progress comment with percentage
5. Logs all actions to `.specweave/logs/hooks-debug.log`

**Example Flow**:
```
Task T-003 completed in tasks.md
↓
Hook fires (PostToolUse + TodoWrite matcher)
↓
GitHub issue #42 checkboxes updated: [ ] T-003 → [x] T-003
↓
Progress comment posted: "Progress Update: 3/5 tasks (60%)"
↓
Log: "[GitHub] ✅ GitHub sync complete"
```

**Dependencies**:
- `gh` CLI (GitHub CLI)
- `jq` for JSON parsing
- Bash 4.0+

---

## Configuration

### Hook Registration

**DEPRECATED (v0.26.0)**: This hook is NO LONGER automatically registered on TodoWrite events.

**Previous behavior (v0.24.0 and earlier)**:
- Hook automatically fired on EVERY task completion
- Caused excessive GitHub API calls
- Created performance overhead and duplicate executions

**New behavior (v0.26.0+)**:
- Hook must be invoked manually via `/sw-github:sync`
- OR triggered on increment completion (not task completion)
- Reduces API calls by 90%+
- Eliminates duplicate hook executions

### Usage

**Manual Sync** (recommended workflow):
```bash
# After completing several tasks, sync progress to GitHub
/sw-github:sync

# Or sync specific feature
/sw-github:sync FS-048
```

**Automatic Sync Options**:
1. **On Increment Completion**: Add hook to specweave plugin's post-increment-completion
2. **Periodic Sync**: Set up cron job or CI/CD trigger
3. **On Demand**: Call `/sw-github:sync` when needed

### Metadata Format

Increments must have `metadata.json` with GitHub issue link:

```json
{
  "github": {
    "issue": 42,
    "url": "https://github.com/owner/repo/issues/42",
    "repo": "owner/repo"
  }
}
```

---

## Installation

### Automatic (Recommended)

When `specweave init` runs, all plugin hooks are automatically installed:

```bash
npx specweave init my-project
# Installs all plugins including specweave-github
# Hooks auto-register via hooks.json
```

### Manual (Development)

For testing or development:

```bash
# Install plugin
/plugin install sw-github@specweave

# Verify hook registration
cat ~/.claude/settings.json
# Should show sw-github hooks registered
```

---

## Testing

### Test Hook Independently

```bash
# Test syntax
bash -n plugins/specweave-github/hooks/post-task-completion.sh

# Test execution (requires active increment + GitHub issue)
./plugins/specweave-github/hooks/post-task-completion.sh
```

### Test with GitHub Issue

1. Create increment: `/sw:increment "test feature"`
2. Create GitHub issue: `/sw-github:create-issue 0001`
3. Complete several tasks via TodoWrite
4. **Manually trigger sync**: `/sw-github:sync`
5. Check GitHub issue for updates

---

## Logging

All GitHub sync actions are logged to:

```
.specweave/logs/hooks-debug.log
```

**Example Log Output**:
```
[2025-11-10] [GitHub] 🔗 GitHub sync hook fired
[2025-11-10] [GitHub] 🔄 Syncing to GitHub issue #42
[2025-11-10] [GitHub] 📊 Syncing task checkboxes to GitHub issue #42
[2025-11-10] [GitHub] Completed tasks found: T-001 T-002 T-003
[2025-11-10] [GitHub] Updated checkbox for task: T-001
[2025-11-10] [GitHub] Updated checkbox for task: T-002
[2025-11-10] [GitHub] Updated checkbox for task: T-003
[2025-11-10] [GitHub] ✅ Issue description checkboxes updated
[2025-11-10] [GitHub] ✅ Progress comment posted (60%)
[2025-11-10] [GitHub] ✅ GitHub sync complete
```

**Log Prefixes**:
- `[GitHub]` - All messages from this hook
- `🔗` - Hook fired
- `🔄` - Syncing started
- `📊` - Syncing task data
- `✅` - Success
- `⚠️` - Warning (non-blocking failure)
- `ℹ️` - Info (skipped due to precondition)

---

## Architecture

### How It Works with Core Plugin

**Before (v0.12.x)**:
```
Core hook (500+ lines)
├── Sound notifications
├── Living docs sync
├── Translation
├── GitHub sync        ← Embedded in core!
├── JIRA sync          ← Embedded in core!
└── ADO sync           ← Embedded in core!
```

**After (v0.13.0+)**:
```
Core hook (330 lines)         GitHub plugin hook (241 lines)
├── Sound notifications       ├── Check for GitHub issue
├── Living docs sync          ├── Update checkboxes
├── Translation               ├── Post progress comment
└── Self-reflection           └── Log actions
```

**Key Benefits**:
- ✅ **Separation of concerns**: Core plugin has NO external tool dependencies
- ✅ **Optional plugin**: GitHub sync only runs if `specweave-github` installed
- ✅ **Independent testing**: Test GitHub sync in isolation
- ✅ **Cleaner code**: Each hook <250 lines, single responsibility
- ✅ **Parallel execution**: Claude Code runs all hooks concurrently

---

## Troubleshooting

### Hook Not Firing

**Check**:
1. Plugin installed: `/plugin list --installed | grep specweave-github`
2. Hook registered: `cat ~/.claude/settings.json | grep specweave-github`
3. Active increment: `cat .specweave/logs/current-increment`
4. GitHub issue linked: `cat .specweave/increments/####/metadata.json | jq .github`

### GitHub CLI Not Found

**Fix**:
```bash
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Authenticate
gh auth login
```

### Sync Failures

**Check logs**:
```bash
tail -f .specweave/logs/hooks-debug.log | grep '\[GitHub\]'
```

**Common issues**:
- ❌ No `metadata.json`: Create GitHub issue via `/sw-github:create-issue`
- ❌ Not authenticated: Run `gh auth login`
- ❌ Invalid issue number: Check `metadata.json` has correct issue ID
- ❌ Network error: Check internet connection

---

## Migration from v0.12.x

If upgrading from SpecWeave v0.12.x or earlier:

1. **Automatic**: Run `specweave init` (re-installs all hooks)
2. **Manual**: Copy `plugins/specweave-github/hooks/` to `.claude/hooks/` (not recommended)

**No action needed**: Existing increments with GitHub issues will continue to sync automatically.

---

## Related Documentation

- **Core Plugin Hooks**: `plugins/specweave/hooks/README.md`
- **Architecture Analysis**: `.specweave/increments/0018-strict-increment-discipline-enforcement/reports/HOOKS-ARCHITECTURE-ANALYSIS.md`
- **Claude Code Hooks Guide**: https://code.claude.com/docs/en/hooks-guide
- **GitHub Sync Command**: `plugins/specweave-github/commands/sync.md`

---

**Version**: v0.13.0+
**Last Updated**: 2025-11-10
