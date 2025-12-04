---
id: US-004
feature: FS-050
title: "Smart Caching with TTL"
status: completed
priority: P1
created: 2025-11-21
---

# US-004: Smart Caching with TTL

**Feature**: [FS-050](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US4-01**: 24-Hour TTL for Project List
- [x] **AC-US4-02**: Per-Project Dependency Cache
- [x] **AC-US4-03**: Cache Validation on Startup
- [x] **AC-US4-04**: Manual Refresh Command
- [x] **AC-US4-05**: Respect API Rate Limits

---

## Implementation

**Increment**: [0050-external-tool-import-phase-1b-7](../../../../../../increments/_archive/0050-external-tool-import-phase-1b-7/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Implement CacheManager with TTL Validation
- [x] **T-002**: Implement Rate Limit Checker
- [x] **T-003**: Integrate CacheManager into JiraDependencyLoader
- [x] **T-004**: Integrate CacheManager into AdoDependencyLoader
- [x] **T-005**: Create `/specweave-jira:refresh-cache` Command
- [x] **T-006**: Create `/specweave-ado:refresh-cache` Command
- [x] **T-007**: Create `/specweave:cleanup-cache` Maintenance Command
- [x] **T-008**: Add Cache Directory to .gitignore
- [x] **T-009**: Document Cache Architecture in ADR
- [x] **T-010**: Integration Test: Full Cache Workflow
- [x] **T-011**: Performance Test: Cache Hit Rate Validation
- [x] **T-012**: Update CLI Helper Modules with Cache Support
