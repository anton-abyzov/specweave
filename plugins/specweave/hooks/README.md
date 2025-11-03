# SpecWeave Hooks (Source of Truth)

**Location**: `src/hooks/` (version controlled, copied to new projects)
**Installed to**: `.claude/hooks/` (via symlink or copy)

---

## Purpose

Hooks automate workflows and provide feedback during development:
- **Sound notifications** when tasks complete or input is needed
- **Documentation updates** after task completion
- **Change detection** when docs are modified during implementation
- **Regression checks** before starting implementation on brownfield projects

---

## Available Hooks

### 1. `post-task-completion.sh`
**Triggers**: After ANY task is marked complete (via TodoWrite tool)

**Actions**:
1. Plays completion sound **synchronously** (Glass.aiff on macOS, equivalent on Linux/Windows)
2. Outputs JSON with systemMessage reminder to update docs
3. Logs task completion

**Sound**: Glass.aiff (or system equivalent)

**Important**: Hooks cannot invoke slash commands or skills. The hook only:
- Plays sound to notify user
- Shows reminder message
- Claude must manually update CLAUDE.md/README.md inline after each task
- Living docs sync (via `/sync-docs`) happens after ALL tasks complete

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
