---
id: US-001
feature: FS-062
title: Multi-Repo Detection in Init
status: not_started
priority: P1
created: 2025-11-25
external_tools:
  github:
    number: 756
    url: https://github.com/anton-abyzov/specweave/issues/756
    created_at: 2025-11-25T08:14:26.848Z
---

# US-001: Multi-Repo Detection in Init

**Feature**: [FS-062](../../_features/FS-062/FEATURE.md)

**As a** developer starting a multi-repo project
**I want** SpecWeave to detect when I describe multiple repos
**So that** it can set up appropriate project structure

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Init detects keywords like "3 repos", "frontend repo", "backend repo", "monorepo with services"
- [ ] **AC-US1-02**: Prompts "I detected a multi-repo architecture. How would you like to set it up?"
- [ ] **AC-US1-03**: Offers options: "Clone from GitHub", "Create new repos", "Initialize each folder"
- [ ] **AC-US1-04**: For "Clone from GitHub", accepts comma-separated URLs or interactive entry

---

## Implementation

**Increment**: [0062-umbrella-multi-repo-support](../../../../increments/0062-umbrella-multi-repo-support/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
