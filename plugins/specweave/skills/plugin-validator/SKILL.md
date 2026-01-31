---
name: plugin-validator
description: Validates SpecWeave plugin installation when EXPLICITLY requested by user. Use for checking if plugins are installed correctly, validating marketplace registration, or troubleshooting missing plugins. Only triggers on explicit requests to avoid false positives during normal workflow.
allowed-tools: Read, Bash, Grep
---

# Plugin Validator Skill

**Purpose**: Validate and install SpecWeave plugins when explicitly requested by the user.

**Activation**: Triggers ONLY when user explicitly requests plugin validation (e.g., "validate plugins", "check plugins", or runs `specweave validate-plugins` command). Does NOT auto-activate for workflow commands to prevent false positive errors.

## What This Skill Does

This skill ensures that your SpecWeave environment is properly configured with all required plugins BEFORE you start working. It prevents frustrating errors and wasted time from missing components.

### Key Features

1. **Marketplace Validation**: Ensures SpecWeave marketplace is registered in `~/.claude/settings.json`
2. **Core Plugin Check**: Verifies `specweave` plugin is installed
3. **Context Detection**: Analyzes your increment description and suggests relevant plugins
4. **Auto-Installation**: Can automatically install missing components (with your permission)
5. **Clear Guidance**: Shows exactly what's missing and how to fix it

## When This Skill Activates

✅ **ONLY activates when explicitly requested**:
- You mention "plugin validation" or "validate plugins"
- You mention "environment setup" or "check plugins"
- You run: `specweave validate-plugins`
- You ask: "Can you validate my plugins?"
- You report: "I'm getting plugin errors"
- During: `specweave init` (initial setup only)

❌ **Does NOT auto-activate for**:
- `/sw:increment` commands
- `/sw:do` commands
- Any other workflow commands
- Reason: Prevents false positive errors when plugins are installed but detection fails

## Validation Process

### Phase 1: Marketplace Check

**What**: Checks if SpecWeave marketplace is registered in Claude Code
**Where**: `~/.claude/settings.json`
**Expected**:
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

**If missing**: Auto-creates the configuration

### Phase 2: Core Plugin Check

**What**: Verifies `specweave` plugin is installed
**Command**: `/plugin list --installed | grep "specweave"`
**Expected**: Plugin appears in the list

**If missing**: Suggests `/plugin install specweave`

### Phase 3: Context-Aware Plugin Detection

**What**: Scans your increment description for keywords
**Examples**:

| Your Description | Detected Keywords | Suggested Plugin |
|-----------------|-------------------|------------------|
| "Add GitHub sync" | github, sync | specweave-github |
| "Stripe billing with React UI" | stripe, billing, react, ui | specweave-payments, specweave-frontend |
| "Deploy to Kubernetes" | kubernetes, deploy | specweave-kubernetes |
| "Add Jira integration" | jira, integration | specweave-jira |

**Full Keyword Map** (15+ plugins):
- **specweave-github**: github, git, issues, pull request, pr, repository
- **specweave-jira**: jira, epic, story, sprint, backlog
- **specweave-ado**: azure devops, ado, work item, boards
- **specweave-payments**: stripe, billing, payment, subscription, invoice
- **specweave-frontend**: react, nextjs, vue, angular, frontend, ui
- **specweave-kubernetes**: kubernetes, k8s, helm, pod, deployment
- **specweave-ml**: machine learning, ml, tensorflow, pytorch, model
- **specweave-observability**: prometheus, grafana, monitoring, metrics
- **specweave-security**: security, owasp, vulnerability, audit
- **specweave-diagrams**: diagram, c4, mermaid, architecture
- **specweave-backend-nodejs**: nodejs, express, fastify, nestjs, backend
- **specweave-backend-python**: python, fastapi, django, flask
- **specweave-backend-dotnet**: dotnet, .net, aspnet, c#
- **specweave-e2e-testing**: playwright, e2e, end-to-end, browser

## Usage Examples

### Example 1: Fresh Environment

**Scenario**: You cloned a project to a new VM and want to start working.

