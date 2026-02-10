---
id: US-009
feature: FS-170
title: "Parallel Status Dashboard"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-009: Parallel Status Dashboard

**Feature**: [FS-170](./FEATURE.md)

**As a** developer,
**I want** to see real-time status of all parallel agents,
**So that** I understand overall progress.

---

## Acceptance Criteria

- [x] **AC-US9-01**: `specweave auto-status --parallel` shows all agents
- [x] **AC-US9-02**: Status icons: ⏳ pending, 🔄 running, ✅ done, ❌ failed
- [x] **AC-US9-03**: Progress bars show task completion
- [x] **AC-US9-04**: Elapsed time per agent displayed
- [x] **AC-US9-05**: `--watch` flag enables live updates (2s refresh)
- [x] **AC-US9-06**: Test coverage for dashboard ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-020**: Extend Auto Status Command
- [x] **T-022**: Create CLI Tests (90%+ coverage)
