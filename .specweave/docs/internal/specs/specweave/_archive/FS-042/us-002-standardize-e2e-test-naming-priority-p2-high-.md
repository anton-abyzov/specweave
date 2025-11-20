---
id: US-002
feature: FS-042
title: "Standardize E2E Test Naming (Priority: P2 - HIGH)"
status: completed
priority: P1
created: 2025-11-18
---

# US-002: Standardize E2E Test Naming (Priority: P2 - HIGH)

**Feature**: [FS-042](../../_features/FS-042/FEATURE.md)

**As a** SpecWeave contributor
**I want** consistent E2E test naming convention (.test.ts only)
**So that** glob patterns are simpler and developers know which pattern to use

---

## Acceptance Criteria

- [ ] **AC-US2-01**: All E2E tests use `.test.ts` extension (zero `.spec.ts` files)
- [ ] **AC-US2-02**: Test configs updated to use `.test.ts` pattern only
- [ ] **AC-US2-03**: Documentation updated with naming standard
- [ ] **AC-US2-04**: All renamed tests still pass with zero failures

---

## Implementation

**Increment**: [0042-test-infrastructure-cleanup](../../../../increments/0042-test-infrastructure-cleanup/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Rename E2E Tests and Move Misplaced Tests
- [x] **T-005**: Update Test Config and Documentation for Phase 2
- [ ] **T-017**: Create Completion Report
- [ ] **T-018**: Final Validation and Increment Closure
