---
id: US-001
feature: FS-220
title: "Remove docs scripts from root package.json (P0)"
status: completed
priority: P1
created: 2026-02-15T00:00:00.000Z
tldr: "**As a** SpecWeave developer
**I want** the root package."
project: specweave
board: modules
---

# US-001: Remove docs scripts from root package.json (P0)

**Feature**: [FS-220](./FEATURE.md)

**As a** SpecWeave developer
**I want** the root package.json to not contain docs-site proxy scripts
**So that** docs-site is decoupled and can later be moved to an umbrella workspace

---

## Acceptance Criteria

- [x] **AC-US1-01**: The 5 `docs:*` scripts are removed from root `package.json`
- [x] **AC-US1-02**: `npm run rebuild` passes without errors
- [x] **AC-US1-03**: `npm test` passes without errors
- [x] **AC-US1-04**: GitHub Actions workflows (`deploy-docs.yml`, `docs-build.yml`) are unaffected (they use `cd docs-site` directly)

---

## Implementation

**Increment**: [0220-docs-site-cleanup](../../../../../increments/0220-docs-site-cleanup/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
