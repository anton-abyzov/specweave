---
id: US-001
feature: FS-107
title: ConfigManager-Based Configuration Loading
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 833
    url: https://github.com/anton-abyzov/specweave/issues/833
---

# US-001: ConfigManager-Based Configuration Loading

**Feature**: [FS-107](./FEATURE.md)

**As a** developer using SpecWeave,
**I want** all non-secret configuration to be loaded from config.json via ConfigManager,
**So that** I can share configuration with my team via git and avoid .env files for non-sensitive data.

---

## Acceptance Criteria

- [x] **AC-US1-01**: CredentialsManager delegates config loading to ConfigManager for non-secrets
- [x] **AC-US1-02**: JiraReconciler reads JIRA_DOMAIN from ConfigManager instead of process.env
- [x] **AC-US1-03**: AdoReconciler reads AZURE_DEVOPS_ORG from ConfigManager instead of process.env
- [x] **AC-US1-04**: ADR-0194 documents the decision and migration path

---

## Implementation

**Increment**: [0107-enforce-config-json-separation](../../../../increments/0107-enforce-config-json-separation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Refactor CredentialsManager to use ConfigManager for config values
- [x] **T-002**: Update JiraReconciler to use ConfigManager
- [x] **T-003**: Update AdoReconciler to use ConfigManager
- [x] **T-004**: Create ADR-0194 documenting the decision
