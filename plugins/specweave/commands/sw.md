---
name: specweave
description: SpecWeave command reference and help. Shows available commands. DO NOT use routing syntax like '/specweave do' - always use full namespaced commands like '/sw:do' instead.
---

# SpecWeave Command Reference

**⚠️ IMPORTANT: This is a REFERENCE ONLY, not a router!**

**DO NOT use**: `/specweave do`, `/specweave inc`, etc.
**ALWAYS use**: `/sw:do`, `/sw:increment`, etc.

Claude Code does not support command routing. Each command must be invoked directly by its full namespaced name.

**Namespace Protection**: All SpecWeave commands are prefixed with `specweave:` to avoid collisions with existing project commands.

---

## Available Commands

**All commands use the `specweave:` prefix** (note the colon!)

### Increment Lifecycle

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:increment` | Create new increment (PM-led) | `/sw:increment "User auth"` |
| `/sw:do` | Execute tasks (auto-resumes) | `/sw:do` or `/sw:do 0031` |
| `/sw:next` | Smart transition (close + suggest) | `/sw:next` |
| `/sw:done` | Manual closure with PM validation | `/sw:done 0031` |
| `/sw:progress` | Check status and next action | `/sw:progress` |
| `/sw:validate` | Validate increment quality | `/sw:validate 0031` |

### Documentation & Sync

| Command | Description | Example |
|---------|-------------|---------|
| `/sw:sync-docs` | Sync living docs | `/sw:sync-docs update` |
| `/sw:sync-tasks` | Sync tasks with status | `/sw:sync-tasks` |

### GitHub Plugin

| Command | Description | Example |
|---------|-------------|---------|
| `/sw-github:create-issue` | Create GitHub issue | `/sw-github:create-issue 0031` |
| `/sw-github:sync` | Two-way sync | `/sw-github:sync 0031` |
| `/sw-github:sync-tasks` | Sync tasks as sub-issues | `/sw-github:sync-tasks 0031` |
| `/sw-github:close-issue` | Close GitHub issue | `/sw-github:close-issue 0031` |
| `/sw-github:status` | Show sync status | `/sw-github:status` |

---

## ⚠️ NO ROUTING SUPPORT

**Claude Code does not implement command routing!**

This file is a **reference guide only**. You cannot do:
- ❌ `/specweave do` (doesn't work, no routing!)
- ❌ `/specweave inc "feature"` (doesn't work!)
- ❌ `/specweave next` (doesn't work!)

**Instead, always use full namespaced commands:**
- ✅ `/sw:do`
- ✅ `/sw:increment "feature"`
- ✅ `/sw:next`

**Why This Matters:**
Calling both `/specweave` and `/sw:do` causes **duplicate invocations**! Always use the namespaced version with the colon.

---

## Usage Examples

### ✅ CORRECT Usage

```bash
# Create increment
/sw:increment "User authentication"

# Execute tasks
/sw:do

# Check progress
/sw:progress

# Complete increment
/sw:done 0031
```

### ❌ INCORRECT Usage (Causes Duplicates!)

```bash
# DO NOT use routing syntax:
/specweave do           # ❌ Won't work, no routing!
/specweave inc "feat"   # ❌ Won't work!
/specweave next         # ❌ Won't work!

# ALWAYS use namespaced commands:
/sw:do           # ✅ Correct!
/sw:increment "feat"  # ✅ Correct!
/sw:next         # ✅ Correct!
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

**⚠️ Remember**: Always use `/sw:` with a colon, never `/specweave ` with a space!
