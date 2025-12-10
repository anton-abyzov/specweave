# FS-137: Per-US Project/Board Enforcement

**Status**: ✅ Completed
**Increment**: 0137-per-us-project-board-enforcement
**Priority**: P0
**Created**: 2025-12-09
**Completed**: 2025-12-10

## Summary

Per-US Project/Board Enforcement - The Missing Runtime Layer. Creates a comprehensive 5-layer enforcement system ensuring every User Story has proper project/board targeting at runtime.

## Problem Statement

Increments 0119 and 0125 implemented the INFRASTRUCTURE for per-User-Story project/board targeting, but Claude doesn't actually USE it at runtime. User Stories are still being created without `**Project**:` and `**Board**:` fields, causing sync failures and living docs to land in wrong folders.

## Solution

A 5-layer enforcement system:
1. **Context Injection**: Inject project options BEFORE Claude generates spec
2. **Validation Hook** (BLOCKING): Pre-Tool-Use hook blocks spec.md without per-US project
3. **Smart Project Resolution**: Auto-resolve project from keywords/context
4. **Living Docs Per-US Placement**: Route each US to its declared project folder
5. **External Plugin Integration**: Connect GitHub/JIRA/ADO sync to per-US orchestrator

## User Stories

### US-001: Pre-Planning Context Injection (P0)
**Project**: specweave
**Status**: ✅ Completed

Context injection before spec generation ensures Claude has project information.

### US-002: Per-US Project Validation Hook (P0)
**Project**: specweave
**Status**: ✅ Completed

Validation hook BLOCKS spec.md writes missing per-US project fields.

### US-003: Smart Project Resolution Utility (P1)
**Project**: specweave
**Status**: ✅ Completed

Auto-resolve project/board from US content with confidence scoring.

### US-004: GitHub Plugin Per-US Sync (P1)
**Project**: specweave
**Status**: ✅ Completed

GitHub sync creates issues in correct repo per US.

### US-005: JIRA Plugin Per-US Sync (P1)
**Project**: specweave
**Status**: ✅ Completed

JIRA sync creates issues in correct project per US.

### US-006: ADO Plugin Per-US Sync (P1)
**Project**: specweave
**Status**: ✅ Completed

ADO sync creates work items in correct area path per US.

### US-007: Config Schema for projectMappings (P1)
**Project**: specweave
**Status**: ✅ Completed

JSON schema defines projectMappings structure with validation.

### US-008: /specweave:status Cross-Project View (P2)
**Project**: specweave
**Status**: ✅ Completed

Status command shows per-US sync status grouped by project.

### US-009: Living Docs Per-US Folder Placement (P1)
**Project**: specweave
**Status**: ✅ Completed

Living docs places each US file in its declared project folder.

### US-010: Backward Compatibility - Default Project Fallback (P2)
**Project**: specweave
**Status**: ✅ Completed

Fallback to increment-level project for existing specs without per-US fields.

## Key Deliverables

- `plugins/specweave/hooks/v2/guards/per-us-project-validator.sh` - Validation hook (18 tests)
- `plugins/specweave/hooks/v2/guards/metadata-json-guard.sh` - Metadata guard (22 tests)
- `src/utils/project-resolver.ts` - Smart project resolution with CrossCuttingDetector
- `plugins/specweave-github/lib/per-us-sync.ts` - GitHub per-US sync
- `plugins/specweave-jira/lib/per-us-sync.ts` - JIRA per-US sync
- `plugins/specweave-ado/lib/per-us-sync.ts` - ADO per-US sync
- `src/core/schemas/specweave-config.schema.json` - projectMappings schema

## Test Coverage

| Test Suite | Passed |
|------------|--------|
| per-us-project-validator.sh | 18/18 |
| metadata-json-guard.sh | 22/22 |
| cross-project-sync integration | 12/12 |

## Related

- **Dependencies**: 0119 (infrastructure), 0125 (cross-project targeting)
- **CLAUDE.md**: Section 2c-bis documents per-US project enforcement rules
