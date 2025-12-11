---
id: US-009
feature: FS-135
title: Hook Integration for Automatic Updates
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 883
    url: https://github.com/anton-abyzov/specweave/issues/883
---

# US-009: Hook Integration for Automatic Updates

**Feature**: [FS-135](./FEATURE.md)

**As a** SpecWeave user
**I want** living docs to update automatically on key events
**So that** documentation is always current without manual effort

---

## Acceptance Criteria

- [x] **AC-US9-01**: Hook on increment completion: `/specweave:done` triggers living docs update for that feature
- [x] **AC-US9-02**: Hook on code commit (optional, configurable): Git post-commit triggers incremental update
- [x] **AC-US9-03**: Hook on spec changes: spec.md edit triggers re-sync
- [x] **AC-US9-04**: Hooks can be disabled: `livingDocs.autoUpdate: false` in config
- [x] **AC-US9-05**: Hook failures don't block main workflow (non-blocking, logged)
- [x] **AC-US9-06**: User can manually trigger: `/specweave:living-docs update`
- [x] **AC-US9-01**: Hook on increment completion
- [x] **AC-US9-02**: Hook on code commit (optional)
- [x] **AC-US9-03**: Hook on spec changes
- [x] **AC-US9-04**: Hooks can be disabled
- [x] **AC-US9-05**: Hook failures don't block main workflow
- [x] **AC-US9-06**: User can manually trigger update

---

## Implementation

**Increment**: [0135-living-docs-visualization](../../../../increments/0135-living-docs-visualization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-022**: Create CLI Command `/specweave:living-docs update`
- [x] **T-023**: Implement Hook Integration
