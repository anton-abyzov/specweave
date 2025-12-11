---
id: US-002
feature: FS-126
title: Bitbucket Multi-Repo Pattern Selection
status: completed
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 869
    url: https://github.com/anton-abyzov/specweave/issues/869
---

# US-002: Bitbucket Multi-Repo Pattern Selection

**Feature**: [FS-126](./FEATURE.md)

**As a** user setting up a Bitbucket multi-repo architecture
**I want** the same pattern selection experience as ADO users
**So that** the init flow is consistent across providers

---

## Acceptance Criteria

- [x] **AC-US2-01**: User sees pattern selection after choosing Bitbucket + multiple
- [x] **AC-US2-02**: All 4 options are available
- [x] **AC-US2-03**: Localization works for all 10 languages

---

## Implementation

**Increment**: [0126-github-bitbucket-multirepo-pattern-parity](../../../../increments/0126-github-bitbucket-multirepo-pattern-parity/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add localized strings for GitHub/Bitbucket multi-repo
- [x] **T-002**: Create unified promptMultiRepoPatternSelection function
- [x] **T-003**: Update setupRepositoryHosting flow condition
- [x] **T-004**: Verify build compiles successfully
