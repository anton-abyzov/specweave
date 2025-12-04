# ADR-0065: Three-Tier Permission Gate Architecture

**Date**: 2025-11-22
**Status**: Accepted
**Priority**: P0 (Critical - Core workflow integration)

## Context

SpecWeave currently has a single permission flag (`canUpsertInternalItems`) that controls living docs sync. Users want automatic GitHub sync on increment completion, but need fine-grained control to enable/disable:
- Living docs sync independently from external sync
- External tracker sync without forcing auto-sync on completion
- GitHub-specific sync without affecting Jira/ADO

**Current Architecture** (v0.24.x):
```typescript
if (config.sync?.settings?.canUpsertInternalItems) {
  await syncLivingDocs(); // Living docs sync
}
// No external sync integration!
```

**Problem**: No way to enable external GitHub sync automatically. Users must manually run `/specweave-github:sync` after every `/done`.

**Business Impact**:
- 30% of syncs forgotten (manual adherence failure)
- 2-5 minutes wasted per increment
- Stale GitHub issues (poor stakeholder visibility)

## Decision

We will implement a **Three-Tier Permission Gate Architecture** with 4 independent permission flags:

### Gate Hierarchy

```
GATE 1: canUpsertInternalItems (Living Docs)
  ↓ (controls internal sync)
Living Docs Sync

GATE 2: canUpdateExternalItems (External Trackers)
  ↓ (controls external sync capability)

GATE 3: autoSyncOnCompletion (Automatic Trigger)
  ↓ (controls automatic vs manual trigger)

GATE 4: sync.github.enabled (Tool-Specific)
  ↓ (controls GitHub-specific sync)
GitHub Issue Creation
```

### Configuration Schema

```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,    // GATE 1: Enable living docs sync
      "canUpdateExternalItems": true,    // GATE 2: Enable external tracker sync
      "autoSyncOnCompletion": true       // GATE 3: Auto-sync on /done (default: true)
    },
    "github": {
      "enabled": true,                   // GATE 4: Enable GitHub specifically
      "owner": "anton-abyzov",
      "repo": "specweave"
    },
    "jira": {
      "enabled": false                   // Tool-specific gate for Jira
    },
    "ado": {
      "enabled": false                   // Tool-specific gate for Azure DevOps
    }
  }
}
```

### Permission Truth Table

| GATE 1 | GATE 2 | GATE 3 | GATE 4 | Result | Sync Mode |
|--------|--------|--------|--------|--------|-----------|
| false  | *      | *      | *      | Skip all | `read-only` |
| true   | false  | *      | *      | Living Docs Only | `living-docs-only` |
| true   | true   | false  | *      | Manual Trigger | `manual-only` |
| true   | true   | true   | false  | External Disabled | `external-disabled` |
| true   | true   | true   | true   | **Auto-Sync** ✅ | `full-sync` |

### Implementation in SyncCoordinator

```typescript
async syncIncrementCompletion(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    userStoriesSynced: 0,
    syncMode: 'read-only',
    errors: []
  };

  try {
    const config = await this.loadConfig();

    // GATE 1: Living docs sync
    if (!config.sync?.settings?.canUpsertInternalItems) {
      this.logger.log('ℹ️  Living docs sync disabled (canUpsertInternalItems=false)');
      result.syncMode = 'read-only';
      result.success = true;
      return result;
    }

    await syncLivingDocs(); // Existing living docs sync

    // GATE 2: External tracker sync
    if (!config.sync?.settings?.canUpdateExternalItems) {
      this.logger.log('ℹ️  External sync disabled (canUpdateExternalItems=false)');
      result.syncMode = 'living-docs-only';
      result.success = true;
      return result;
    }

    // GATE 3: Automatic sync on completion (DEFAULT: true for better UX)
    const autoSync = config.sync?.settings?.autoSyncOnCompletion ?? true;
    if (!autoSync) {
      this.logger.log('⚠️  Automatic sync disabled (autoSyncOnCompletion=false)');
      this.logger.log('   Living docs updated locally, but external tools require manual sync');
      this.logger.log('   Run /specweave-github:sync to sync manually');
      result.syncMode = 'manual-only';
      result.success = true;
      return result;
    }

    this.logger.log('✅ Automatic sync enabled (autoSyncOnCompletion=true)');

    // GATE 4: GitHub-specific sync
    if (!config.sync?.github?.enabled) {
      this.logger.log('⏭️  GitHub sync SKIPPED (sync.github.enabled=false)');
      result.syncMode = 'external-disabled';
      result.success = true;
      return result;
    }

    // All gates passed → auto-sync GitHub issues
    await this.createGitHubIssuesForUserStories(config);
    result.syncMode = 'full-sync';
    result.success = true;
    return result;

  } catch (error) {
    // Error isolation (NEVER crash workflow)
    result.errors.push(`Sync coordinator error: ${error.message}`);
    this.logger.error('❌ Sync failed:', error);
    return result;
  }
}
```

## Alternatives Considered

### Alternative 1: Single Boolean Flag (Current State - Rejected)

