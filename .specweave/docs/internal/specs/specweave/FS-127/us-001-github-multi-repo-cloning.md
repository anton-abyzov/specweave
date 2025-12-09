---
id: US-001
feature: FS-127
title: GitHub Multi-Repo Cloning
status: not_started
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 802
    url: https://github.com/anton-abyzov/specweave/issues/802
---

# US-001: GitHub Multi-Repo Cloning

**Feature**: [FS-127](./FEATURE.md)

**As a** SpecWeave user with multiple GitHub repositories
**I want** to clone all/selected repos during `specweave init`
**So that** I don't have to manually clone each repo after init

---

## Acceptance Criteria

No acceptance criteria defined.

---

## Implementation

**Increment**: [0127-github-bitbucket-clone-parity](../../../../increments/0127-github-bitbucket-clone-parity/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-001**: Create GitHub repo cloning module
- [ ] **T-002**: Implement GitHub API repo fetching
- [ ] **T-003**: Implement GitHub repo filtering
- [ ] **T-004**: Build GitHub HTTPS clone URLs
- [ ] **T-005**: Launch GitHub background clone job
