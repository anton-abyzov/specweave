---
id: FS-087
title: "Remove Redundant feature_id/featureId from Increment Metadata"
type: feature
status: completed
priority: P1
created: 2025-12-01
lastUpdated: 2025-12-02
---

# Remove Redundant feature_id/featureId from Increment Metadata

## Overview

Remove the redundant `feature_id` and `featureId` fields from `metadata.json` files. The feature ID is **100% derivable** from the increment number:
- `0081-ado-repo-cloning` → `FS-081`
- `0100-some-feature` → `FS-100`
- `1000-future-feature` → `FS-1000`

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0087-remove-redundant-feature-id](../../../../../increments/0087-remove-redundant-feature-id/spec.md) | ✅ completed | 2025-12-01 |

## User Stories

- [US-001: Remove feature_id from Type Definitions](../../specweave/FS-087/us-001-remove-feature-id-from-type-definitions.md)
- [US-002: Update Living Docs Sync to Derive Feature ID](../../specweave/FS-087/us-002-update-living-docs-sync-to-derive-feature-id.md)
- [US-003: Migrate All Existing Metadata Files](../../specweave/FS-087/us-003-migrate-all-existing-metadata-files.md)
- [US-004: Update Documentation](../../specweave/FS-087/us-004-update-documentation.md)
