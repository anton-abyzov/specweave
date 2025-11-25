---
id: US-002
feature: FS-062
title: Independent Repo Initialization
status: not_started
priority: P1
created: 2025-11-25
external_tools:
  github:
    number: 757
    url: https://github.com/anton-abyzov/specweave/issues/757
    created_at: 2025-11-25T08:14:29.097Z
---

# US-002: Independent Repo Initialization

**Feature**: [FS-062](../../_features/FS-062/FEATURE.md)

**As a** developer with multiple repos
**I want** each repo to have its own SpecWeave configuration
**So that** each repo is independent and syncs to its own external tools

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Each cloned/created repo gets its own `.specweave/` folder
- [ ] **AC-US2-02**: Each repo gets its own `config.json` with its GitHub/JIRA/ADO settings
- [ ] **AC-US2-03**: Parent/umbrella repo (optional) only coordinates, no implementation specs
- [ ] **AC-US2-04**: Running `specweave init` in child repo detects it's part of umbrella setup

---

## Implementation

**Increment**: [0062-umbrella-multi-repo-support](../../../../increments/0062-umbrella-multi-repo-support/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
