# ADR-0139: Unified Post-Increment GitHub Sync

**Status**: Accepted
**Date**: 2025-11-24
**Deciders**: Anton Abyzov (Tech Lead), Claude (Architect)
**Related**: ADR-0135 (Increment Creation Sync Orchestration), ADR-0134 (External Tool Detection)

## Context

### Problem Statement

After increment creation, GitHub issues for User Stories were NOT being created reliably. Users expected automatic GitHub sync but got nothing.

**Root Causes Identified**:

1. **Silent Failures**: `sync-living-docs.js` has 5 config gates that can silently skip GitHub sync
2. **Missing Feature ID**: If `spec.md` lacks `feature_id`/`epic`/`feature` in frontmatter, sync was silently skipped
3. **No Retry Mechanism**: Transient failures (network, rate limits) had no recovery
4. **Incomplete Feature ID Extraction**: Hook only looked for `epic:` field, missing `feature_id:` and `feature:`

### Evidence

```
User creates increment → Living docs created ✅
                       → GitHub issues NOT created ❌ (silent skip)
                       → User confused, runs manual sync
```

## Decision

Implement **explicit GitHub sync** in `post-increment-planning.sh` with:

1. **Multi-field Feature ID Extraction** - Check `epic:`, `feature_id:`, `feature:` in order
2. **Feature ID Auto-generation** - If no field found, generate `FS-XXX` from increment number
3. **Explicit GitHub Sync Step** - Direct call to `github-feature-sync-cli.js` after living docs
4. **Retry Mechanism** - 2 attempts with 3-second delay
5. **User Feedback** - Clear messages on success/failure with recovery instructions

## Implementation

### 1. Enhanced Feature ID Extraction (post-increment-planning.sh)

```bash
# Extract from multiple frontmatter fields (priority order)
FEATURE_ID=$(awk '
  in_frontmatter == 1 && /^epic:/ { feature_id = ... }
  in_frontmatter == 1 && /^feature_id:/ { if (!feature_id) feature_id = ... }
  in_frontmatter == 1 && /^feature:/ { if (!feature_id) feature_id = ... }
' "$spec_md_path")

# Auto-generate if not found
if [ -z "$FEATURE_ID" ]; then
  increment_num=$(echo "$increment_id" | grep -oE '^[0-9]+')
  FEATURE_ID="FS-${increment_num}"
fi
```

### 2. Explicit GitHub Sync Step (post-increment-planning.sh)

After living docs sync (Step 7), new Step 8:

```bash
# STEP 8: EXPLICIT GITHUB ISSUE CREATION
if [ "$github_enabled" = "true" ] && [ -n "$FEATURE_ID" ]; then
  # Load token, find CLI script
  GITHUB_TOKEN=... node "$GITHUB_SYNC_SCRIPT" "$FEATURE_ID"

  # Retry on failure (2 attempts, 3s delay)
fi
```

### 3. GitHub Feature Sync CLI (github-feature-sync-cli.ts)

New standalone CLI wrapper:

```typescript
// Usage: node github-feature-sync-cli.js FS-062
// - Loads config from .specweave/config.json
// - Detects repo from git remote
// - Creates Milestone + User Story Issues
// - Idempotent (skips existing issues)
```

### 4. SyncCoordinator Auto-generation (sync-coordinator.ts)

```typescript
if (!featureId) {
  const incrementMatch = this.incrementId.match(/^(\d+)/);
  if (incrementMatch) {
    featureId = `FS-${incrementMatch[1]}`;
    this.logger.log(`📝 Auto-generated feature ID: ${featureId}`);
  }
}
```

## New Flow

```
User creates increment
  ↓
post-increment-planning.sh fires
  ↓
Step 7: Living docs sync (existing)
  ↓
Step 8: Explicit GitHub sync (NEW)
  ├── Extract feature ID (epic/feature_id/feature)
  ├── Auto-generate if missing (FS-XXX)
  ├── Call github-feature-sync-cli.js
  ├── Retry on failure (2x)
  └── Report result to user
  ↓
✅ GitHub issues created!
```

## Files Changed

1. `plugins/specweave/hooks/post-increment-planning.sh`
   - Enhanced feature ID extraction (multi-field + auto-generate)
   - Added Step 8: Explicit GitHub sync with retry

2. `plugins/specweave-github/lib/github-feature-sync-cli.ts` (NEW)
   - Standalone CLI for GitHub sync
   - Loads config, creates issues, handles errors

3. `src/sync/sync-coordinator.ts`
   - Added feature ID auto-generation

## Consequences

### Positive

- **Reliable GitHub Sync**: Issues created automatically after increment
- **Resilient**: Retry mechanism handles transient failures
- **User-Friendly**: Clear feedback on success/failure
- **Self-Healing**: Auto-generates feature ID if missing

### Negative

- **Additional Hook Execution Time**: ~5-10 seconds for GitHub API calls
- **Duplicate Code**: Feature ID extraction in both shell and TypeScript

### Mitigations

- GitHub sync runs non-blocking (doesn't block hook completion)
- Idempotency checks prevent duplicate issues

## Testing

```bash
# Test CLI directly
GITHUB_TOKEN=xxx node dist/plugins/specweave-github/lib/github-feature-sync-cli.js FS-061

# Expected output:
# 🐙 GitHub Feature Sync CLI
#    Feature: FS-061
#    Repository: owner/repo
# 🔄 Syncing FS-061 to GitHub...
# ✅ Sync complete!
#    🎯 Milestone: #21
#    📝 Issues created: 3
```

## References

- [ADR-0135: Increment Creation Sync Orchestration](./0135-increment-creation-sync-orchestration)
- [ADR-0134: External Tool Detection Enhancement](./0134-external-tool-detection-enhancement)
- [CLAUDE.md: GitHub Issue Format(../../../../../../CLAUDE.md)
