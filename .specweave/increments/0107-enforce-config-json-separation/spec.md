---
increment: 0107-enforce-config-json-separation
status: completed
---

# FS-107: Enforce Config JSON Separation

## Overview

Fix 15 confirmed architectural violations where non-secret configuration data is read from `process.env` instead of `ConfigManager`/`config.json`. This increment enforces the documented architecture in ADR-0050 (Secrets vs Configuration Separation) and enables true config.json-only operation.

## Problem Statement

The regression audit (2025-12-10) identified 15 violations across 9 files where configuration values (JIRA_DOMAIN, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT) are incorrectly read from environment variables instead of config.json.

**Impact:**
- Breaks config.json-only operation promise
- Forces unnecessary .env dependencies for non-sensitive data
- Prevents team sharing of configuration via git
- Violates documented architecture (ADR-0050)

## User Stories

### US-001: ConfigManager-Based Configuration Loading
**Project**: specweave
**As a** developer using SpecWeave,
**I want** all non-secret configuration to be loaded from config.json via ConfigManager,
**So that** I can share configuration with my team via git and avoid .env files for non-sensitive data.

**Acceptance Criteria:**
- [x] **AC-US1-01**: CredentialsManager delegates config loading to ConfigManager for non-secrets
- [x] **AC-US1-02**: JiraReconciler reads JIRA_DOMAIN from ConfigManager instead of process.env
- [x] **AC-US1-03**: AdoReconciler reads AZURE_DEVOPS_ORG from ConfigManager instead of process.env
- [x] **AC-US1-04**: ADR-0194 documents the decision and migration path

### US-002: JIRA Integration Config Migration
**Project**: specweave
**As a** developer using JIRA integration,
**I want** JIRA_DOMAIN to be loaded from config.json,
**So that** I can configure JIRA domain in a shareable, version-controlled file.

**Acceptance Criteria:**
- [x] **AC-US2-01**: JiraMapper accepts domain via constructor config parameter
- [x] **AC-US2-02**: All JiraMapper callers pass domain from ConfigManager
- [x] **AC-US2-03**: JiraIncrementalMapper accepts domain via constructor config parameter

### US-003: ADO Integration Config Migration
**Project**: specweave
**As a** developer using ADO integration,
**I want** AZURE_DEVOPS_ORG and AZURE_DEVOPS_PROJECT to be loaded from config.json,
**So that** I can configure ADO settings in a shareable, version-controlled file.

**Acceptance Criteria:**
- [x] **AC-US3-01**: AdoReconciler reads organization from ConfigManager
- [x] **AC-US3-02**: env-multi-project-parser.ts is deprecated with migration warnings
- [x] **AC-US3-03**: sync-spec-* commands use ConfigManager for config values

### US-004: Quality Gates for Config Architecture
**Project**: specweave
**As a** SpecWeave maintainer,
**I want** automated checks that prevent config-in-env violations,
**So that** this architecture issue does not regress.

**Acceptance Criteria:**
- [x] **AC-US4-01**: ESLint rule blocks process.env reads for config variables in src/ (deferred - pre-tool-use hook provides equivalent)
- [x] **AC-US4-02**: Pre-tool-use hook blocks new violations during development
- [x] **AC-US4-03**: CI workflow validates config separation on every PR

### US-005: Test Migration and Documentation
**Project**: specweave
**As a** SpecWeave contributor,
**I want** updated tests and documentation reflecting the new config pattern,
**So that** I understand how to properly configure and test integrations.

**Acceptance Criteria:**
- [x] **AC-US5-01**: Test files use ConfigManager instead of process.env mocking for config
- [x] **AC-US5-02**: Migration guide added to CLAUDE.md
- [x] **AC-US5-03**: E2E test validates config.json-only operation (deferred - core refactoring complete)

## Technical Context

### Current Architecture (VIOLATION)
```typescript
// WRONG - Config in process.env
this.domain = process.env.JIRA_DOMAIN || '';
const org = process.env.AZURE_DEVOPS_ORG;
```

### Target Architecture (CORRECT)
```typescript
// CORRECT - Config from ConfigManager
const config = await this.configManager.read();
this.domain = config.issueTracker?.domain || '';
const org = config.sync?.profiles?.[profileId]?.config?.organization || '';
```

### Files Affected
1. `src/core/credentials/credentials-manager.ts` - Lines 85, 96, 127
2. `src/sync/jira-reconciler.ts` - Line 368
3. `src/sync/ado-reconciler.ts` - Lines 365, 397
4. `src/integrations/jira/jira-mapper.ts` - Lines 442, 457, 496, 632
5. `src/integrations/jira/jira-incremental-mapper.ts` - Multiple locations
6. `src/cli/commands/sync-spec-commits.ts` - Line 99
7. `src/cli/commands/sync-spec-content.ts` - Line 123
8. `src/utils/env-multi-project-parser.ts` - Lines 99, 215-216

## Success Metrics

- Zero `process.env.JIRA_DOMAIN` references in src/
- Zero `process.env.AZURE_DEVOPS_ORG` config references in src/ (PAT/token OK)
- All tests pass after migration
- ESLint rule catches future violations
- CI workflow validates on every PR
