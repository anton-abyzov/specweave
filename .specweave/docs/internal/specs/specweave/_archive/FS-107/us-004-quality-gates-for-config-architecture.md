---
id: US-004
feature: FS-107
title: Quality Gates for Config Architecture
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 836
    url: https://github.com/anton-abyzov/specweave/issues/836
---

# US-004: Quality Gates for Config Architecture

**Feature**: [FS-107](./FEATURE.md)

**As a** SpecWeave maintainer,
**I want** automated checks that prevent config-in-env violations,
**So that** this architecture issue does not regress.

---

## Acceptance Criteria

- [x] **AC-US4-01**: ESLint rule blocks process.env reads for config variables in src/ (deferred - pre-tool-use hook provides equivalent)
- [x] **AC-US4-02**: Pre-tool-use hook blocks new violations during development
- [x] **AC-US4-03**: CI workflow validates config separation on every PR

---

## Implementation

**Increment**: [0107-enforce-config-json-separation](../../../../increments/0107-enforce-config-json-separation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-012**: Add ESLint rule for config-in-env violations
- [x] **T-013**: Create pre-tool-use hook for config separation
- [x] **T-014**: Create CI workflow for config validation
