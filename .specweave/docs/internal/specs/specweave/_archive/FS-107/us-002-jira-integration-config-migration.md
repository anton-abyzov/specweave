---
id: US-002
feature: FS-107
title: JIRA Integration Config Migration
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 834
    url: https://github.com/anton-abyzov/specweave/issues/834
---

# US-002: JIRA Integration Config Migration

**Feature**: [FS-107](./FEATURE.md)

**As a** developer using JIRA integration,
**I want** JIRA_DOMAIN to be loaded from config.json,
**So that** I can configure JIRA domain in a shareable, version-controlled file.

---

## Acceptance Criteria

- [x] **AC-US2-01**: JiraMapper accepts domain via constructor config parameter
- [x] **AC-US2-02**: All JiraMapper callers pass domain from ConfigManager
- [x] **AC-US2-03**: JiraIncrementalMapper accepts domain via constructor config parameter

---

## Implementation

**Increment**: [0107-enforce-config-json-separation](../../../../increments/0107-enforce-config-json-separation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Refactor JiraMapper to accept domain via config
- [x] **T-006**: Update all JiraMapper callers
- [x] **T-007**: Refactor JiraIncrementalMapper
