---
id: US-001
feature: FS-152
title: "Context-Aware Auto Mode"
status: completed
priority: critical
created: 2026-01-02
project: specweave
---

# US-001: Context-Aware Auto Mode

**Feature**: [FS-152](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Stop hook detects when context is approaching limits (>150k tokens estimated)
- [x] **AC-US1-02**: Auto mode triggers `/compact` command when context threshold exceeded
- [x] **AC-US1-03**: Session state preserved across compaction via checkpoint files
- [x] **AC-US1-04**: Context size estimation based on transcript file size (rough heuristic)

---

## Implementation

**Increment**: [0152-auto-mode-reliability-improvements](../../../../increments/0152-auto-mode-reliability-improvements/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Implement Context Size Estimation
- [x] **T-006**: Add Compaction Trigger Logic
- [x] **T-017**: Update Documentation
