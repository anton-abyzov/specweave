---
id: US-006
feature: FS-134
title: "Incremental Update with Change Detection"
status: not_started
priority: P1
created: 2025-12-09
project: specweave
related_projects: [MyApp (3 repos)]
---

# US-006: Incremental Update with Change Detection

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave user
**I want** living docs updates to be incremental and fast
**So that** I can run updates frequently without waiting

---

## Acceptance Criteria

- [ ] **AC-US6-01**: System uses Git to detect changes since last update:
- [ ] **AC-US6-02**: System caches analysis results in `.specweave/cache/analysis/`:
- [ ] **AC-US6-03**: System updates only affected documentation sections
- [ ] **AC-US6-04**: Full update mode available: `--full` flag bypasses cache
- [ ] **AC-US6-05**: Update completes in <30 seconds for incremental changes
- [ ] **AC-US6-06**: System logs what was updated: "Regenerated 3 ADRs, updated dependency graph"

---

## Implementation

**Increment**: [0134-intelligent-living-docs-deep-analysis](../../../../increments/0134-intelligent-living-docs-deep-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-001**: Create LivingDocsOrchestrator
- [ ] **T-003**: Build Cache Infrastructure
- [ ] **T-004**: Implement Git Change Detection
- [ ] **T-027**: Performance Optimization
