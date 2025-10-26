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
**Triggers**: After ANY task is marked complete

**Actions**:
1. Plays completion sound (Glass.aiff on macOS, equivalent on Linux/Windows)
2. Triggers `docs-updater` skill (if exists)
3. Checks if CLAUDE.md needs update
4. Logs task completion

**Sound**: Glass.aiff (or system equivalent)

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
npx specweave create-project my-project
```

This copies `src/hooks/` → `my-project/src/hooks/` → `my-project/.claude/hooks/`

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

Hooks respect `.specweave/config.yaml`:

```yaml
---
hooks:
  enabled: true

  # Sound notifications
  sounds:
    enabled: true
    completion: /System/Library/Sounds/Glass.aiff  # macOS
    input_required: /System/Library/Sounds/Ping.aiff

  # Auto-update docs
  docs_updater:
    enabled: true
    auto_commit: false  # If true, auto-commit doc changes

  # Regression checks
  regression:
    enabled: true
    require_baseline_tests: false  # If true, block if no baseline tests
---
```

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
- [Increment 002: Role-Based Agents](../../.specweave/increments/002-role-based-agents/)
