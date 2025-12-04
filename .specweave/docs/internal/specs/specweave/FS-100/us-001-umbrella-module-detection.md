---
id: US-001
feature: FS-100
title: "Umbrella Module Detection"
status: completed
priority: critical
created: 2024-12-03
---

**Origin**: 🏠 **Internal**


# US-001: Umbrella Module Detection

**Feature**: [FS-100](./FEATURE.md)

**As a** developer working with an umbrella repository containing multiple cloned repos
**I want** SpecWeave to automatically detect each child repo as a module
**So that** living docs builder can analyze and document each project correctly

---

## Acceptance Criteria

- [x] **AC-US1-01**: Child repos with `.git` directories are detected as modules
- [x] **AC-US1-02**: Modules from clone job config.json are recognized when available
- [x] **AC-US1-03**: Each detected module has correct path, name, and file stats
- [x] **AC-US1-04**: Detection works for 200+ repos without performance issues

---

## Implementation

**Increment**: [0097-umbrella-module-detection](../../../../increments/0097-umbrella-module-detection/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-001](../../../../increments/0097-umbrella-module-detection/tasks.md#T-001): Create Umbrella Detector Module
- [x] [T-003](../../../../increments/0097-umbrella-module-detection/tasks.md#T-003): Modify Discovery to Support Umbrella
- [x] [T-007](../../../../increments/0097-umbrella-module-detection/tasks.md#T-007): Unit Tests for Umbrella Detection
- [x] [T-008](../../../../increments/0097-umbrella-module-detection/tasks.md#T-008): Integration Test End-to-End