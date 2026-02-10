---
id: US-007
feature: FS-171
title: "Loading State Tracking"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-007: Loading State Tracking

**Feature**: [FS-171](./FEATURE.md)

**As a** developer,
**I want** to know which plugins are currently loaded,
**So that** I can understand my current context state.

---

## Acceptance Criteria

- [x] **AC-US7-01**: State tracked in `~/.specweave/state/plugins-loaded.json`
- [x] **AC-US7-02**: `specweave plugin-status` shows loaded vs cached plugins
- [x] **AC-US7-03**: State persists across Claude Code restarts
- [x] **AC-US7-04**: State cleared when user requests full unload
- [x] **AC-US7-05**: State includes timestamps for debugging

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Implement State File Management
- [x] **T-025**: Implement plugin-status Command
