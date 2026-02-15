---
id: US-006
feature: FS-192
title: "Deprecated Code Cleanup (P3)"
status: not_started
priority: P1
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** SpecWeave contributor,
**I want** deprecated GitHub sync code removed and replaced with clear migration paths,
**So that** the codebase has a single canonical sync path and no confusion between old and new systems."
project: specweave
---

# US-006: Deprecated Code Cleanup (P3)

**Feature**: [FS-192](./FEATURE.md)

**As a** SpecWeave contributor,
**I want** deprecated GitHub sync code removed and replaced with clear migration paths,
**So that** the codebase has a single canonical sync path and no confusion between old and new systems.

---

## Acceptance Criteria

- [ ] **AC-US6-01**: `github-board-resolver.ts` Classic Projects V1 code is replaced with Projects V2 resolver (from US-003)
- [ ] **AC-US6-02**: `task-sync.ts` and `task-parser.ts` (deprecated increment-based sync) are deleted with git history preserved
- [ ] **AC-US6-03**: `github-issue-tracker` skill (deprecated) is removed from the plugin
- [ ] **AC-US6-04**: `/sw-github:sync` command (old increment-based) redirects to `/sw-github:sync-spec` with a deprecation notice
- [ ] **AC-US6-05**: Feature sync vs spec sync ambiguity resolved: single canonical sync path documented in MULTI-PROJECT-SYNC-ARCHITECTURE.md

---

## Implementation

**Increment**: [0192-github-sync-v2-multi-repo](../../../../increments/0192-github-sync-v2-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
