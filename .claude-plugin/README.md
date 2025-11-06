# SpecWeave Plugin Marketplace (Local)

This directory contains the Claude Code native plugin structure for SpecWeave.

---

## Quick Setup (For Contributors)

### Option 1: Automatic Setup (✅ Recommended)

When you clone this repo and **trust the folder** in Claude Code:

1. **Trust the SpecWeave folder** when prompted by Claude Code
2. The `.claude/settings.json` file **automatically registers** the marketplace
3. Install the core plugin:
   ```
   /plugin install specweave
   ```
4. **Restart Claude Code**
5. Commands are now available: `/specweave:inc`, `/specweave:do`, etc.

**How it works**: The `.claude/settings.json` file contains:
```json
{
  "extraKnownMarketplaces": {
    "specweave": {"source": "../.claude-plugin"}
  }
}
```

This tells Claude Code to auto-register the marketplace when the folder is trusted.

### Option 2: Manual Setup

If automatic setup doesn't work (or folder not trusted):

```bash
# 1. Register the marketplace manually
/plugin marketplace add ./.claude-plugin

# 2. Verify registration
/plugin marketplace list
# Should show "specweave" marketplace

# 3. Install core plugin
/plugin install specweave

# 4. (Optional) Install other plugins as needed
/plugin install specweave-github

# 5. Restart Claude Code
```

### Verify Installation

After installing plugins, type `/specweave:` to see available commands:
- `/specweave:inc` - Plan new increment (alias for /specweave:increment)
- `/specweave:do` - Execute tasks
- `/specweave:next` - Smart transition
- `/specweave:done` - Close increment
- `/specweave:progress` - Show status
- `/specweave:validate` - Validate increment
- ... (19 total commands)

Type `/github:` to see GitHub commands (if installed):
- `/github:sync` - Sync with GitHub Issues
- `/github:create-issue` - Create issue
- `/github:close-issue` - Close issue
- `/github:status` - GitHub status

## Marketplace Structure

```
.claude-plugin/
├── marketplace.json      # Plugin registry (18 SpecWeave plugins)
└── README.md             # This file

plugins/                  # Individual plugin locations
├── specweave/.claude-plugin/plugin.json       # Core plugin manifest
├── specweave-github/.claude-plugin/plugin.json     # GitHub plugin manifest
├── specweave-figma/.claude-plugin/plugin.json      # Figma plugin manifest
└── ... (18 plugins total, each with plugin.json)
```

**Note**: The marketplace itself (`marketplace.json`) is a registry that points to plugins. Each individual plugin has its own `plugin.json` manifest in `plugins/*/.claude-plugin/`.

## Marketplace Schema

SpecWeave's marketplace.json follows Claude's official schema format. Here's the structure:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "specweave",
  "version": "0.6.0",
  "description": "SpecWeave - Spec-Driven Development Framework",
  "owner": {
    "name": "Anton Abyzov",
    "email": "anton@spec-weave.com"
  },
  "plugins": [
    {
      "name": "specweave-github",
      "description": "GitHub integration - bidirectional sync",
      "source": "../plugins/specweave-github",
      "category": "productivity",
      "version": "1.0.0",
      "author": {
        "name": "Anton Abyzov",
        "email": "anton@spec-weave.com"
      }
    }
  ]
}
```

**Key Schema Requirements**:
- ✅ `$schema` - References Claude's official marketplace schema
- ✅ `source` - Relative path to plugin directory (e.g., `"../plugins/specweave-github"`)
- ✅ `category` - Plugin category: `development`, `productivity`, `security`, or `learning`
- ✅ `author.email` - Author email address (required by Claude's schema)
- ❌ No separate `path` field (follows Claude's schema)
- ❌ No `source: "local"` type indicator (follows Claude's schema)

## How It Works

**Without Plugin System** (old):
- Commands: `/specweave.increment`, `/specweave:do`
- Direct commands in `.claude/commands/`
- No namespacing

**With Plugin System** (new):
- Commands: `/specweave:inc`, `/specweave:do`, `/specweave-github:sync`
- Plugin-namespaced via `.claude-plugin/`
- Proper marketplace structure
- Each plugin has its own namespace (e.g., `specweave`, `specweave-github`)

## Available Plugins

### 1. SpecWeave Core (`specweave`)
**Commands** (invoked as `/specweave:command`):
- `increment` - Plan new product increment
- `do` - Execute implementation tasks
- `next` - Smart increment transition
- `done` - Close increment with validation
- `progress` - Show increment progress
- `validate` - Validate increment quality
- `status` - Show all increments
- `close-previous` - Close incomplete increments

**Skills**:
- `increment-planner` - PM-led planning workflow
- `spec-generator` - Specification creation
- `context-loader` - Context management
- `brownfield-analyzer` - Existing project analysis
- `brownfield-onboarder` - Onboard existing docs
- `increment-quality-judge` - Quality assessment
- `context-optimizer` - Context optimization
- `project-kickstarter` - New project setup

**Agents**:
- `pm` - Product Manager
- `architect` - System Architect
- `tech-lead` - Technical Lead

### 2. GitHub Integration (`specweave-github`)
**Location**: `./plugins/specweave-github`

**Commands** (invoked as `/specweave-github:command`):
- `create-issue` - Create GitHub issue
- `sync` - Sync increments with issues
- `close-issue` - Close GitHub issue
- `status` - Show GitHub sync status

**Skills**:
- `github-sync` - Bidirectional sync
- `github-issue-tracker` - Task-level tracking

**Agents**:
- `github-manager` - GitHub CLI specialist

## Troubleshooting

### 🚨 "I don't see any /specweave commands!"

**This is the most common issue.** Here's the step-by-step fix:

**Diagnosis**:
```bash
# Check if marketplace is registered
/plugin marketplace list
```

**If marketplace NOT listed**:
```bash
# Register it manually
/plugin marketplace add ./.claude-plugin

