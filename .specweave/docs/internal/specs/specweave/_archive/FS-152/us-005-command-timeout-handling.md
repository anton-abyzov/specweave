---
id: US-005
feature: FS-152
title: "Command Timeout Handling"
status: completed
priority: critical
created: 2026-01-02
project: specweave
---

# US-005: Command Timeout Handling

**Feature**: [FS-152](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: Default timeout of 10 minutes for test commands
- [x] **AC-US5-02**: Configurable timeout per command type in config.json
- [x] **AC-US5-03**: Graceful termination with SIGTERM, then SIGKILL after 30s
- [x] **AC-US5-04**: Timeout events logged with command context

---

## Implementation

**Increment**: [0152-auto-mode-reliability-improvements](../../../../increments/0152-auto-mode-reliability-improvements/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Add Command Timeout Handling
- [x] **T-017**: Update Documentation
