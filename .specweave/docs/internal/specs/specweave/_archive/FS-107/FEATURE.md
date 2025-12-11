---
id: FS-107
title: "FS-107: Enforce Config JSON Separation"
type: feature
status: completed
priority: P1
created: 2025-12-11
lastUpdated: 2025-12-11
external_tools:
  github:
    type: milestone
    id: 38
    url: https://github.com/anton-abyzov/specweave/milestone/38
---

# FS-107: Enforce Config JSON Separation

## Overview

Fix 15 confirmed architectural violations where non-secret configuration data is read from `process.env` instead of `ConfigManager`/`config.json`. This increment enforces the documented architecture in ADR-0050 (Secrets vs Configuration Separation) and enables true config.json-only operation.

## Implementation History

| Increment | Status | Completion Date |
|-----------|--------|----------------|
| [0107-enforce-config-json-separation](../../../../increments/0107-enforce-config-json-separation/spec.md) | ✅ completed | 2025-12-11 |

## User Stories

- [US-001: ConfigManager-Based Configuration Loading](../../specweave/FS-107/us-001-configmanager-based-configuration-loading.md)
- [US-002: JIRA Integration Config Migration](../../specweave/FS-107/us-002-jira-integration-config-migration.md)
- [US-003: ADO Integration Config Migration](../../specweave/FS-107/us-003-ado-integration-config-migration.md)
- [US-004: Quality Gates for Config Architecture](../../specweave/FS-107/us-004-quality-gates-for-config-architecture.md)
- [US-005: Test Migration and Documentation](../../specweave/FS-107/us-005-test-migration-and-documentation.md)
