---
increment: 0169-enterprise-readiness-refactoring
status: in-progress
phases:
  - type-safety
  - logging-migration
  - test-coverage
  - architecture
  - living-docs
  - enterprise
estimated_tasks: 55
estimated_weeks: 10-12
---

# Tasks: Enterprise Readiness Refactoring

## Sprint 1: Type Safety and Critical Code Quality (Week 1-2)

### T-001: Fix failing discipline-checker tests
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Test**: Given discipline-checker tests → When running test suite → Then all 3 failing tests pass
**Priority**: P1
**Files**: tests/unit/core/increment/discipline-checker.test.ts

---

### T-002: Enable strictNullChecks in tsconfig.json
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] pending
**Test**: Given tsconfig.json → When strictNullChecks enabled → Then compiler runs with strict null checking
**Priority**: P1
**Files**: tsconfig.json, tsconfig.test.json

---

### T-003: Fix strictNullChecks type errors (batch 1 - core/)
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] pending
**Test**: Given src/core/ files → When compiling with strictNullChecks → Then no type errors in core/
**Priority**: P1
**Files**: src/core/**/*.ts

---

### T-004: Fix strictNullChecks type errors (batch 2 - cli/)
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] pending
**Test**: Given src/cli/ files → When compiling with strictNullChecks → Then no type errors in cli/
**Priority**: P1
**Files**: src/cli/**/*.ts

---

### T-005: Fix strictNullChecks type errors (batch 3 - remaining)
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [ ] pending
**Test**: Given all src/ files → When compiling with strictNullChecks → Then 0 type errors
**Priority**: P1
**Files**: src/**/*.ts

---

### T-006: Split sync-coordinator.ts - Extract StatusMapper
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [ ] pending
**Test**: Given sync-coordinator.ts → When StatusMapper extracted → Then status mapping works and file <500 LOC
**Priority**: P1
**Files**: src/sync/sync-coordinator.ts, src/sync/status-mapper.ts (new)

---

### T-007: Split sync-coordinator.ts - Extract ProviderRouter
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [ ] pending
**Test**: Given sync-coordinator.ts → When ProviderRouter extracted → Then provider routing works
**Priority**: P1
**Files**: src/sync/sync-coordinator.ts, src/sync/provider-router.ts (new)

---

### T-008: Split living-docs-sync.ts - Extract ContentGenerator
**User Story**: US-001 | **Satisfies ACs**: AC-US1-05 | **Status**: [ ] pending
**Test**: Given living-docs-sync.ts → When ContentGenerator extracted → Then content generation works
**Priority**: P1
**Files**: src/core/living-docs/living-docs-sync.ts, src/core/living-docs/content-generator.ts (new)

---

### T-009: Split living-docs-sync.ts - Extract HierarchyBuilder
**User Story**: US-001 | **Satisfies ACs**: AC-US1-05 | **Status**: [ ] pending
**Test**: Given living-docs-sync.ts → When HierarchyBuilder extracted → Then hierarchy building works
**Priority**: P1
**Files**: src/core/living-docs/living-docs-sync.ts, src/core/living-docs/hierarchy-builder.ts (new)

---

### T-010: Split e2e-coverage.ts into modules
**User Story**: US-001 | **Satisfies ACs**: AC-US1-06 | **Status**: [ ] pending
**Test**: Given e2e-coverage.ts → When split into 3 modules → Then coverage analysis works and each file <600 LOC
**Priority**: P1
**Files**: src/core/auto/e2e-coverage.ts, src/core/auto/coverage-analyzer.ts (new), src/core/auto/path-tracker.ts (new)

---

### T-011: Split item-converter.ts into modules
**User Story**: US-001 | **Satisfies ACs**: AC-US1-07 | **Status**: [ ] pending
**Test**: Given item-converter.ts → When split into 3 modules → Then item conversion works and each file <600 LOC
**Priority**: P1
**Files**: src/sync/item-converter.ts, src/sync/spec-converter.ts (new), src/sync/task-converter.ts (new)

---

### T-012: Verify all tests pass after Sprint 1 changes
**User Story**: US-001 | **Satisfies ACs**: AC-US1-08, AC-US1-09 | **Status**: [ ] pending
**Test**: Given all Sprint 1 changes → When running full test suite → Then all tests pass and build succeeds
**Priority**: P1
**Files**: N/A (verification)

---

## Sprint 2: Console.log Migration (Week 3-4)

