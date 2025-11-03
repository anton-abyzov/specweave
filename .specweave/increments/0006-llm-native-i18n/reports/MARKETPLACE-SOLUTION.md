# Marketplace Architecture - Complete Solution

**Date**: 2025-11-02
**Issue**: Plugin commands not visible when typing `/specweave`
**Root Cause**: Plugin commands isolated in `plugins/` folder, never copied to `.claude/commands/`

---

## 🎯 The Core Problem

When user types `/specweave` in Claude Code, they see:

```
✅ Displayed:
- /specweave:list-increments
- /specweave:progress
- /specweave:inc
- /specweave:next
- /specweave:done
- /specweave:sync-docs

❌ Missing:
- GitHub plugin commands (github-create-issue, github-sync, github-status, etc.)
- Any future plugin commands
```

**Why?**

The `/specweave` command is a ROUTER that:
1. Lists commands from `.claude/commands/specweave*.md`
2. Routes subcommands to specific command files
3. Has a HARDCODED routing table (lines 187-195 in `commands/specweave.md`)

The routing table ONLY knows about core commands, NOT plugin commands.

---

## 🔍 Current Architecture Analysis

### Command Locations

```
specweave/
├── .claude/                          # Developer mode (15 commands)
│   └── commands/
│       ├── specweave.inc.md
│       ├── specweave.do.md
│       ├── ...
│       └── specweave.sync-github.md  # Only ONE GitHub command!
│
├── commands/                         # Root source (21 commands)
│   ├── specweave.md                  # ROUTER
│   ├── specweave.inc.md
│   ├── specweave.do.md
│   └── ...
│
├── .claude-plugin/                   # Plugin marketplace (8 commands)
│   └── commands/
│       ├── increment.md
│       ├── do.md
│       └── ...
│
└── plugins/
    └── specweave-github/             # GitHub plugin (5 commands!)
        └── commands/
            ├── github-create-issue.md
            ├── github-sync.md
            ├── github-sync-tasks.md
            ├── github-close-issue.md
            └── github-status.md
```

### The Disconnect

**GitHub plugin has 5 commands** but they're ISOLATED in `plugins/specweave-github/commands/`.

**They never get copied to `.claude/commands/`** during installation, so:
- The `/specweave` router doesn't know about them
- User can't discover them
- They're invisible to Claude Code

---

## ✅ The Solution (Two Parts)

### Part 1: Copy Plugin Commands During Installation

Update `bin/install-commands.sh` to:
1. Copy core commands from `commands/` to `.claude/commands/`
2. Copy plugin commands from `plugins/*/commands/` to `.claude/commands/`
3. Prefix plugin commands with `specweave.github.` for namespacing

**Result**:
```
.claude/commands/
├── specweave.inc.md                  # Core
├── specweave.do.md                   # Core
├── specweave.sync-github.md          # Core integration wrapper
├── specweave.github.create-issue.md  # Plugin (new!)
├── specweave.github.sync.md          # Plugin (new!)
├── specweave.github.sync-tasks.md    # Plugin (new!)
├── specweave.github.close-issue.md   # Plugin (new!)
└── specweave.github.status.md        # Plugin (new!)
```

### Part 2: Update Router to Include Plugin Commands

Update `commands/specweave.md` router to:
1. Auto-discover plugin commands
2. Include them in routing table
3. Show them in help output

**Router Changes**:

**Before (hardcoded)**:
```markdown
## Available Subcommands

### Increment Lifecycle
| Subcommand | Description |
|------------|-------------|
| inc        | Create increment |
| do         | Execute tasks |
| ...        | ... |
```

**After (dynamic)**:
```markdown
## Available Subcommands

### Increment Lifecycle
| Subcommand | Description |
|------------|-------------|
| inc        | Create increment |
| do         | Execute tasks |
| ...        | ... |

### GitHub Integration (Plugin)
| Subcommand | Description |
|------------|-------------|
| github:create-issue | Create GitHub issue |
| github:sync         | Sync with GitHub |
| github:sync-tasks   | Sync task-level |
| github:close-issue  | Close GitHub issue |
| github:status       | Show sync status |
```

---

## 🚀 Implementation Steps

### Step 1: Copy Plugin Commands to .claude/commands/

