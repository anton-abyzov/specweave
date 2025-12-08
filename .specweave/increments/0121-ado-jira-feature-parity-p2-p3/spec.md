---
increment: 0121-ado-jira-feature-parity-p2-p3
project: specweave
title: ADO/JIRA Feature Parity P2/P3 Implementation
type: feature
priority: P2
status: completed
---

# ADO/JIRA Feature Parity P2/P3 Implementation

## Overview

This increment implements the remaining P2 and P3 gaps identified in increment 0120. Focus areas:
- Sync-judge agents for both ADO and JIRA
- Multi-project-mapper agent for JIRA
- Reconcile commands for ADO and JIRA
- Cleanup-duplicates commands for ADO and JIRA
- Parent item recovery in JIRA importer

## User Stories

### US-001: JIRA Sync Judge Agent
**As a** SpecWeave user
**I want** a JIRA sync-judge agent
**So that** sync conflicts are validated with external-always-wins rule

### US-002: JIRA Multi-Project Mapper Agent
**As a** SpecWeave user
**I want** a JIRA multi-project-mapper agent
**So that** specs can be intelligently routed to correct JIRA projects

### US-003: ADO/JIRA Reconcile Commands
**As a** SpecWeave user
**I want** reconcile commands for ADO and JIRA
**So that** I can detect and fix drift between local and external states

### US-004: ADO/JIRA Cleanup-Duplicates Commands
**As a** SpecWeave user
**I want** cleanup-duplicates commands for ADO and JIRA
**So that** I can remove duplicate work items created by race conditions

### US-005: Parent Item Recovery
**As a** SpecWeave user
**I want** JIRA importer to auto-fetch missing Epic parents
**So that** paginated imports don't lose hierarchy context

---

## Acceptance Criteria

### US-001: JIRA Sync Judge Agent
- [x] **AC-US1-01**: Agent validates external status always wins in conflicts
- [x] **AC-US1-02**: Agent distinguishes increment lifecycle vs spec lifecycle
- [x] **AC-US1-03**: Agent detects 4 violation types (local winning, incomplete closure, forced match, missing triggers)

### US-002: JIRA Multi-Project Mapper Agent
- [x] **AC-US2-01**: Agent detects correct project with confidence scoring
- [x] **AC-US2-02**: Agent supports 3 strategies: project-per-team, component-based, epic-based
- [x] **AC-US2-03**: Agent creates project-specific folder organization

### US-003: ADO/JIRA Reconcile Commands
- [x] **AC-US3-01**: `/specweave-ado:reconcile` detects status drift
- [x] **AC-US3-02**: `/specweave-jira:reconcile` detects status drift
- [x] **AC-US3-03**: Both support --dry-run flag
- [x] **AC-US3-04**: Both report mismatches found/fixed

### US-004: ADO/JIRA Cleanup-Duplicates Commands
- [x] **AC-US4-01**: `/specweave-ado:cleanup-duplicates` finds duplicate work items
- [x] **AC-US4-02**: `/specweave-jira:cleanup-duplicates` finds duplicate issues
- [x] **AC-US4-03**: Both keep oldest item, close rest
- [x] **AC-US4-04**: Both support --dry-run and confirmation prompt

### US-005: Parent Item Recovery
- [x] **AC-US5-01**: JIRA importer detects orphaned items (missing parent Epic)
- [x] **AC-US5-02**: Importer auto-fetches parent Epics by key
- [x] **AC-US5-03**: Importer creates hierarchy with recovered parents

---

## Implementation Plan

### Phase 1: Sync-Judge Agents
1. Create `plugins/specweave-jira/agents/jira-sync-judge/AGENT.md`

### Phase 2: Multi-Project Mapper Agent
2. Create `plugins/specweave-jira/agents/jira-multi-project-mapper/AGENT.md`

### Phase 3: Reconcile Commands
3. Create `plugins/specweave-ado/commands/reconcile.md`
4. Create `plugins/specweave-jira/commands/reconcile.md`
5. Create `src/sync/ado-reconciler.ts`
6. Create `src/sync/jira-reconciler.ts`

### Phase 4: Cleanup-Duplicates Commands
7. Create `plugins/specweave-ado/commands/cleanup-duplicates.md`
8. Create `plugins/specweave-jira/commands/cleanup-duplicates.md`
9. Create `plugins/specweave-ado/lib/ado-duplicate-detector.ts`
10. Create `plugins/specweave-jira/lib/jira-duplicate-detector.ts`

### Phase 5: Parent Item Recovery
11. Update `src/integrations/jira/jira-hierarchy-mapper.ts` with parent recovery

---

## References

- Increment 0120: Gap Analysis
- GitHub Reconciler: `src/sync/github-reconciler.ts`
- GitHub Duplicate Detector: `plugins/specweave-github/lib/duplicate-detector.ts`
- ADO Sync Judge: `plugins/specweave-ado/agents/ado-sync-judge/AGENT.md`