**Action**: Run `/sw:increment "Add authentication"`

**What Happens**:
```
🔍 Validating SpecWeave environment...

❌ Missing components detected:
   • SpecWeave marketplace not registered
   • Core plugin (specweave) not installed

📦 Installing missing components...
   ✅ Marketplace registered (.claude/settings.json)
   ✅ Core plugin installed (specweave v0.9.4)

🎉 Environment ready! Proceeding with increment planning...
```

### Example 2: Context Detection

**Scenario**: You're adding a new feature that uses GitHub and React.

**Action**: Run `/sw:increment "Add GitHub sync with React UI"`

**What Happens**:
```
🔍 Validating SpecWeave environment...

✅ Marketplace registered
✅ Core plugin installed (specweave v0.9.4)

🔎 Detected context plugins from your description:
   • specweave-github (keywords: github, sync)
   • specweave-frontend (keywords: react, ui)

❌ Missing context plugins:
   • specweave-github
   • specweave-frontend

📦 Would you like to install these plugins?
   They provide specialized expertise for your use case.

   1. Yes, install now (recommended)
   2. No, skip for now (limited capabilities)

Your choice [1]:
```

### Example 3: Manual Validation

**Scenario**: You want to check your environment without running a command.

**Action**: Run `specweave validate-plugins --verbose`

**What Happens**:
```
[PluginValidator] Checking marketplace registration...
[PluginValidator] Marketplace registered ✓
[PluginValidator] Checking core plugin (specweave)...
[PluginValidator] Core plugin installed ✓ (0.9.4)

✅ All plugins validated!
   • Core plugin: installed (v0.9.4)
   • Cache: miss
```

### Example 4: Dry-Run Mode

**Scenario**: You want to see what would be installed without actually installing.

**Action**: Run `specweave validate-plugins --context="Add Stripe billing" --dry-run`

**What Happens**:
```
🔍 Validating SpecWeave environment...

✅ Marketplace registered
✅ Core plugin installed

🔎 Detected context plugins:
   • specweave-payments (keywords: stripe, billing)

❌ Missing: specweave-payments

💡 Dry-run mode: No changes made.
   To install, remove --dry-run flag.
```

## CLI Command Reference

**Basic validation**:
```bash
specweave validate-plugins
```

**Auto-install missing components**:
```bash
specweave validate-plugins --auto-install
```

**With context detection**:
```bash
specweave validate-plugins --context="Add GitHub sync for mobile app"
```

**Dry-run (preview only)**:
```bash
specweave validate-plugins --dry-run --context="Add Stripe billing"
```

**Verbose mode**:
```bash
specweave validate-plugins --verbose
```

**Combined flags**:
```bash
specweave validate-plugins --auto-install --context="Deploy to Kubernetes" --verbose
```

## Troubleshooting

### Error: "Claude CLI not available"

**Symptom**: Validation fails with "command not found"

**Solution**:
1. Ensure Claude Code is installed
2. Restart your terminal
3. Verify: `claude --version`
4. If still failing, install plugins manually using `/plugin install` command

### Error: "Marketplace configuration invalid"

**Symptom**: Marketplace is registered but validation fails

**Solution**:
1. Check `~/.claude/settings.json` structure
2. Ensure marketplace points to GitHub source
3. If using local marketplace (dev mode), this is expected
4. Re-run validation to auto-fix configuration

### Error: "Plugin installation failed"

**Symptom**: Auto-install tries but fails

**Solution**:
1. Check internet connection (GitHub access required)
2. Verify Claude Code is running
3. Try manual installation: `/plugin install specweave`
4. Check Claude Code logs for detailed errors

### False Positive: Wrong Plugin Suggested

**Symptom**: Context detection suggests irrelevant plugin

**Example**: Description "Add GitHub Actions" suggests specweave-github (but you meant CI/CD, not issue tracking)

**Solution**:
1. Skip the suggestion (choose option 2)
2. Install correct plugin manually later
3. This is rare (2+ keyword matches required for suggestion)

## Performance

**Validation Speed**:
- ✅ With cache: <2 seconds
- ✅ Without cache: <5 seconds
- ✅ With auto-install: <30 seconds (1-2 plugins)

