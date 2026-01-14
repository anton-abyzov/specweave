---
increment: 0169-enterprise-readiness-refactoring
title: "Enterprise Readiness Refactoring"
priority: P1
status: in-progress
created: 2026-01-14
dependencies: []
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "nodejs-cli"
  database: "none"
  orm: "none"
---

# Enterprise Readiness Refactoring

**Feature**: FS-ENT - Enterprise Readiness
**Estimated Effort**: 10-12 weeks (6 sprints)
**Files to Modify**: ~250+
**Tests to Add**: ~100+

## Overview

Comprehensive refactoring to make SpecWeave enterprise-ready with improved type safety, test coverage, code quality, and enterprise features (audit logging, metrics export).

---

## User Stories

### US-001: Type Safety and Critical Code Quality
**Project**: specweave-dev
**Priority**: P1

**As a** SpecWeave developer, I want **strictNullChecks enabled** and **large files split** so that we have better type safety and maintainable code.

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Fix 3 failing discipline-checker tests
- [ ] **AC-US1-02**: Enable strictNullChecks in tsconfig.json
- [ ] **AC-US1-03**: Fix all ~200-300 strictNullChecks type errors
- [ ] **AC-US1-04**: Split sync-coordinator.ts (2,020 LOC) into StatusMapper, ProviderRouter, SyncOrchestrator
- [ ] **AC-US1-05**: Split living-docs-sync.ts (1,972 LOC) into ContentGenerator, HierarchyBuilder, CrossLinker
- [ ] **AC-US1-06**: Split e2e-coverage.ts (1,759 LOC) into CoverageAnalyzer, PathTracker, ReportGenerator
- [ ] **AC-US1-07**: Split item-converter.ts (1,730 LOC) into SpecConverter, TaskConverter, MetadataMapper
- [ ] **AC-US1-08**: All unit tests pass after changes
- [ ] **AC-US1-09**: Build succeeds with no TypeScript errors

---

### US-002: Console.log Migration to Logger
**Project**: specweave-dev
**Priority**: P1

