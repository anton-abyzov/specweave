---
increment: 0182-remove-custom-plugin-cache
title: "Remove Custom Plugin Cache System"
type: refactor
priority: P1
status: completed
created: 2026-02-03
structure: user-stories
test_mode: TDD
coverage_target: 80
---

# Refactor: Remove Custom Plugin Cache System

## Overview

SpecWeave currently maintains a custom plugin cache management system that duplicates functionality provided natively by Claude Code. This creates:
- **Bugs**: session-start.sh deleted cache, breaking all commands/skills
- **Complexity**: 5+ files (~1500 LOC) managing what Claude Code already handles
- **State pollution**: `.cache-check-throttle` persists forever
- **Confusion**: Two registries (`plugins-loaded.json` vs `installed_plugins.json`)

**Goal**: Remove custom cache system, rely on Claude Code's native plugin management.

## User Stories

### US-001: Remove Custom Cache Module (P1)
**Project**: specweave

**As a** SpecWeave maintainer
**I want** to remove the custom plugin cache module
**So that** we reduce complexity and eliminate bugs

**Acceptance Criteria**:
- [x] **AC-US1-01**: Delete `src/core/plugin-cache/cache-manager.ts`
- [x] **AC-US1-02**: Delete `src/core/plugin-cache/cache-health-monitor.ts`
- [x] **AC-US1-03**: Delete `src/core/plugin-cache/cache-invalidator.ts`
- [x] **AC-US1-04**: Delete `src/core/plugin-cache/cache-metadata.ts`
- [x] **AC-US1-05**: Delete `src/core/plugin-cache/startup-checker.ts`
- [x] **AC-US1-06**: Keep `src/core/plugin-cache/types.ts` (may have shared types)

### US-002: Remove Cache Commands (P1)
**Project**: specweave

**As a** SpecWeave user
**I want** unnecessary cache commands removed
**So that** the CLI is simpler and I use Claude Code's native commands

**Acceptance Criteria**:
- [x] **AC-US2-01**: Remove `specweave cache-status` command
- [x] **AC-US2-02**: Remove `specweave cache-refresh` command
- [x] **AC-US2-03**: Update `specweave --help` to not show removed commands

### US-003: Simplify refresh-marketplace (P2)
**Project**: specweave

**As a** SpecWeave user
**I want** `specweave refresh-marketplace` to use native Claude plugin commands
**So that** plugin updates work reliably

**Acceptance Criteria**:
- [x] **AC-US3-01**: `refresh-marketplace` uses `claude plugin install --force` instead of custom cache logic
- [x] **AC-US3-02**: Remove references to custom cache metadata
- [x] **AC-US3-03**: Command still works for bulk plugin updates

### US-004: Remove State Pollution (P2)
**Project**: specweave

**As a** SpecWeave user
**I want** no orphaned state files from plugin cache
**So that** my `.specweave/state/` stays clean

**Acceptance Criteria**:
- [x] **AC-US4-01**: Remove `~/.specweave/state/plugins-loaded.json` usage
- [x] **AC-US4-02**: Remove `.cache-check-throttle` creation
- [x] **AC-US4-03**: Update hooks to read `~/.claude/plugins/installed_plugins.json` directly

### US-005: Update Tests (P1)
**Project**: specweave

**As a** developer
**I want** tests updated to reflect removed code
**So that** the test suite passes

**Acceptance Criteria**:
- [x] **AC-US5-01**: Remove tests for deleted cache modules
- [x] **AC-US5-02**: Update integration tests that used cache functions
- [x] **AC-US5-03**: All tests pass after refactor

## Functional Requirements

### FR-001: Use Native Plugin Registry
Read plugin state from `~/.claude/plugins/installed_plugins.json` instead of custom tracking.

### FR-002: No Direct Cache Manipulation
Never touch `~/.claude/plugins/cache/` directly. Let Claude Code manage it.

### FR-003: Preserve refresh-marketplace Functionality
Keep the convenience of bulk plugin updates but implement via native commands.

## Success Criteria

- Build passes with no references to deleted modules
- All tests pass
- `specweave refresh-marketplace` still works
- No new state files created in `~/.specweave/state/`
- CLI help shows no removed commands

## Out of Scope

- Changing how hooks detect installed plugins (already uses native registry)
- Adding new plugin management features
- Modifying Claude Code's plugin system

## Dependencies

- Requires Claude Code's `claude plugin` CLI to be available
- Requires `installed_plugins.json` to be accessible
