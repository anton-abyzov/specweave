# SpecWeave Marketplace Error Resolution Guide

**Last Updated**: 2025-11-11
**Issue Type**: Critical Plugin Loading Failure
**Frequency**: Occasional (after Claude Code updates or plugin registry corruption)

## The Problem

Users may encounter the following errors when starting Claude Code with SpecWeave:

```
Marketplaces:
  ✘ specweave · Failed
     Marketplace file not found at
     /Users/{username}/.claude/plugins/marketplaces/anton-abyzov-specweave/.claude-plugin

Plugin Loading Errors:
  ✘ specweave@specweave
     Plugin 'specweave' not found in marketplace 'specweave'
  ✘ specweave-github@specweave
     Plugin 'specweave-github' not found in marketplace 'specweave'
  ... (and 17+ more similar errors)
```

## Root Cause

This issue occurs when:

1. **Marketplace Registration Corrupted**: The marketplace gets registered as a local path instead of a GitHub source
2. **Path Mismatch**: Claude Code looks for plugins at `anton-abyzov-specweave` but they're installed at `specweave`
3. **Registry Desync**: The `installed_plugins.json` file references paths that don't exist
4. **Auto-Recreation**: Claude Code automatically recreates incorrect entries if not fixed properly

## Quick Fix (Automatic)

Run the provided fix script:

```bash
# From SpecWeave directory
bash bin/fix-marketplace-errors.sh

# Or download and run directly
curl -fsSL https://raw.githubusercontent.com/anton-abyzov/specweave/main/bin/fix-marketplace-errors.sh | bash
```

## Manual Fix (Step-by-Step)

If the automatic script doesn't work, follow these manual steps:

### Step 1: Remove Existing Marketplace

```bash
claude plugin marketplace remove specweave
```

### Step 2: Clean Up Files

```bash
# Remove local marketplace copy
rm -rf ~/.claude/plugins/marketplaces/specweave

# Clear plugin registry
echo '{"version": 1, "plugins": {}}' > ~/.claude/plugins/installed_plugins.json
echo '{}' > ~/.claude/plugins/known_marketplaces.json
```

### Step 3: Re-Register from GitHub

```bash
claude plugin marketplace add anton-abyzov/specweave
```

### Step 4: Reinstall Plugins

```bash
# Install core plugin first
claude plugin install specweave

# Then install other plugins
claude plugin install specweave-github
claude plugin install specweave-jira
# ... continue for all 19 plugins
```

### Step 5: Verify Installation

```bash
# Check marketplace is registered
claude plugin marketplace list
# Should show: specweave (Source: GitHub anton-abyzov/specweave)

# Check plugins are installed
cat ~/.claude/plugins/installed_plugins.json | jq -r '.plugins | keys[]' | wc -l
# Should show: 19

# Check core plugin exists
ls ~/.claude/plugins/marketplaces/specweave/plugins/specweave/.claude-plugin/plugin.json
# Should show the file path
```

### Step 6: Restart Claude Code

Press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux) to restart Claude Code.

## Prevention

To prevent this issue:

1. **Always use GitHub marketplace**: Never clone SpecWeave locally into `.claude/plugins/`
2. **Use official installation**: Always use `specweave init` or the fix script
3. **Don't manually edit**: Never manually edit `installed_plugins.json` or `known_marketplaces.json`
4. **Keep Claude Code updated**: Ensure you're using the latest version

## Why This Happens

The issue typically occurs due to:

1. **Claude Code Updates**: Sometimes updates change how marketplaces are handled
2. **Interrupted Installation**: If `specweave init` is interrupted, it may leave corrupt state
3. **Manual Intervention**: Manually editing plugin files can cause mismatches
4. **Multiple Installation Attempts**: Running `specweave init` multiple times without cleanup

## Technical Details

### Correct State

**Marketplace Registration** (`known_marketplaces.json`):
```json
{
  "specweave": {
    "source": {
      "source": "github",
      "repo": "anton-abyzov/specweave"
    },
    "installLocation": "/Users/{username}/.claude/plugins/marketplaces/specweave",
    "lastUpdated": "2025-11-11T16:40:20.700Z"
  }
}
```

**Plugin Registration** (`installed_plugins.json`):
```json
{
  "version": 1,
  "plugins": {
    "specweave@specweave": {
      "version": "0.8.0",
      "installedAt": "...",
      "installPath": "/Users/{username}/.claude/plugins/marketplaces/specweave/plugins/specweave",
      "isLocal": true
    },
    // ... 18 more plugins
  }
}
```

### Directory Structure

```
~/.claude/plugins/
├── installed_plugins.json
├── known_marketplaces.json
└── marketplaces/
    └── specweave/              # Cloned from GitHub
        ├── .claude-plugin/
        │   └── marketplace.json
        └── plugins/
            ├── specweave/
            ├── specweave-github/
            └── ... (17 more)
```

## Related Issues

- GitHub Issue: [#TBD - Marketplace Loading Errors]
- Claude Code Docs: [Plugin Troubleshooting](https://docs.claude.com/en/docs/claude-code/plugin-troubleshooting)

## Support

If the issue persists after trying these fixes:

1. Check GitHub Issues: https://github.com/anton-abyzov/specweave/issues
2. Create new issue with:
   - Error message screenshot
   - Output of `claude --version`
   - Output of `ls -la ~/.claude/plugins/`
   - Contents of `installed_plugins.json`

## Changelog

- **2025-11-11**: Initial documentation and fix script created
- **2025-11-11**: Confirmed working solution for marketplace path mismatch issue