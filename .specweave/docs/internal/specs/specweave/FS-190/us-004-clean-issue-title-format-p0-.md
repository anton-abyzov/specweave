---
id: US-004
feature: FS-190
title: "Clean Issue Title Format (P0)"
status: completed
priority: P0
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** developer viewing GitHub/JIRA/ADO issues
**I want** clean issue titles without redundant prefixes
**So that** I can read what the issue is about at a glance."
project: specweave
---

# US-004: Clean Issue Title Format (P0)

**Feature**: [FS-190](./FEATURE.md)

**As a** developer viewing GitHub/JIRA/ADO issues
**I want** clean issue titles without redundant prefixes
**So that** I can read what the issue is about at a glance

---

## Acceptance Criteria

- [x] **AC-US4-01**: Given a synced GitHub issue for a user story, when created, then the title format is `US-010: Documentation Update` (no FS prefix)
- [x] **AC-US4-02**: Given a feature milestone in GitHub, when created, then it carries the full FS-ID and title: `FS-172: True Autonomous Mode`
- [x] **AC-US4-03**: Given a synced JIRA story, when created, then the summary follows the same `US-XXX: Title` format
- [x] **AC-US4-04**: Given reverse lookup from an issue, when parsing, then `US-XXX` is extracted from title AND a structured metadata block in the issue body serves as authoritative fallback
- [x] **AC-US4-05**: Given existing issues with `[FS-XXX][US-YYY]` format, when the reconciler runs, then it recognizes both old and new title formats

---

## Implementation

**Increment**: [0190-sync-architecture-redesign](../../../../increments/0190-sync-architecture-redesign/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
