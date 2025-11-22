# GitHub Sync Permission Bug - 2025-11-22

## Problem

The GitHub sync code **does NOT respect** the permission flags in `.specweave/config.json`!

## Config Says (Correctly Set)

`.specweave/config.json` lines 108-118:
```json
"sync": {
  "enabled": true,
  "provider": "github",
  "settings": {
    "canUpsertInternalItems": true,      ✅ Set
    "canUpdateExternalItems": true,      ✅ Set
    "canUpdateStatus": true              ✅ Set
  }
}
```

## But Code IGNORES Them! ❌

**File**: `plugins/specweave-github/lib/github-spec-content-sync.ts`

### What It Checks (Line 394):
```typescript
return config.sync?.settings?.syncSpecContent !== false;
```

**Only checks**: `syncSpecContent` (not even in your config!)

### What It DOESN'T Check:
- ❌ `canUpsertInternalItems` - Never checked
- ❌ `canUpdateExternalItems` - Never checked before updating GitHub issues
- ❌ `canUpdateStatus` - Never checked

### Problematic Code:

**Line 130-134** (No permission check!):
```typescript
if (existingIssueNumber) {
  // UPDATE existing issue - NO PERMISSION CHECK!
  return await updateGitHubIssue(client, spec, parseInt(existingIssueNumber), options);
} else {
  // CREATE new issue - NO PERMISSION CHECK!
  return await createGitHubIssue(client, spec, options);
}
```

**Line 297** (Updates GitHub without permission check!):
```typescript
await client.addLabels(issueNumber, labels);  // ❌ Should check canUpdateExternalItems!
```

**Line 300-306** (Posts comment without permission check!):
```typescript
await postProgressComment(
  client,
  specPath,
  issueNumber,
  spec,
  verbose
);  // ❌ Should check canUpdateExternalItems!
```

## Impact

Even if you set `canUpdateExternalItems: false`, the GitHub sync will **still update GitHub issues**!

This means:
- ✅ Config flags exist
- ✅ Flags are set correctly
- ❌ **Code doesn't use them!**

## What Should Happen

### 1. Check `canUpdateExternalItems` Before Updates

```typescript
async function updateGitHubIssue(
  client: GitHubClientV2,
  spec: SpecContent,
  issueNumber: number,
  options: GitHubContentSyncOptions
): Promise<ContentSyncResult> {
  // ✅ ADD THIS CHECK
  const config = await loadConfig(projectRoot);
  if (!config.sync?.settings?.canUpdateExternalItems) {
    return {
      success: false,
      action: 'skipped',
      error: 'canUpdateExternalItems is disabled in config'
    };
  }

  // ... rest of update logic
}
```

### 2. Check `canUpsertInternalItems` Before Creation

```typescript
async function createGitHubIssue(
  client: GitHubClientV2,
  spec: SpecContent,
  options: GitHubContentSyncOptions
): Promise<ContentSyncResult> {
  // ✅ ADD THIS CHECK
  const config = await loadConfig(projectRoot);
  if (!config.sync?.settings?.canUpsertInternalItems) {
    return {
      success: false,
      action: 'skipped',
      error: 'canUpsertInternalItems is disabled in config'
    };
  }

  // ... rest of create logic
}
```

### 3. Check `canUpdateStatus` Before Status Changes

```typescript
// In status sync logic (if exists)
if (!config.sync?.settings?.canUpdateStatus) {
  // Skip status sync
  return;
}
```

## Why This Matters

**Current behavior**:
- User sets `canUpdateExternalItems: false` to prevent GitHub updates
- **GitHub still gets updated anyway!** (Bug)
- User confused why config doesn't work

**Expected behavior**:
- User sets `canUpdateExternalItems: false`
- GitHub sync skips updates (respects config)
- User has full control

## Files to Fix

1. **Primary**: `plugins/specweave-github/lib/github-spec-content-sync.ts`
   - Add permission checks to `updateGitHubIssue()` (line 228)
   - Add permission checks to `createGitHubIssue()` (line 148)
   - Add permission checks to `postProgressComment()` (line 336)

2. **Secondary**: `plugins/specweave-github/lib/ThreeLayerSyncManager.ts`
   - Verify it uses permission flags correctly

3. **Hook**: `plugins/specweave-github/hooks/post-task-completion.sh`
   - Already registered ✅
   - Calls sync CLI which should respect permissions (once fixed)

## Recommendation

**Option 1: Add Permission Checks (Correct)**
- Read config in each sync function
- Check permission flags before operations
- Return `{ action: 'skipped' }` if permission denied

**Option 2: Fail Fast at Entry Point**
- Check permissions once at hook entry
- Skip entire GitHub sync if permissions disabled
- Faster but less granular

**Recommended**: Option 1 (more control, better error messages)

## Testing

After fix:

```bash
# 1. Disable external updates
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('.specweave/config.json'));
config.sync.settings.canUpdateExternalItems = false;
fs.writeFileSync('.specweave/config.json', JSON.stringify(config, null, 2));
"

# 2. Complete a task (should NOT update GitHub)
# TodoWrite -> hook fires -> sync runs -> permission check FAILS -> GitHub not updated ✅

# 3. Re-enable
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('.specweave/config.json'));
config.sync.settings.canUpdateExternalItems = true;
fs.writeFileSync('.specweave/config.json', JSON.stringify(config, null, 2));
"

# 4. Complete a task (should update GitHub)
# TodoWrite -> hook fires -> sync runs -> permission check PASSES -> GitHub updated ✅
```

## See Also

- `.specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md`
- ADR-0047: Three-Permission Architecture
- `github-sync-bidirectional.ts` (deprecated, has correct comments but not used)

---

**Status**: 🐛 BUG CONFIRMED - Permission flags exist but are not used by sync code!
**Next**: Add permission checks to `github-spec-content-sync.ts`
