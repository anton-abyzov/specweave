# SpecWeave Core Plugin Hooks

**Plugin**: `specweave` (core plugin)
**Location**: `plugins/specweave/hooks/`

---

## Purpose

Core hooks automate SpecWeave's fundamental workflows:
- **Sound notifications** when tasks complete or input is needed
- **Living docs sync** after task completion
- **Translation** of non-English documentation
- **Self-reflection** for AI-driven quality improvements

**Note**: External tool sync (GitHub, JIRA, Azure DevOps) has been moved to respective plugin hooks as of v0.13.0. See "Architecture Changes" section below.

---

## Available Hooks

### 1. `user-prompt-submit.sh` ⭐ NEW (v0.13.0+)
**Triggers**: BEFORE user's command executes (prompt-based hook)

**Actions** (Zero-Token Validation):
1. **Discipline enforcement** - Blocks `/specweave:increment` if incomplete increments exist
2. **Context injection** - Adds active increment status to every prompt
3. **Command suggestions** - Guides users to SpecWeave commands

**Why This Is Better**:
- ✅ **Zero LLM tokens** - Shell script validation (no PM agent invocation)
- ✅ **Instant blocking** - User gets feedback before Claude even thinks
- ✅ **Always current** - Context injected into every conversation
- ✅ **Better UX** - Proactive guidance for new users

**Example Output** (blocking):
```json
{
  "decision": "block",
  "reason": "❌ Cannot create new increment! You have 2 incomplete increment(s)..."
}
```

**Example Output** (context injection):
```json
{
  "decision": "approve",
  "systemMessage": "📍 Active Increment: 0017-sync-architecture-fix (73% complete, 11/15 tasks)\n\n💡 TIP: Consider using SpecWeave commands..."
}
```

---

### 2. `post-task-completion.sh`
**Triggers**: After ANY task is marked complete (via TodoWrite tool)

**Actions** (Core Concerns Only):
1. **Session-end detection** - Smart inactivity tracking (15s threshold)
2. **Sound notification** - Glass.aiff on macOS (only when session truly ends)
3. **tasks.md updates** - Sync completion status from TodoWrite
4. **Living docs sync** - Update permanent specs after completion
5. **Translation** - Auto-translate non-English docs to English
6. **Self-reflection** - Prepare AI reflection context

**Sound**: Glass.aiff (or system equivalent)

**Architecture Note** (v0.13.0+): External tool sync (GitHub, JIRA, ADO) has been **removed from this hook** and moved to respective plugin hooks:
- `plugins/specweave-github/hooks/post-task-completion.sh`
- `plugins/specweave-jira/hooks/post-task-completion.sh`
- `plugins/specweave-ado/hooks/post-task-completion.sh`

**Benefits**:
- ✅ **27% smaller** (330 lines, down from 452)
- ✅ **No external tool dependencies** (gh CLI, JIRA API, ADO API)
- ✅ **Cleaner separation** (core vs. external concerns)
- ✅ **Optional plugins** (GitHub sync only runs if plugin installed)

---

### 2. `human-input-required.sh`
**Triggers**: When Claude needs clarification or approval

**Actions**:
1. Plays notification sound (Ping.aiff on macOS, equivalent on Linux/Windows)
2. Logs the question/requirement to `.specweave/logs/hooks.log`
3. Records in current work context (`.specweave/work/current-*/notes.md`)

**Sound**: Ping.aiff (or system equivalent)

---

### 3. `docs-changed.sh`
**Triggers**: After file changes are detected (git)

**Actions**:
1. Detects if documentation files changed (`.specweave/docs/`, `.specweave/increments/`)
2. Plays notification sound if docs changed
3. Recommends review workflow
4. Logs documentation changes

**Sound**: Ping.aiff (warning sound)

**Use case**: During implementation, if architecture needs to change, this hook alerts the user to review and approve doc updates before continuing

---

### 4. `pre-implementation.sh`
**Triggers**: Before starting implementation of a task

**Actions**:
1. Detects if project is brownfield (has existing code)
2. Checks for baseline tests
3. Recommends regression prevention steps
4. Logs pre-implementation check

**Use case**: Prevents breaking existing code by ensuring baseline tests exist

---

## How Hooks Work (Claude Code Native)

**CRITICAL**: Hooks are **NOT copied** to `.claude/hooks/`. They stay in `plugins/specweave/hooks/` and Claude Code discovers them automatically.

### Hook Discovery (Automatic)

1. **Plugin Installation**: When you install the `specweave` plugin via `/plugin install specweave` (or automatically during `specweave init`)
2. **Hook Registration**: Claude Code reads `plugins/specweave/.claude-plugin/plugin.json` which points to `hooks/hooks.json`
3. **Hook Discovery**: Claude Code loads `plugins/specweave/hooks/hooks.json` which references hook scripts:
   ```json
   {
     "hooks": {
       "PostToolUse": [{
         "matcher": "TodoWrite",
         "hooks": [{
           "type": "command",
           "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh"
         }]
       }]
     }
   }
   ```
