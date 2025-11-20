# ADR-0048: Claude Code Marketplace Symlink Requirement for Local Development

**Status**: ✅ Accepted
**Date**: 2025-11-18
**Context**: Increment 0043 - Plugin Hook Execution Errors Investigation
**Severity**: 🔴 **CRITICAL** - Affects all SpecWeave contributors

---

## Context

During development of SpecWeave (increment 0043), we encountered systematic failures of plugin hooks with the error:

```
Plugin hook error: /bin/sh:
~/.claude/plugins/marketplaces/specweave/plugins/*/hooks/*.sh:
No such file or directory
```

After extensive investigation (5 hypothesis testing phases), we discovered a critical architectural constraint in Claude Code's plugin system.

---

## Problem Statement

Claude Code has **two separate systems** for plugin management:

1. **Plugin Registry** (`~/.claude/plugins/installed_plugins.json`)
   - Tracks installed plugins
   - Stores `installPath` for each plugin
   - Used for: Skills, agents, commands discovery

2. **Hook Execution System**
   - Looks for hooks in marketplace directory (`~/.claude/plugins/marketplaces/*/`)
   - Does **NOT** use `installPath` from registry
   - Expects hooks at fixed marketplace paths

### The Critical Constraint

The marketplace path (`~/.claude/plugins/marketplaces/specweave/`) can be:
- **Directory**: A copy of the plugin repository (created by `claude plugin marketplace update`)
- **Symlink**: A symbolic link to the local development repository

**For local development, ONLY symlinks work reliably.**

---

## Investigation Summary

### Phase 1: File Existence ✅
- **Hypothesis**: Hooks don't exist
- **Result**: ❌ Rejected - All hooks exist in repository

### Phase 2: Permissions ✅
- **Hypothesis**: Hooks not executable
- **Result**: ❌ Rejected - All hooks have `rwxr-xr-x` permissions

### Phase 3: Extended Attributes ✅
- **Hypothesis**: macOS quarantine blocks execution
- **Result**: ❌ Rejected - No quarantine attribute, only provenance

### Phase 4: Shebang/Line Endings ✅
- **Hypothesis**: Invalid interpreter or DOS line endings
- **Result**: ❌ Rejected - Valid shebang, Unix line endings, manual execution works

### Phase 5: Directory vs Symlink ⭐
- **Hypothesis**: Hook execution expects symlink, but directory exists
- **Result**: ✅ **ROOT CAUSE IDENTIFIED**

---

## Root Cause Analysis

### Directory vs Symlink Behavior

| Aspect | Directory (`drwxr-xr-x`) | Symlink (`lrwxr-xr-x`) |
|--------|--------------------------|------------------------|
| **Type** | Copy of repository | Live reference to repository |
| **Sync** | Manual (`claude plugin marketplace update`) | Automatic (changes immediately reflected) |
| **Hook Changes** | NOT reflected until marketplace update | Immediately available |
| **Development** | ❌ Frustrating (stale code, manual updates) | ✅ Smooth (live code, zero latency) |
| **Failure Mode** | Hooks fail with "No such file" if stale/inconsistent | Hooks always work (uses latest code) |

### Why Directory Setup Fails

1. **Stale Code**: Marketplace directory copy may be outdated
2. **Inconsistent State**: Updates can leave directory in broken state
3. **Silent Failures**: No clear error points to directory vs symlink issue
4. **Development Friction**: Every hook change requires marketplace update

### How the Problem Occurs

```
Developer Workflow:
1. Clone repository → ✅ Has latest hooks
2. Create symlink → ✅ Hooks accessible via marketplace path
3. Run `claude plugin marketplace update` → ❌ SYMLINK REPLACED WITH DIRECTORY
4. Hooks start failing → ❌ No clear error message
5. Hours of debugging → ❌ Frustration
```

---

## Decision

**For SpecWeave local development, the marketplace path MUST be a symlink.**

### Requirements

1. ✅ **Mandatory symlink** at `~/.claude/plugins/marketplaces/specweave/`
2. ✅ **Automated verification** via pre-commit hook (warns if directory)
3. ✅ **Clear documentation** in CLAUDE.md with visual distinction
4. ✅ **Troubleshooting guide** for fixing broken setup

### Non-Requirements

- ❌ **NOT** required for end users (they get marketplace installations)
- ❌ **NOT** enforced by build system (developers can bypass with `--no-verify`)
- ❌ **NOT** a technical limitation (directory setup CAN work, but unreliable)

---

## Solution

### Setup Script

