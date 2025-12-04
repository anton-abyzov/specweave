---
id: US-002
feature: FS-081
title: "Filter Repositories by Pattern"
status: completed
priority: P1
created: 2025-12-02
---

# US-002: Filter Repositories by Pattern

**Feature**: [FS-081](./FEATURE.md)

**As a** user who selected a clone pattern
**I want** repositories filtered by my glob/regex pattern
**So that** I only clone relevant repos

---

## Acceptance Criteria

- [x] **AC-US2-01**: Pattern `*` clones all repos
- [x] **AC-US2-02**: Glob patterns like `sw-*` filter correctly
- [x] **AC-US2-03**: Regex patterns with `regex:` prefix work
- [x] **AC-US2-04**: Skip pattern skips cloning entirely

---

## Implementation

**Increment**: [0081-ado-repo-cloning](../../../../../../increments/_archive/0081-ado-repo-cloning/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Add pattern matching filter utility
