---
id: US-008
feature: FS-160
title: "Integration with check-hooks"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-008: Integration with check-hooks

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US8-01**: New flag: `specweave check-hooks --include-cache`
- [ ] **AC-US8-02**: After hook health check, add cache health section
- [ ] **AC-US8-03**: Uses existing `CacheHealthMonitor` to validate all plugins
- [ ] **AC-US8-04**: Output format matches existing hook health output style
- [ ] **AC-US8-05**: Exit code: 0=all healthy, 1=failures, 2=critical failures (existing behavior)

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
