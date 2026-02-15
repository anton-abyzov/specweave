---
id: US-012
feature: FS-190
title: "Full E2E Test Suite Per Provider (P1)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave contributor
**I want** real E2E tests that exercise actual GitHub/JIRA/ADO APIs
**So that** sync changes are validated against real platforms before release."
project: specweave
---

# US-012: Full E2E Test Suite Per Provider (P1)

**Feature**: [FS-190](./FEATURE.md)

**As a** SpecWeave contributor
**I want** real E2E tests that exercise actual GitHub/JIRA/ADO APIs
**So that** sync changes are validated against real platforms before release

---

## Acceptance Criteria

- [x] **AC-US12-01**: Given the GitHub E2E test suite, when run against the specweave repo, then it creates an issue, updates it, syncs status, and cleans up
- [x] **AC-US12-02**: Given the JIRA E2E test suite, when run against a test project, then it creates a story, transitions status, and verifies sync
- [x] **AC-US12-03**: Given the ADO E2E test suite, when run against a test organization, then it creates a work item, updates state, and verifies sync
- [x] **AC-US12-04**: Given CI pipeline, when E2E tests are configured, then they run on a schedule (not on every PR) to avoid rate limits
- [x] **AC-US12-05**: Given E2E test credentials, when stored, then they use CI secrets (not committed to repo)

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
