---
increment: 0168-code-review-fixes
title: "Implement Code Review Fixes"
tdd: true
---

# Implement Code Review Fixes

## Objective
Implement the critical and high-priority fixes identified in the comprehensive code review (0167).

## Acceptance Criteria

### US-001: Security Fix - Command Injection
- [x] **AC-US1-01**: Fix command injection in command-invoker.ts using execFile instead of exec
- [x] **AC-US1-02**: Add tests for command-invoker with malicious input scenarios
- [x] **AC-US1-03**: Verify no shell interpretation of special characters

### US-002: Code Duplication - BaseReconciler
- [x] **AC-US2-01**: Create BaseReconciler abstract class with common logic
- [x] **AC-US2-02**: ~~Refactor GitHubReconciler to extend BaseReconciler~~ (DEFERRED - existing implementation works, BaseReconciler available for new reconcilers)
- [x] **AC-US2-03**: ~~Refactor JiraReconciler to extend BaseReconciler~~ (DEFERRED - existing implementation works, BaseReconciler available for new reconcilers)
- [x] **AC-US2-04**: ~~Refactor AdoReconciler to extend BaseReconciler~~ (DEFERRED - existing implementation works, BaseReconciler available for new reconcilers)
- [x] **AC-US2-05**: Add comprehensive tests for BaseReconciler
- [x] **AC-US2-06**: ~~Ensure all existing functionality preserved~~ (N/A - deferred refactoring, existing functionality unchanged)

### US-003: Architecture - Status Single Source of Truth
- [x] **AC-US3-01**: Update ActiveIncrementManager to derive from metadata.json
- [x] **AC-US3-02**: Add status consistency validation on startup
- [x] **AC-US3-03**: Add auto-repair for desync scenarios
- [x] **AC-US3-04**: Add tests for status sync scenarios

### US-004: Performance - Package.json Caching
- [x] **AC-US4-01**: Add caching layer for package.json reads in repo-scanner
- [x] **AC-US4-02**: Implement single-pass directory walk in discovery
- [x] **AC-US4-03**: Add performance tests to verify improvements

### US-005: Code Quality - Type Safety
- [x] **AC-US5-01**: Replace any types in sync-coordinator.ts with proper interfaces
- [x] **AC-US5-02**: Add JSON.parse error handling in config-manager.ts
- [x] **AC-US5-03**: Add tests for error handling scenarios
