# Solution: Global Packages Lost After Node Upgrade (nvm)

**Created**: 2025-12-31
**For**: Your user experiencing "command not found" after upgrading Node 18→22 with nvm

---

## What Happened

Your user upgraded from Node 18 to Node 22 using nvm, and now commands like `specweave` and `claude` don't work anymore.

**Root Cause**: nvm gives each Node version its own isolated global packages directory. Switching Node versions = looking at a new, empty directory.

---

## Immediate Fix (Share This With User)

```bash
# After switching to Node 22
nvm use 22

# Reinstall the packages they need
npm install -g specweave
npm install -g @anthropic-ai/claude-code

# Verify it works
specweave --version
claude --version
```

That's it! Takes 30 seconds.

---

## Why This Happened (Technical Explanation)

nvm isolates global packages **per Node version**:

```
~/.nvm/versions/node/
├── v18.20.0/
│   └── lib/node_modules/        ← Their old packages are HERE
│       ├── specweave/
│       ├── claude/
│       └── typescript/
│
├── v20.11.0/
│   └── lib/node_modules/        ← Empty!
│
└── v22.0.0/
    └── lib/node_modules/        ← Empty! (currently active)
```

When they switched to Node 22, they're now looking at `v22.0.0/lib/node_modules/`, which is empty.

---

## Better Solutions For Future Upgrades

### Option 1: Auto-Copy During Install (Easiest)

```bash
# Instead of:
nvm install 22
nvm use 22

# Do this:
nvm install 22 --reinstall-packages-from=18
```

This automatically copies ALL global packages from Node 18 to Node 22.

---

### Option 2: Backup/Restore Script (Most Reliable)

**Before upgrading:**
```bash
npm list -g --depth=0 --parseable | sed '1d' | awk '{gsub(/.*\//,"",$1); print}' > ~/.nvm-global-packages.txt
```

**After upgrading:**
```bash
nvm use 22
cat ~/.nvm-global-packages.txt | xargs npm install -g
```

This creates a backup file with all package names, then reinstalls them.

---

### Option 3: Automated Script (Best Practice)

I created a helper script they can save as `~/.nvm-backup-globals.sh`:

```bash
#!/bin/bash
BACKUP_FILE="$HOME/.nvm-global-packages.txt"

case "$1" in
  backup)
    npm list -g --depth=0 --parseable | sed '1d' | awk '{gsub(/.*\//,"",$1); print}' > "$BACKUP_FILE"
    echo "Backed up to $BACKUP_FILE"
    cat "$BACKUP_FILE"
    ;;
  restore)
    cat "$BACKUP_FILE" | xargs npm install -g
    echo "Restored global packages"
    ;;
  *)
    echo "Usage: $0 {backup|restore}"
    exit 1
    ;;
esac
```

**Usage:**
```bash
# Make executable
chmod +x ~/.nvm-backup-globals.sh

# Before upgrading Node
~/.nvm-backup-globals.sh backup

# After upgrading Node
nvm use 22
~/.nvm-backup-globals.sh restore
```

---

## Documentation Created

I've added comprehensive documentation to SpecWeave:

### 1. **Runbook** (Internal Ops Guide)
📄 `.specweave/docs/internal/operations/runbook-node-version-management.md`

**Contents:**
- Full nvm installation guide
- All nvm commands and operations
- 4 different solutions to global packages issue
- Troubleshooting guide
- Best practices
- CI/CD considerations
- Quick reference card

**Audience**: Developers, contributors, power users

---

### 2. **Quick Fix Guide** (Public Documentation)
📄 `.specweave/docs/public/guides/getting-started/nvm-global-packages-fix.md`

**Contents:**
- Problem explanation
- 3 quick fixes (choose one)
- One-time setup script
- Prevention tips
- TL;DR with copy/paste commands

**Audience**: End users, beginners

---

### 3. **Installation Guide Update** (Public Documentation)
📄 `.specweave/docs/public/guides/getting-started/installation.md`

**Added:**
- ⚠️ CRITICAL section on global packages loss
- 3 solutions (quick, recommended, best practice)
- Link to full runbook

---

### 4. **CLAUDE.md Update** (Project Root)
📄 `CLAUDE.md` (Troubleshooting section)

**Added:**
- New troubleshooting row for "specweave/claude not found after Node upgrade"
- Quick fix command
- Link to full documentation

---

## How to Share With User

### Quick Message (Copy/Paste)

```
Hey! I found the issue. When you upgraded Node 18→22 with nvm, all your
global npm packages got "lost" because nvm isolates packages per Node version.

Quick fix (30 seconds):
nvm use 22
npm install -g specweave
npm install -g @anthropic-ai/claude-code

That's it! Your commands should work now.

For future Node upgrades, use this instead:
nvm install <new-version> --reinstall-packages-from=<old-version>

This auto-copies all your global packages.

Full guide: https://spec-weave.com/guides/getting-started/nvm-global-packages-fix
```

---

### If They Want Details

Send them these links:
- **Quick Fix**: `.specweave/docs/public/guides/getting-started/nvm-global-packages-fix.md`
- **Full Guide**: `.specweave/docs/internal/operations/runbook-node-version-management.md`
- **Installation**: `.specweave/docs/public/guides/getting-started/installation.md` (search for "CRITICAL")

---

## Prevention Going Forward

1. **Add to SpecWeave docs website** (when published):
   - Make the quick-fix guide highly visible
   - Add to FAQ section
   - Include in installation prerequisites

2. **Add to README.md** (consider):
   - Add a "Common Issues" section
   - Link to nvm global packages fix

3. **Add to CLI output** (future enhancement):
   - Detect if running with nvm
   - Check if recently switched Node versions
   - Show warning if global packages look empty

4. **Add to init wizard** (future enhancement):
   ```bash
   specweave init

   # Detect nvm + recently switched versions
   ⚠️  Warning: You recently switched Node versions with nvm.
   ⚠️  Global packages may be missing. Run: npm install -g specweave
   ```

---

## Technical Implementation Notes

### Why nvm Does This

nvm's design is intentional:
- **Isolation**: Different projects may need different Node + package versions
- **Clean environments**: No version conflicts
- **Predictability**: Each Node version has known, isolated dependencies

### Alternatives to nvm

If users want shared global packages:
- **n** (Node version manager) - shares global packages by default
- **fnm** (Fast Node Manager) - similar to nvm but faster
- **asdf** (Universal version manager) - manages multiple runtimes

But nvm's isolation is generally **better** for professional development.

---

## Summary

✅ **Created 3 documentation files**:
1. Comprehensive runbook (internal)
2. Quick-fix guide (public)
3. Updated installation guide

✅ **Updated CLAUDE.md** troubleshooting table

✅ **Provided 4 solutions**:
1. Manual reinstall (fastest)
2. Auto-copy during install (recommended)
3. Backup/restore (most reliable)
4. Automated script (best practice)

✅ **Ready to share** with user immediately

---

**Next Steps:**
1. Share quick fix with user (30 seconds to resolve)
2. Optionally share detailed guides if they want to understand/prevent future issues
3. Consider adding nvm warning to SpecWeave CLI/docs website

---

**Files Modified/Created:**
- ✅ `.specweave/docs/internal/operations/runbook-node-version-management.md` (NEW)
- ✅ `.specweave/docs/public/guides/getting-started/nvm-global-packages-fix.md` (NEW)
- ✅ `.specweave/docs/public/guides/getting-started/installation.md` (UPDATED)
- ✅ `CLAUDE.md` (UPDATED)
- ✅ `NVM_GLOBAL_PACKAGES_SOLUTION.md` (THIS FILE - summary for you)
