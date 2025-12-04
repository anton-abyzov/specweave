---
id: US-005
feature: FS-077
title: "Move ADO Configuration to config.json"
status: completed
priority: P1
created: 2025-11-27
---

# US-005: Move ADO Configuration to config.json

**Feature**: [FS-077](./FEATURE.md)

**As a** developer
**I want** non-secret ADO configuration in config.json (not .env)
**So that** team members can share configuration

---

## Acceptance Criteria

- [x] **AC-US5-01**: `AZURE_DEVOPS_ORG` value stored in `config.json` (not .env)
- [x] **AC-US5-02**: `AZURE_DEVOPS_PROJECT` value stored in `config.json`
- [x] **AC-US5-03**: Selected area paths stored in `config.json`
- [x] **AC-US5-04**: Only `AZURE_DEVOPS_PAT` remains in `.env` (secret)
- [x] **AC-US5-05**: Detection reads from both config.json and .env

---

## Implementation

**Increment**: [0077-ado-init-flow-critical-fixes](../../../../../../increments/_archive/0077-ado-init-flow-critical-fixes/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-010**: Write ADO non-secrets to config.json
- [x] **T-011**: Update detection to read from both sources
