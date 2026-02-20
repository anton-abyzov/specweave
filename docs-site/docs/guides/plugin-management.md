# Plugin Management Guide

> Comprehensive guide to managing SpecWeave plugins in Claude Code

## Overview

SpecWeave uses a **plugin architecture** to provide domain-specific expertise (frontend, backend, payments, etc.) without bloating the base installation. Plugins are loaded on-demand based on your project needs.

**Key Principle**: Plugins install ONLY when you explicitly ask to BUILD something, not when discussing topics or asking questions.

## Architecture

```
~/.claude/plugins/
├── installed_plugins.json     # Registry of installed plugins
├── cache/                     # Installed plugin files
│   ├── specweave/
│   │   ├── sw/1.0.0/         # Core plugin (hooks, skills)
│   │   │   └── hooks/        # ← Hooks run from HERE, not source
│   │   ├── sw-router/1.0.1/
│   │   └── sw-frontend/1.0.0/
│   └── claude-plugins-official/  # Optional MCP plugins (user-installed)
│       ├── context7/             # Install: claude plugin install context7@claude-plugins-official
│       └── playwright/           # Install: claude plugin install playwright@claude-plugins-official
└── marketplaces/             # Available plugins from registries
    └── specweave/
```

### Critical Understanding: Cache vs Source

**Hooks run from the CACHE, not from source code.**

If you're developing SpecWeave plugins:
- Edits to `plugins/specweave/hooks/*.sh` affect SOURCE only
- Running session uses `~/.claude/plugins/cache/specweave/sw/<version>/hooks/`
- Changes only take effect after reinstalling the plugin OR copying to cache

## Plugin Auto-Loading

### How It Works (v1.0.159+)

1. **User submits prompt** (e.g., "Build a React dashboard with Stripe checkout")
2. **LLM analyzes intent** via `specweave detect-intent`
3. **If BUILD task detected**, LLM recommends plugins
4. **Plugins install** via `claude plugin install`
5. **Session restart required** for new skills to be available

### When Plugins Install

| Prompt Type | Plugins Install? | Example |
|-------------|------------------|---------|
| BUILD request | Yes | "Build React dashboard" |
| IMPLEMENT request | Yes | "Implement Stripe checkout" |
| Questions | No | "How does React work?" |
| Discussions | No | "Let's discuss plugin architecture" |
| Meta-prompts | No | "Why are plugins installing?" |
| Running tests | No | "Run npm test" |

### Configuration

Control auto-loading in `.specweave/config.json`:

```json
{
  "pluginAutoLoad": {
    "enabled": true,       // Master switch for auto-loading
    "suggestOnly": false   // If true: suggest but don't install
  }
}
```

| Setting | Behavior |
|---------|----------|
| `enabled: true, suggestOnly: false` | **Default**: Auto-install when LLM detects BUILD task |
| `enabled: true, suggestOnly: true` | Show suggestions, user installs manually |
| `enabled: false` | No detection, no suggestions, fully manual |

### Environment Variable Override

```bash
# Disable all auto-loading for this session
export SPECWEAVE_DISABLE_AUTO_LOAD=1
```

## Manual Plugin Management

### Installing Plugins

```bash
# Install a specific plugin
claude plugin install sw-frontend@specweave

# Install from official registry
claude plugin install context7@claude-plugins-official

# List available plugins
claude plugin list --available
```

### Uninstalling Plugins

```bash
# Uninstall a single plugin
claude plugin uninstall sw-frontend@specweave

# Uninstall multiple (run multiple times)
claude plugin uninstall sw-backend@specweave
claude plugin uninstall sw-testing@specweave
```

### Listing Installed Plugins

```bash
claude plugin list
```

### Registry File

The registry at `~/.claude/plugins/installed_plugins.json` tracks installed plugins:

```json
{
  "version": 2,
  "plugins": {
    "sw@specweave": [{
      "scope": "user",
      "installPath": "/Users/.../.claude/plugins/cache/specweave/sw/1.0.0",
      "version": "1.0.0",
      "installedAt": "2026-01-24T18:50:05.175Z"
    }]
  }
}
```

## Available Plugins

### Core (Always Installed)

| Plugin | Purpose |
|--------|---------|
| `sw@specweave` | Core SpecWeave: commands, hooks, workflow |
| `sw-router@specweave` | Smart routing to specialized skills |

### Domain-Specific (Install When Needed)

| Plugin | Domain | Triggers |
|--------|--------|----------|
| `sw-frontend` | React, Vue, Next.js, UI | "Build dashboard", "Create component" |
| `sw-backend` | Node.js, APIs, databases | "Build API", "Create endpoint" |
| `sw-testing` | Playwright, Vitest, TDD | "Write E2E tests", "TDD workflow" |
| `sw-payments` | Stripe, PayPal, checkout | "Add Stripe", "Payment integration" |
| `sw-infra` | Terraform, Docker, CI/CD | "Deploy to AWS", "Create Dockerfile" |
| `sw-k8s` | Kubernetes, Helm, GitOps | "K8s manifests", "Helm chart" |
| `sw-mobile` | React Native, Expo | "Build mobile app", "iOS/Android" |
| `sw-ml` | ML, PyTorch, TensorFlow | "Train model", "ML pipeline" |
| `sw-kafka` | Kafka, event streaming | "Kafka topics", "Event architecture" |
| `sw-github` | GitHub issues, PRs | "Sync to GitHub", "Create PR" |
| `sw-jira` | JIRA integration | "Sync to JIRA", "Create epic" |
| `sw-ado` | Azure DevOps | "Sync to ADO", "Work items" |

## Troubleshooting

### Plugins Keep Reinstalling

