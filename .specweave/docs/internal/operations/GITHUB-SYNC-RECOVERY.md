# GitHub Sync Recovery Guide (T-021)

**Last Updated**: 2025-11-23  
**Version**: v0.25.0

## Quick Reference

| Issue | Recovery Command | Time |
|-------|------------------|------|
| Sync Failed Mid-Way | Re-run `/specweave-github:sync` | < 1 min |
| Duplicate Issues Created | Use cleanup script | 2-5 min |
| Rate Limit Hit | Wait 60 min or use auth | N/A |
| Permission Denied | Update GitHub token scopes | 2 min |

---

## Common Recovery Scenarios

### 1. Sync Failed Mid-Way

**Symptoms**:
- Partial issues created
- Error in console logs
- Some user stories have GitHub issues, others don't

**Recovery**:
```bash
# Re-run sync - idempotency protects against duplicates
/specweave-github:sync FS-049
```

**Why it works**: 3-layer idempotency cache skips existing issues.

**Time**: < 1 minute

---

### 2. Duplicate Issues Created

**Symptoms**:
- Multiple issues for same user story
- GitHub shows duplicate titles

**Root Cause**: Race condition or cache bypass

**Recovery**:
```bash
# Option 1: Manual cleanup
bash scripts/cleanup-duplicate-github-issues.sh --dry-run
bash scripts/cleanup-duplicate-github-issues.sh --execute

# Option 2: Close duplicates manually on GitHub
# Keep the lowest issue number, close the rest
```

**Prevention**: Always use `DuplicateDetector.createWithProtection()`

**Time**: 2-5 minutes

---

### 3. Rate Limit Exceeded

**Symptoms**:
```
⚠️  GitHub API rate limit exceeded
```

**Recovery**:
```bash
# Option 1: Wait (resets hourly)
# Check reset time:
gh api rate_limit

# Option 2: Authenticate (if not already)
gh auth login

# Option 3: Use authenticated requests (60/hr → 5000/hr)
gh auth status
```

**Time**: Immediate (if auth), 60 min (if waiting)

---

### 4. Permission Denied

**Symptoms**:
```
❌ Permission denied - insufficient GitHub permissions
```

**Recovery**:
```bash
# Check current token scopes
gh auth status

# Re-authenticate with correct scopes
gh auth login --scopes "repo,workflow,admin:org"

# Update token in .env if using PAT
# Required scopes: repo, workflow
```

**Time**: 2 minutes

---

### 5. Network Error

**Symptoms**:
```
❌ Network error connecting to GitHub
```

**Recovery**:
```bash
# Check internet connection
ping github.com

# Check GitHub status
curl https://www.githubstatus.com/api/v2/status.json

# Retry sync when connection restored
/specweave-github:sync FS-049
```

**Progress Saved**: Yes - resumes from last successful issue

**Time**: Depends on network recovery

---

### 6. Missing Feature ID

**Symptoms**:
```
⚠️  No feature ID found in increment spec
```

**Recovery**:
```yaml
# Add feature_id to increment spec.md frontmatter:
---
increment: 0051-automatic-github-sync
feature_id: FS-049  # ← Add this
---
```

**Time**: < 1 minute

---

### 7. No User Stories Found

**Symptoms**:
```
📚 No user stories found for this increment
```

**Possible Causes**:
1. Feature directory doesn't exist
2. User story files missing
3. Frontmatter parsing error

**Recovery**:
```bash
# Check feature directory exists
ls .specweave/docs/internal/specs/specweave/FS-049/

# Check user story files
ls .specweave/docs/internal/specs/specweave/FS-049/us-*.md

# Validate frontmatter syntax
head -20 .specweave/docs/internal/specs/specweave/FS-049/us-001-*.md
```

**Time**: 2-5 minutes

---

## Emergency Rollback

If sync causes major issues, you can disable it:

```json
// .specweave/config.json
{
  "sync": {
    "github": {
      "enabled": false  // ← Disable automatic sync
    },
    "settings": {
      "autoSyncOnCompletion": false  // ← Disable on completion
    }
  }
}
```

**Note**: This only disables automatic sync. Manual sync still works.

---

## Data Recovery

### Recover Lost metadata.json

```bash
# metadata.json tracks GitHub issue numbers
# If lost, sync will detect via Layer 3 (GitHub API search)
# and backfill metadata.json automatically

/specweave-github:sync FS-049
```

### Recover Lost Frontmatter

```bash
# Layer 2 (metadata.json) will be used
# If both lost, Layer 3 (GitHub API) detects existing issues
```

---

## Prevention Best Practices

1. **Always use idempotent operations**
   - Use `DuplicateDetector.createWithProtection()`
   - Never bypass 3-layer cache

2. **Test sync with --dry-run first**
   ```bash
   /specweave-github:sync FS-049 --dry-run
   ```

3. **Monitor rate limits**
   ```bash
   gh api rate_limit
   ```

4. **Keep backups of metadata.json**
   - Git commits preserve metadata
   - Hooks auto-update metadata

5. **Use authenticated requests**
   - 60 requests/hour (unauth) → 5000 requests/hour (auth)
   - `gh auth login`

---

## Getting Help

1. **Check logs**: `.specweave/logs/sync-*.log`
2. **Run diagnostics**: `/specweave-github:status FS-049`
3. **File issue**: https://github.com/anton-abyzov/specweave/issues
4. **Emergency support**: Create issue with `[URGENT]` tag

---

**Next**: See [GITHUB-SYNC-TROUBLESHOOTING](./GITHUB-SYNC-TROUBLESHOOTING) for detailed error diagnosis.
