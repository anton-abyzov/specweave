---
name: plugin-expert
description: Expert knowledge of Claude Code's plugin system, marketplace management, and installation commands. Activates for plugin installation, marketplace setup, plugin troubleshooting, plugin commands. Keywords plugin install, plugin marketplace, claude code plugins, plugin management, plugin errors, marketplace add, plugin list.
---

# Plugin Expert - Claude Code Plugin System Authority

**Purpose**: Authoritative source of truth for Claude Code's plugin system, marketplace management, and correct installation syntax.

**When to Consult**: ANY time you need to install, manage, or reference Claude Code plugins.

---

## 🚨 CRITICAL: Correct Plugin Installation Format

**ALWAYS use this format**:
```bash
/plugin install <plugin-name>
```

**Examples**:
```bash
# ✅ CORRECT
/plugin install specweave-github
/plugin install specweave-jira
/plugin install specweave-kubernetes

# ❌ WRONG - NEVER use @marketplace suffix
/plugin install specweave-github@specweave
/plugin install specweave-jira@specweave
```

**Why this matters**:
- Claude Code automatically resolves plugins from registered marketplaces
- The `@marketplace` syntax does NOT exist in Claude Code
- Using wrong syntax causes installation failures

---

## Official Documentation

**Primary Sources** (ALWAYS defer to these):
1. **Plugin System**: https://code.claude.com/docs/en/plugins
2. **Marketplaces**: https://code.claude.com/docs/en/plugin-marketplaces
3. **Blog Post**: https://claude.com/blog/claude-code-plugins

---

## Plugin Commands Reference

### Installation

```bash
# Install plugin from registered marketplace
/plugin install <plugin-name>

# Examples
/plugin install specweave
/plugin install specweave-github
/plugin install specweave-jira
```

### Marketplace Management

```bash
# List all available marketplaces
/plugin marketplace list

# Add marketplace (GitHub)
/plugin marketplace add <owner>/<repo>
# Example: /plugin marketplace add anton-abyzov/specweave

# Add marketplace (local directory - development only)
/plugin marketplace add /path/to/.claude-plugin

# Remove marketplace
/plugin marketplace remove <marketplace-name>
```

### Plugin Management

```bash
# List installed plugins
/plugin list --installed

# List all available plugins from marketplaces
/plugin list

# Get plugin info
/plugin info <plugin-name>

# Uninstall plugin
/plugin uninstall <plugin-name>

# Update plugin
/plugin update <plugin-name>
```

---

## SpecWeave Marketplace Setup

### User Projects (Production)

SpecWeave automatically registers the GitHub marketplace during `specweave init`:

**File**: `.claude/settings.json`
```json
{
  "extraKnownMarketplaces": {
    "specweave": {
      "source": {
        "source": "github",
        "repo": "anton-abyzov/specweave",
        "path": ".claude-plugin"
      }
    }
  }
}
```

**Result**: Claude Code fetches plugins from GitHub on-demand (no local copies)

### SpecWeave Repo (Development)

For contributors working on SpecWeave itself:

```bash
# Add local marketplace (CLI only - settings.json doesn't support local paths)
/plugin marketplace add ./.claude-plugin

# Then install plugins
/plugin install specweave
/plugin install specweave-github
```

---

## Available SpecWeave Plugins

### Core (Auto-Installed)

- **specweave** - Framework essentials (increment planning, PM/Architect agents, living docs)
  - Auto-installed during `specweave init`
  - Provides: 9 skills, 22 agents, 22 commands, 8 hooks

### Issue Trackers

- **specweave-github** - GitHub Issues integration
  - Install: `/plugin install specweave-github`
  - Provides: GitHub sync, PR automation, issue tracking

- **specweave-jira** - Jira integration
  - Install: `/plugin install specweave-jira`
  - Provides: Jira sync, epic management, sprint tracking

- **specweave-ado** - Azure DevOps integration
  - Install: `/plugin install specweave-ado`
  - Provides: ADO work items, boards, sprints

### Tech Stacks

- **specweave-frontend** - React, Next.js, Vue, Angular
  - Install: `/plugin install specweave-frontend`
  - Provides: Frontend expert agent, component generation, design system integration

- **specweave-kubernetes** - K8s, Helm, kubectl
  - Install: `/plugin install specweave-kubernetes`
  - Provides: K8s expert agent, Helm chart generation, deployment validation

