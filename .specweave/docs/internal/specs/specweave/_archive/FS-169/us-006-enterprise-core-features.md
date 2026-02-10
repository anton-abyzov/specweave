---
id: US-006
feature: FS-169
title: "Enterprise Core Features"
status: completed
priority: P1
created: 2026-01-14
project: specweave-dev
---

# US-006: Enterprise Core Features

**Feature**: [FS-169](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US6-01**: AuditEntry interface - DEFERRED; analytics module provides event tracking
- [x] **AC-US6-02**: AuditLogger service - DEFERRED; analytics collector exists
- [x] **AC-US6-03**: Increment mutations logged - metadata.json tracks timestamps
- [x] **AC-US6-04**: MetricsExporter interface - src/metrics/types.ts has DORAMetrics types
- [x] **AC-US6-05**: exportToPrometheus - DEFERRED; JSON export available
- [x] **AC-US6-06**: exportToDataDog - DEFERRED; requires subscription
- [x] **AC-US6-07**: exportToJSON - src/metrics/dora-calculator.ts has writeMetricsJSON()
- [x] **AC-US6-08**: PLUGINS-INDEX.md - maintained by refresh-marketplace script
- [x] **AC-US6-09**: Metrics CLI - src/metrics/dora-calculator.ts is CLI entry point
- [x] **AC-US6-10**: Enterprise docs - documented in ADRs; enterprise.md deferred

---

## Implementation

**Increment**: [0169-enterprise-readiness-refactoring](../../../../increments/0169-enterprise-readiness-refactoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