4. **Execution**: When `TodoWrite` fires, Claude Code executes `plugins/specweave/hooks/post-task-completion.sh` using the `${CLAUDE_PLUGIN_ROOT}` variable

**Key Insight**: `${CLAUDE_PLUGIN_ROOT}` resolves to the installed plugin directory automatically. NO copying needed!

### Installation (Automatic)

Hooks are installed automatically when you:

```bash
# Option 1: Full project initialization
specweave init my-project

# Option 2: Plugin installation (if already initialized)
/plugin install specweave
```

**Result**: Claude Code automatically discovers and registers hooks. Nothing to copy or configure manually!

---

## Configuration

Hooks are configured via `.specweave/config.json` (created automatically during `specweave init`):

```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true,        // Sync specs to living docs
      "sync_tasks_md": true,           // Update tasks.md with completion status
      "external_tracker_sync": true    // Sync to GitHub/Jira/ADO (if configured)
    },
    "post_increment_planning": {
      "auto_create_issue": true        // Auto-create GitHub issue after planning
    }
  },
  "sync": {
    "enabled": true,
    "activeProfile": "github-default",
    "profiles": {
      "github-default": {
        "provider": "github",
        "config": {
          "owner": "your-org",
          "repo": "your-repo"
        }
      }
    }
  }
}
```

### Hook Behavior

**post-task-completion**:
- `sync_living_docs: true` - Automatically syncs increment specs to `.specweave/docs/internal/specs/` after task completion
- `sync_tasks_md: true` - Updates `tasks.md` with completion status from `TodoWrite` events
- `external_tracker_sync: true` - Syncs progress to GitHub/Jira/ADO (requires sync profile configured)

**post-increment-planning**:
- `auto_create_issue: true` - Automatically creates GitHub issue after `/specweave:increment` completes

### Sound Notifications

Sound notifications work automatically (platform-specific):
- **macOS**: Uses `afplay` (Glass.aiff, Ping.aiff)
- **Linux**: Uses `paplay` or `aplay` (system sounds)
- **Windows**: Uses PowerShell `Media.SoundPlayer` (chimes.wav, notify.wav)

---

## Disabling Hooks

### Option 1: Configuration (Recommended)
Edit `.specweave/config.json`:
```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": false,        // Disable living docs sync
      "sync_tasks_md": false,           // Disable tasks.md updates
      "external_tracker_sync": false    // Disable external sync
    }
  }
}
```

### Option 2: Uninstall Plugin (Nuclear)
```bash
/plugin uninstall specweave
```
**Warning**: This disables ALL SpecWeave functionality, not just hooks!

---

## Customizing Hooks

Hooks are bash scripts in the plugin. To customize:

1. **For development** (SpecWeave repo contributors):
   - Edit `plugins/specweave/hooks/post-task-completion.sh`
   - Changes take effect immediately (hooks run from plugin directory)

2. **For users** (project using SpecWeave):
   - NOT RECOMMENDED - Hooks are plugin-managed
   - Configure behavior via `.specweave/config.json` instead

---

## Testing Hooks

### Validate Hook Syntax
```bash
# Test core hook
bash -n plugins/specweave/hooks/post-task-completion.sh

# Test plugin hooks (if using external sync)
bash -n plugins/specweave-github/hooks/post-task-completion.sh
```

### Test Integrated Workflow
1. Create increment: `/specweave:increment "test feature"`
2. Complete a task (via TodoWrite)
3. Check logs: `tail -f .specweave/logs/hooks-debug.log`
4. Verify hook execution in logs

---

## Hook Execution Order

During a typical workflow:

```
1. pre-implementation.sh         ← Before starting task
   ↓
2. [User implements task]
   ↓
3. docs-changed.sh                ← If docs modified
   ↓
4. human-input-required.sh        ← If approval needed
   ↓
5. [User approves]
   ↓
6. post-task-completion.sh        ← After task complete
```

---

## Logs

All hooks log to:
- `.specweave/logs/hooks.log` - General hook activity
- `.specweave/logs/tasks.log` - Task completions
- `.specweave/work/current-*/notes.md` - Current work context

Logs are gitignored (in `.specweave/logs/`)

---

## Architecture Changes (v0.13.0)

### What Changed

**External tool sync logic has been moved from core plugin to respective plugin hooks**:

| External Tool | Old Location | New Location |
|---------------|-------------|--------------|
| **GitHub Issues** | `plugins/specweave/hooks/post-task-completion.sh` (lines 227-333) | `plugins/specweave-github/hooks/post-task-completion.sh` |
| **JIRA** | `plugins/specweave/hooks/post-task-completion.sh` (lines 335-345) | `plugins/specweave-jira/hooks/post-task-completion.sh` |
| **Azure DevOps** | `plugins/specweave/hooks/post-task-completion.sh` (lines 347-357) | `plugins/specweave-ado/hooks/post-task-completion.sh` |

