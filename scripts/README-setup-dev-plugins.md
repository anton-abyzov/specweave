# SpecWeave Development Plugin Setup Script

**Purpose**: Automatically configure SpecWeave plugins for development based on your environment (local machine vs cloud VM).

## Quick Start

```bash
# Run from SpecWeave repo root
./scripts/setup-dev-plugins.sh
```

## What It Does

**Automatically detects your environment and does the right thing:**

### Local Machine (Detected)
- ✅ Creates symlink: `~/.claude/plugins/marketplaces/specweave → /path/to/repo`
- ✅ Changes to hooks take effect immediately (no push needed)
- ✅ Perfect for rapid development iteration
- ✅ Optional: Installs core plugins via Claude CLI

### Cloud VM (Detected)
- ✅ Uses GitHub marketplace: `claude plugin marketplace add anton-abyzov/specweave`
- ✅ Clones repo from GitHub (always up-to-date)
- ✅ Reliable across VM recreations
- ✅ Automatically installs core plugins

## Environment Detection

The script detects VMs/cloud environments by checking for:
- `CLOUDENV`, `CODESPACE_NAME`, `GITPOD_WORKSPACE_ID` environment variables
- `/.dockerenv` file (Docker containers)
- `/workspace` directory (common in cloud IDEs)
- Hypervisor indicators in `/proc/cpuinfo`
- Hostname patterns like `claude-code`

## Supported Environments

| Environment | Detection | Setup Method |
|-------------|-----------|--------------|
| **Local macOS** | No VM indicators | Symlink |
| **Local Linux** | No VM indicators | Symlink |
| **Local Windows** | No VM indicators | Symlink (WSL) |
| **claude.ai/code** | `CLOUDENV` or hostname | GitHub marketplace |
| **GitHub Codespaces** | `CODESPACE_NAME` | GitHub marketplace |
| **Gitpod** | `GITPOD_WORKSPACE_ID` | GitHub marketplace |
| **Docker** | `/.dockerenv` | GitHub marketplace |

## What Gets Installed

**Core plugins** (automatically):
- `specweave` - Framework essentials (increment planning, living docs, hooks)
- `specweave-github` - GitHub Issues integration
- `specweave-jira` - JIRA integration
- `specweave-ado` - Azure DevOps integration

**Additional plugins** (optional):
- Install manually via `/plugin install specweave-{name}` in Claude Code

## Verification

### Automated Health Check (NEW!)

```bash
# Run comprehensive health check
./scripts/check-plugin-health.sh

# What it checks:
# ✅ Marketplace registration
# ✅ Symlink/directory exists
# ✅ Core hooks accessible
# ✅ Plugin hooks accessible
# ✅ Plugin installation status
# ✅ marketplace.json validity
```

**Example output**:
```
🔍 SpecWeave Plugin Health Check
================================================

1. Checking marketplace registration...
   ✅ Marketplace registered
      Source: Directory (/path/to/specweave)

2. Checking marketplace directory...
   ✅ Symlink exists
   ✅ Points to correct location

3. Checking core hooks...
   ✅ Core hooks accessible
   ✅ Hooks are executable

4. Checking plugin hooks...
   ✅ Found 3 plugin hooks

5. Checking core plugin installation...
   Plugin check not automated (use /plugin list in Claude Code)

6. Checking marketplace.json...
   ✅ marketplace.json valid
      Plugins defined: 21

================================================
✅ All checks passed!
```

### Manual Verification

**Check manually** (if health check script fails):
```bash
# Verify symlink (local)
ls -la ~/.claude/plugins/marketplaces/specweave

# Verify hooks work
test -f ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-task-completion.sh && echo "✅"

# Check marketplace registration
claude plugin marketplace list
```

## Troubleshooting

### Plugins Not Found After Setup

**Symptom**: `✘ Plugin 'specweave' not found in marketplace 'specweave'`

**Root Cause**: Marketplace not registered with Claude Code (common after updates/restarts)

**The Fix** (automatic):
```bash
# Re-run setup script (it now auto-detects and fixes)
./scripts/setup-dev-plugins.sh

# What it does:
# 1. Checks marketplace registration
# 2. If missing → auto-registers
# 3. Installs plugins
# 4. Verifies everything works
```

**Manual Fix** (if script fails):
```bash
# Check registration
claude plugin marketplace list

# If "No marketplaces" or "specweave" missing:
claude plugin marketplace add /path/to/specweave
# ⚠️ Use PROJECT ROOT, not .claude-plugin!

# Verify
claude plugin marketplace list
# Should show: ❯ specweave (Source: Directory /path/to/specweave)

# Install plugins
claude plugin install specweave
```

**Critical Insight**: Symlink ≠ Registration. You need BOTH:
- ✅ Symlink: `~/.claude/plugins/marketplaces/specweave` → repo
- ✅ Registration: `claude plugin marketplace add /path/to/specweave`

**See**: `.specweave/increments/0030-intelligent-living-docs/reports/MARKETPLACE-REGISTRATION-FIX.md` for complete analysis

---

### Other Common Issues

**Script says "VM detected" but I'm local:**
- Check for Docker containers running
- Check `/proc/cpuinfo` for hypervisor indicators
- Run with `bash -x` for debug output: `bash -x ./scripts/setup-dev-plugins.sh`

**Script says "local" but I'm in claude.ai/code:**
- VM detection may need update
- Manually use GitHub marketplace: `claude plugin marketplace add anton-abyzov/specweave`

**Hooks still not working after setup:**
- Verify marketplace directory: `ls -la ~/.claude/plugins/marketplaces/specweave`
- Check symlink target (local): `readlink ~/.claude/plugins/marketplaces/specweave`
- Check registration: `claude plugin marketplace list` (should show "specweave")
- Restart Claude Code IDE

**Claude CLI not found:**
- Install from: https://docs.claude.com/cli
- Or skip plugin installation (symlink/GitHub marketplace still work)

## Manual Setup (Alternative)

**If script fails, use manual commands:**

### Local Development
```bash
# Create symlink
ln -sf /path/to/specweave ~/.claude/plugins/marketplaces/specweave

# Verify
test -f ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-task-completion.sh && echo "✅"
```

### Cloud/VM
```bash
# Remove local marketplace (if present)
claude plugin marketplace remove specweave

# Add GitHub marketplace
claude plugin marketplace add anton-abyzov/specweave

# Install core plugins
claude plugin install specweave
claude plugin install specweave-github
```

## For Production Users (NPM)

**This script is for CONTRIBUTORS only.** Production users get plugins automatically via:
```bash
npx specweave init .
# → Installs all plugins from GitHub marketplace
# → Everything works out of the box!
```

## Architecture

**Why two approaches?**

| Aspect | Local (Symlink) | VM (GitHub) |
|--------|----------------|-------------|
| **Files** | Points to local repo | Clones from GitHub |
| **Updates** | Instant (edit & test) | On git pull |
| **Persistence** | Permanent | VM recreation → re-clone |
| **Network** | Not needed | Required |
| **Use case** | Active development | Testing in cloud |

**Result**: Local = Fast iteration, VM = Production-like testing

## Related Documentation

- **CLAUDE.md**: Full contributor guide
- **Plugin Architecture**: `plugins/*/README.md`
- **Hooks Documentation**: `plugins/specweave/hooks/README.md`
