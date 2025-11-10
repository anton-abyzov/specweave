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

## Installation

### Method 1: Symlink (Recommended for Development)
```bash
# From SpecWeave repository root
npx specweave install-hooks --symlink
```

This creates symlinks:
```
.claude/hooks/post-task-completion.sh → src/hooks/post-task-completion.sh
.claude/hooks/human-input-required.sh → src/hooks/human-input-required.sh
.claude/hooks/docs-changed.sh → src/hooks/docs-changed.sh
.claude/hooks/pre-implementation.sh → src/hooks/pre-implementation.sh
```

**Benefit**: Changes to `src/hooks/` immediately reflected in `.claude/hooks/`

---

### Method 2: Copy (For New Projects)
```bash
# When creating new project
npx specweave init my-project
```

This copies `src/hooks/` → `my-project/.claude/hooks/`

**Benefit**: New project gets its own copy of hooks (can customize if needed)

---

### Manual Installation
```bash
# Copy hooks to .claude/hooks/
mkdir -p .claude/hooks
cp src/hooks/*.sh .claude/hooks/
chmod +x .claude/hooks/*.sh
```

---

## Configuration

Hooks are enabled by default. To customize behavior, hooks can check environment variables or use auto-detection.

### Default Behavior
- Sound notifications enabled (platform-specific)
- Auto-update docs after task completion
- Regression checks for brownfield projects

### Customization
Hooks use auto-detection for platform-specific features (macOS/Linux/Windows sound files).

---

## Cross-Platform Support

### macOS
- Uses `afplay` for sound
- Sounds: Glass.aiff, Ping.aiff

### Linux
- Uses `paplay` or `aplay`
- Sounds: system sounds in `/usr/share/sounds/`

### Windows
- Uses PowerShell `Media.SoundPlayer`
- Sounds: `C:\Windows\Media\chimes.wav`, `notify.wav`

---

## Disabling Hooks

### Temporarily
```bash
# Disable all hooks
export SPECWEAVE_HOOKS_DISABLED=1
```

### Permanently
Delete or rename `.claude/hooks/` directory:
```bash
mv .claude/hooks .claude/hooks.disabled
```

---

## Customizing Hooks

Hooks are bash scripts, so you can customize them:

1. Edit `src/hooks/post-task-completion.sh` (for example)
2. If using symlinks, changes are immediately active
3. If using copies, run `npx specweave install-hooks` again

---

## Testing Hooks

### Test post-task-completion
```bash
./.claude/hooks/post-task-completion.sh
```

Expected:
- Sound plays
- Console output shows actions
- Log created in `.specweave/logs/tasks.log`

### Test human-input-required
```bash
./.claude/hooks/human-input-required.sh "Test question"
```

Expected:
- Ping sound plays
- Log created in `.specweave/logs/hooks.log`

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
