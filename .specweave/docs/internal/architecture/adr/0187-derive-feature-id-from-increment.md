# ADR-0187: Derive Feature ID from Increment Number

| Status | Accepted |
|--------|----------|
| Date | 2025-12-01 |
| Decision | Remove `feature_id`/`featureId` from metadata.json; derive from increment number |
| Related | Increment 0087-remove-redundant-feature-id |

## Context

Prior to v0.29.0, increment metadata.json files stored feature ID in two redundant fields:

```json
{
  "id": "0082-unified-sync-orchestration",
  "featureId": "FS-082",       // camelCase
  "feature_id": "FS-082",      // snake_case (duplicate!)
  "relatedIncrements": [],     // never used
  ...
}
```

**Problems:**
1. **DRY violation** - Same information stored twice, and both are derivable from increment ID
2. **Sync bugs** - Feature ID could get out of sync with increment number
3. **Schema inconsistency** - Both camelCase and snake_case formats existed
4. **Dead code** - `relatedIncrements` was never read by any code

## Decision

**Remove all redundant fields. Derive feature ID from increment number.**

### The 1:1 Mapping Principle

Each increment MUST have exactly one corresponding feature folder:

```
Increment 0081-ado-repo-cloning
    ↓
Feature folder: .specweave/docs/internal/specs/{project}/FS-081/
```

The derivation is trivial and deterministic:

```typescript
function deriveFeatureId(incrementId: string): string {
  const match = incrementId.match(/^(\d+)/);
  const num = parseInt(match[1], 10);
  return `FS-${String(num).padStart(3, '0')}`;
}

// Examples:
// 0081-ado-repo-cloning → FS-081
// 0100-some-feature → FS-100
// 1000-future-feature → FS-1000
```

### Fields Removed

| Field | Reason for Removal |
|-------|-------------------|
| `feature_id` | Derivable from increment number |
| `featureId` | Duplicate of feature_id |
| `relatedIncrements` | Never used in code; relationships tracked at feature level |

### External vs Internal Features

- **Internal (FS-XXX)**: Always derived from increment number
- **External (FS-XXXE)**: Imported features from JIRA/GitHub/ADO; not increments

External items are imported directly as features in living docs. They don't have corresponding increments in `.specweave/increments/`.

## Consequences

### Positive

1. **Simpler schema** - Less redundancy, cleaner metadata.json
2. **No sync bugs** - Feature ID always matches increment number
3. **Single source of truth** - Increment ID is the canonical identifier
4. **Easier maintenance** - No need to update feature_id when creating increments

### Negative

1. **Migration required** - All existing metadata.json files needed cleanup (one-time)
2. **Code changes** - living-docs-sync.ts needed updates to derive instead of read

## Implementation

1. Created `deriveFeatureId()` utility in `src/utils/feature-id-derivation.ts`
2. Updated `IncrementMetadataV2` type to remove `featureId`
3. Updated `living-docs-sync.ts` to derive feature ID
4. Ran migration script on all 88 metadata.json files

## References

- Increment: 0087-remove-redundant-feature-id
- Utility: `src/utils/feature-id-derivation.ts`
- Living docs sync: `src/core/living-docs/living-docs-sync.ts`