**Result**:
- ✅ Core hook: 452 lines → 330 lines (27% reduction)
- ✅ Each plugin hook: ~150-240 lines (self-contained)
- ✅ Total: 871 lines (vs. 452 monolithic lines)

### Why This Change?

**Problem (Before v0.13.0)**:
```
Core hook (500+ lines)
├── Core concerns (sound, docs, translation)
├── GitHub sync logic (107 lines)      ← Embedded in core!
├── JIRA sync logic (11 lines)         ← Embedded in core!
└── Azure DevOps sync logic (11 lines) ← Embedded in core!

Issues:
❌ Tight coupling (core depends on gh CLI, JIRA API, ADO API)
❌ Cannot opt out of GitHub sync even if not using it
❌ Testing complexity (must mock all external tools)
❌ Violates separation of concerns
```

**Solution (v0.13.0+)**:
```
Core hook (330 lines)           GitHub plugin hook (241 lines)
├── Core concerns only          ├── GitHub API calls
                                ├── Issue checkbox updates
                                └── Progress comments

JIRA plugin hook (150 lines)    ADO plugin hook (150 lines)
├── JIRA API calls              ├── Azure DevOps API calls
└── Issue status updates        └── Work item updates

Benefits:
✅ Separation of concerns (core vs. external tools)
✅ Optional plugins (GitHub sync only if plugin installed)
✅ Independent testing (test each hook in isolation)
✅ No external dependencies in core plugin
✅ Parallel execution (Claude Code runs all hooks concurrently)
```

### How It Works (Claude Code's Hook System)

**When a task completes**:
1. `TodoWrite` tool fires
2. Claude Code triggers `PostToolUse` event
3. **ALL registered hooks fire in parallel**:
   - Core hook: Sound + Living docs + Translation + Reflection
   - GitHub hook: Update issue checkboxes (if `specweave-github` installed)
   - JIRA hook: Update issue status (if `specweave-jira` installed)
   - ADO hook: Update work item (if `specweave-ado` installed)

**Key Insight**: Each plugin registers its own hooks via `hooks.json`, enabling clean modularity.

### Migration Guide

**For existing projects** (v0.12.x → v0.13.0):

**Option 1: Automatic (Recommended)**
```bash
# Re-run init to update hooks
specweave init .
# Overwrites .claude/hooks/ with new structure
```

**Option 2: Manual (Not Recommended)**
```bash
# Remove old monolithic hook
rm .claude/hooks/post-task-completion.sh

# Copy new plugin hooks
cp -r plugins/specweave/hooks/.claude/hooks/
cp -r plugins/specweave-github/hooks/ .claude/hooks/ (if using GitHub)
cp -r plugins/specweave-jira/hooks/ .claude/hooks/ (if using JIRA)
cp -r plugins/specweave-ado/hooks/ .claude/hooks/ (if using ADO)
```

**No breaking changes**: Existing increments with GitHub/JIRA/ADO links will continue to sync automatically.

### Testing the New Architecture

**Test core hook independently**:
```bash
bash -n plugins/specweave/hooks/post-task-completion.sh
# Should show no syntax errors
```

**Test plugin hooks independently**:
```bash
bash -n plugins/specweave-github/hooks/post-task-completion.sh
bash -n plugins/specweave-jira/hooks/post-task-completion.sh
bash -n plugins/specweave-ado/hooks/post-task-completion.sh
```

**Test integrated workflow**:
1. Create increment: `/specweave:increment "test"`
2. Create GitHub issue: `/specweave-github:create-issue 0001`
3. Complete a task (TodoWrite)
4. Check logs: `tail -f .specweave/logs/hooks-debug.log`
5. Verify:
   - Core hook logs: `[$(date)]` messages
   - GitHub hook logs: `[$(date)] [GitHub]` messages
   - GitHub issue updated with checkboxes

### Related Documentation

- **Architecture Analysis**: `.specweave/increments/0018-strict-increment-discipline-enforcement/reports/HOOKS-ARCHITECTURE-ANALYSIS.md`
- **GitHub Plugin Hooks**: `plugins/specweave-github/hooks/README.md`
- **JIRA Plugin Hooks**: `plugins/specweave-jira/hooks/README.md`
- **ADO Plugin Hooks**: `plugins/specweave-ado/hooks/README.md`
- **Claude Code Hooks Guide**: https://code.claude.com/docs/en/hooks-guide

---

## Future Enhancements

Planned hooks:
- `pre-commit.sh` - Validate before git commit
- `pre-push.sh` - Run tests before push
- `post-deploy.sh` - Actions after deployment
- `cost-alert.sh` - Alert if infrastructure costs exceed budget

---

**For more information**, see:
- [Autonomous Workflow](../../ai-execution-files/reports/SPECWEAVE-AUTONOMOUS-WORKFLOW.md)
- [Increment 0002: Role-Based Agents](../../.specweave/increments/0002-role-based-agents/)
