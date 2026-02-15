---
id: US-001
feature: FS-192
title: "Spec-to-GitHub Issue Sync (Push Direction) (P1)"
status: not_started
priority: P1
created: "2026-02-06T00:00:00.000Z"
tldr: "**As a** developer using SpecWeave with GitHub,
**I want** my User Stories from spec."
project: specweave
---

# US-001: Spec-to-GitHub Issue Sync (Push Direction) (P1)

**Feature**: [FS-192](./FEATURE.md)

**As a** developer using SpecWeave with GitHub,
**I want** my User Stories from spec.md to automatically create and update GitHub Issues in the target repository,
**So that** my team can track work on GitHub boards without manual issue creation.

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Running `/sw-github:sync-spec <spec-id>` creates one GitHub Issue per User Story in the target repository
- [ ] **AC-US1-02**: Issue title follows format `[US-XXX] <User Story Title>` for deduplication and searchability
- [ ] **AC-US1-03**: Issue body contains User Story description, Acceptance Criteria as checkboxes, priority label, and link back to local spec
- [ ] **AC-US1-04**: Labels are applied automatically: `user-story`, `spec:<spec-id>`, `priority:<P1|P2|P3>`
- [ ] **AC-US1-05**: Idempotent sync: if issue already exists (matched by `[US-XXX]` title prefix), it updates the existing issue rather than creating a duplicate
- [ ] **AC-US1-06**: After sync, spec frontmatter is updated with `externalLinks.github.userStories[US-XXX].issueNumber` and `issueUrl`
- [ ] **AC-US1-07**: `/sw-github:sync-spec --all` syncs all specs in the workspace in a single batch

---

## Implementation

**Increment**: [0192-github-sync-v2-multi-repo](../../../../increments/0192-github-sync-v2-multi-repo/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
