---
increment: 0087-remove-redundant-feature-id
status: completed
priority: P1
created: 2025-12-01
---

# Remove Redundant feature_id/featureId from Increment Metadata

## Quick Overview

Remove the redundant `feature_id` and `featureId` fields from `metadata.json` files. The feature ID is **100% derivable** from the increment number:
- `0081-ado-repo-cloning` → `FS-081`
- `0100-some-feature` → `FS-100`
- `1000-future-feature` → `FS-1000`

Also remove the unused `relatedIncrements` field.

## Problem Statement

Current metadata.json has **duplicate/redundant fields**:

```json
{
  "id": "0082-unified-sync-orchestration",
  "featureId": "FS-082",        // camelCase (redundant!)
  "feature_id": "FS-082",       // snake_case (also redundant!)
  "relatedIncrements": [],      // never used in code
  ...
}
```

**Issues:**
1. **DRY violation** - same information stored twice (and derivable from ID)
2. **Sync bugs** - feature_id can get out of sync with increment number
3. **Schema inconsistency** - both camelCase and snake_case used
4. **Dead code** - `relatedIncrements` not read anywhere

## Core Principle

> **Each increment MUST have a 1:1 mapping with a feature folder**

```
Increment 0081-ado-repo-cloning
    ↓
Feature folder: .specweave/docs/internal/specs/{project}/FS-081/
```

The feature ID IS the increment number with `FS-` prefix. No need to store it.

## User Stories

### US-001: Remove feature_id from Type Definitions

**As a** developer
**I want** the TypeScript types to not include redundant featureId
**So that** the schema is clean and self-documenting

**Acceptance Criteria:**
- [x] **AC-US1-01**: Remove `featureId` from `IncrementMetadataV2` interface
- [x] **AC-US1-02**: Add `deriveFeatureId(incrementId: string)` utility function
- [x] **AC-US1-03**: All existing usages of `metadata.feature_id` use derivation instead

### US-002: Update Living Docs Sync to Derive Feature ID

**As a** developer
**I want** living-docs-sync to derive feature ID from increment number
**So that** there's a single source of truth (increment ID)

**Acceptance Criteria:**
- [x] **AC-US2-01**: `getFeatureIdForIncrement()` derives ID, doesn't read from metadata
- [x] **AC-US2-02**: Remove `updateMetadataFeatureId()` function (no longer needed)
- [x] **AC-US2-03**: External sync still works with derived feature ID

### US-003: Migrate All Existing Metadata Files

**As a** maintainer
**I want** all existing metadata.json files cleaned up
**So that** the codebase is consistent

**Acceptance Criteria:**
- [x] **AC-US3-01**: Remove `feature_id` from all active increment metadata.json
- [x] **AC-US3-02**: Remove `featureId` from all active increment metadata.json
- [x] **AC-US3-03**: Remove `relatedIncrements` from all increment metadata.json
- [x] **AC-US3-04**: Archive increments also cleaned up

### US-004: Update Documentation

**As a** user/developer
**I want** documentation to reflect the new simpler model
**So that** I understand the 1:1 increment-to-feature mapping

**Acceptance Criteria:**
- [x] **AC-US4-01**: Create ADR explaining the decision
- [x] **AC-US4-02**: Update CLAUDE.md if it references feature_id
- [x] **AC-US4-03**: Update public docs (spec-weave.com content)
- [x] **AC-US4-04**: Update README if it mentions metadata schema

## Technical Design

### Feature ID Derivation Function

```typescript
/**
 * Derive feature ID from increment ID
 *
 * @example
 * deriveFeatureId('0081-ado-repo-cloning') → 'FS-081'
 * deriveFeatureId('0100-some-feature') → 'FS-100'
 * deriveFeatureId('1000-future-feature') → 'FS-1000'
 */
export function deriveFeatureId(incrementId: string): string {
  const match = incrementId.match(/^(\d+)/);
  if (!match) {
    throw new Error(`Invalid increment ID format: ${incrementId}`);
  }
  const num = parseInt(match[1], 10);
  // padStart(3, '0') handles 1-999; 1000+ naturally has 4 digits
  return `FS-${String(num).padStart(3, '0')}`;
}
```

### External vs Internal Features

- **Internal (FS-XXX)**: Derived from increment number
- **External (FS-XXXE)**: Imported features, NOT increments - handled separately

External items are imported directly as features in living docs. They don't have corresponding increments in `.specweave/increments/`.

## Migration Strategy

1. Create migration script that processes all metadata.json files
2. Remove: `feature_id`, `featureId`, `relatedIncrements`
3. Run on both active and archived increments
4. Verify living-docs-sync still works

## Out of Scope

- Changing how external (brownfield) features are imported
- Modifying the living docs folder structure
- Changing the FS-XXX naming convention
