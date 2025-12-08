# Tasks - 0121: ADO/JIRA Feature Parity P2/P3 Implementation

## User Stories

### US-001: JIRA Sync Judge Agent
### US-002: JIRA Multi-Project Mapper Agent
### US-003: ADO/JIRA Reconcile Commands
### US-004: ADO/JIRA Cleanup-Duplicates Commands
### US-005: Parent Item Recovery

---

## Tasks

### T-001: Create JIRA Sync Judge Agent
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

**Deliverable**: `plugins/specweave-jira/agents/jira-sync-judge/AGENT.md`

### T-002: Create JIRA Multi-Project Mapper Agent
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed

**Deliverable**: `plugins/specweave-jira/agents/jira-multi-project-mapper/AGENT.md`

### T-003: Create ADO Reconcile Command
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-03, AC-US3-04
**Status**: [x] completed

**Deliverables**:
- `plugins/specweave-ado/commands/reconcile.md`
- `src/sync/ado-reconciler.ts`

### T-004: Create JIRA Reconcile Command
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

**Deliverables**:
- `plugins/specweave-jira/commands/reconcile.md`
- `src/sync/jira-reconciler.ts`

### T-005: Create ADO Cleanup-Duplicates Command
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-03, AC-US4-04
**Status**: [x] completed

**Deliverables**:
- `plugins/specweave-ado/commands/cleanup-duplicates.md`
- `plugins/specweave-ado/lib/ado-duplicate-detector.ts`

### T-006: Create JIRA Cleanup-Duplicates Command
**User Story**: US-004
**Satisfies ACs**: AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed

**Deliverables**:
- `plugins/specweave-jira/commands/cleanup-duplicates.md`
- `plugins/specweave-jira/lib/jira-duplicate-detector.ts`

### T-007: Implement Parent Item Recovery in JIRA Importer
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed

**Updates**: `src/importers/jira-importer.ts`

---

## Summary

| Task | Description | Status |
|------|-------------|--------|
| T-001 | JIRA sync-judge agent | Completed |
| T-002 | JIRA multi-project-mapper agent | Completed |
| T-003 | ADO reconcile command | Completed |
| T-004 | JIRA reconcile command | Completed |
| T-005 | ADO cleanup-duplicates command | Completed |
| T-006 | JIRA cleanup-duplicates command | Completed |
| T-007 | Parent item recovery | Completed |