```bash
#!/bin/bash
# Create marketplace symlink for local development

# Remove any existing directory/symlink
rm -rf ~/.claude/plugins/marketplaces/specweave

# Create symlink to local repository (use absolute path)
ln -s "$(pwd)" ~/.claude/plugins/marketplaces/specweave

# Verify symlink is correct
test -L ~/.claude/plugins/marketplaces/specweave && \
  echo "✅ Symlink created successfully" || \
  echo "❌ Failed to create symlink"
```

### Verification Script

Location: `.specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh`

**Checks**:
1. ✅ Symlink exists (`-L` test)
2. ✅ Points to current repository (`readlink` matches `$REPO_ROOT`)
3. ⚠️  Marketplace is registered (optional)
4. ✅ Hooks are accessible via symlink
5. ✅ Hooks have execute permissions
6. ✅ Optional plugins (release, ADO, etc.) accessible

### Pre-Commit Hook Integration

Added to `.git/hooks/pre-commit` (installed via `scripts/install-git-hooks.sh`):

```bash
# Verify local development setup (contributors only)
if [ -f ".specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh" ]; then
  if [ -d "plugins/specweave" ]; then  # Only for contributors
    bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh > /dev/null 2>&1 || {
      echo "⚠️  WARNING: Local development setup verification failed"
      echo "   Run: bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh"
      # Don't fail commit, just warn
    }
  fi
fi
```

---

## Consequences

### Positive

1. ✅ **Immediate Feedback**: Hook changes reflected instantly
2. ✅ **No Manual Sync**: No need for `claude plugin marketplace update` after every change
3. ✅ **Reliable Hooks**: Hooks always execute (no stale code)
4. ✅ **Faster Development**: Zero latency between change and test
5. ✅ **Clear Error Messages**: Verification script provides actionable fix

### Negative

1. ⚠️  **Setup Complexity**: Contributors must understand symlink requirement
2. ⚠️  **Fragile**: Marketplace updates MAY replace symlink with directory
3. ⚠️  **Platform Specific**: Symlinks work differently on Windows (requires admin or dev mode)
4. ⚠️  **Hidden Dependency**: Not obvious from error messages that symlink is required

### Mitigations

1. ✅ **Clear Documentation**: CLAUDE.md has prominent warning section
2. ✅ **Automated Detection**: Pre-commit hook warns if setup broken
3. ✅ **Quick Fix**: One-command fix provided in all documentation
4. ✅ **Comprehensive Reports**: Ultrathink analysis for deep understanding

---

## Alternatives Considered

### Alternative 1: Use Directory Setup (Rejected)

**Pros**:
- Simpler (no symlink needed)
- Matches production environment

**Cons**:
- ❌ Requires manual `claude plugin marketplace update` after every hook change
- ❌ Stale code issues
- ❌ Inconsistent state during updates
- ❌ Slow development workflow

**Decision**: Rejected - Development experience too poor

### Alternative 2: Patch Claude Code to Use `installPath` (Rejected)

**Pros**:
- Would solve problem at root cause
- No symlink needed

**Cons**:
- ❌ Requires changes to Claude Code (outside our control)
- ❌ Backward compatibility issues
- ❌ May break existing plugins

**Decision**: Rejected - Not feasible (external dependency)

### Alternative 3: Document but Don't Enforce (Considered)

**Pros**:
- Developers have flexibility
- No pre-commit hook overhead

**Cons**:
- ⚠️  Easy to forget and waste hours debugging
- ⚠️  Inconsistent developer experience

**Decision**: Partially accepted - We warn but don't fail commits

---

## Implementation

### Files Modified

1. **CLAUDE.md** (lines 13-71)
   - Added prominent warning section at top of file
   - Visual distinction (directory vs symlink table)
   - Quick fix commands
   - References to detailed reports

2. **scripts/install-git-hooks.sh** (lines 43-63, 149-160)
   - Added verification step to pre-commit hook
   - Enhanced output to show symlink check

3. **Created verification script**:
   - `.specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh`
   - 6 comprehensive checks
   - Clear pass/fail reporting
   - Fix instructions on failure

### Documentation Created

1. **Ultrathink Report** (~400 lines):
   - `.specweave/increments/0043-spec-md-desync-fix/reports/ULTRATHINK-HOOK-EXECUTION-ERRORS-ROOT-CAUSE-ANALYSIS-2025-11-18.md`
   - 5-phase investigation process
   - Technical deep dive
   - Prevention strategies

2. **Fixes Applied Summary**:
   - `.specweave/increments/0043-spec-md-desync-fix/reports/HOOK-EXECUTION-ERRORS-FIXES-APPLIED-2025-11-18.md`
   - Before/after comparison
   - Verification results
   - One-command fix

