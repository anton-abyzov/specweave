---
id: US-002
feature: FS-084
title: "API Route Analyzer"
status: completed
priority: P1
created: 2025-12-01
---

# US-002: API Route Analyzer

**Feature**: [FS-084](./FEATURE.md)

**As a** developer,
**I want** automatic detection of API routes from code,
**So that** I can compare them against documented API specs.

---

## Acceptance Criteria

- [x] **AC-US2-01**: Detect Express/Fastify route definitions
- [x] **AC-US2-02**: Extract HTTP method, path, and handler
- [x] **AC-US2-03**: Support Next.js API routes
- [x] **AC-US2-04**: Support dynamic route parameters
- [x] **AC-US2-05**: Build route map with method/path/file

---

## Implementation

**Increment**: [0084-discrepancy-detection](../../../../../../increments/_archive/0084-discrepancy-detection/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Implement API Route Analyzer
- [x] **T-007**: Add Unit & Integration Tests
