---
id: US-002
feature: FS-160
title: "Cache Health Monitor"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-002: Cache Health Monitor

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Detect merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in all cached files
- [ ] **AC-US2-02**: Validate shell script syntax using `bash -n` for all `.sh` files
- [ ] **AC-US2-03**: Compute and validate SHA256 checksums against metadata
- [ ] **AC-US2-04**: Detect missing files that should exist based on metadata
- [ ] **AC-US2-05**: Return structured `CacheHealthIssue[]` with severity, type, file, message, suggestion
- [ ] **AC-US2-06**: Categorize severity: critical (merge conflict, syntax error), medium (checksum mismatch), low (missing optional file)

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
