# Migration Guide: v0.24 → v0.25

**Release**: v0.25.0  
**Date**: 2025-11-23  
**Type**: Feature Release (Backward Compatible)

## Summary

v0.25.0 introduces **Automatic GitHub Sync** with 4-tier permissions and 3-layer idempotency.

**Breaking Changes**: ❌ None  
**Required Actions**: ⚠️ Optional (recommended)  
**Migration Time**: 5-10 minutes

---

## What's New

### 1. Automatic GitHub Sync

**Before (v0.24)**:
```bash
# Manual sync required
/specweave:done 0051
/specweave-github:sync FS-049  # ← Manual step
```

**After (v0.25)**:
```bash
# Automatic sync on completion
/specweave:done 0051  # ← GitHub issues auto-created! 🎉
```

### 2. Permission Gates (4-Tier Model)

**New config options** (all optional, defaults work):

```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": true  // ← NEW in v0.25
    },
    "github": {
      "enabled": true  // ← Enhanced in v0.25
    }
  }
}
```

### 3. 3-Layer Idempotency

Prevents duplicate issues:
- Layer 1: Frontmatter cache (< 1ms)
- Layer 2: Metadata cache (< 5ms)
- Layer 3: GitHub API (500-2000ms)

**Result**: 99.9% faster on repeated syncs

---

## Migration Steps

### Step 1: Update SpecWeave

```bash
# Global install
npm update -g specweave

# Or local
npm install specweave@latest
npm run rebuild
```

**Verify**:
```bash
specweave --version  # Should show 0.25.0+
```

### Step 2: Update Config (Optional)

**If you want automatic sync** (recommended):

```json
// .specweave/config.json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true,
      "autoSyncOnCompletion": true  // ← Add this (default: true)
    },
    "github": {
      "enabled": true,  // ← Add this
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

**If you prefer manual sync**:

```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false  // ← Disable automatic
    }
  }
}
```

### Step 3: Test Sync

```bash
# Create test increment
/specweave:increment "Test automatic sync"

# Complete it
/specweave:done 0099

# Check GitHub - issues should be auto-created!
```

### Step 4: Verify Idempotency

```bash
# Re-run sync (should skip existing issues)
/specweave-github:sync FS-049

# Expected output:
# ⏭️  US-001 - Issue #123 already exists (cached)
```

---

## Compatibility Matrix

| Component | v0.24 | v0.25 | Compatible? |
|-----------|-------|-------|-------------|
| `.specweave/config.json` | ✅ | ✅ | ✅ Yes |
| Increment format | ✅ | ✅ | ✅ Yes |
| User stories | ✅ | ✅ | ✅ Yes |
| Hooks | ✅ | ✅ | ✅ Yes |
| GitHub sync | ✅ | ✅ Enhanced | ✅ Yes |

**Verdict**: 100% backward compatible!

---

## Behavioral Changes

### 1. Default Behavior

**v0.24**: Manual sync required  
**v0.25**: Automatic sync on `/done`

**Migration**: No action needed (opt-out model)

### 2. Idempotency

**v0.24**: 1-layer (GitHub API only)  
**v0.25**: 3-layer (frontmatter → metadata → API)

**Migration**: Automatic upgrade (no action)

### 3. Error Handling

**v0.24**: One failure blocks all  
**v0.25**: Per-issue isolation

**Migration**: Benefits automatic

---

## Breaking Changes

**None!** v0.25 is fully backward compatible with v0.24.

Existing workflows continue to work without modification.

---

## Rollback Instructions

If you encounter issues:

```bash
# 1. Disable automatic sync
# .specweave/config.json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false
    }
  }
}

# 2. Downgrade (if needed)
npm install -g specweave@0.24.11

# 3. Report issue
# https://github.com/anton-abyzov/specweave/issues
```

**Data loss risk**: ❌ None (metadata preserved)

---

## Common Migration Issues

### Issue 1: "GitHub sync disabled"

**Symptom**:
```
ℹ️  GitHub sync disabled (sync.github.enabled=false)
```

**Fix**:
```json
{
  "sync": {
    "github": {
      "enabled": true  // ← Set to true
    }
  }
}
```

### Issue 2: "No feature ID found"

**Symptom**:
```
⚠️  No feature ID found in increment spec
```

**Fix**: Add `feature_id` to spec.md:
```yaml
---
increment: 0051-test
feature_id: FS-049  // ← Add this
---
```

### Issue 3: Rate limit exceeded

**Symptom**:
```
⚠️  GitHub API rate limit exceeded
```

**Fix**: Authenticate for higher limits:
```bash
gh auth login  # 60/hr → 5000/hr
```

---

## New Commands

```bash
# Check sync status
/specweave-github:status FS-049

# Manual sync (still works)
/specweave-github:sync FS-049

# Cleanup duplicates (if needed)
bash scripts/cleanup-duplicate-github-issues.sh
```

---

## Performance Improvements

| Operation | v0.24 | v0.25 | Improvement |
|-----------|-------|-------|-------------|
| First sync | 2-3s/issue | 2-3s/issue | Same |
| Repeated sync | 500-2000ms | < 1ms | **99.9% faster** |
| Cache hits | 0% | 99.9% | ✅ New |

---

## FAQ

**Q: Do I need to update my config?**  
A: No, defaults work out-of-the-box.

**Q: Will this create duplicate issues?**  
A: No, 3-layer idempotency prevents duplicates.

**Q: Can I still sync manually?**  
A: Yes, `/specweave-github:sync` still works.

**Q: What if I don't want automatic sync?**  
A: Set `autoSyncOnCompletion: false` in config.

**Q: Is my data safe?**  
A: Yes, 100% backward compatible. No data migration needed.

---

## Testing Checklist

- [ ] Automatic sync works on `/done`
- [ ] Manual sync still works
- [ ] Idempotency prevents duplicates
- [ ] Gates respect config settings
- [ ] Error messages are clear

---

## Getting Help

1. **Documentation**: https://spec-weave.com/docs/v0.25
2. **Issues**: https://github.com/anton-abyzov/specweave/issues
3. **Recovery Guide**: `.specweave/docs/internal/emergency-procedures/GITHUB-SYNC-RECOVERY.md`

---

**Migration Complete!** 🎉

Next: Try automatic sync with your next increment.