- **specweave-ml** - TensorFlow, PyTorch, ML workflows
  - Install: `/plugin install specweave-ml`
  - Provides: ML expert agent, training pipelines, model deployment

### Utilities

- **specweave-diagrams** - Mermaid + C4 diagrams
  - Install: `/plugin install specweave-diagrams`
  - Provides: Architecture diagram generation, C4 model support

- **specweave-docs-preview** - Docusaurus documentation preview
  - Install: `/plugin install specweave-docs-preview`
  - Provides: Beautiful docs UI, hot reload, Mermaid rendering

---

## Common Mistakes to Avoid

### ❌ Wrong: Using @marketplace Syntax

```bash
# NEVER DO THIS
/plugin install specweave-github@specweave
/plugin install specweave-jira@specweave
```

**Why wrong**: Claude Code doesn't support `@marketplace` suffix

**Correct**:
```bash
/plugin install specweave-github
/plugin install specweave-jira
```

### ❌ Wrong: Using Local Paths in settings.json

```json
{
  "extraKnownMarketplaces": {
    "specweave": {
      "source": "./.claude-plugin"  // ❌ NOT supported
    }
  }
}
```

**Why wrong**: `extraKnownMarketplaces` in settings.json only supports remote sources (GitHub, Git)

**Correct for development**:
```bash
# Use CLI instead
/plugin marketplace add ./.claude-plugin
```

### ❌ Wrong: Forgetting Marketplace Registration

```bash
# Install without marketplace registered
/plugin install specweave-github  # ❌ Fails: marketplace not found
```

**Correct**:
```bash
# 1. Register marketplace first (or ensure settings.json has it)
/plugin marketplace add anton-abyzov/specweave

# 2. Then install plugins
/plugin install specweave-github
```

---

## Troubleshooting

### "Marketplace not found" Error

**Symptom**: `/plugin install specweave-xxx` fails with "marketplace not found"

**Fix**:
```bash
# Check registered marketplaces
/plugin marketplace list

# If specweave not listed, add it
/plugin marketplace add anton-abyzov/specweave

# Then retry install
/plugin install specweave-xxx
```

### Plugin Not Auto-Activating

**Symptom**: Plugin installed but skills/agents not working

**Causes**:
1. Claude Code needs restart after plugin install
2. Skill description keywords don't match user's context
3. Plugin has errors (check plugin logs)

**Fix**:
```bash
# 1. Verify plugin installed
/plugin list --installed

# 2. Restart Claude Code

# 3. Check skill descriptions match your context
```

### Installation Hangs or Fails

**Symptom**: `/plugin install` hangs or times out

**Causes**:
1. Network issues (GitHub fetch failed)
2. Marketplace not registered
3. Plugin doesn't exist in marketplace

**Fix**:
```bash
# 1. Check marketplace registered
/plugin marketplace list

# 2. Verify plugin exists
/plugin list  # Shows all available plugins

# 3. Check network connectivity
# Try re-adding marketplace (refreshes cache)
/plugin marketplace remove specweave
/plugin marketplace add anton-abyzov/specweave
```

---

## How Other Skills Should Use This

**Example: increment-planner skill recommending plugins**

```markdown
**Step 6: Detect Required Plugins**

When recommending plugins, ALWAYS use correct format:

✅ CORRECT:
📦 Install recommended plugins:
  /plugin install specweave-github
  /plugin install specweave-kubernetes

❌ WRONG:
  /plugin install specweave-github@specweave  # NEVER use @marketplace
```

**Example: Auto-installation in TypeScript**

```typescript
// ✅ CORRECT
execFileNoThrowSync('claude', ['plugin', 'install', 'specweave-github']);

// ❌ WRONG
execFileNoThrowSync('claude', ['plugin', 'install', 'specweave-github@specweave']);
```

---

## References

- **Official Docs**: https://code.claude.com/docs/en/plugins
- **Marketplaces**: https://code.claude.com/docs/en/plugin-marketplaces
- **Blog**: https://claude.com/blog/claude-code-plugins
- **SpecWeave Marketplace**: https://github.com/anton-abyzov/specweave/.claude-plugin

---

**Last Updated**: 2025-01-06 (v0.8.18)
