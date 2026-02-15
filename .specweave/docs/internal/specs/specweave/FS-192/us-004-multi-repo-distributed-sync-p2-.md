---
id: US-004
feature: FS-192
title: "Multi-Repo Distributed Sync (P2)"
status: not_started
priority: P1
created: "2026-02-06T00:00:00.000Z"
tldr: "Multi-Repo Distributed Sync (P2)"
project: specweave
---

# US-004: Multi-Repo Distributed Sync (P2)

**Feature**: [FS-192](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US4-01**: With `githubStrategy: "distributed"`, each SpecWeave project syncs issues to its mapped GitHub repo via sync profiles
- [ ] **AC-US4-02**: Project detection from spec path works: `.specweave/docs/internal/specs/frontend/spec-001.md` resolves to profile `frontend` which targets repo `org/frontend-app`
- [ ] **AC-US4-03**: Cross-team User Stories (tagged with multiple projects in frontmatter) create issues in all relevant repos
- [ ] **AC-US4-04**: Cross-repo issues reference each other via body links: "Also tracked in: org/backend-api#45"
- [ ] **AC-US4-05**: All cross-repo issues can be aggregated into a single org-level GitHub Project V2 board (using US-003)
- [ ] **AC-US4-06**: Rate limiting coordinates across simultaneous multi-repo syncs using a shared token bucket to prevent 429 errors

---

## Implementation

**Increment**: [0192-github-sync-v2-multi-repo](../../../../increments/0192-github-sync-v2-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
