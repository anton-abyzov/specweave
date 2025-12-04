---
id: US-003
feature: FS-079
title: "Remove Team Selection from Init"
status: completed
priority: P0
created: 2025-11-29
---

# US-003: Remove Team Selection from Init

**Feature**: [FS-079](./FEATURE.md)

**As a** developer
**I want** init to focus on Project + Area Path only
**So that** setup is simpler and faster

---

## Acceptance Criteria

- [x] **AC-US3-01**: Remove team selection checkbox from `promptAzureDevOpsCredentials()`
- [x] **AC-US3-02**: Remove `teams` from returned credentials
- [x] **AC-US3-03**: Remove team-related prompts and caching
- [x] **AC-US3-04**: Keep team fetching ONLY if needed for future features (disabled by default)

---

## Implementation

**Increment**: [0079-ado-init-flow-v2](../../../../../../increments/_archive/0079-ado-init-flow-v2/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Remove Team Selection from Init
