# Hook Architecture Correction - How Claude Code Hooks ACTUALLY Work

**Date**: 2025-11-10
**Severity**: CRITICAL MISUNDERSTANDING CORRECTED
**Source**: https://code.claude.com/docs/en/hooks

---

## ❌ What I Thought (WRONG)

```
Hooks must be copied to .claude/hooks/
    ↓
Claude Code executes from .claude/hooks/
    ↓
Hooks are "installed" by copying files
```

**This is COMPLETELY WRONG!**

---

## ✅ How Claude Code Hooks ACTUALLY Work

### 1. Hook Storage (NO Copying!)

**Hooks stay in the plugin directory:**

```
plugins/specweave/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json              ← Hook configuration (references .sh files)
│   ├── post-task-completion.sh ← Stays here (NOT copied!)
│   └── post-increment-planning.sh
└── ...
```

### 2. Hook Discovery (Automatic Merge)

**From plugin.json:**
```json
{
  "name": "specweave",
  "hooks": "hooks/hooks.json"  ← Points to hooks.json
}
```

**From hooks/hooks.json:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh"
        }]
      }
    ]
  }
}
```

**Key: `${CLAUDE_PLUGIN_ROOT}` resolves to the plugin directory!**

### 3. Hook Execution Flow

```
1. User installs plugin:
   /plugin install specweave

2. Claude Code reads:
   plugins/specweave/.claude-plugin/plugin.json
   ↓
   "hooks": "hooks/hooks.json"
   ↓
   plugins/specweave/hooks/hooks.json
   ↓
   Discovers: PostToolUse → TodoWrite → run post-task-completion.sh

3. When TodoWrite fires:
   Claude Code executes:
   ${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh
   ↓
   Resolves to:
   plugins/specweave/hooks/post-task-completion.sh
   ↓
   Hook runs!
```

**NO COPYING NEEDED!**

---

## 🔑 Key Architectural Facts

### Fact 1: Hooks Are Configuration, Not Files

> "Plugin hooks are defined in the plugin's `hooks/hooks.json` file"

Hooks are **configuration** (JSON), not file copying!

### Fact 2: Automatic Merging

> "When a plugin is enabled, its hooks are merged with user and project hooks"

Claude Code **automatically discovers** and **merges** plugin hooks at runtime.

### Fact 3: No Installation Step

**Hooks are purely configuration-driven**:
- Plugin has `hooks.json`
- Claude Code reads it when plugin loads
- Hooks are available immediately
- NO copying, NO installation scripts needed

### Fact 4: ${CLAUDE_PLUGIN_ROOT} Magic

```bash
${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh
```

This resolves to:
- **User installs from marketplace**: `~/.claude/plugins/specweave/hooks/post-task-completion.sh`
- **Local development**: `/path/to/specweave/plugins/specweave/hooks/post-task-completion.sh`

### Fact 5: .claude/hooks/ Is NOT Used

The `.claude/hooks/` directory is **NOT part of the hook system**!

**What .claude/ actually contains:**
- `.claude/settings.json` - User/project settings (marketplace config, preferences)
- `.claude/settings.local.json` - Local overrides (gitignored)

**NOT:**
- ❌ `.claude/hooks/` - This directory is irrelevant to Claude Code!

---

## 🐛 The Bug I Introduced

### What I Did Wrong

```typescript
// In src/cli/commands/init.ts
async function copyTemplates() {
  // ❌ WRONG: Copying hooks to .claude/hooks/
  cp plugins/specweave/hooks/*.sh .claude/hooks/
}
```

### Why It Seemed to "Work"

It didn't actually work via .claude/hooks/!

**Hooks worked because:**
1. Plugin was installed: `/plugin install specweave`
2. Plugin's `hooks.json` was discovered
3. Hooks ran from `plugins/specweave/hooks/` via `${CLAUDE_PLUGIN_ROOT}`

**The .claude/hooks/ copies were IGNORED!**

---

## ✅ Correct Architecture

### For Plugin Authors (SpecWeave Development)

**Structure:**
```
plugins/specweave/
├── .claude-plugin/
│   └── plugin.json           ← "hooks": "hooks/hooks.json"
├── hooks/
│   ├── hooks.json            ← Hook configuration
│   ├── post-task-completion.sh
│   └── *.sh files
└── ...
```

**NO copying needed!** Hooks stay in `plugins/specweave/hooks/`.

### For Plugin Users (User Projects)

**After `specweave init`:**
```
my-project/
├── .claude/
│   └── settings.json         ← Marketplace reference only
├── .specweave/
│   ├── config.json           ← Sync settings (owner/repo/etc.)
│   └── ...
└── ...
```

**Hooks are loaded from the installed plugin**, not from the project!

---

## 🔧 What Needs to Change

### 1. Remove Hook Copying from init.ts

```diff
- // Copy hooks to .claude/hooks/
- cp plugins/specweave/hooks/*.sh .claude/hooks/

+ // Hooks are automatically discovered from plugin
+ // No copying needed!
```

### 2. Ensure Plugin Is Installed

```typescript
// The ONLY thing init needs to do:
await installPlugin('specweave', language);

// This installs the plugin, which makes hooks available
```

### 3. Write Sync Config (This Part Was Correct!)

```typescript
// This WAS needed:
await writeSyncConfig(projectPath, tracker, credentials);

// Because hooks need config.json to know:
// - sync.enabled
// - sync.profiles (owner/repo)
// - hooks.post_task_completion settings
```

---

## 📚 Official Documentation

**Read**: https://code.claude.com/docs/en/hooks

**Key Quotes:**

> "Plugin hooks are defined in the plugin's `hooks/hooks.json` file or in a file given by a custom path to the `hooks` field."

> "When a plugin is enabled, its hooks are merged with user and project hooks"

> "Claude Code: (1) Captures a snapshot of hooks at startup (2) Uses this snapshot throughout the session"

---

## 🎯 Corrected Understanding

### What Makes Hooks Work

1. ✅ Plugin installed: `/plugin install specweave`
2. ✅ Plugin has `hooks.json` referencing .sh files
3. ✅ Config exists: `.specweave/config.json` with sync settings
4. ✅ Hook fires: `${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh`
5. ✅ Hook reads config and syncs

### What Doesn't Matter

1. ❌ `.claude/hooks/` directory - IRRELEVANT
2. ❌ Copying .sh files - UNNECESSARY
3. ❌ "Installing" hooks - NO SUCH CONCEPT

---

## 🚨 Action Items

1. **Remove hook copying from init.ts** (it's noise)
2. **Update CLAUDE.md** with correct hook architecture
3. **Document ${CLAUDE_PLUGIN_ROOT}** clearly
4. **Test that hooks work via plugin** (not copied files)

---

## 🎓 Lessons Learned

**I misunderstood** how Claude Code's plugin system works because:
1. I assumed it worked like git hooks (files in .git/hooks/)
2. I didn't read the official documentation carefully
3. I saw `.claude/hooks/` and assumed it was for hook storage

**Correct mental model**:
- Plugins are like **npm packages** (installed globally)
- Hooks are like **package.json scripts** (configuration, not files)
- `${CLAUDE_PLUGIN_ROOT}` is like **node_modules/package/** (resolved at runtime)

---

**Bottom Line**: `.claude/hooks/` is a red herring! Hooks work via plugin `hooks.json`, period.
