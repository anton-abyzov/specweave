---
id: US-002
feature: FS-056
title: "Automatic GitHub Issue Creation on Increment Creation (P0)"
status: not_started
priority: P0
created: 2025-11-24T00:00:00.000Z
---

# US-002: Automatic GitHub Issue Creation on Increment Creation (P0)

**Feature**: [FS-056](./FEATURE.md)

**As a** developer
**I want** GitHub issues to be automatically created when increment is created
**So that** stakeholders can track progress immediately without manual sync

---

## Acceptance Criteria

- [ ] **AC-US2-01**: After living docs sync, GitHub milestone is automatically created if configured
- [ ] **AC-US2-02**: GitHub issues created for each user story in format `[FS-XXX][US-YYY] Title`
- [ ] **AC-US2-03**: Issues have proper formatting with checkable acceptance criteria as checkboxes
- [ ] **AC-US2-04**: `metadata.json` updated with GitHub issue IDs and milestone ID
- [ ] **AC-US2-05**: No manual `/specweave-github:sync` command required

---

## Implementation

**Increment**: [0056-auto-github-sync-on-increment-creation](../../../../../../increments/_archive/0056-auto-github-sync-on-increment-creation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
