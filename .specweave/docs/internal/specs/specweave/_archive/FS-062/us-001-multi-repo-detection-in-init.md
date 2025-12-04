---
id: US-001
feature: FS-062
title: "Multi-Repo Detection in Init"
status: in_progress
priority: P1
created: 2025-11-25
---

# US-001: Multi-Repo Detection in Init

**Feature**: [FS-062](./FEATURE.md)

**As a** developer starting a multi-repo project
**I want** SpecWeave to detect when I describe multiple repos
**So that** it can set up appropriate project structure

---

## Acceptance Criteria

- [x] **AC-US1-01**: Init detects keywords like "3 repos", "frontend repo", "backend repo", "monorepo with services"
- [x] **AC-US1-02**: Prompts "I detected a multi-repo architecture. How would you like to set it up?"
- [ ] **AC-US1-03**: Offers options: "Clone from GitHub", "Create new repos", "Initialize each folder"
- [ ] **AC-US1-04**: For "Clone from GitHub", accepts comma-separated URLs or interactive entry

---

## Implementation

**Increment**: [0062-umbrella-multi-repo-support](../../../../../../increments/_archive/0062-umbrella-multi-repo-support/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create multi-repo intent detector
- [x] **T-002**: Create umbrella-repo-detector skill
- [x] **T-005**: Write unit tests for multi-repo detector
- [x] **T-007**: Add multi-repo detection to init flow (DEFERRED)