**Pros**: Simple, no configuration complexity
**Cons**: No flexibility, all-or-nothing sync, can't decouple living docs from external sync
**Decision**: Rejected (doesn't meet user needs)

### Alternative 2: Two-Tier Model (`canUpsertInternalItems` + `canUpdateExternalItems` only)

**Pros**: Simpler than 3-tier
**Cons**: Can't disable auto-sync (always-on or always-off), no tool-specific control
**Decision**: Rejected (insufficient flexibility)

### Alternative 3: Four-Tier Model with Per-Tool Auto-Sync

**Pros**: Maximum flexibility (auto-sync GitHub but not Jira)
**Cons**: Overly complex, confusing configuration
**Decision**: Rejected (over-engineered for current use case)

### Alternative 4: Three-Tier + Tool-Specific Gates (SELECTED)

**Pros**: Balanced flexibility, clear hierarchy, tool-specific control
**Cons**: More configuration fields than single boolean
**Decision**: **Accepted** (best trade-off)

## Consequences

### Positive

1. **✅ Fine-Grained Control**: Users can enable living docs sync without external sync
2. **✅ Manual Override**: Users can disable auto-sync but still have manual commands
3. **✅ Tool-Specific Gates**: GitHub can be enabled while Jira is disabled
4. **✅ Sensible Default**: `autoSyncOnCompletion: true` (automatic sync by default)
5. **✅ Backward Compatibility**: Existing config works (defaults applied)
6. **✅ Clear Error Messages**: Users see which gate blocked sync

### Negative

1. **❌ Configuration Complexity**: 4 flags vs 1 (but well-documented)
2. **❌ Documentation Burden**: Users need to understand gate hierarchy
3. **❌ Migration Required**: Existing users must update config (but automatic)

### Neutral

1. **Configuration Size**: ~15 lines of config (acceptable for flexibility)
2. **Learning Curve**: Users learn gates once, benefit forever

## Implementation Plan

### Phase 1: Config Schema Update (2 hours)
- Add `autoSyncOnCompletion` to `SyncSettings` interface
- Add `github.enabled`, `jira.enabled`, `ado.enabled` to config schema
- Update config validation

### Phase 2: SyncCoordinator Enhancement (4 hours)
- Implement 4-gate evaluation logic
- Add user-facing messages for each gate
- Unit tests for all gate combinations (16 tests)

### Phase 3: Default Config Generation (1 hour)
- Update `specweave init` to include new flags
- Set `autoSyncOnCompletion: true` as default
- Migration guide for existing users

### Phase 4: Documentation (1 hour)
- Update README with gate examples
- Create troubleshooting guide
- Add configuration examples

**Total Effort**: ~8 hours

## Validation

### Unit Tests (16 combinations)

```typescript
describe('Permission Gates', () => {
  it('GATE 1 false → skip all sync', async () => {
    const config = { sync: { settings: { canUpsertInternalItems: false } } };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('read-only');
  });

  it('GATE 2 false → living docs only', async () => {
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: false
        }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('living-docs-only');
  });

  it('GATE 3 false → manual trigger only', async () => {
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: false
        }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('manual-only');
  });

  it('GATE 4 false → external disabled', async () => {
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true
        },
        github: { enabled: false }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('external-disabled');
  });

  it('All gates true → full auto-sync', async () => {
    const config = {
      sync: {
        settings: {
          canUpsertInternalItems: true,
          canUpdateExternalItems: true,
          autoSyncOnCompletion: true
        },
        github: { enabled: true, owner: 'org', repo: 'app' }
      }
    };
    const result = await coordinator.syncIncrementCompletion();
    expect(result.syncMode).toBe('full-sync');
  });
});
```

### Integration Tests

- Test gate messages logged correctly
- Test sync behavior matches gate configuration
- Test backward compatibility (missing fields → defaults)

## Migration Strategy

### Existing Users (v0.24.x → v0.25.0)

**Automatic Migration** (no action required):
- Missing `autoSyncOnCompletion` → defaults to `true` (enables auto-sync)
- Missing `github.enabled` → defaults to `true` (if GitHub configured)
- No breaking changes

**Opt-Out** (manual config):
```json
{
  "sync": {
    "settings": {
      "autoSyncOnCompletion": false  // Disable auto-sync
    }
  }
}
```

### New Users (v0.25.0+)

**During `specweave init`**:
```
Enable automatic GitHub sync on increment completion? (Y/n)
  ✅ Yes (recommended) - Auto-create GitHub issues on /done
  ❌ No - Manual sync only (run /specweave-github:sync)
```

## References

- **Related ADRs**:
  - [ADR-0030: Intelligent Living Docs Sync](0030-intelligent-living-docs-sync.md) (GATE 1 origin)
  - [ADR-0032: Universal Hierarchy Mapping](0166-universal-hierarchy-mapping.md) (Feature → User Stories)
  - [ADR-0066: SyncCoordinator Integration Point](#) (Where to integrate)
  - [ADR-0067: Three-Layer Idempotency Caching](#) (Prevent duplicates)

- **User Stories**:
  - [US-002: Three-Tier Permission Model](../../specs/specweave/_archive/FS-049/us-002-permission-gates.md)

- **Implementation**:
  - Increment: [0051-automatic-github-sync](../../../../increments/_archive/0051-automatic-github-sync/)
  - Files: `src/sync/sync-coordinator.ts`, `src/core/config/types.ts`

---

**Approval Date**: 2025-11-22
**Review Date**: 2025-12-01 (post-implementation feedback)