**As a** SpecWeave user, I want **consistent logging** through the logger utility so that output is predictable and configurable.

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Migrate src/cli/commands/*.ts (91 files, ~1,500 console calls)
- [ ] **AC-US2-02**: Migrate src/cli/helpers/*.ts (~500 console calls)
- [ ] **AC-US2-03**: Create automated logger migration script for remaining files
- [ ] **AC-US2-04**: Update CLAUDE.md coding standards to require logger usage
- [ ] **AC-US2-05**: Add ESLint rule to warn on console.log usage
- [ ] **AC-US2-06**: Reduce console.* usage from 3,920 to <100 calls
- [ ] **AC-US2-07**: All migrated files use logger.info/warn/error consistently

---

### US-003: Test Coverage Expansion to 50%
**Project**: specweave-dev
**Priority**: P1

**As a** SpecWeave contributor, I want **50% test coverage** with JIRA/ADO integration tests so that integrations are reliable.

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Add unit tests for src/integrations/jira/*.ts (11 files)
- [ ] **AC-US3-02**: Add unit tests for src/integrations/ado/*.ts (5 files)
- [ ] **AC-US3-03**: Add unit tests for src/cli/commands/init.ts (951 LOC)
- [ ] **AC-US3-04**: Fix or document all skipped tests (ADO rate-limit tests)
- [ ] **AC-US3-05**: Remove placeholder test (tests/unit/placeholder.test.ts)
- [ ] **AC-US3-06**: Increase coverage threshold in vitest.config.ts from 25% to 50%
- [ ] **AC-US3-07**: All tests pass with coverage meeting new threshold

---

### US-004: Architectural Improvements
**Project**: specweave-dev
**Priority**: P2

**As a** SpecWeave architect, I want **cleaner abstractions** (StatusMapper, session persistence, credentials) so that code is maintainable.

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Extract StatusMapper service from SyncCoordinator
- [ ] **AC-US4-02**: Implement auto mode session persistence to .specweave/state/auto-session.json
- [ ] **AC-US4-03**: Create CredentialProvider abstraction for unified auth
- [ ] **AC-US4-04**: Add deprecation warning for legacy sync config format
- [ ] **AC-US4-05**: Create migrate-config script for legacy to profiles migration
- [ ] **AC-US4-06**: Update SyncCoordinator to use StatusMapper
- [ ] **AC-US4-07**: Tests verify session recovery after simulated crash

---

### US-005: Living Docs and Claude Code Alignment
**Project**: specweave-dev
**Priority**: P2

**As a** SpecWeave user, I want **updated architecture diagrams** and **Claude Code v2.1.7 alignment** so that docs are accurate and hooks are modern.

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Update c4-context.md diagram with current components
- [ ] **AC-US5-02**: Update c4-container.md diagram with all 24 plugins
- [ ] **AC-US5-03**: Update data-flow.md with current sync flow
- [ ] **AC-US5-04**: Create plugin-system.md diagram (24 plugins visualization)
- [ ] **AC-US5-05**: Create hook-lifecycle.md diagram (hook execution flow)
- [ ] **AC-US5-06**: Create auto-mode-flow.md diagram (autonomous execution)
- [ ] **AC-US5-07**: Write ADR-0211 (Console.log deprecation)
- [ ] **AC-US5-08**: Write ADR-0212 (strictNullChecks enablement)
- [ ] **AC-US5-09**: Write ADR-0213 (Auto mode session persistence)
- [ ] **AC-US5-10**: Write ADR-0214 (Status mapper extraction)
- [ ] **AC-US5-11**: Write ADR-0215 (Test coverage targets)
- [ ] **AC-US5-12**: Implement PostToolUseFailure hook handling
- [ ] **AC-US5-13**: Implement Notification hook for status updates
- [ ] **AC-US5-14**: Add PermissionRequest hook support

---

### US-006: Enterprise Core Features
**Project**: specweave-dev
**Priority**: P2

**As an** enterprise user, I want **audit logging** and **metrics export** so that I have compliance-ready tracking and observability.

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Create AuditEntry interface (timestamp, incrementId, action, actor, details, checksum)
- [ ] **AC-US6-02**: Implement AuditLogger service with append-only log
- [ ] **AC-US6-03**: Log all increment mutations (create, update, complete, sync)
- [ ] **AC-US6-04**: Create MetricsExporter interface
- [ ] **AC-US6-05**: Implement exportToPrometheus() method
- [ ] **AC-US6-06**: Implement exportToDataDog() method
- [ ] **AC-US6-07**: Implement exportToJSON() method for generic export
- [ ] **AC-US6-08**: Update PLUGINS-INDEX.md with accurate 24 plugins
- [ ] **AC-US6-09**: Add metrics endpoint to CLI (specweave metrics export)
- [ ] **AC-US6-10**: Documentation for enterprise features in living docs

---

## Technical Notes

### Files to Split
| File | Current LOC | Target Modules |
|------|-------------|----------------|
| sync-coordinator.ts | 2,020 | StatusMapper, ProviderRouter, SyncOrchestrator |
| living-docs-sync.ts | 1,972 | ContentGenerator, HierarchyBuilder, CrossLinker |
| e2e-coverage.ts | 1,759 | CoverageAnalyzer, PathTracker, ReportGenerator |
| item-converter.ts | 1,730 | SpecConverter, TaskConverter, MetadataMapper |

### Untested Integration Files
- JIRA: jira-client.ts (963 LOC), jira-mapper.ts, jira-hierarchy-mapper.ts, + 8 more
- ADO: ado-client.ts (1,035 LOC), ado-pat-provider.ts, + 3 more

### Console.log Hot Spots
- src/cli/commands/project.ts (102 calls)
- src/cli/commands/init.ts (91 calls)
- src/cli/helpers/issue-tracker/index.ts (81 calls)

---

## References

- [Plan File](/Users/antonabyzov/.claude/plans/dynamic-enchanting-comet.md)
- [Claude Code Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- [Agent SDK Hooks](https://platform.claude.com/docs/en/agent-sdk/hooks)
