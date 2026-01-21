---
id: US-010
feature: FS-145
title: Project Discovery from External Tools (P2)
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 939
    url: https://github.com/anton-abyzov/specweave/issues/939
---

# US-010: Project Discovery from External Tools (P2)

**Feature**: [FS-145](./FEATURE.md)

**As a** SpecWeave user
**I want** to discover and import projects from external tools
**So that** I can quickly onboard existing projects

---

## Acceptance Criteria

- [x] **AC-US10-01**: `specweave project discover --github` - List GitHub labels matching `project:*`
- [x] **AC-US10-02**: `specweave project discover --ado` - List ADO area paths
- [x] **AC-US10-03**: `specweave project discover --jira` - List JIRA projects
- [x] **AC-US10-04**: `specweave project import <id>` - Add discovered project to registry

---

## Implementation

**Increment**: [0145-project-registry-eda-sync](../../../../increments/0145-project-registry-eda-sync/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-018**: Implement Project Discovery