**Symptom**: You uninstall plugins but they reappear.

**Cause**: Hooks in the plugin CACHE are triggering reinstallation.

**Solution**:

1. **Check which hooks are running**:
   ```bash
   cat ~/.claude/plugins/cache/specweave/sw/*/hooks/hooks.json
   ```

2. **Verify cache has updated hooks**:
   ```bash
   # Should return 0 if keyword fallback removed
   grep -c "detect_plugins_by_keywords" \
     ~/.claude/plugins/cache/specweave/sw/*/hooks/user-prompt-submit.sh
   ```

3. **If cache has old hooks, update it**:
   ```bash
   # Option A: Reinstall plugin from source
   claude plugin uninstall sw@specweave
   claude plugin install sw@specweave

   # Option B: Copy fixed hooks to cache (for developers)
   cp /path/to/source/hooks/user-prompt-submit.sh \
      ~/.claude/plugins/cache/specweave/sw/1.0.0/hooks/
   ```

4. **Clean registry manually**:
   ```bash
   # Keep only core plugins (context7 and playwright are optional)
   cat > ~/.claude/plugins/installed_plugins.json << 'EOF'
   {
     "version": 2,
     "plugins": {
       "sw@specweave": [...],
       "sw-router@specweave": [...]
     }
   }
   EOF
   # Optionally re-add MCP plugins if you use them:
   # claude plugin install context7@claude-plugins-official
   # claude plugin install playwright@claude-plugins-official
   ```

5. **Restart Claude Code** for changes to take effect.

### New Skills Not Available After Install

**Symptom**: Plugin installed but `/sw-frontend:*` commands don't work.

**Cause**: Claude Code loads skills at session start, not dynamically.

**Solution**: Restart Claude Code session after installing new plugins.

### Cache vs Source Mismatch (Developers)

**Symptom**: Your hook edits don't take effect.

**Cause**: Session uses hooks from cache, not your source edits.

**Solution**:

```bash
# Copy your edited hooks to the cache
cp plugins/specweave/hooks/user-prompt-submit.sh \
   ~/.claude/plugins/cache/specweave/sw/1.0.0/hooks/

cp plugins/specweave/hooks/v2/dispatchers/session-start.sh \
   ~/.claude/plugins/cache/specweave/sw/1.0.0/hooks/v2/dispatchers/

# Then restart Claude Code
```

Or reinstall from local source:
```bash
claude plugin uninstall sw@specweave
cd /path/to/specweave
claude plugin install .
```

### Checking What's Triggering Installs

View the lazy-loading log:

```bash
tail -50 ~/.specweave/logs/lazy-loading.log
```

Example output:
```
[2026-01-25T00:10:35] detect-intent | duration=1500ms | cached=false
[2026-01-25T00:10:36] plugins | installed=sw-frontend,sw-backend | already=none
```

## Character Budget & When to Disable Plugins

### Understanding the 15K Character Limit

Claude Code has a **15,000 character default budget** for skill descriptions. When too many plugins are loaded, skills get truncated and auto-activation becomes unreliable.

**Check total description size:**
```bash
find ~/.claude/plugins/cache -name "SKILL.md" -exec grep -h "^description:" {} \; 2>/dev/null | wc -c
```

**Increase budget if needed:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000
```

### Recommended Plugin Sets by Project Type

| Project Type | Plugins | ~Description Chars |
|--------------|---------|-------------------|
| **Core only** | sw | ~5,000 |
| **Web dev** | sw + frontend + backend | ~12,000 |
| **Full stack** | sw + frontend + backend + infra + testing | ~20,000 |
| **Mobile** | sw + mobile + payments | ~10,000 |
| **Everything** | All 24 plugins | ~56,000 (never fits!) |

### Disabling Unused Plugins

**Disable plugins not needed for current project:**
```bash
claude plugin disable sw-ml@specweave        # If not doing ML
claude plugin disable sw-kafka@specweave     # If not using Kafka
claude plugin disable sw-kubernetes@specweave # If not using K8s
claude plugin disable sw-mobile@specweave    # If not building mobile
```

### For Multi-Domain Requests

For "React + .NET + Stripe" type requests, auto-activation is unreliable. Use explicit invocation:

```typescript
// More reliable than auto-activation
Skill({ skill: "sw-frontend:frontend-architect" })
Skill({ skill: "sw-backend:dotnet-backend" })
Skill({ skill: "sw-payments:stripe-integration" })
```

See [Skill Truncation Troubleshooting](../troubleshooting/skill-truncation-budget.md) for details.

## Best Practices

### Minimal Installation

Start with only core plugins:
- `sw@specweave` - Core workflow
- `sw-router@specweave` - Smart routing

Let the system install others when you actually need them.

### For Teams

1. **Standardize config** in `.specweave/config.json`:
   ```json
   {
     "pluginAutoLoad": {
       "enabled": true,
       "suggestOnly": false
     }
   }
   ```

2. **Commit config** to version control so team shares settings.

3. **Document required plugins** in project README if specific ones are needed.

### For Plugin Developers

1. **Always test in fresh session** after hook changes
2. **Copy hooks to cache** for immediate testing:
   ```bash
   cp hooks/*.sh ~/.claude/plugins/cache/specweave/sw/*/hooks/
   ```
3. **Bump plugin version** when publishing updates
4. **Check lazy-loading logs** to verify detection behavior

## Related Documentation

- [Plugin Naming Conventions](../troubleshooting/plugin-naming-conventions.md)
- [Cost Optimization Guide](./cost-optimization.md) - Token savings with lazy loading
- [Claude CLI Automation](../development/claude-cli-automation.md)
