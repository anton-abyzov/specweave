---
id: US-005
feature: FS-150
title: "Multi-Viewport E2E Enforcement"
status: not_started
priority: P0
created: 2025-12-30
project: specweave
---

# US-005: Multi-Viewport E2E Enforcement

**Feature**: [FS-150](./FEATURE.md)

**As a** developer building responsive UIs
**I want** E2E tests to run on multiple viewports
**So that** mobile/tablet users get the same quality

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Playwright config includes mobile, tablet, desktop projects
- [ ] **AC-US5-02**: Stop hook verifies tests ran on all required viewports
- [ ] **AC-US5-03**: Block completion if viewport coverage incomplete
- [ ] **AC-US5-04**: Report which viewports are missing coverage

---

## Implementation

**Increment**: [0150-auto-mode-world-class-testing](../../../../increments/0150-auto-mode-world-class-testing/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-015**: Detect viewport configuration
- [x] **T-016**: Verify viewport coverage in stop hook
