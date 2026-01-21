---
id: US-005
feature: FS-160
title: "Proactive Startup Checker"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-005: Proactive Startup Checker

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Run max once per hour (throttled check using timestamp file)
- [ ] **AC-US5-02**: Execute in <100ms (use local checks only, no GitHub API)
- [ ] **AC-US5-03**: Non-blocking: silent failure if checks error out
- [ ] **AC-US5-04**: Alert only if critical issues found (merge conflicts, syntax errors)
- [ ] **AC-US5-05**: Simple warning message with fix command: `⚠️ Plugin cache issues detected. Run: specweave cache-status`

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
