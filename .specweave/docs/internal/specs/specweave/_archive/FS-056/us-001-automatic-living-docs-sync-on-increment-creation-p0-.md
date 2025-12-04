---
id: US-001
feature: FS-056
title: "Automatic Living Docs Sync on Increment Creation (P0)"
status: not_started
priority: P0
created: 2025-11-24T00:00:00.000Z
---

# US-001: Automatic Living Docs Sync on Increment Creation (P0)

**Feature**: [FS-056](./FEATURE.md)

**As a** developer
**I want** increment specs to automatically sync to living docs after creation
**So that** I don't have to manually run `/specweave:sync-specs`

---

## Acceptance Criteria

- [ ] **AC-US1-01**: After `/specweave:increment` completes, living docs are automatically updated without user intervention
- [ ] **AC-US1-02**: Feature overview created in `.specweave/docs/internal/specs/_features/FS-{number}/FEATURE.md`
- [ ] **AC-US1-03**: User stories created in `.specweave/docs/internal/specs/{project}/FS-{number}/us-*.md`
- [ ] **AC-US1-04**: No manual sync command required (workflow is 1-step: `/specweave:increment` → done)

---

## Implementation

**Increment**: [0056-auto-github-sync-on-increment-creation](../../../../../../increments/_archive/0056-auto-github-sync-on-increment-creation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-001**: Enhance detectExternalTools() to Check config.json
- [ ] **T-002**: Add Enhanced Logging to detectExternalTools()
- [ ] **T-003**: Create sync-living-docs.js Hook Script
- [ ] **T-004**: Create post-increment-planning.sh Hook
- [ ] **T-005**: Verify LivingDocsSync.syncIncrement() Calls External Tool Sync
