---
id: US-011
feature: FS-047
title: "Multi-Repo Selection Strategy (GitHub Init)"
status: completed
priority: P0
created: 2025-11-19
---

# US-011: Multi-Repo Selection Strategy (GitHub Init)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/698

**Feature**: [FS-047](../../_features/FS-047/FEATURE.md)

**As a** team lead adopting SpecWeave in a multi-repo organization
**I want** intelligent repository selection during GitHub init (all org repos, personal repos, pattern matching, or explicit list)
**So that** I can connect the right set of repositories without manual configuration

---

## Acceptance Criteria

- [x] **AC-US11-01**: During `specweave init`, detect if user has access to multiple GitHub organizations
- [x] **AC-US11-02**: Prompt user with multi-repo selection strategy options (4 modes)
- [x] **AC-US11-03**: Option 1: Connect all repos from specific organization
- [x] **AC-US11-04**: Option 2: Connect all repos from user's personal account
- [x] **AC-US11-05**: Option 3: Pattern matching for repository names (glob or regex)
- [x] **AC-US11-06**: Option 4: Explicit comma-separated list of repository names
- [x] **AC-US11-07**: Show preview of matched repositories before confirmation
- [x] **AC-US11-08**: Handle pagination when listing organization/personal repos (100+ repos)
- [x] **AC-US11-09**: Save selected repos to `.specweave/config.json` under `github.repositories`
- [x] **AC-US11-10**: Validate repository access before adding to config (check permissions)
- [x] **AC-US11-11**: Support mixed public/private repos (authenticate with PAT if private repos detected)
- [x] **AC-US11-12**: Allow editing repository selection after initial setup

---

## Implementation

**Increment**: [0047-us-task-linkage](../../../../increments/0047-us-task-linkage/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-037**: Create GitHub repo selector with organization detection
- [x] **T-038**: Implement pattern matching and explicit list strategies
- [x] **T-039**: Add repo preview and confirmation flow
- [x] **T-040**: Integrate multi-repo selection into specweave init command
