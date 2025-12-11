---
id: US-005
feature: FS-119
title: Living Docs Sync Path Validation (P1)
status: completed
priority: P1
created: 2025-12-07
project: specweave
external:
  github:
    issue: 851
    url: https://github.com/anton-abyzov/specweave/issues/851
---

# US-005: Living Docs Sync Path Validation (P1)

**Feature**: [FS-119](./FEATURE.md)

**As a** user with 2-level structure (ADO/JIRA boards)
**I want** living docs sync to validate the target path before creating files
**So that** specs land in the correct `{project}/{board}/FS-XXX/` folder

---

## Acceptance Criteria

- [x] **AC-US5-01**: Sync reads project/board from spec.md YAML frontmatter
- [x] **AC-US5-02**: For 2-level: validate `{project}/{board}` path exists or create it
- [x] **AC-US5-03**: FAIL if project doesn't exist in config (with helpful error)
- [x] **AC-US5-04**: FAIL if board doesn't exist under project (with helpful error)
- [x] **AC-US5-05**: Log expected vs actual path for debugging

---

## Implementation

**Increment**: [0119-project-board-context-enforcement](../../../../increments/0119-project-board-context-enforcement/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-008**: Add path validation to living-docs-sync 🧠
