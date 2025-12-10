---
id: US-009
feature: FS-134
title: "Hook Integration for Automatic Updates"
status: not_started
priority: P1
created: 2025-12-09
project: specweave
related_projects: [MyApp (3 repos)]
---

# US-009: Hook Integration for Automatic Updates

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave user
**I want** living docs to update automatically on key events
**So that** documentation is always current without manual effort

---

## Acceptance Criteria

- [ ] **AC-US9-01**: Hook on increment completion: `/specweave:done` triggers living docs update for that feature
- [ ] **AC-US9-02**: Hook on code commit (optional, configurable): Git post-commit triggers incremental update
- [ ] **AC-US9-03**: Hook on spec changes: spec.md edit triggers re-sync
- [ ] **AC-US9-04**: Hooks can be disabled: `livingDocs.autoUpdate: false` in config
- [ ] **AC-US9-05**: Hook failures don't block main workflow (non-blocking, logged)
- [ ] **AC-US9-06**: User can manually trigger: `/specweave:living-docs update`

---

## Implementation

**Increment**: [0134-intelligent-living-docs-deep-analysis](../../../../increments/0134-intelligent-living-docs-deep-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-022**: Create CLI Command `/specweave:living-docs update`
- [ ] **T-023**: Implement Hook Integration
