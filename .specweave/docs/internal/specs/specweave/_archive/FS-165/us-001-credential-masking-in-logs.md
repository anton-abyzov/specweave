---
id: US-001
feature: FS-165
title: Credential Masking in Logs
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1001
    url: https://github.com/anton-abyzov/specweave/issues/1001
---

# US-001: Credential Masking in Logs

**Feature**: [FS-165](./FEATURE.md)

**As a** developer using SpecWeave,
**I want** credentials to be automatically masked in all log output,
**So that** I don't accidentally expose sensitive tokens when sharing logs or screenshots.

---

## Acceptance Criteria

- [x] **AC-US1-01**: GITHUB_TOKEN values masked in log output
- [x] **AC-US1-02**: JIRA credentials masked in log output
- [x] **AC-US1-03**: Azure DevOps PAT masked in log output
- [x] **AC-US1-04**: Database URLs with passwords masked
- [x] **AC-US1-05**: AWS credentials masked
- [x] **AC-US1-06**: Generic API keys masked

---

## Implementation

**Increment**: [0165-credential-masking-implementation](../../../../increments/0165-credential-masking-implementation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create Credential Masker Utility
- [x] **T-003**: Integrate Masking into Logger
- [x] **T-004**: Secure Prompt Logger
- [x] **T-005**: Write Unit Tests for Credential Masker
- [x] **T-007**: Create Implementation Summary
