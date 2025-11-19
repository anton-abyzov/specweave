# Documentation Update Summary - GitHub Marketplace First

**Date**: 2025-11-19
**Context**: Simplified contributor setup by making GitHub marketplace the primary workflow
**Impact**: Cross-platform support, reduced complexity, Windows-friendly

---

## Executive Summary

**Problem**: Symlink-based development setup was Unix-only (broke on Windows), complex (bash scripts, registry locking), and fought Claude Code's auto-update mechanism.

**Solution**: Made GitHub marketplace the **primary recommended workflow**, moved symlink setup to optional advanced documentation.

**Benefits**:
- ✅ **Cross-platform** (works on Windows without admin privileges)
- ✅ **Simple** (standard git workflow, no scripts)
- ✅ **Reliable** (Claude Code manages updates, no race conditions)
- ✅ **Beginner-friendly** (familiar git push workflow)

---

## Files Changed

### 1. CLAUDE.md (Primary Contributor Documentation)

**Section 1: Local Development Setup** (Lines 13-121)

**BEFORE**:
- "Dual-Mode Development Setup (MANDATORY for Contributors)"
- 70+ lines of complex symlink instructions
- Emphasized symlink as mandatory, npm mode as alternative
- Unix-specific commands (ln -s, readlink)

**AFTER**:
- "Local Development Setup" 
- GitHub marketplace as primary (Quick Start section)
- Simple 3-step setup: clone, npm install, npm run rebuild
- Symlink as "Option 3: Advanced, Unix-Only"
- Clear cross-platform benefits listed

**Troubleshooting Section** (Line 653):
- **BEFORE**: "**Hooks failing**: Verify symlink (see "Symlink Setup" above)"
- **AFTER**: "**Hooks failing**: Ensure changes are pushed to GitHub (Claude Code auto-updates marketplace every 5-10s). For symlink mode, see `.specweave/docs/internal/advanced/symlink-dev-mode.md`"

**Quick Reference - Remember** (Line 684):
- **BEFORE**: "1. Symlink setup is MANDATORY for contributors"
- **AFTER**: "1. Push changes to GitHub → Claude Code auto-updates marketplace (5-10s)"

### 2. .github/CONTRIBUTING.md (External Contributor Guide)

**Install SpecWeave Section** (Lines 45-122)

**BEFORE**:
- "🚨 CRITICAL: You MUST create a marketplace symlink for hooks to work!"
- Detailed symlink creation instructions
- "Why Symlink is MANDATORY" section
- Troubleshooting focused on symlink issues

**AFTER**:
- "📌 RECOMMENDED: Use GitHub marketplace workflow (cross-platform, simple)"
- Simple 4-step setup: npm install, npm run rebuild, install hooks, done
- "How it works" section explaining auto-update behavior
- Symlink mentioned only as advanced option with Unix-only warning
- Troubleshooting focused on GitHub push workflow

### 3. .specweave/docs/internal/advanced/symlink-dev-mode.md (NEW)

**Created comprehensive advanced documentation** for symlink mode:
- Clear audience: Advanced contributors who need instant feedback
- Platform warnings: macOS/Linux only, NOT Windows
- Detailed setup instructions (with registry locking)
- Troubleshooting guide
- Comparison table: Symlink vs GitHub marketplace
- When to use / when not to use guidance

**Sections**:
1. When to Use This (opt-in guidance)
2. How It Works (technical explanation)
3. Setup Instructions (3-step with verification)
4. Development Workflow (instant feedback loop)
5. Troubleshooting (symlink converted to directory, etc.)
6. Switching Between Modes
7. Pre-Commit Hook Integration
8. Comparison Table

### 4. Pre-Commit Hook (No Changes Needed)

**Verified**: Already handles symlink check correctly
- Lines 12-31: Checks for symlink but **only warns** (doesn't fail)
- Line 26: `# exit 1` is commented out (allows commit)
- Works for both GitHub marketplace and symlink users

---

## Workflow Comparison

| Aspect | Old (Symlink-First) | New (GitHub Marketplace-First) |
|--------|---------------------|--------------------------------|
| **Primary Workflow** | Symlink (MANDATORY) | GitHub marketplace (RECOMMENDED) |
| **Platforms** | macOS/Linux only | macOS, Linux, Windows |
| **Setup Steps** | 7 steps (complex) | 3 steps (simple) |
| **Scripts Required** | dev-mode.sh, verify-dev-setup.sh | None (optional git hooks) |
| **Registry Manipulation** | Required (chmod 444) | Not needed |
| **Maintenance** | High (check every session) | Zero (auto-managed) |
| **Feedback Loop** | Instant (<1s) | Fast (5-10s) |
| **Reliability** | Medium (Claude Code fights symlinks) | High (Claude Code manages it) |
| **Windows Support** | ❌ Requires admin | ✅ Works out of box |
| **Symlink Option** | Primary method | Advanced/optional |

---

## New Contributor Experience

### Quick Start (3 Steps)

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/specweave.git
cd specweave
npm install

# 2. Build
npm run rebuild

# 3. Done! Claude Code auto-installs from GitHub marketplace
```

### Development Workflow

```bash
# Make changes
vim src/file.ts

# Build and test
npm run rebuild && npm test

# Push to branch
git add . && git commit -m "feat: new feature"
git push origin develop

# Wait 5-10 seconds → Claude Code auto-updates
# Test in Claude Code → hooks work!
```

**No symlinks, no scripts, no platform-specific commands.**

---

## Advanced Users (Symlink Mode)

**When to use**:
- Rapid hook iteration (10+ changes per session)
- Pre-commit hook testing (can't push without working hooks)
- Need instant feedback (<1s vs 5-10s)

**When NOT to use**:
- Windows development
- New contributors (GitHub marketplace is simpler)
- Normal feature development (5-10s is fast enough)

**Documentation**: `.specweave/docs/internal/advanced/symlink-dev-mode.md`

---

## Migration Guide (For Existing Contributors)

### From Symlink Mode → GitHub Marketplace

```bash
# 1. Restore marketplace registry
chmod 644 ~/.claude/plugins/known_marketplaces.json
echo '{
  "specweave": {
    "source": {
      "source": "github",
      "repo": "anton-abyzov/specweave"
    },
    "installLocation": "'$HOME'/.claude/plugins/marketplaces/specweave",
    "lastUpdated": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }
}' > ~/.claude/plugins/known_marketplaces.json

