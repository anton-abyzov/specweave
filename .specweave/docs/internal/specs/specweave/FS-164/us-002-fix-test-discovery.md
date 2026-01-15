---
id: US-002
feature: FS-164
title: "Fix Test Discovery"
status: completed
priority: P0
created: 2026-01-08
project: specweave-dev
---

# US-002: Fix Test Discovery

**Feature**: [FS-164](./FEATURE.md)

**As a** developer
**I want** Vitest to discover all E2E test files correctly
**So that** all tests execute during test runs

---

## Acceptance Criteria

- [x] **AC-US2-01**: Audit playwright.config.ts - added testIgnore for e2e/
- [x] **AC-US2-02**: Kept .e2e.ts naming (semantic distinction), Vitest discovers both
- [x] **AC-US2-03**: Removed complex grep-invert, now `vitest run tests/e2e`
- [x] **AC-US2-04**: All 7 E2E test files discovered - 74 tests total (55 passing, 17 failing, 2 skipped)
- [x] **AC-US2-05**: Script simplified from 200+ chars to 24 chars

---

## Implementation

**Increment**: [0164-e2e-test-infrastructure-fix](../../../../increments/0164-e2e-test-infrastructure-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
