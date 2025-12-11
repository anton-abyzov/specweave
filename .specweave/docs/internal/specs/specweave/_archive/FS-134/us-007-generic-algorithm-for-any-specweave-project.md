---
id: US-007
feature: FS-134
title: "Generic Algorithm for Any SpecWeave Project"
status: in_progress
priority: P1
created: 2025-12-09
project: specweave
---

# US-007: Generic Algorithm for Any SpecWeave Project

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave framework developer
**I want** the living docs engine to work on any user project
**So that** users get intelligent docs without custom configuration

---

## Acceptance Criteria

- [x] **AC-US7-01**: System works with single-repo projects (no umbrella)
- [x] **AC-US7-02**: System works with multi-repo umbrella projects
- [ ] **AC-US7-03**: System auto-detects tech stack (Node.js, Go, Python, Java, Rust, etc.)
- [x] **AC-US7-01**: System works with single-repo projects
- [x] **AC-US7-02**: System works with multi-repo umbrella projects
- [ ] **AC-US7-03**: System auto-detects tech stack

---

## Implementation

**Increment**: [0134-living-docs-core-engine](../../../../increments/0134-living-docs-core-engine/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Implement RepoScanner with Multi-Repo Support
