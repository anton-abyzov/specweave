---
id: US-005
feature: FS-158
title: "E2E Coverage Manifest Integration"
status: completed
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-005: E2E Coverage Manifest Integration

**Feature**: [FS-158](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: Generate `.e2e-coverage.json` manifest on first E2E test run
- [x] **AC-US5-02**: Auto-detect framework (Playwright, Cypress, Detox, Maestro)
- [x] **AC-US5-03**: Track route coverage (which routes tested)
- [x] **AC-US5-04**: Track viewport coverage (mobile, tablet, desktop)
- [x] **AC-US5-05**: Track action coverage (clicks, forms, navigation)
- [x] **AC-US5-06**: Update manifest automatically via custom reporter
- [x] **AC-US5-07**: Calculate coverage percentage (routes tested / total routes)
- [x] **AC-US5-08**: Block completion if coverage below threshold (default: 70%)
- [x] **AC-US5-09**: Show untested routes in stop hook output
- [x] **AC-US5-10**: Warn about missing viewport coverage (non-blocking)

---

## Implementation

**Increment**: [0158-smart-completion-conditions](../../../../increments/0158-smart-completion-conditions/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
