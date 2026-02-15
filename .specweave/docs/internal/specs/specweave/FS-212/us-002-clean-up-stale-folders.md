---
id: US-002
title: Clean up existing stale folders
status: completed
priority: P2
---

# US-002: Clean up existing stale folders

**As a** developer who already has stale `.specweave/` folders
**I want** `specweave update` to detect and remove them
**So that** I don't have to manually clean up

## Acceptance Criteria

- [x] **AC-US2-01**: `specweave update` scans parent directories for stale `.specweave/` (no config.json)
- [x] **AC-US2-02**: `specweave update` scans `$HOME/.specweave/` if only runtime dirs
- [x] **AC-US2-03**: `--check` flag shows what would be removed without deleting
- [x] **AC-US2-04**: Valid `.specweave/` folders (with config.json) are never deleted