3. **This ADR**:
   - `.specweave/docs/internal/architecture/adr/0082-claude-code-marketplace-symlink-requirement.md`
   - Architectural decision record
   - Alternatives analysis
   - Long-term reference

---

## Verification

### Before Fix

```bash
$ ls -ld ~/.claude/plugins/marketplaces/specweave
drwxr-xr-x  # ❌ DIRECTORY (wrong)

$ bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh
❌ FAILED: Marketplace symlink missing!
```

### After Fix

```bash
$ ls -ld ~/.claude/plugins/marketplaces/specweave
lrwxr-xr-x ... -> /Users/antonabyzov/Projects/github/specweave  # ✅ SYMLINK (correct)

$ bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh
✅ ALL CHECKS PASSED! Local development setup is correct.
```

---

## Lessons Learned

### 1. Two Separate Systems

Claude Code has separate systems for plugin registry and hook execution. Understanding this separation is critical.

### 2. Symlinks Are NOT Optional

For local development, symlinks are **mandatory**, not a convenience. Without them, hooks fail unpredictably.

### 3. "No such file" ≠ "File doesn't exist"

The error can mean many things:
- File doesn't exist
- Stale copy
- Wrong path
- **Directory instead of symlink** ← Our case

### 4. Verification is Essential

Automated verification catches issues before they cause frustration. Pre-commit hooks are valuable for this.

### 5. Clear Documentation Saves Time

Prominent warnings in CLAUDE.md ensure new contributors know about this requirement immediately.

---

## References

### Primary Sources

1. **Root Cause Investigation**:
   - Report: `.specweave/increments/0043-spec-md-desync-fix/reports/ULTRATHINK-HOOK-EXECUTION-ERRORS-ROOT-CAUSE-ANALYSIS-2025-11-18.md`
   - Increment: `0043-spec-md-desync-fix`

2. **Fixes Applied**:
   - Report: `.specweave/increments/0043-spec-md-desync-fix/reports/HOOK-EXECUTION-ERRORS-FIXES-APPLIED-2025-11-18.md`

3. **Verification Script**:
   - Location: `.specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh`

### Related Documentation

1. **CLAUDE.md**: Lines 13-71 - "Critical Finding: Claude Code Marketplace Directory vs Symlink Issue"
2. **Plugin Architecture**: `.specweave/docs/internal/architecture/PLUGIN-ARCHITECTURE.md`
3. **User Story**: `.specweave/docs/internal/specs/specweave/FS-023/us-001-claude-code-plugin-registration-p0-critical.md`
4. **Documentation Placement Analysis**: `.specweave/increments/0043-spec-md-desync-fix/reports/DOCUMENTATION-PLACEMENT-ANALYSIS-2025-11-18.md`

---

## Future Considerations

### Potential Improvements

1. **Auto-Fix on Marketplace Update**
   - Detect when marketplace update replaces symlink
   - Automatically recreate symlink
   - Requires: Background watcher or git hook

2. **Better Error Messages**
   - Enhance Claude Code to detect directory vs symlink
   - Provide actionable error message
   - Requires: Contribution to Claude Code

3. **Cross-Platform Support**
   - Test symlink setup on Windows
   - Document Windows-specific requirements (admin/dev mode)
   - Provide alternative for platforms without symlink support

4. **Automated Setup**
   - Add setup command: `npm run setup:dev`
   - Automatically creates symlink and verifies
   - Idempotent (safe to run multiple times)

### Open Questions

1. **Why does marketplace update replace symlinks?**
   - Is this intentional behavior?
   - Can it be configured?
   - Should we report to Claude Code team?

2. **What about CI/CD?**
   - Does CI environment use directory or symlink?
   - Should we align local dev with CI?
   - How to handle in containerized environments?

3. **Windows Compatibility**
   - Do symlinks work on Windows (without admin)?
   - Do we need a directory-based fallback?
   - How to detect platform and choose approach?

---

## Status

- **Decision**: ✅ **Accepted** (2025-11-18)
- **Implementation**: ✅ **Complete**
- **Verification**: ✅ **All checks passing**
- **Documentation**: ✅ **Comprehensive**
- **Adoption**: 🟡 **In Progress** (new contributors will see in CLAUDE.md)

---

**Author**: Claude Code (Sonnet 4.5) + Anton Abyzov
**Reviewers**: TBD (awaiting contributor feedback)
**Last Updated**: 2025-11-18
**Supersedes**: None (first ADR on this topic)
**Related ADRs**:
- ADR-0015: Hybrid Plugin System
- ADR-0018: Plugin Validation
