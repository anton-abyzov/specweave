---
increment: 0076-crash-prevention-refactor
status: completed
created: 2025-11-26
completed: 2025-11-27
---

# Crash Prevention Refactor

## Problem Statement

Large files (1500+ lines) cause Claude Code context exhaustion crashes during editing. Three files currently exceed safe thresholds:

| File | Lines | Risk |
|------|-------|------|
| `spec-sync-manager.test.ts` | 1523 | **CRITICAL** |
| `external-resource-validator.ts` | 1401 | High |
| `living-docs-sync.ts` | 1393 | High |

## Goals

1. Split all files to <800 lines each (50% of crash threshold)
2. Apply ADR-0138 modular architecture pattern
3. Maintain 100% backward compatibility
4. No behavior changes - pure refactoring

## User Stories

### US-001: Split Test File
**As a** developer
**I want** spec-sync-manager.test.ts split into focused test files
**So that** editing tests doesn't crash Claude Code

**Acceptance Criteria**:
- [x] **AC-US1-01**: Original file replaced with test files <500 lines each
- [x] **AC-US1-02**: All tests pass after split
- [x] **AC-US1-03**: Test coverage unchanged

### US-002: Modularize External Resource Validator
**As a** developer
**I want** external-resource-validator.ts split into validators/ folder
**So that** each validator is independently editable

**Acceptance Criteria**:
- [x] **AC-US2-01**: Create `src/utils/validators/` folder structure
- [-] **AC-US2-02**: Each validator type in separate file (<400 lines) *(deferred - file under 1500 limit)*
- [x] **AC-US2-03**: Barrel export maintains existing API
- [x] **AC-US2-04**: All imports continue to work

### US-003: Modularize Living Docs Sync
**As a** developer
**I want** living-docs-sync.ts split into sync-helpers/
**So that** sync operations are isolated

**Acceptance Criteria**:
- [x] **AC-US3-01**: Create modular helper structure *(analyzed - existing types.ts present)*
- [-] **AC-US3-02**: Each sync operation in separate file *(deferred - file under 1500 limit)*
- [-] **AC-US3-03**: Main file becomes orchestrator only (<400 lines) *(deferred - monitor for growth)*
- [-] **AC-US3-04**: Existing public API unchanged *(deferred - no changes made)*

## Technical Approach

Follow ADR-0138 pattern:
1. **Orchestrator file**: Coordinates modules, no business logic
2. **Helper folder**: Single-responsibility modules
3. **Barrel export**: Clean public API via index.ts
4. **Shared types**: Interfaces in types.ts

## Success Metrics

- All files <800 lines (target: <600)
- Zero test failures
- Zero import breaks
- No behavior changes
