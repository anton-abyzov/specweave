# Tasks - 0120: ADO vs JIRA Feature Parity Analysis

## User Stories

### US-001: Command Parity Analysis
**As a** SpecWeave user
**I want** JIRA to have the same commands as ADO
**So that** I can use SpecWeave consistently regardless of issue tracker

### US-002: Import & Sync Parity
**As a** SpecWeave user
**I want** JIRA external item import to match ADO capabilities
**So that** large-scale imports work reliably

### US-003: Permission & Profile Parity
**As a** SpecWeave admin
**I want** JIRA permission handling to match ADO's robustness
**So that** access control is consistent

### US-004: Implementation of Missing Features
**As a** SpecWeave developer
**I want** to implement the identified gaps
**So that** JIRA has feature parity with ADO

---

## Analysis Tasks (Phase 1)

### T-001: Document Command Gaps
**User Story**: US-001
**Satisfies ACs**: AC-0120-01, AC-0120-02
**Status**: [x] completed

### T-002: Analyze External Item Import
**User Story**: US-002
**Satisfies ACs**: AC-0120-03, AC-0120-05
**Status**: [x] completed

### T-003: Compare Permission Handling
**User Story**: US-003
**Satisfies ACs**: AC-0120-04
**Status**: [x] completed

### T-004: Verify 2-Level Structure Support
**User Story**: US-002
**Satisfies ACs**: AC-0120-06
**Status**: [x] completed

### T-005: Identify Missing Agents
**User Story**: US-003
**Satisfies ACs**: AC-0120-07
**Status**: [x] completed

### T-006: Create Remediation Backlog
**User Story**: US-001, US-002, US-003
**Satisfies ACs**: AC-0120-08
**Status**: [x] completed

---

## Implementation Tasks (Phase 2)

### T-007: Implement JIRA Permission Gate
**User Story**: US-004
**Status**: [x] completed

**Deliverable**: `plugins/specweave-jira/lib/jira-permission-gate.ts`
- JiraPermissionGate class with checkWritePermission(), checkStatusPermission()
- checkClosePermission() for combined permission check
- Matches ADO permission gate structure exactly

### T-008: Implement JIRA Profile Resolver
**User Story**: US-004
**Status**: [x] completed

**Deliverable**: `plugins/specweave-jira/lib/jira-profile-resolver.ts`
- JiraProfileResolver class with resolveProfile(), getIncrementProfile()
- Supports increment-specific and global profile resolution
- Backwards compatible with legacy `external_ids.jira.*` naming

### T-009: Implement /specweave-jira:create Command
**User Story**: US-004
**Status**: [x] completed

**Deliverable**: `plugins/specweave-jira/commands/create.md`
- Permission gate check before API calls
- Profile resolution with increment-specific fallback
- Metadata update with `external_sync.jira.*` format

### T-010: Implement /specweave-jira:close Command
**User Story**: US-004
**Status**: [x] completed

**Deliverable**: `plugins/specweave-jira/commands/close.md`
- Requires both canUpdateExternalItems AND canUpdateStatus
- Completion validation before closing
- Posts completion summary to JIRA

### T-011: Implement /specweave-jira:status Command
**User Story**: US-004
**Status**: [x] completed

**Deliverable**: `plugins/specweave-jira/commands/status.md`
- Shows sync status, issue key, URL, last synced
- Drift detection between local and JIRA status
- Profile information display

### T-012: Implement Multi-Org Token Support
**User Story**: US-004
**Status**: [x] completed

**Deliverable**: `src/integrations/jira/jira-token-provider.ts`
- Domain-specific tokens: JIRA_API_TOKEN_{DOMAIN}
- Domain-specific emails: JIRA_EMAIL_{DOMAIN}
- Mirrors ADO PAT provider pattern exactly

### T-013: Standardize Metadata Naming
**User Story**: US-004
**Status**: [x] completed

**Updates**:
- Standardized to `external_sync.jira.*` (matching ADO)
- Updated `plugins/specweave-jira/reference/jira-specweave-mapping.md`
- Updated `plugins/specweave-jira/agents/jira-manager/AGENT.md`
- Profile resolver supports legacy `external_ids` for backwards compatibility

---

## Summary

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| Analysis | T-001 to T-006 | 6/6 | ✅ |
| Implementation | T-007 to T-013 | 7/7 | ✅ |
| **Total** | **13 tasks** | **13/13** | **100%** |

## Files Created

1. `plugins/specweave-jira/lib/jira-permission-gate.ts` (250 lines)
2. `plugins/specweave-jira/lib/jira-profile-resolver.ts` (350 lines)
3. `plugins/specweave-jira/commands/create.md` (120 lines)
4. `plugins/specweave-jira/commands/close.md` (180 lines)
5. `plugins/specweave-jira/commands/status.md` (150 lines)
6. `src/integrations/jira/jira-token-provider.ts` (140 lines)

## Files Updated

1. `plugins/specweave-jira/reference/jira-specweave-mapping.md`
2. `plugins/specweave-jira/agents/jira-manager/AGENT.md`
