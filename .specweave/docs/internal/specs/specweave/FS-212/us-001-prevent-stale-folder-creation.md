---
id: US-001
title: Prevent stale .specweave/ folder creation
status: completed
priority: P1
---

# US-001: Prevent stale .specweave/ folder creation

**As a** developer using SpecWeave across multiple projects
**I want** `.specweave/` folders to only exist where `specweave init` was run
**So that** my filesystem isn't polluted with orphan folders

## Acceptance Criteria

- [x] **AC-US1-01**: Hook project root detection runs BEFORE any code that creates directories
- [x] **AC-US1-02**: Project root detection checks for `config.json` (not just `.specweave/` dir)
- [x] **AC-US1-03**: All `mkdir` calls in hooks are guarded by valid `SW_PROJECT_ROOT`
- [x] **AC-US1-04**: No `${SW_PROJECT_ROOT:-.}` fallbacks remain
- [x] **AC-US1-05**: `$HOME/.specweave/` paths replaced with project-root-relative paths
