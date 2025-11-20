# Migration Guide: v0.23.x → v0.24.0

**Target Audience**: Existing SpecWeave users upgrading from v0.23.x

---

## Overview

SpecWeave v0.24.0 introduces the **5-Gate Permission Architecture** for fine-grained control over sync operations. This guide helps you migrate safely.

## TL;DR - Quick Migration

**For most users**: ✅ **No action required**

v0.24.0 is **100% backward compatible**. Your existing workflows continue working unchanged.

---

## What Changed?

### New: 5-Gate Permission System

v0.24.0 adds granular permission controls:

| Gate | Permission | Default (new projects) | Default (existing projects) |
|------|-----------|------------------------|----------------------------|
| GATE 1 | `canUpsertInternalItems` | `false` | `true` (auto-enabled) |
| GATE 2 | `canUpdateExternalItems` | `false` | `true` (auto-enabled) |
| GATE 3 | `autoSyncOnCompletion` | **`true`** | `true` (auto-enabled) |
| GATE 4 | `{tool}.enabled` | `false` | `true` (auto-enabled) |
| GATE 5 | `canUpdateStatus` | `false` | `true` (auto-enabled) |

**Existing projects**: All permissions auto-enabled on first run (maintains current behavior)

**New projects**: User prompted during `specweave init`

---

## Migration Steps

### Step 1: Update SpecWeave

```bash
npm install -g specweave@latest
# or
npm update specweave
```

**Expected version**: v0.24.0 or higher

### Step 2: Verify Auto-Migration

Run any SpecWeave command:

```bash
specweave status
# or
/specweave:progress
```

**What happens**:
- v0.24.0 detects you're upgrading from v0.23.x
- Auto-enables all permissions (maintains current behavior)
- Updates `.specweave/config.json` with new settings

**No manual config changes needed!**

### Step 3: Verify Configuration

Check your config:

```bash
cat .specweave/config.json | grep -A 15 "sync"
```

**Expected output**:
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true,
      "canUpdateStatus": true
    },
    "github": { "enabled": true }
  }
}
```

All `true` = same behavior as v0.23.x ✅

---

## Customizing Permissions (Optional)

### Scenario 1: Disable Automatic External Sync

**Use Case**: You want to review changes internally before syncing to GitHub/JIRA.

**Change**:
```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false  // Changed from true
    }
  }
}
```

**Effect**: `/specweave:done` updates living docs locally, but requires manual sync:
```bash
/specweave-github:sync 0047
```

---

### Scenario 2: Read-Only External Integration

**Use Case**: You import from GitHub but don't want SpecWeave to push changes back.

**Change**:
```json
{
  "sync": {
    "settings": {
      "canUpdateExternalItems": false  // Changed from true
    }
  }
}
```

**Effect**: External tools remain read-only (import only, never export).

---

### Scenario 3: Disable Specific Tools

**Use Case**: You use multiple tools but only want to sync with GitHub.

**Change**:
```json
{
  "sync": {
    "github": { "enabled": true },
    "jira": { "enabled": false },    // Disabled
    "ado": { "enabled": false }      // Disabled
  }
}
```

**Effect**: Only GitHub receives sync updates.

---

## Troubleshooting

### Issue: "Living docs sync BLOCKED"

**Symptom**:
```
⛔ Living docs sync BLOCKED (canUpsertInternalItems = false)
```

**Cause**: Auto-migration didn't run or config was manually edited.

**Fix**:
```json
{"sync": {"settings": {"canUpsertInternalItems": true}}}
```

---

### Issue: "Automatic sync DISABLED"

**Symptom**:
```
⚠️ Automatic external sync DISABLED (autoSyncOnCompletion = false)
```

**Cause**: This is expected if you customized permissions.

**Fix Option 1** (Enable auto-sync):
```json
{"sync": {"settings": {"autoSyncOnCompletion": true}}}
```

**Fix Option 2** (Manual sync):
```bash
/specweave-github:sync 0047
```

---

### Issue: Tests failing after upgrade

**Symptom**: Existing tests fail with permission errors.

**Cause**: Test environment doesn't have config.json.

**Fix**: Add config to test setup:
```typescript
beforeEach(async () => {
  const config = {
    sync: {
      settings: {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        autoSyncOnCompletion: true
      }
    }
  };
  await fs.writeJson('.specweave/config.json', config);
});
```

---

## Breaking Changes

**None!** v0.24.0 is 100% backward compatible.

**New defaults for fresh projects**:
- All permissions default to `false` (deny-by-default security model)
- Users prompted during `specweave init` to configure

**Existing projects**:
- All permissions auto-enabled to `true` (maintains v0.23.x behavior)
- No manual migration required

---

## Rollback Plan

If you encounter issues, rollback to v0.23.x:

```bash
npm install -g specweave@0.23.2
```

**Your data is safe**: v0.24.0 doesn't modify existing increments or living docs structure.

**Report issues**: https://github.com/anthropics/specweave/issues

---

## What's New in v0.24.0

### Security Improvements

✅ **Permission checks BEFORE sync** (not after)
✅ **Deny-by-default** security model
✅ **Config error handling** (malformed JSON fails safe)
✅ **Defense-in-depth** (multiple permission checks)

### New Features

- **Fine-grained sync control** (5 independent permission gates)
- **Automatic vs manual sync** (`autoSyncOnCompletion` setting)
- **Per-tool enable flags** (control GitHub/JIRA/ADO individually)
- **Clear error messages** with actionable fix instructions

### Documentation

- **Architecture**: `.specweave/docs/internal/architecture/hld-permissions.md`
- **User Guide**: `.specweave/docs/public/guides/sync-configuration.md`
- **This Guide**: `.specweave/docs/public/guides/migration-v024.md`

---

## FAQ

### Q: Will my existing increments break?

**A**: No! All existing increments continue working unchanged.

### Q: Do I need to reconfigure external tools (GitHub/JIRA)?

**A**: No! Existing connections remain unchanged.

### Q: Can I disable all sync?

**A**: Yes! Set `canUpsertInternalItems = false` for fully locked mode.

### Q: How do I test the new permissions?

**A**: Create a test increment and try different permission combinations:
```bash
/specweave:increment "test-permissions"
# Modify .specweave/config.json
# Complete tasks and observe sync behavior
```

### Q: What if I find a bug?

**A**: Report at https://github.com/anthropics/specweave/issues with:
- SpecWeave version: `specweave --version`
- Your config (redact sensitive data)
- Steps to reproduce

---

## Next Steps

1. ✅ Update to v0.24.0
2. ✅ Verify auto-migration worked
3. 📖 Read sync configuration guide (`.specweave/docs/public/guides/sync-configuration.md`)
4. 🎯 (Optional) Customize permissions for your workflow
5. ✅ Continue using SpecWeave as normal!

---

**Migration Status**: ✅ Complete
**Your Action**: None required (auto-migration handles everything)
**Questions?** See full documentation or file an issue

---

**Version**: v0.24.0
**Last Updated**: 2025-11-20