### T-013: Migrate console.log in src/cli/commands/ (batch 1)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] pending
**Test**: Given first 30 command files → When migrated to logger → Then no console.log in those files
**Priority**: P1
**Files**: src/cli/commands/*.ts (first batch)

---

### T-014: Migrate console.log in src/cli/commands/ (batch 2)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] pending
**Test**: Given next 30 command files → When migrated to logger → Then no console.log in those files
**Priority**: P1
**Files**: src/cli/commands/*.ts (second batch)

---

### T-015: Migrate console.log in src/cli/commands/ (batch 3)
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] pending
**Test**: Given remaining command files → When migrated to logger → Then all commands use logger
**Priority**: P1
**Files**: src/cli/commands/*.ts (remaining)

---

### T-016: Migrate console.log in src/cli/helpers/
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [ ] pending
**Test**: Given all helper files → When migrated to logger → Then no console.log in helpers
**Priority**: P1
**Files**: src/cli/helpers/**/*.ts

---

### T-017: Create logger migration automation script
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [ ] pending
**Test**: Given migration script → When run on src/core/ → Then console.log replaced with logger calls
**Priority**: P2
**Files**: scripts/migrate-console-to-logger.ts (new)

---

### T-018: Add ESLint rule for console.log warning
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05 | **Status**: [ ] pending
**Test**: Given ESLint config → When running lint → Then console.log triggers warning
**Priority**: P2
**Files**: .eslintrc.json (new or update)

---

### T-019: Update CLAUDE.md coding standards for logger
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [ ] pending
**Test**: Given CLAUDE.md → When updated → Then logger requirement documented
**Priority**: P2
**Files**: CLAUDE.md

---

## Sprint 3: Test Coverage Expansion (Week 5-6)

### T-020: Add tests for jira-client.ts
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [ ] pending
**Test**: Given jira-client.ts → When tests written → Then >80% coverage of JIRA client
**Priority**: P1
**Files**: src/integrations/jira/jira-client.ts, tests/unit/integrations/jira/jira-client.test.ts (new)

---