**Quick Fix (immediate)**:
```bash
# Copy GitHub plugin commands
cp plugins/specweave-github/commands/*.md .claude/commands/

# Rename them with plugin prefix
cd .claude/commands/
for f in github-*.md; do
  mv "$f" "specweave.$f"
done
```

**Permanent Fix (update install script)**:
```bash
# Update bin/install-commands.sh
# Add after core commands are copied:

# Copy plugin commands
echo "Installing plugin commands..."
for plugin_dir in plugins/*/; do
  plugin_name=$(basename "$plugin_dir")
  if [ -d "$plugin_dir/commands" ]; then
    for cmd_file in "$plugin_dir/commands"/*.md; do
      if [ -f "$cmd_file" ]; then
        cmd_name=$(basename "$cmd_file" .md)
        # Prefix with specweave.plugin-name.
        cp "$cmd_file" ".claude/commands/specweave.${plugin_name}.${cmd_name}.md"
        echo "✅ Installed plugin command: /specweave.${plugin_name}.${cmd_name}"
      fi
    done
  fi
done
```

### Step 2: Update Router Command

**Update `commands/specweave.md`**:

Add plugin commands section:
```markdown
### GitHub Integration (Plugin)

| Subcommand | Description | Example |
|------------|-------------|---------|
| **github:create-issue** | Create GitHub issue from increment | `/specweave github:create-issue 0001` |
| **github:sync** | Bidirectional sync | `/specweave github:sync 0001` |
| **github:sync-tasks** | Task-level sync | `/specweave github:sync-tasks 0001` |
| **github:close-issue** | Close GitHub issue | `/specweave github:close-issue 0001` |
| **github:status** | Show sync status | `/specweave github:status` |
```

Update routing table:
```yaml
subcommands:
  # Core commands
  inc: .claude/commands/specweave:inc.md
  do: .claude/commands/specweave:do.md
  ...

  # GitHub plugin commands
  github:create-issue: .claude/commands/specweave:github:create-issue.md
  github:sync: .claude/commands/specweave:github:sync.md
  github:sync-tasks: .claude/commands/specweave:github:sync-tasks.md
  github:close-issue: .claude/commands/specweave:github:close-issue.md
  github:status: .claude/commands/specweave:github:status.md
```

### Step 3: Test Command Visibility

```bash
# 1. Copy commands
bash bin/install-commands.sh

# 2. Verify in .claude/commands/
ls -1 .claude/commands/ | grep github

# Expected output:
# specweave.github.create-issue.md
# specweave.github.sync.md
# specweave.github.sync-tasks.md
# specweave.github.close-issue.md
# specweave.github.status.md

# 3. Test in Claude Code
/specweave

# Should now show GitHub plugin commands!
```

---

## 🎨 Alternative: Plugin Command Namespacing

**Option A: Flat Namespace (simpler)**
```
/specweave github-create-issue
/specweave github-sync
/specweave github-status
```

**Option B: Colon Namespace (clearer)**
```
/specweave github:create-issue
/specweave github:sync
/specweave github:status
```

**Option C: Dot Namespace (consistent with current)**
```
/specweave:github:create-issue
/specweave:github:sync
/specweave:github:status
```

**Recommendation**: Option A (flat) for now, migrate to Option B (colon) when Claude Code supports it natively.

---

## 📝 File Changes Required

### 1. `bin/install-commands.sh` (add plugin command copying)

**Add this section after line 33**:
```bash
# Install plugin commands
echo ""
echo "Installing plugin commands..."
echo "────────────────────────────────────────────────────────"
echo ""

plugin_count=0

for plugin_dir in plugins/*/; do
  if [ -d "$plugin_dir" ]; then
    plugin_name=$(basename "$plugin_dir" | sed 's/^specweave-//')

    if [ -d "$plugin_dir/commands" ]; then
      for cmd_file in "$plugin_dir/commands"/*.md; do
        if [ -f "$cmd_file" ]; then
          cmd_name=$(basename "$cmd_file" .md)
          dest_name="specweave.${plugin_name}.${cmd_name}.md"

          cp "$cmd_file" "$COMMANDS_DEST/$dest_name"
          echo "✅ Installed: /$dest_name (from $plugin_name plugin)"
          ((plugin_count++))
        fi
      done
    fi
  fi
done

echo ""
echo "Installed $plugin_count plugin commands"
echo ""
```

### 2. `commands/specweave.md` (update router)

