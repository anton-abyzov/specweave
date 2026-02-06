# ADR-0236: Permission Preset System

**Date**: 2026-02-06
**Status**: Accepted
**Increment**: 0190-sync-architecture-redesign

## Context

Current sync permissions use 8+ independent booleans across two config layers (SyncSettings + PlatformSyncPermissions). The valid combination matrix is 256 states, most nonsensical. Users struggle to configure correctly.

## Decision

Introduce named presets with optional per-flag overrides:

```json
{
  "sync": {
    "preset": "bidirectional",
    "overrides": {
      "canDelete": false
    }
  }
}
```

| Preset | canRead | canUpdateStatus | canUpsert | canDelete |
|--------|---------|-----------------|-----------|-----------|
| `read-only` | true | false | false | false |
| `push-only` | false | true | true | false |
| `bidirectional` | true | true | true | false |
| `full-control` | true | true | true | true |

Resolution order: `preset defaults` → `overrides` → `effective permissions`

The old boolean fields (`canUpsertInternalItems`, `canUpdateExternalItems`, `canUpdateStatus`) are deprecated but still honored if `preset` is not set (backward compatibility).

## Consequences

**Positive**: 4 choices vs 256 combinations, self-documenting config, overrides for power users
**Negative**: Must maintain backward compatibility with old boolean format
