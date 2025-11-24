# RECOMMENDATION: Simplify Development Setup (Cross-Platform)

**Date**: 2025-11-19
**Issue**: Current symlink-based dev setup is Unix-only (breaks on Windows)
**Recommendation**: Use GitHub marketplace installation (works everywhere)

---

## Current Problems with Symlink Approach

### OS Compatibility Issues

| Issue | macOS | Linux | Windows |
|-------|-------|-------|---------|
| `ln -s` | ✅ Works | ✅ Works | ❌ Requires admin (`mklink /D`) |
| `readlink` | ❌ Not installed (needs `greadlink`) | ✅ Works | ❌ Not available |
| `chmod 444` | ✅ Works | ✅ Works | ❌ No effect (NTFS) |
| Bash scripts | ✅ Works | ✅ Works | ⚠️ Needs WSL/Git Bash |
| `$HOME` | ✅ Works | ✅ Works | ⚠️ Uses `%USERPROFILE%` |

### Additional Complexity

- **Claude Code auto-updates**: Aggressively overwrites symlinks
- **Registry locking**: Fragile (needs read-only file)
- **Verification script**: Requires bash, Unix tools
- **Pre-commit hooks**: Would need cross-platform logic
- **Shell startup**: Different profiles (.zshrc vs .bashrc vs PowerShell)

---

## ✅ RECOMMENDED: Use GitHub Marketplace (Simple & Cross-Platform)

### How It Works

1. **Claude Code auto-installs** from `anton-abyzov/specweave` GitHub repo
2. **Marketplace directory** updates automatically (every few seconds during dev)
3. **Hooks execute** from `~/.claude/plugins/marketplaces/specweave/plugins/*/hooks/`

### Why This Works for Development

**The key insight**: Claude Code's auto-update is **actually helpful** for contributors:

```bash
# Make changes to local repo
vim plugins/specweave/hooks/post-task-completion.sh

# Commit to your branch
git add . && git commit -m "fix: update hook logic"

# Push to GitHub
git push origin feature-branch

# Claude Code auto-updates within seconds!
# No rebuild, no symlink, no scripts needed
```

**For unpushed changes**: Just push to your fork/branch, Claude Code pulls it.

---

## Proposed New Workflow (Contributors)

### One-Time Setup (Cross-Platform)

```bash
# 1. Clone SpecWeave repo
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave

# 2. Install dependencies
npm install

# 3. Claude Code auto-installs from GitHub (nothing to do!)
# Marketplace location: ~/.claude/plugins/marketplaces/specweave
# Hooks execute from marketplace, not local repo
```

### Development Workflow

```bash
# 1. Make changes in local repo
vim src/core/task-parser.ts

# 2. Build TypeScript changes
npm run rebuild

# 3. Test locally (unit/integration)
npm test

# 4. Commit & push to your branch
git add . && git commit -m "feat: add new parser"
git push origin feature-branch

# 5. Claude Code auto-updates marketplace (5-10 seconds)
# Hooks now use your latest code!

# 6. Test in Claude Code
# /specweave:increment "test feature"
```

### For Hook Changes (Bash Scripts)

Hook changes don't need TypeScript build, just push:

```bash
# 1. Edit hook
vim plugins/specweave/hooks/post-task-completion.sh

# 2. Commit & push
git add . && git commit -m "fix: improve hook error handling"
git push origin feature-branch

# 3. Wait 5-10 seconds (Claude Code auto-updates)

# 4. Test hook execution
# (trigger TodoWrite to test post-task-completion hook)
```

---

## Edge Case: Testing Unpushed Changes

**Problem**: You want to test changes BEFORE pushing to GitHub.

**Solution 1**: Temporary test branch
```bash
# Create throwaway branch
git checkout -b temp-test-$(date +%s)
git add . && git commit -m "temp: testing changes"
git push origin temp-test-...

# Claude Code auto-updates
# Test your changes
# ...

# Delete branch when done
git push origin --delete temp-test-...
git checkout main
git branch -D temp-test-...
```

**Solution 2**: Use GitHub fork marketplace
```bash
# One-time: Configure Claude Code to use your fork
# In Claude Code CLI:
claude plugin marketplace remove specweave
claude plugin marketplace add github:YOUR_USERNAME/specweave

# Now push to YOUR fork's main/develop branch
git push origin develop

# Claude Code pulls from YOUR fork instead of upstream
```

**Solution 3**: Keep symlink for advanced contributors (opt-in)
- Document symlink setup as **optional advanced workflow**
- Provide scripts but **don't require** them
- Default recommendation: Use GitHub marketplace

---

## Impact on CLAUDE.md

### Simplify "Local Development Setup" Section

**BEFORE** (Current):
```markdown
### 1. Dual-Mode Development Setup (MANDATORY for Contributors)

Problem: Claude Code executes hooks from `~/.claude/plugins/marketplaces/specweave/`...
[50+ lines of complex symlink setup]
```

**AFTER** (Proposed):
```markdown
### Local Development Setup

#### Quick Start (Recommended)

1. Clone repo: `git clone https://github.com/YOUR_USERNAME/specweave.git`
2. Install: `npm install`
3. Build: `npm run rebuild`
4. Push changes: `git push` → Claude Code auto-updates marketplace

**That's it!** Claude Code pulls your latest code from GitHub automatically.

#### Advanced: Symlink Setup (Optional)

If you need **instant updates** without pushing to GitHub:
- See: `.specweave/increments/0043-spec-md-desync-fix/reports/SYMLINK-DEV-SETUP.md`
- **Warning**: Unix-only (macOS/Linux), doesn't work on Windows
- Use cases: Testing pre-commit hooks, rapid iteration on bash scripts
```

---

## Migration Plan

1. **Update CLAUDE.md**: Replace symlink instructions with GitHub marketplace workflow
2. **Keep scripts**: Move to `.specweave/docs/internal/advanced/symlink-dev-mode.md`
3. **Update CONTRIBUTING.md**: Reference GitHub marketplace as primary workflow
4. **Update verification script**: Make it optional (for symlink users only)
5. **Remove pre-commit hook**: No longer needed for marketplace workflow

---

## Benefits

### Simplicity
- ✅ Works on **all platforms** (macOS, Linux, Windows)
- ✅ No bash scripts required
- ✅ No symlink management
- ✅ No registry locking

### Reliability
- ✅ Claude Code handles updates (no manual intervention)
- ✅ No file permission issues
- ✅ No race conditions with auto-updates

### Developer Experience
- ✅ Familiar git workflow (commit → push → test)
- ✅ Works with standard git tools
- ✅ No special setup for new contributors
- ✅ Auto-syncs across team (everyone gets latest hooks)

### Trade-offs
- ⚠️ 5-10 second delay for Claude Code to pull updates
- ⚠️ Must push to GitHub to test (can use throwaway branches)
- ⚠️ Can't test unpushed hook changes instantly

---

## Recommendation

**For 95% of contributors**: Use GitHub marketplace (default recommendation)
**For advanced contributors**: Offer symlink setup as optional (with Unix-only warning)

Update CLAUDE.md to reflect this priority order.
