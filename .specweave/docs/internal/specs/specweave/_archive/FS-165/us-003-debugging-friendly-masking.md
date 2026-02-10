---
id: US-003
feature: FS-165
title: Debugging-Friendly Masking
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1003
    url: https://github.com/anton-abyzov/specweave/issues/1003
---

# US-003: Debugging-Friendly Masking

**Feature**: [FS-165](./FEATURE.md)

**As a** developer debugging issues,
**I want** to see partial credential info (first/last chars),
**So that** I can identify token types while keeping secrets safe.

---

## Acceptance Criteria

- [x] **AC-US3-01**: First 4 characters visible
- [x] **AC-US3-02**: Last 4 characters visible
- [x] **AC-US3-03**: Middle characters replaced with asterisks
- [x] **AC-US3-04**: Token type identifiable (e.g., ghp_ for GitHub)

---

## Implementation

**Increment**: [0165-credential-masking-implementation](../../../../increments/0165-credential-masking-implementation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Credential Masker Utility
- [x] **T-005**: Write Unit Tests for Credential Masker
