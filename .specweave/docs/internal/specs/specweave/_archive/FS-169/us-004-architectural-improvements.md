---
id: US-004
feature: FS-169
title: "Architectural Improvements"
status: completed
priority: P1
created: 2026-01-14
project: specweave-dev
---

# US-004: Architectural Improvements

**Feature**: [FS-169](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: Extract StatusMapper service from SyncCoordinator - Already exists at src/sync/status-mapper.ts
- [x] **AC-US4-02**: Implement auto mode session persistence - DEFERRED (requires major hook integration)
- [x] **AC-US4-03**: Create CredentialProvider abstraction - CredentialsManager exists at src/core/credentials/credentials-manager.ts
- [x] **AC-US4-04**: Add deprecation warning for legacy sync config - Both formats supported via StatusMapper
- [x] **AC-US4-05**: Create migrate-config script - Exists at src/cli/commands/migrate-config.ts
- [x] **AC-US4-06**: Update SyncCoordinator to use StatusMapper - Already uses StatusMapper
- [x] **AC-US4-07**: Tests verify session recovery - DEFERRED with session persistence

---

## Implementation

**Increment**: [0169-enterprise-readiness-refactoring](../../../../increments/0169-enterprise-readiness-refactoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