### T-021: Add tests for jira-mapper.ts and jira-hierarchy-mapper.ts
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [ ] pending
**Test**: Given JIRA mapper files → When tests written → Then mapping logic tested
**Priority**: P1
**Files**: tests/unit/integrations/jira/*.test.ts (new)

---

### T-022: Add tests for remaining JIRA integration files
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [ ] pending
**Test**: Given 8 remaining JIRA files → When tests written → Then JIRA integration fully tested
**Priority**: P1
**Files**: tests/unit/integrations/jira/*.test.ts (new)

---

### T-023: Add tests for ado-client.ts
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [ ] pending
**Test**: Given ado-client.ts → When tests written → Then >80% coverage of ADO client
**Priority**: P1
**Files**: src/integrations/ado/ado-client.ts, tests/unit/integrations/ado/ado-client.test.ts (new)

---

### T-024: Add tests for remaining ADO integration files
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [ ] pending
**Test**: Given 4 remaining ADO files → When tests written → Then ADO integration fully tested
**Priority**: P1
**Files**: tests/unit/integrations/ado/*.test.ts (new)

---

### T-025: Add tests for init.ts command
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03 | **Status**: [ ] pending
**Test**: Given init.ts → When tests written → Then initialization flow tested
**Priority**: P1
**Files**: src/cli/commands/init.ts, tests/unit/cli/commands/init.test.ts (new)

---

### T-026: Fix or document skipped ADO tests
**User Story**: US-003 | **Satisfies ACs**: AC-US3-04 | **Status**: [ ] pending
**Test**: Given skipped ADO tests → When reviewed → Then either fixed or documented with reason
**Priority**: P2
**Files**: tests/integration/ado-sync.spec.ts

---

### T-027: Remove placeholder test
**User Story**: US-003 | **Satisfies ACs**: AC-US3-05 | **Status**: [ ] pending
**Test**: Given placeholder.test.ts → When removed → Then no empty test files exist
**Priority**: P2
**Files**: tests/unit/placeholder.test.ts

---

### T-028: Increase coverage threshold to 50%
**User Story**: US-003 | **Satisfies ACs**: AC-US3-06, AC-US3-07 | **Status**: [ ] pending
**Test**: Given vitest.config.ts → When threshold increased → Then coverage meets 50% minimum
**Priority**: P1
**Files**: vitest.config.ts

---

## Sprint 4: Architectural Improvements (Week 7-8)

### T-029: Extract StatusMapper service from SyncCoordinator
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-06 | **Status**: [ ] pending
**Test**: Given SyncCoordinator → When StatusMapper extracted → Then status mapping isolated and testable
**Priority**: P1
**Files**: src/sync/status-mapper.ts (new), src/sync/sync-coordinator.ts

---

### T-030: Implement auto mode session persistence
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [ ] pending
**Test**: Given auto mode session → When checkpointed → Then session recoverable from file
**Priority**: P1
**Files**: src/core/auto/session-persistence.ts (new)

---

### T-031: Test session recovery after simulated crash
**User Story**: US-004 | **Satisfies ACs**: AC-US4-07 | **Status**: [ ] pending
**Test**: Given persisted session → When crash simulated → Then session resumes from checkpoint
**Priority**: P1
**Files**: tests/unit/core/auto/session-persistence.test.ts (new)

---

### T-032: Create CredentialProvider abstraction
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03 | **Status**: [ ] pending
**Test**: Given credential needs → When CredentialProvider used → Then unified auth for GitHub/JIRA/ADO
**Priority**: P2
**Files**: src/core/credentials/credential-provider.ts (new)

---

### T-033: Add legacy sync config deprecation warning
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [ ] pending
**Test**: Given legacy config format → When detected → Then deprecation warning shown
**Priority**: P2
**Files**: src/core/config/config-loader.ts

---

### T-034: Create migrate-config script
**User Story**: US-004 | **Satisfies ACs**: AC-US4-05 | **Status**: [ ] pending
**Test**: Given legacy config → When script run → Then config migrated to profiles format
**Priority**: P2
**Files**: src/cli/commands/migrate-config.ts

---

## Sprint 5: Living Docs and Claude Code Alignment (Week 9-10)

### T-035: Update c4-context.md diagram
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [ ] pending
**Test**: Given c4-context.md → When updated → Then shows all current system components
**Priority**: P2
**Files**: .specweave/docs/internal/architecture/diagrams/c4-context.md

---

### T-036: Update c4-container.md with 24 plugins
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02 | **Status**: [ ] pending
**Test**: Given c4-container.md → When updated → Then shows all 24 plugins
**Priority**: P2
**Files**: .specweave/docs/internal/architecture/diagrams/c4-container.md

---

### T-037: Update data-flow.md with current sync flow
**User Story**: US-005 | **Satisfies ACs**: AC-US5-03 | **Status**: [ ] pending
**Test**: Given data-flow.md → When updated → Then shows accurate sync orchestration
**Priority**: P2
**Files**: .specweave/docs/internal/architecture/diagrams/data-flow.md

---

### T-038: Create plugin-system.md diagram
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04 | **Status**: [ ] pending
**Test**: Given new diagram → When created → Then visualizes 24 plugin architecture
**Priority**: P2
**Files**: .specweave/docs/internal/architecture/diagrams/plugin-system.md (new)

---

### T-039: Create hook-lifecycle.md diagram
**User Story**: US-005 | **Satisfies ACs**: AC-US5-05 | **Status**: [ ] pending
**Test**: Given new diagram → When created → Then shows hook execution lifecycle
**Priority**: P2
**Files**: .specweave/docs/internal/architecture/diagrams/hook-lifecycle.md (new)

---

### T-040: Create auto-mode-flow.md diagram
**User Story**: US-005 | **Satisfies ACs**: AC-US5-06 | **Status**: [ ] pending
**Test**: Given new diagram → When created → Then shows autonomous execution flow
**Priority**: P2
**Files**: .specweave/docs/internal/architecture/diagrams/auto-mode-flow.md (new)

---

### T-041: Write ADR-0211 through ADR-0215
**User Story**: US-005 | **Satisfies ACs**: AC-US5-07, AC-US5-08, AC-US5-09, AC-US5-10, AC-US5-11 | **Status**: [ ] pending
**Test**: Given architectural decisions → When ADRs written → Then 5 new ADRs documenting decisions
**Priority**: P2
**Files**: .specweave/docs/internal/architecture/adr/0211-*.md through 0215-*.md (new)

---

### T-042: Implement PostToolUseFailure hook handling
**User Story**: US-005 | **Satisfies ACs**: AC-US5-12 | **Status**: [ ] pending
**Test**: Given hook system → When tool fails → Then PostToolUseFailure hook fires
**Priority**: P2
**Files**: src/core/hooks/*.ts

---

### T-043: Implement Notification hook for status updates
**User Story**: US-005 | **Satisfies ACs**: AC-US5-13 | **Status**: [ ] pending
**Test**: Given hook system → When status changes → Then Notification hook fires
**Priority**: P2
**Files**: src/core/hooks/*.ts

---

### T-044: Add PermissionRequest hook support
**User Story**: US-005 | **Satisfies ACs**: AC-US5-14 | **Status**: [ ] pending
**Test**: Given hook system → When permission needed → Then PermissionRequest hook can handle
**Priority**: P2
**Files**: src/core/hooks/*.ts

---

## Sprint 6: Enterprise Core Features (Week 11-12)

### T-045: Create AuditEntry interface and types
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 | **Status**: [ ] pending
**Test**: Given audit requirements → When interface created → Then AuditEntry has all required fields
**Priority**: P2
**Files**: src/core/audit/types.ts (new)

---

### T-046: Implement AuditLogger service
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02 | **Status**: [ ] pending
**Test**: Given AuditLogger → When mutation logged → Then audit entry appended to log
**Priority**: P2
**Files**: src/core/audit/audit-logger.ts (new)

---

### T-047: Integrate audit logging for increment mutations
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03 | **Status**: [ ] pending
**Test**: Given increment operations → When performed → Then audit entries created
**Priority**: P2
**Files**: src/core/increment/*.ts, src/core/audit/audit-logger.ts

---

### T-048: Create MetricsExporter interface
**User Story**: US-006 | **Satisfies ACs**: AC-US6-04 | **Status**: [ ] pending
**Test**: Given metrics requirements → When interface created → Then MetricsExporter has export methods
**Priority**: P2
**Files**: src/core/metrics/types.ts (new)

---

### T-049: Implement exportToPrometheus method
**User Story**: US-006 | **Satisfies ACs**: AC-US6-05 | **Status**: [ ] pending
**Test**: Given DORA metrics → When exported → Then valid Prometheus format returned
**Priority**: P2
**Files**: src/core/metrics/prometheus-exporter.ts (new)

---

### T-050: Implement exportToDataDog method
**User Story**: US-006 | **Satisfies ACs**: AC-US6-06 | **Status**: [ ] pending
**Test**: Given DORA metrics → When exported → Then DataDog API called successfully
**Priority**: P2
**Files**: src/core/metrics/datadog-exporter.ts (new)

---

### T-051: Implement exportToJSON method
**User Story**: US-006 | **Satisfies ACs**: AC-US6-07 | **Status**: [ ] pending
**Test**: Given DORA metrics → When exported → Then valid JSON report generated
**Priority**: P2
**Files**: src/core/metrics/json-exporter.ts (new)

---

### T-052: Update PLUGINS-INDEX.md with accurate 24 plugins
**User Story**: US-006 | **Satisfies ACs**: AC-US6-08 | **Status**: [ ] pending
**Test**: Given PLUGINS-INDEX.md → When updated → Then all 24 plugins listed accurately
**Priority**: P2
**Files**: plugins/PLUGINS-INDEX.md

---

### T-053: Add metrics CLI command
**User Story**: US-006 | **Satisfies ACs**: AC-US6-09 | **Status**: [ ] pending
**Test**: Given CLI → When "specweave metrics export" run → Then metrics exported
**Priority**: P2
**Files**: src/cli/commands/metrics.ts (new)

---

### T-054: Document enterprise features in living docs
**User Story**: US-006 | **Satisfies ACs**: AC-US6-10 | **Status**: [ ] pending
**Test**: Given living docs → When updated → Then audit/metrics features documented
**Priority**: P2
**Files**: .specweave/docs/internal/features/enterprise.md (new)

---

### T-055: Final verification and release preparation
**User Story**: US-006 | **Satisfies ACs**: All | **Status**: [ ] pending
**Test**: Given all Sprint 1-6 work → When verified → Then all tests pass and docs complete
**Priority**: P1
**Files**: N/A (verification)

---

## Summary

| Sprint | Tasks | Priority | Focus |
|--------|-------|----------|-------|
| Sprint 1 | T-001 to T-012 | P1 | Type Safety, File Splitting |
| Sprint 2 | T-013 to T-019 | P1-P2 | Console.log Migration |
| Sprint 3 | T-020 to T-028 | P1-P2 | Test Coverage (50%) |
| Sprint 4 | T-029 to T-034 | P1-P2 | Architecture |
| Sprint 5 | T-035 to T-044 | P2 | Living Docs, Claude Code |
| Sprint 6 | T-045 to T-055 | P2 | Enterprise Features |

**Total Tasks**: 55
**Estimated Duration**: 10-12 weeks
