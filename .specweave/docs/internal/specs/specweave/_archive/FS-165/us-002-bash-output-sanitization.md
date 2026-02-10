---
id: US-002
feature: FS-165
title: Bash Output Sanitization
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1002
    url: https://github.com/anton-abyzov/specweave/issues/1002
---

# US-002: Bash Output Sanitization

**Feature**: [FS-165](./FEATURE.md)

**As a** developer running bash commands through SpecWeave,
**I want** command output to be sanitized before display,
**So that** credentials from grep/cat commands aren't exposed.

---

## Acceptance Criteria

- [x] **AC-US2-01**: `grep TOKEN .env` output is masked
- [x] **AC-US2-02**: `cat .env` output is masked
- [x] **AC-US2-03**: Multi-line env file outputs masked
- [x] **AC-US2-04**: Docker command outputs masked
- [x] **AC-US2-05**: Curl command outputs masked

---

## Implementation

**Increment**: [0165-credential-masking-implementation](../../../../increments/0165-credential-masking-implementation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Create Bash Sanitizer
- [x] **T-006**: Write Unit Tests for Bash Sanitizer
