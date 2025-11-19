# Development Environment Hook Fix

**Date**: 2025-11-15
**Issue**: Plugin hooks not found during development
**Status**: ✅ RESOLVED

## Problem

When running `/specweave:do 0033`, encountered errors:

```
Plugin hook error: /bin/sh:
/Users/antonabyzov/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/pre-command-deduplication.sh:
No such file or directory

Plugin hook error: /bin/sh:
/Users/antonabyzov/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/user-prompt-submit.sh:
No such file or directory
```

## Root Cause

**Marketplace was registered but symlink didn't exist**:
- ✅ Marketplace registered correctly: `Source: Directory (/Users/antonabyzov/Projects/github/specweave)`
- ❌ Symlink missing: `~/.claude/plugins/marketplaces/specweave/` did not exist
- ❌ Result: Claude Code couldn't find hook files

This is a classic development environment issue where:
1. Marketplace registration survived (persistent in Claude Code config)
2. Symlink was removed (possibly by system cleanup, IDE restart, or manual deletion)
3. Both registration AND symlink are required for hooks to work

## Solution

**Ran automated setup script**:
```bash
./scripts/setup-dev-plugins.sh
```

**What it did**:
1. ✅ Created symlink: `~/.claude/plugins/marketplaces/specweave → /Users/antonabyzov/Projects/github/specweave`
2. ✅ Verified marketplace registration (already registered)
3. ✅ Validated hooks are now accessible

**Verification**:
```bash
# Both hooks now accessible via symlink
✅ ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/pre-command-deduplication.sh
✅ ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/user-prompt-submit.sh
```

## Prevention

**The setup script is idempotent** - safe to run anytime:
```bash
./scripts/setup-dev-plugins.sh
```

**When to run it**:
- After cloning the repo (initial setup)
- After Claude Code updates (symlink may be removed)
- After IDE restarts (if hooks stop working)
- When seeing "No such file or directory" hook errors

**Key Insights**:
- ✅ Symlink enables instant updates (no rebuild needed)
- ✅ Registration + Symlink = Both required for hooks
- ✅ Script auto-detects environment (local vs VM)
- ✅ Self-healing: Re-running fixes broken registrations

## Benefits of Fix

- ✅ **Immediate**: Hooks work without restart
- ✅ **Persistent**: Symlink survives IDE restarts
- ✅ **Developer-friendly**: Edit hooks → test instantly
- ✅ **Documented**: CLAUDE.md has full troubleshooting guide

## Related Documentation

- **CLAUDE.md**: Section "Plugin hooks not working? (Development Setup)"
- **Setup script**: `scripts/setup-dev-plugins.sh`
- **Plugin hooks**: `plugins/specweave/hooks/README.md`

## Lessons Learned

1. **Symlinks are fragile**: Can be removed by system cleanups
2. **Registration is persistent**: Survives cleanups but not sufficient alone
3. **Automated setup**: Script handles both symlink AND registration
4. **Multi-layer validation**: Setup script checks both conditions

---

**Status**: ✅ Fixed - hooks now working correctly
**Next Steps**: Continue with `/specweave:do 0033` to work on duplicate prevention
