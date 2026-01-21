---
id: US-001
feature: FS-151
title: Plugin Activation E2E Tests
status: completed
priority: P0
created: 2025-12-31
project: specweave
external:
  github:
    issue: 986
    url: https://github.com/anton-abyzov/specweave/issues/986
---

# US-001: Plugin Activation E2E Tests

**Feature**: [FS-151](./FEATURE.md)

**As a** developer using SpecWeave
**I want** proof that domain-specific plugins activate when I ask about K8s, mobile, or backend topics
**So that** I can trust the plugin system works as documented

---

## Acceptance Criteria

- [x] **AC-US1-01**: E2E test verifies kubernetes-architect agent activates for "deploy to EKS with GitOps"
- [x] **AC-US1-02**: E2E test verifies mobile-architect agent activates for "React Native authentication flow"
- [x] **AC-US1-03**: E2E test verifies backend agents activate for "NestJS API with Prisma"
- [x] **AC-US1-04**: E2E test verifies frontend-architect activates for "Next.js dashboard"
- [x] **AC-US1-05**: Test coverage includes at least 5 different plugin domains

---

## Implementation

**Increment**: [0151-plugin-lsp-activation-e2e-tests](../../../../increments/0151-plugin-lsp-activation-e2e-tests/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create E2E test infrastructure
- [x] **T-006**: E2E test for Kubernetes plugin activation
- [x] **T-007**: E2E test for Mobile plugin activation
- [x] **T-008**: E2E test for Backend plugin activation
- [x] **T-009**: E2E test for Frontend plugin activation
- [x] **T-010**: E2E test for additional domains
