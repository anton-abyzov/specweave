---
id: US-001
feature: FS-081
title: "List ADO Repositories"
status: completed
priority: P1
created: 2025-12-02
---

# US-001: List ADO Repositories

**Feature**: [FS-081](./FEATURE.md)

**As a** user running specweave init with ADO multi-repo
**I want** the system to fetch repository list from my selected ADO projects
**So that** I can clone them to my local workspace

---

## Acceptance Criteria

- [x] **AC-US1-01**: System calls ADO REST API to list repositories
- [x] **AC-US1-02**: Repositories from all selected projects are fetched
- [x] **AC-US1-03**: API errors are handled gracefully with retry guidance

---

## Implementation

**Increment**: [0081-ado-repo-cloning](../../../../../../increments/_archive/0081-ado-repo-cloning/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Add listRepositories to AzureDevOpsProvider
