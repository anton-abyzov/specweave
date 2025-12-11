---
id: US-001
feature: FS-126
title: GitHub Multi-Repo Pattern Selection
status: completed
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 868
    url: https://github.com/anton-abyzov/specweave/issues/868
---

# US-001: GitHub Multi-Repo Pattern Selection

**Feature**: [FS-126](./FEATURE.md)

**As a** user setting up a GitHub multi-repo architecture
**I want** to specify which repositories to work with using patterns
**So that** I can filter my microservices repos efficiently

---

## Acceptance Criteria

- [x] **AC-US1-01**: User sees pattern selection after choosing GitHub + multiple
- [x] **AC-US1-02**: All 4 options are available (All, Pattern glob, Pattern regex, Skip)
- [x] **AC-US1-03**: Pattern shortcuts work (starts:, ends:, contains:)

---

## Implementation

**Increment**: [0126-github-bitbucket-multirepo-pattern-parity](../../../../increments/0126-github-bitbucket-multirepo-pattern-parity/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add localized strings for GitHub/Bitbucket multi-repo
- [x] **T-002**: Create unified promptMultiRepoPatternSelection function
- [x] **T-003**: Update setupRepositoryHosting flow condition
- [x] **T-004**: Verify build compiles successfully
