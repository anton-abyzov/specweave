---
id: US-002
feature: FS-127
title: Bitbucket Multi-Repo Cloning
status: not_started
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 803
    url: https://github.com/anton-abyzov/specweave/issues/803
---

# US-002: Bitbucket Multi-Repo Cloning

**Feature**: [FS-127](./FEATURE.md)

**As a** SpecWeave user with multiple Bitbucket repositories
**I want** to clone all/selected repos during `specweave init`
**So that** I can work with my Bitbucket multi-repo setup

---

## Acceptance Criteria

No acceptance criteria defined.

---

## Implementation

**Increment**: [0127-github-bitbucket-clone-parity](../../../../increments/0127-github-bitbucket-clone-parity/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-006**: Create Bitbucket repo cloning module
- [ ] **T-007**: Implement Bitbucket API repo fetching
- [ ] **T-008**: Implement Bitbucket repo filtering
- [ ] **T-009**: Build Bitbucket HTTPS clone URLs
- [ ] **T-010**: Launch Bitbucket background clone job