# 2. Remove symlink
rm ~/.claude/plugins/marketplaces/specweave

# 3. Claude Code auto-recreates directory from GitHub (wait 5-10s)

# 4. Develop normally (push to GitHub, Claude Code updates)
```

### From GitHub Marketplace → Symlink Mode

```bash
# See: .specweave/docs/internal/advanced/symlink-dev-mode.md
bash scripts/dev-mode.sh
echo '{}' > ~/.claude/plugins/known_marketplaces.json
chmod 444 ~/.claude/plugins/known_marketplaces.json
```

---

## Testing Unpushed Changes

### Option 1: Temporary Branch (Recommended)
```bash
git checkout -b temp-test-$(date +%s)
git add . && git commit -m "temp: testing"
git push origin temp-test-1234567890
# Test in Claude Code (5-10s)
git push origin --delete temp-test-1234567890
git checkout develop && git branch -D temp-test-1234567890
```

### Option 2: Fork-Based Development
```bash
claude plugin marketplace remove specweave
claude plugin marketplace add github:YOUR_USERNAME/specweave
git push origin develop  # Pushes to YOUR fork
```

### Option 3: Symlink Mode (Advanced)
See advanced documentation.

---

## Impact Analysis

### Positive Impacts

1. **Windows Contributors**: Can now contribute without admin privileges or WSL
2. **New Contributors**: Simpler onboarding (3 steps vs 7 steps)
3. **Team Coordination**: Everyone uses same workflow (no platform-specific setup)
4. **Reliability**: Claude Code manages updates (no symlink race conditions)
5. **Documentation**: Clearer separation (primary vs advanced)

### Trade-offs

1. **Feedback Loop**: 5-10s delay vs instant (symlink)
   - **Mitigation**: For rapid iteration, use temporary branches or symlink mode
2. **Testing Unpushed Changes**: Must push to branch
   - **Mitigation**: Use throwaway branches for testing
3. **Advanced Users**: Need extra documentation for symlink mode
   - **Mitigation**: Comprehensive advanced docs created

### Risks Mitigated

1. **Platform Lock-in**: Windows contributors no longer excluded
2. **Complexity**: Reduced setup complexity by 60% (7 steps → 3 steps)
3. **Maintenance Burden**: Zero maintenance (Claude Code manages marketplace)
4. **Documentation Confusion**: Clear primary vs advanced separation

---

## Verification Checklist

- [x] CLAUDE.md Section 1 rewritten (GitHub marketplace first)
- [x] CLAUDE.md Troubleshooting updated
- [x] CLAUDE.md Quick Reference updated
- [x] CONTRIBUTING.md rewritten (GitHub marketplace first)
- [x] Advanced symlink documentation created
- [x] Pre-commit hook verified (already optional)
- [x] GitHub marketplace workflow tested (working)
- [x] Hooks accessible from marketplace
- [x] TodoWrite executes without errors

---

## Next Steps (Future Improvements)

1. **Update increment 0043 docs**: Mark symlink approach as advanced/optional
2. **Add video tutorial**: GitHub marketplace workflow walkthrough
3. **Update FAQ**: Common questions about marketplace vs symlink
4. **Metrics**: Track how many contributors use each approach
5. **Windows CI**: Add Windows to CI pipeline (now possible!)

---

## See Also

- **Recommendation Report**: `.specweave/increments/0046-console-elimination/reports/SIMPLE-DEV-SETUP-RECOMMENDATION.md`
- **Hook Error Resolution**: `.specweave/increments/0046-console-elimination/reports/HOOK-ERROR-RESOLUTION-FINAL.md`
- **Prevention Strategy**: `.specweave/increments/0046-console-elimination/reports/HOOK-ERROR-PREVENTION-STRATEGY.md`
- **Advanced Symlink Docs**: `.specweave/docs/internal/advanced/symlink-dev-mode.md`
- **CLAUDE.md**: Section 1 - Local Development Setup
- **CONTRIBUTING.md**: Install SpecWeave section

---

## Conclusion

**The documentation has been successfully updated** to prioritize the **cross-platform GitHub marketplace workflow** while preserving symlink mode as an **advanced option for power users**.

This change makes SpecWeave accessible to **all contributors regardless of platform**, simplifies onboarding, and leverages Claude Code's intended workflow instead of fighting it.

**GitHub marketplace is now the recommended approach for 95% of contributors.**
