---
name: specweave
description: SpecWeave command reference and help. Shows available commands. DO NOT use routing syntax like '/specweave do' - always use full namespaced commands like '/specweave:do' instead.
---

# SpecWeave Command Reference

**⚠️ IMPORTANT: This is a REFERENCE ONLY, not a router!**

**DO NOT use**: `/specweave do`, `/specweave inc`, etc.
**ALWAYS use**: `/specweave:do`, `/specweave:increment`, etc.

Claude Code does not support command routing. Each command must be invoked directly by its full namespaced name.

**Namespace Protection**: All SpecWeave commands are prefixed with `specweave:` to avoid collisions with existing project commands.

---

## Available Commands

**All commands use the `specweave:` prefix** (note the colon!)

### Increment Lifecycle

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:increment` | Create new increment (PM-led) | `/specweave:increment "User auth"` |
| `/specweave:do` | Execute tasks (auto-resumes) | `/specweave:do` or `/specweave:do 0031` |
| `/specweave:next` | Smart transition (close + suggest) | `/specweave:next` |
| `/specweave:done` | Manual closure with PM validation | `/specweave:done 0031` |
| `/specweave:progress` | Check status and next action | `/specweave:progress` |
| `/specweave:validate` | Validate increment quality | `/specweave:validate 0031` |

### Documentation & Sync

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave:sync-docs` | Sync living docs | `/specweave:sync-docs update` |
| `/specweave:sync-tasks` | Sync tasks with status | `/specweave:sync-tasks` |

### GitHub Plugin

| Command | Description | Example |
|---------|-------------|---------|
| `/specweave-github:create-issue` | Create GitHub issue | `/specweave-github:create-issue 0031` |
| `/specweave-github:sync` | Bidirectional sync | `/specweave-github:sync 0031` |
| `/specweave-github:sync-tasks` | Sync tasks as sub-issues | `/specweave-github:sync-tasks 0031` |
| `/specweave-github:close-issue` | Close GitHub issue | `/specweave-github:close-issue 0031` |
| `/specweave-github:status` | Show sync status | `/specweave-github:status` |

---

## ⚠️ NO ROUTING SUPPORT

**Claude Code does not implement command routing!**

This file is a **reference guide only**. You cannot do:
- ❌ `/specweave do` (doesn't work, no routing!)
- ❌ `/specweave inc "feature"` (doesn't work!)
- ❌ `/specweave next` (doesn't work!)

**Instead, always use full namespaced commands:**
- ✅ `/specweave:do`
- ✅ `/specweave:increment "feature"`
- ✅ `/specweave:next`

**Why This Matters:**
Calling both `/specweave` and `/specweave:do` causes **duplicate invocations**! Always use the namespaced version with the colon.

---

## Usage Examples

### ✅ CORRECT Usage

```bash
# Create increment
/specweave:increment "User authentication"

# Execute tasks
/specweave:do

# Check progress
/specweave:progress

# Complete increment
/specweave:done 0031
```

### ❌ INCORRECT Usage (Causes Duplicates!)

```bash
# DO NOT use routing syntax:
/specweave do           # ❌ Won't work, no routing!
/specweave inc "feat"   # ❌ Won't work!
/specweave next         # ❌ Won't work!

# ALWAYS use namespaced commands:
/specweave:do           # ✅ Correct!
/specweave:increment "feat"  # ✅ Correct!
/specweave:next         # ✅ Correct!
```

---

## Why Namespacing?

**Namespace Protection**: All SpecWeave commands use `specweave:` prefix to avoid collisions with existing project commands in brownfield setups.

**Benefits:**
1. **No collisions** - SpecWeave commands never overwrite user commands
2. **Clear ownership** - `specweave:` prefix shows it's a framework command
3. **Easy identification** - Clear indication of SpecWeave actions
4. **Brownfield safe** - Can install in any existing project
5. **Uninstall clean** - Remove `specweave:*` commands, user's commands intact

---

## Related Documentation

- [Getting Started](https://spec-weave.com/docs/getting-started)
- [Command Reference](https://spec-weave.com/docs/commands)
- [Workflow Guide](https://spec-weave.com/docs/workflow)

---

**⚠️ Remember**: Always use `/specweave:` with a colon, never `/specweave ` with a space!
