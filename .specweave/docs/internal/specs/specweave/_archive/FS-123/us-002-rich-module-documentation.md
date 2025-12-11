---
id: US-002
feature: FS-123
title: Rich Module Documentation
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 863
    url: https://github.com/anton-abyzov/specweave/issues/863
---

# US-002: Rich Module Documentation

**Feature**: [FS-123](./FEATURE.md)

**As a** technical lead
**I want** module docs to explain architectural purpose and integration points
**So that** I understand how modules fit together without reading source code

---

## Acceptance Criteria

- [x] **AC-US2-01**: Each module doc has "Purpose" section explaining responsibility
- [x] **AC-US2-02**: Each module doc has "Dependencies" section listing what it imports from
- [x] **AC-US2-03**: Each module doc has "Dependents" section listing what depends on it
- [x] **AC-US2-04**: Each module doc has "Integration Points" section (APIs, events, shared state)
- [x] **AC-US2-05**: Each module doc has "Patterns Used" section with evidence
- [x] **AC-US2-06**: AI insights already collected in `analysis.aiInsights` are written to markdown

---

## Implementation

**Increment**: [0123-intelligent-living-docs-content](../../../../increments/0123-intelligent-living-docs-content/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Create generateRichModuleSummary Function
- [x] **T-004**: Wire AI Insights to Module Output
