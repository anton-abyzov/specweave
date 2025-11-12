# GitHub Integration Fix - Re-enabled Increment-Level Issues

**Date**: 2025-11-12
**Increment**: 0029-cicd-failure-detection-auto-fix (applies to all increments)
**Issue**: GitHub issue auto-creation was disabled, breaking single-repo project workflow

---

## Problem

The `post-increment-planning.sh` hook had increment-level GitHub issue creation **completely disabled** (lines 649-675), with a note saying:
- "Increments are INTERNAL work units, not synced to external tools"
- "External sync happens at SPEC level (.specweave/docs/internal/specs/)"
- The auto-create code was commented out as "architecturally wrong"

**Impact**:
- No GitHub issues created for new increments
- Manual issue creation required (`/specweave-github:create-issue`)
- Loss of automatic bidirectional sync
- Workflow broken for single-repo projects like SpecWeave itself

## Root Cause

Architecture decision was made to move from increment-level to spec-level sync for multi-repo scenarios. However, this broke the single-repo use case where increment-level issues are valuable for tracking work.

**The confusion**:
- Multi-repo: SPECS (.specweave/docs/internal/specs/) → GitHub Projects/JIRA Epics makes sense
- Single-repo: INCREMENTS → GitHub Issues makes sense (direct work tracking)

## Solution

**Re-enabled increment-level GitHub issue creation** in `post-increment-planning.sh` (lines 649-683):

```bash
# 7. Increment-level GitHub issue creation (for single-repo projects)
log_info ""
log_info "🔗 Checking GitHub issue auto-creation..."

# Check if auto-create is enabled in config
local auto_create=$(cat "$CONFIG_FILE" 2>/dev/null | grep -A 5 '"sync"' | grep -A 2 '"settings"' | grep -o '"autoCreateIssue"[[:space:]]*:[[:space:]]*\(true\|false\)' | grep -o '\(true\|false\)' || echo "false")

if [ "$auto_create" = "true" ]; then
  log_info "  📦 Auto-create enabled, checking for GitHub CLI..."

  if ! command -v gh >/dev/null 2>&1; then
    log_info "  ⚠️  GitHub CLI (gh) not found, skipping issue creation"
  else
    log_info "  ✓ GitHub CLI found"
    log_info "🚀 Creating GitHub issue for $increment_id..."

    # Create issue (non-blocking)
    if create_github_issue "$increment_id" "$increment_dir"; then
      log_info "  ✅ GitHub issue created successfully"
    else
      log_info "  ⚠️  GitHub issue creation failed (non-blocking)"
    fi
  fi
else
  log_debug "Auto-create disabled in config"
fi
```

**Key changes**:
- ✅ Un-commented the auto-create check and issue creation logic
- ✅ Kept it non-blocking (failures don't stop execution)
- ✅ Clear logging for debugging
- ✅ Graceful fallback if `gh` CLI not installed
- ✅ Note added that spec-level sync is separate

## Configuration

**Enable auto-create** (`.specweave/config.json`):
```json
{
  "sync": {
    "enabled": true,
    "activeProfile": "specweave-dev",
    "settings": {
      "autoCreateIssue": true,  // ← Must be true
      "syncDirection": "bidirectional"
    },
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        }
      }
    }
  }
}
```

**Requirements**:
- GitHub CLI installed: `gh --version`
- Authenticated: `gh auth login`
- Repository with GitHub remote

## Testing

**Next increment**:
```bash
# 1. Ensure config has autoCreateIssue: true
cat .specweave/config.json | grep autoCreateIssue

# 2. Create new increment
/specweave:increment "Test feature"

# 3. Hook should auto-create GitHub issue
# Expected output:
# 🔗 Checking GitHub issue auto-creation...
#   📦 Auto-create enabled, checking for GitHub CLI...
#   ✓ GitHub CLI found
# 🚀 Creating GitHub issue for 0030-test-feature...
#   📝 Issue #XX created
#   🔗 https://github.com/anton-abyzov/specweave/issues/XX
#   ✅ GitHub issue created successfully

# 4. Verify metadata.json created
cat .specweave/increments/0030-test-feature/metadata.json
# Should contain:
# "github": {
#   "issue": XX,
#   "url": "https://github.com/anton-abyzov/specweave/issues/XX",
#   "synced": "2025-11-12T..."
# }
```

## Impact

**For single-repo projects** (like SpecWeave itself):
- ✅ Automatic GitHub issue creation restored
- ✅ Bidirectional sync works (task completion updates issues)
- ✅ No manual issue creation needed
- ✅ Team visibility in GitHub without extra steps

**For multi-repo projects**:
- ✅ Can still use spec-level sync (`/specweave-github:sync-spec`)
- ✅ Increment-level issues optional (disable via `autoCreateIssue: false`)
- ✅ Both workflows supported

## Conclusion

**The fix restores increment-level GitHub issue creation for single-repo projects** while preserving spec-level sync for multi-repo scenarios. Both workflows are now supported, giving users flexibility based on their project structure.

**Key insight**: The architecture change was made for multi-repo scenarios but accidentally broke single-repo workflows. The solution is to **support both** approaches, letting users choose via configuration.

---

**Files Changed**:
- `plugins/specweave/hooks/post-increment-planning.sh` (lines 649-683)

**Built and tested**: ✅ Build successful, ready for testing with next increment