**Caching**:
- Results cached for 5 minutes
- Speeds up repeated commands
- Invalidated after plugin changes
- Cache location: `~/.specweave/validation-cache.json`

## Configuration

**Validation can be configured** in `.specweave/config.json`:

```json
{
  "pluginValidation": {
    "enabled": true,           // Enable/disable validation (default: true)
    "autoInstall": true,       // Auto-install missing components (default: true)
    "verbose": false,          // Show detailed logs (default: false)
    "cacheValidation": true,   // Cache results (default: true)
    "cacheTTL": 300            // Cache TTL in seconds (default: 300 = 5 min)
  }
}
```

**Disable validation** (not recommended):
```json
{
  "pluginValidation": {
    "enabled": false
  }
}
```

## Integration with Commands

**All SpecWeave commands validate plugins** before execution (STEP 0):

- `/sw:increment` - Validates before PM agent runs
- `/sw:do` - Validates before task execution
- `/sw:next` - Validates before next increment
- `/sw:done` - Validates before completion
- ... (all 22 commands)

**Workflow**:
```
User: /sw:increment "Add feature"
        ↓
   [STEP 0: Plugin Validation]
        ↓ (only proceeds if valid)
   [STEP 1: PM Agent Planning]
        ↓
   [STEP 2: Architect Design]
        ↓
   [STEP 3: Implementation]
```

## Benefits

✅ **Zero manual setup** - Plugins install automatically
✅ **Seamless migration** - Works across local/VM/Cloud IDE
✅ **Context-aware** - Suggests relevant plugins based on your work
✅ **Clear errors** - No more cryptic "command not found" messages
✅ **Fast** - Caching ensures minimal overhead (<2s cached, <5s uncached)
✅ **Non-blocking** - Can skip validation if needed (not recommended)

## Edge Cases

**1. Offline Mode**
- Validation detects missing plugins but can't install
- Shows manual instructions instead
- Validation still useful (identifies what's missing)

**2. Development Mode**
- Local marketplace detected (not GitHub)
- Shows warning: "Development mode detected"
- Validation passes (assumes dev knows what they're doing)

**3. Concurrent Validation**
- Multiple commands run simultaneously
- Uses cache to prevent duplicate validations
- Race conditions handled gracefully

**4. Partial Installation**
- Marketplace exists, but plugin missing (or vice versa)
- Installs only missing components
- Doesn't reinstall existing components

## Manual Installation (Fallback)

**If auto-install fails**, follow these steps:

### Step 1: Register Marketplace

Edit `~/.claude/settings.json`:
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

### Step 2: Install Core Plugin

In Claude Code, run:
```
/plugin install specweave
```

### Step 3: Restart Claude Code

Close and reopen Claude Code for changes to take effect.

### Step 4: Verify Installation

Run:
```bash
specweave validate-plugins
```

Should show:
```
✅ All plugins validated!
   • Core plugin: installed (v0.9.4)
```

### Step 5: Install Context Plugins (Optional)

If you need specific plugins:
```
/plugin install sw-github@specweave
/plugin install sw-payments@specweave
/plugin install sw-frontend@specweave
```

## Summary

**This skill ensures you NEVER waste time debugging plugin issues.**

It proactively validates your environment, auto-installs missing components, and suggests relevant plugins based on your work. The result: you focus on building features, not troubleshooting setup.

**Questions?**
- Check troubleshooting section above
- Run `specweave validate-plugins --help`
- Visit: https://spec-weave.com/docs/plugin-validation

---

**Skill Version**: 1.0.0
**Introduced**: SpecWeave v0.9.4
**Last Updated**: 2025-11-09

## Project-Specific Learnings

**Before starting work, check for project-specific learnings:**

```bash
# Check if skill memory exists for this skill
cat .specweave/skill-memories/plugin-validator.md 2>/dev/null || echo "No project learnings yet"
```

Project learnings are automatically captured by the reflection system when corrections or patterns are identified during development. These learnings help you understand project-specific conventions and past decisions.

