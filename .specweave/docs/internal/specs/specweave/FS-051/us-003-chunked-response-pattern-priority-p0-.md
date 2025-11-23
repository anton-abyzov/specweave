---
id: US-003
feature: FS-051
title: "Idempotency via Caching"
status: planned
priority: P0
created: 2025-11-22
---

# US-003: Idempotency via Caching

**Feature**: [FS-051](../../_features/FS-051/FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Before creating issue, check User Story frontmatter for existing `github.number`
- [ ] **AC-US3-02**: If frontmatter missing, query GitHub API to detect duplicates
- [ ] **AC-US3-03**: Use `DuplicateDetector.createWithProtection()` for GitHub queries
- [ ] **AC-US3-04**: After issue created, update User Story frontmatter with issue number
- [ ] **AC-US3-05**: After all issues created, update increment `metadata.json` with issue list
- [ ] **AC-US3-06**: Re-running sync skips existing issues and reports: "Skipped 2 existing, created 2 new"

---

## Implementation

**Increment**: [0051-automatic-github-sync](../../../../increments/0051-automatic-github-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.
