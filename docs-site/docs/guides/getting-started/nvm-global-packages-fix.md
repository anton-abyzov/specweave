# Quick Fix: Global Packages Lost After Node Upgrade (nvm)

**Problem**: After upgrading Node.js using nvm, commands like `specweave`, `claude`, or other global packages stop working.

**Symptoms:**
```bash
$ nvm use 22
$ specweave --version
bash: specweave: command not found
```

---

## Why This Happens

nvm gives **each Node version its own separate global packages**. When you switch from Node 18 to Node 22, you're looking at an empty global packages directory.

```
~/.nvm/versions/node/
├── v18.20.0/lib/node_modules/  ← Your old packages are HERE
├── v20.11.0/lib/node_modules/  ← Empty!
└── v22.0.0/lib/node_modules/   ← Empty! (currently active)
```

---

## Quick Fixes (Choose One)

### Fix 1: Reinstall Manually (Fastest)

```bash
# After switching to new Node version
nvm use 22

# Reinstall each global package
npm install -g specweave
npm install -g @anthropic-ai/claude-code
npm install -g typescript
# ... (repeat for each package you need)

# Verify
specweave --version
```

**Pros**: Simple, works immediately
**Cons**: Manual, must remember all packages

---

### Fix 2: Auto-Copy During Upgrade (Recommended)

**BEFORE upgrading:**
```bash
# Copy all global packages from Node 18 to Node 22
nvm install 22 --reinstall-packages-from=18

# This installs Node 22 AND copies all globals automatically
```

**OR after upgrading:**
```bash
# Already switched to Node 22? Copy packages now:
nvm use 22
nvm reinstall-packages 18
```

**Pros**: One command, copies ALL globals automatically
**Cons**: Must remember to do this during upgrade

---

### Fix 3: Backup/Restore Script (Best Practice)

**BEFORE switching Node versions:**
```bash
# Save list of current global packages
npm list -g --depth=0 --parseable | sed '1d' | awk '{gsub(/.*\//,"",$1); print}' > ~/.nvm-global-packages.txt
```

**AFTER switching Node versions:**
```bash
# Switch to new version
nvm use 22

# Restore all packages from backup
cat ~/.nvm-global-packages.txt | xargs npm install -g
```

**Pros**: Recoverable, works even weeks later
**Cons**: Two-step process

---

## One-Time Setup: Auto-Backup Script

Create `~/.nvm-backup-globals.sh`:

```bash
#!/bin/bash
# Usage:
#   ./nvm-backup-globals.sh backup    # Before upgrade
#   ./nvm-backup-globals.sh restore   # After upgrade

BACKUP_FILE="$HOME/.nvm-global-packages.txt"

case "$1" in
  backup)
    echo "Backing up global packages..."
    npm list -g --depth=0 --parseable | sed '1d' | awk '{gsub(/.*\//,"",$1); print}' > "$BACKUP_FILE"
    echo "Saved to $BACKUP_FILE:"
    cat "$BACKUP_FILE"
    ;;
  restore)
    if [ ! -f "$BACKUP_FILE" ]; then
      echo "No backup found at $BACKUP_FILE"
      exit 1
    fi
    echo "Restoring global packages..."
    cat "$BACKUP_FILE" | xargs npm install -g
    echo "Done!"
    ;;
  *)
    echo "Usage: $0 {backup|restore}"
    exit 1
    ;;
esac
```

**Make executable:**
```bash
chmod +x ~/.nvm-backup-globals.sh
```

**Usage:**
```bash
# Before upgrading Node
~/.nvm-backup-globals.sh backup

# After upgrading Node
nvm use 22
~/.nvm-backup-globals.sh restore
```

---

## Prevention: Always Use --reinstall-packages-from

**Add to your workflow:**

```bash
# Instead of:
nvm install 22
nvm use 22

# Do this:
nvm install 22 --reinstall-packages-from=18
```

This makes global package copying **automatic**!

---

## Common Packages to Reinstall

If doing manual reinstall, these are typical global packages developers use:

```bash
# Essential
npm install -g specweave
npm install -g @anthropic-ai/claude-code

# TypeScript
npm install -g typescript
npm install -g ts-node

# Linters/Formatters
npm install -g eslint
npm install -g prettier

# Build Tools
npm install -g webpack-cli
npm install -g vite

# Utilities
npm install -g nodemon
npm install -g npm-check-updates
```

---

## Check What You Had Before

If you still have access to the old Node version:

```bash
# Switch back to old version
nvm use 18

# List all global packages
npm list -g --depth=0

# Copy output, then switch back to new version
nvm use 22
```

---

## Verify Your Fix

```bash
# Check Node version
node --version

# Check that commands work
specweave --version
claude --version
tsc --version  # TypeScript

# List current global packages
npm list -g --depth=0
```

---

## Related Resources

- **Full Guide**: [Node Version Management Runbook](../../internal/operations/runbook-node-version-management.md)
- **Installation Guide**: [SpecWeave Installation](installation.md)
- **nvm Documentation**: [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm)

---

## TL;DR

```bash
# Quick fix (after Node upgrade):
nvm use 22
npm install -g specweave @anthropic-ai/claude-code

# Better way (during Node upgrade):
nvm install 22 --reinstall-packages-from=18

# Best practice (before upgrade):
npm list -g --depth=0 --parseable | sed '1d' | awk '{gsub(/.*\//,"",$1); print}' > ~/.nvm-global-packages.txt
# (then after upgrade):
cat ~/.nvm-global-packages.txt | xargs npm install -g
```

---

**Share this guide**: [spec-weave.com/guides/nvm-global-packages-fix](https://spec-weave.com/guides/getting-started/nvm-global-packages-fix)
