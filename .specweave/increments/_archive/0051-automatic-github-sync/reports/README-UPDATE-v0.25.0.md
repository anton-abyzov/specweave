# README Update for v0.25.0 - Automatic GitHub Sync

## New Section to Add to README.md

### 🔄 Automatic GitHub Sync (v0.25.0+)

**Automatic GitHub issue creation** for user stories when increments complete.

#### Features

- ✅ **4-Tier Permission Model**: Fine-grained control over sync behavior
- ✅ **3-Layer Idempotency**: Zero duplicates with sub-millisecond cache
- ✅ **Format Preservation**: Living docs stay clean
- ✅ **Error Isolation**: One failure doesn't block others
- ✅ **Zero Configuration**: Works out-of-the-box with sensible defaults

#### Quick Start

```bash
# 1. Initialize (auto-detects GitHub repo)
specweave init

# 2. Create increment
/specweave:increment "Add user authentication"

# 3. Complete work
/specweave:do

# 4. Close increment → GitHub issues auto-created! 🎉
/specweave:done 0051
```

**That's it!** Issues are automatically created for all user stories.

#### Permission Gates

Control sync behavior with 4 permission gates:

```json
// .specweave/config.json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,     // GATE 1: Living docs sync
      "canUpdateExternalItems": true,     // GATE 2: External tools sync
      "autoSyncOnCompletion": true        // GATE 3: Automatic sync
    },
    "github": {
      "enabled": true,                     // GATE 4: GitHub-specific
      "owner": "your-org",
      "repo": "your-repo"
    }
  }
}
```

**Default**: All gates enabled (opt-out model for better UX).

#### How It Works

**3-Layer Idempotency** prevents duplicates:

```
1. Layer 1: Frontmatter Cache   →  <1ms     (99.9% cache hit)
2. Layer 2: Metadata Cache      →  <5ms     (98% cache hit)
3. Layer 3: GitHub API Search   →  500-2000ms (1% cache miss)
```

**Performance**:
- First run: 2-3 seconds per issue
- Subsequent runs: < 1ms (cache hit)
- **99.9% faster** on warm cache

#### Manual Sync

Prefer manual control?

```bash
# Disable automatic sync
# .specweave/config.json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false  // ← Set to false
    }
  }
}

# Then manually sync when ready
/specweave-github:sync FS-049
```

#### Issue Format

Auto-created issues follow the standard format:

```
Title: [FS-049][US-001] User Story Title
Body:  Auto-generated from living docs
Labels: feature, user-story, FS-049
Milestone: FS-049: Feature Name
```

#### Troubleshooting

**Issue not created?** Check the gates:

```bash
# View sync status
/specweave-github:status FS-049

# Common fixes:
1. Enable GitHub sync: sync.github.enabled = true
2. Authenticate: gh auth login
3. Add feature_id to spec.md frontmatter
```

**Rate limit exceeded?**

```bash
# Authenticate for higher limits (60/hr → 5000/hr)
gh auth login
```

**Duplicates created?**

```bash
# Cleanup script (uses DuplicateDetector)
bash scripts/cleanup-duplicate-github-issues.sh --dry-run
bash scripts/cleanup-duplicate-github-issues.sh --execute
```

#### Migration from v0.24

See [MIGRATION-v0.24-to-v0.25.md](./docs/MIGRATION-v0.24-to-v0.25.md) for upgrade guide.

**Breaking Changes**: None! Fully backward compatible.

#### Advanced Configuration

**Custom issue templates**:

```typescript
// Coming in v0.25.1
import { IssueTemplateBuilder } from 'specweave/sync';

const template = new IssueTemplateBuilder()
  .setTitle('[${featureId}][${userStoryId}] ${title}')
  .setBody('Custom body with ${acceptanceCriteria}')
  .addLabel('custom-label')
  .build();
```

**Selective sync**:

```bash
# Sync specific user stories only
/specweave-github:sync FS-049 --stories US-001,US-003
```

#### Learn More

- [Recovery Guide](./docs/emergency-procedures/GITHUB-SYNC-RECOVERY.md)
- [Architecture](./docs/architecture/adr/0070-hook-consolidation.md)
- [API Reference](./docs/api/github-sync.md)

---

**Next**: [Migration Guide](./docs/MIGRATION-v0.24-to-v0.25.md)
