# SpecWeave Plugin Marketplace - Testing Guide

**Date**: 2025-11-03
**Purpose**: Test marketplace registration and plugin installation after fixes
**Prerequisites**: Claude Code v2.0.31 or later

---

## What Was Fixed

✅ **marketplace.json paths**: Changed `./../plugins/` to `../plugins/`
✅ **Plugin names**: Aligned marketplace names with plugin.json names (e.g., "github" → "specweave-github")
✅ **Duplicate commands**: Removed `specweave.sync-github.md` duplicate
✅ **Documentation**: Updated README.md with correct command formats

---

## Testing Steps

### 1. Remove Old Marketplace (if exists)

```bash
# In Claude Code, check current marketplaces
/plugin marketplace list

# If "specweave" marketplace exists, remove it
/plugin marketplace remove specweave

# Verify removal
/plugin marketplace list
```

### 2. Add SpecWeave Marketplace

From your SpecWeave project directory (`/Users/antonabyzov/Projects/github/specweave`):

```bash
# Add marketplace using relative path
/plugin marketplace add ./.claude-plugin

# OR use absolute path
/plugin marketplace add /Users/antonabyzov/Projects/github/specweave/.claude-plugin
```

**Expected output**:
```
✅ Added marketplace: specweave
   Location: /Users/antonabyzov/Projects/github/specweave/.claude-plugin
   Plugins: 18 available
```

### 3. Verify Marketplace Registration

```bash
/plugin marketplace list
```

**Expected output**:
```
Marketplaces:
1. specweave
   - Source: /Users/antonabyzov/Projects/github/specweave/.claude-plugin
   - Plugins: 18
   - Status: Active
```

### 4. Browse Available Plugins

```bash
# Interactive menu
/plugin

# Or list all plugins
/plugin list
```

**Expected output** (should include):
- `specweave` - Core framework
- `specweave-github` - GitHub integration
- `specweave-jira` - Jira integration
- `specweave-kubernetes` - K8s deployment
- ... (14 more plugins)

### 5. Install Core Plugin

```bash
/plugin install specweave@specweave
```

**Expected output**:
```
Installing specweave from specweave marketplace...
✅ Installed specweave v0.6.0

Commands available:
- /specweave:inc
- /specweave:do
- /specweave:next
- /specweave:done
- /specweave:progress
- /specweave:validate
- /specweave:status
- /specweave:close-previous

Skills available:
- increment-planner
- rfc-generator
- context-loader
- tdd-workflow
- brownfield-analyzer
- brownfield-onboarder
- increment-quality-judge
- context-optimizer
- project-kickstarter

Agents available:
- pm
- architect
- tech-lead
```

### 6. Test Core Commands

```bash
# Test autocomplete
# Type: /specweave:
# Should show all core commands in autocomplete dropdown

# Test a command
/specweave:status
```

**Expected**: Command runs successfully, shows increment status

### 7. Install GitHub Plugin

```bash
/plugin install specweave-github@specweave
```

**Expected output**:
```
Installing specweave-github from specweave marketplace...
✅ Installed specweave-github v1.0.0

Commands available:
- /specweave-github:sync
- /specweave-github:create-issue
- /specweave-github:close-issue
- /specweave-github:status
- /specweave-github:sync-tasks

Skills available:
- github-sync
- github-issue-tracker

Agents available:
- github-manager
```

### 8. Test GitHub Commands

```bash
# Test autocomplete
# Type: /specweave-github:
# Should show all GitHub commands in autocomplete dropdown

# Test a command
/specweave-github:status
```

**Expected**: Command runs, checks GitHub sync status

### 9. Verify Command Namespacing

Type each prefix and verify autocomplete shows correct commands:

| Prefix | Expected Commands |
|--------|-------------------|
| `/specweave:` | inc, do, next, done, progress, validate, status, close-previous |
| `/specweave-github:` | sync, create-issue, close-issue, status, sync-tasks |

### 10. Check Skills Activation

Skills should auto-activate based on keywords:

```bash
# Test increment-planner skill
"I want to plan a new increment for user authentication"
# Should activate: increment-planner skill

# Test github-sync skill
"How do I sync my increment with GitHub issues?"
# Should activate: github-sync skill
```

### 11. Test Agent Invocation

Use the Task tool to invoke plugin agents:

```bash
# Test PM agent
"Use the PM agent to analyze this product requirement"
# Should invoke: pm agent from specweave

# Test GitHub manager agent
"Use the GitHub manager to check repository status"
# Should invoke: github-manager agent from specweave-github
```

---

## Troubleshooting

### Commands Not Appearing in Autocomplete

**Symptom**: Typing `/specweave:` shows no commands

**Fixes**:
1. **Restart Claude Code**
   - Close and reopen Claude Code
   - Plugin changes require restart

