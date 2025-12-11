---
id: US-002
feature: FS-118E
title: Increment Creation Workflow Update
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 885
    url: https://github.com/anton-abyzov/specweave/issues/885
---

# US-002: Increment Creation Workflow Update

**Feature**: [FS-118E](./FEATURE.md)

**As a** SpecWeave developer,
**I want** the increment-planner skill to trigger living docs sync,
**So that** the complete workflow is: create files → sync to living docs → sync to external tools.

---

## Acceptance Criteria

- [x] **AC-US2-01**: Update `plugins/specweave/skills/increment-planner/SKILL.md` to call sync-specs
- [x] **AC-US2-02**: OR update `plugins/specweave/commands/specweave-increment.md` to add Step 10
- [x] **AC-US2-03**: The sync step should be non-blocking (continue if external sync fails)
- [x] **AC-US2-04**: Show progress: "🔄 Syncing to living docs..." → "📡 Syncing to GitHub..."

---

## Implementation

**Increment**: [0118E-external-tool-sync-on-increment-start](../../../../increments/0118E-external-tool-sync-on-increment-start/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Update specweave-increment.md to trigger sync-specs
- [x] **T-003**: Update increment-planner skill to include sync step