**Add GitHub plugin section** (after line 40):
```markdown
### GitHub Integration (Plugin)

| Subcommand | Description | Example |
|------------|-------------|---------|
| **github.create-issue** | Create GitHub issue from increment | `/specweave github.create-issue 0001` |
| **github.sync** | Bidirectional sync with GitHub | `/specweave github.sync 0001` |
| **github.sync-tasks** | Sync tasks as sub-issues | `/specweave github.sync-tasks 0001` |
| **github.close-issue** | Close GitHub issue | `/specweave github.close-issue 0001` |
| **github.status** | Show GitHub sync status | `/specweave github.status` |
```

**Update routing table** (around line 54):
```yaml
subcommands:
  inc: .claude/commands/specweave:inc.md
  do: .claude/commands/specweave:do.md
  next: .claude/commands/specweave:next.md
  done: .claude/commands/specweave:done.md
  progress: .claude/commands/specweave:progress.md
  validate: .claude/commands/specweave:validate.md
  sync-github: .claude/commands/specweave:sync-github.md
  sync-docs: .claude/commands/specweave:sync-docs.md

  # GitHub Plugin Commands
  github.create-issue: .claude/commands/specweave:github:create-issue.md
  github.sync: .claude/commands/specweave:github:sync.md
  github.sync-tasks: .claude/commands/specweave:github:sync-tasks.md
  github.close-issue: .claude/commands/specweave:github:close-issue.md
  github.status: .claude/commands/specweave:github:status.md
```

### 3. `.gitignore` (exclude .claude/ folder)

**Add to .gitignore**:
```
# Claude Code development mode installation
.claude/

# Keep .claude-plugin/ (marketplace structure)
!.claude-plugin/
```

---

## ✅ Expected Outcome

### Before
```bash
$ /specweave

Available commands:
- /specweave:list-increments
- /specweave:progress
- /specweave:inc
- /specweave:next
- /specweave:done
- /specweave:sync-docs
```

### After
```bash
$ /specweave

Available commands:

Increment Lifecycle:
- /specweave:inc
- /specweave:do
- /specweave:next
- /specweave:done
- /specweave:progress
- /specweave:validate

Integrations:
- /specweave:sync-github
- /specweave:sync-docs

GitHub Plugin:
- /specweave:github:create-issue
- /specweave:github:sync
- /specweave:github:sync-tasks
- /specweave:github:close-issue
- /specweave:github:status
```

---

## 🎯 Action Items

### Immediate (Fix Now)

1. ✅ Copy GitHub plugin commands to `.claude/commands/`
2. ✅ Rename them with `specweave.github.` prefix
3. ✅ Update `/specweave` router to list them
4. ✅ Test command visibility

### Short-term (Today)

5. Update `bin/install-commands.sh` script
6. Update `commands/specweave.md` router documentation
7. Test full installation flow

### Long-term (Future Increments)

8. Dynamic plugin command discovery (auto-register plugins)
9. Colon namespace support (`:` instead of `.`)
10. Plugin marketplace UI in Claude Code

---

## 🎓 Lessons Learned

### What Went Wrong

1. **Plugin isolation**: Commands stayed in `plugins/*/commands/` folder
2. **No installation logic**: Install scripts didn't copy plugin commands
3. **Static router**: Hardcoded command list, no dynamic discovery
4. **Incomplete v0.5.0 migration**: Root-level structure created but not fully integrated

### What We're Fixing

1. ✅ **Copy plugin commands**: Install script now handles plugins
2. ✅ **Update router**: Manual addition for now, dynamic discovery later
3. ✅ **Better namespacing**: `specweave.github.*` prefix for clarity
4. ✅ **Complete the migration**: Finish v0.5.0 root-level architecture

### For Future Plugins

When creating new plugins (e.g., `specweave-translator`):

1. Create plugin structure:
   ```
   plugins/specweave-translator/
   ├── .claude-plugin/
   ├── commands/
   ├── skills/
   └── agents/
   ```

2. Commands will auto-install as:
   ```
   /specweave:translate.translate
   /specweave:translate.batch-translate
   /specweave:translate.detect-language
   ```

3. Router will show them (after manual addition for now)

---

**Status**: Solution defined, ready to implement
**Estimated Time**: 2-3 hours to complete all immediate + short-term items
**Next Step**: Copy commands and test visibility