2. **Check plugin installation**:
   ```bash
   /plugin list
   # Should show "specweave" as installed
   ```

3. **Reinstall plugin**:
   ```bash
   /plugin uninstall specweave
   /plugin install specweave@specweave
   ```

### Marketplace Not Found

**Symptom**: `/plugin marketplace add ./.claude-plugin` fails

**Fixes**:
1. **Use absolute path**:
   ```bash
   /plugin marketplace add /Users/antonabyzov/Projects/github/specweave/.claude-plugin
   ```

2. **Check you're in project root**:
   ```bash
   pwd
   # Should be: /Users/antonabyzov/Projects/github/specweave
   ```

3. **Verify marketplace.json exists**:
   ```bash
   ls -la .claude-plugin/marketplace.json
   # Should exist with 18 plugins
   ```

### Plugin Install Fails

**Symptom**: `/plugin install specweave@specweave` fails

**Possible causes**:
1. **Marketplace not added**: Run `/plugin marketplace add` first
2. **Invalid plugin paths**: Check `marketplace.json` has correct `source` paths
3. **Missing plugin.json**: Verify `plugins/specweave/.claude-plugin/plugin.json` exists

**Debug**:
```bash
# Check marketplace is registered
/plugin marketplace list

# Check plugin exists in marketplace
/plugin list | grep specweave

# Try installing from different marketplace
/plugin install specweave@anthropic  # Official marketplace (won't work for SpecWeave)
```

### Commands Show Wrong Namespace

**Symptom**: Commands appear as `/specweave:inc` instead of `/specweave:inc`

**Cause**: Old commands in `.claude/commands/` directory

**Fix**:
```bash
# Remove old command files (they're now in plugins)
rm -rf .claude/commands/specweave.*

# Restart Claude Code
```

### Skills Not Activating

**Symptom**: Skills don't auto-activate when keywords are mentioned

**Fixes**:
1. **Check skill YAML frontmatter**: Ensure `description:` has clear trigger keywords
2. **Check skill installation**: Skills should be in `.claude/skills/` after plugin install
3. **Restart Claude Code**: Skills load at startup

---

## Validation Checklist

Use this checklist to confirm everything works:

- [ ] Marketplace registered successfully (`/plugin marketplace list`)
- [ ] Core plugin installed (`/plugin list` shows `specweave`)
- [ ] Core commands autocomplete (`/specweave:` shows 8 commands)
- [ ] Core commands execute (`/specweave:status` works)
- [ ] GitHub plugin installed (`/plugin list` shows `specweave-github`)
- [ ] GitHub commands autocomplete (`/specweave-github:` shows 5 commands)
- [ ] GitHub commands execute (`/specweave-github:status` works)
- [ ] Skills auto-activate (mention "increment planning" → skill activates)
- [ ] Agents invocable (use Task tool → PM agent works)
- [ ] No old commands conflict (no `/specweave:inc` in autocomplete)

---

## Expected Final State

After all tests pass, you should have:

**Installed Plugins**:
- `specweave@0.6.0` ← Core framework
- `specweave-github@1.0.0` ← GitHub integration

**Available Commands** (autocomplete with `/specweave`):
```
/specweave:inc
/specweave:do
/specweave:next
/specweave:done
/specweave:progress
/specweave:validate
/specweave:status
/specweave:close-previous
/specweave-github:sync
/specweave-github:create-issue
/specweave-github:close-issue
/specweave-github:status
/specweave-github:sync-tasks
```

**Active Skills** (auto-activate):
- increment-planner, rfc-generator, context-loader, tdd-workflow (core)
- github-sync, github-issue-tracker (github)

**Available Agents** (via Task tool):
- pm, architect, tech-lead (core)
- github-manager (github)

---

## Next Steps

Once testing is complete:

1. **Install more plugins** as needed:
   ```bash
   /plugin install specweave-kubernetes@specweave
   /plugin install specweave-figma@specweave
   /plugin install specweave-frontend@specweave
   ```

2. **Use commands** in your workflow:
   ```bash
   /specweave:inc "new feature"
   /specweave:do
   /specweave-github:sync 0006
   ```

3. **Share feedback**: Open GitHub issue if anything doesn't work

---

## References

- **Marketplace**: `.claude-plugin/marketplace.json`
- **Plugins**: `plugins/specweave-*/.claude-plugin/plugin.json`
- **Commands**: `plugins/specweave-*/commands/*.md`
- **Skills**: `plugins/specweave-*/skills/*/SKILL.md`
- **Agents**: `plugins/specweave-*/agents/*/AGENT.md`

**Claude Code Docs**:
- https://docs.claude.com/en/docs/claude-code/plugins
- https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- https://docs.claude.com/en/docs/claude-code/slash-commands

---

**Status**: Ready for Testing ✅
**Last Updated**: 2025-11-03