# Verify
/plugin marketplace list
# Should now show "specweave"
```

**If marketplace IS listed, but plugins not installed**:
```bash
# Check installed plugins
/plugin list

# If specweave is missing, install it
/plugin install specweave

# Restart Claude Code
```

**If plugins ARE installed, but commands still missing**:
```bash
# Check if command files exist
ls .claude/commands/

# Should show specweave.*.md files
# If missing, reinstall plugin:
/plugin uninstall specweave
/plugin install specweave

# Then restart Claude Code
```

### Commands still show as `/specweave.increment` (dot, not colon)

This means you're using the **old direct command structure**, not the plugin system.

**Fix**:
1. Remove old commands:
   ```bash
   rm -rf .claude/commands/specweave.*
   ```

2. Follow Quick Setup above to install via plugin system

**Result**: Commands will now be `/specweave:increment` (colon-namespaced)

### Can't find marketplace

**Path issues**: The marketplace path must be relative to your **current working directory**.

```bash
# ✅ Correct (from SpecWeave root)
/plugin marketplace add ./.claude-plugin

# ✅ Also works (absolute path, always works)
/plugin marketplace add /Users/antonabyzov/Projects/github/specweave/.claude-plugin

# ❌ Wrong (from subdirectory)
cd plugins/
/plugin marketplace add ./.claude-plugin  # Won't work! Wrong path
```

**Solution**: Always run from SpecWeave project root, or use absolute path.

### Marketplace registered, but plugins not showing

1. **Check marketplace is valid**:
   ```bash
   cat .claude-plugin/marketplace.json | head -20
   ```
   Should show JSON with `"name": "specweave"` and `"plugins": [...]`

2. **Refresh marketplace**:
   ```bash
   /plugin marketplace refresh specweave
   ```

3. **Browse available plugins**:
   ```bash
   /plugin
   ```
   Should show interactive menu with 18 SpecWeave plugins

4. **Install specific plugin**:
   ```bash
   /plugin install specweave
   ```

### ".claude/settings.json not working"

The auto-registration via `.claude/settings.json` only works when:

1. ✅ Folder is **trusted** in Claude Code
2. ✅ File is committed to git (not gitignored)
3. ✅ Paths are correct (relative to project root)

**Check trust status**:
- Claude Code will prompt to trust folder on first open
- If already opened, check Claude Code settings for trusted folders

**Check file isn't gitignored**:
```bash
git check-ignore .claude/settings.json
# Should show: (empty output) or "NOT ignored"
```

**If gitignored**, force-add it:
```bash
git add -f .claude/settings.json
git commit -m "feat: add Claude settings for auto-marketplace registration"
```

## Support

- **Docs**: https://spec-weave.com
- **GitHub**: https://github.com/anton-abyzov/specweave
- **Issues**: https://github.com/anton-abyzov/specweave/issues
