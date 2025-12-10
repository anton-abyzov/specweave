---
id: US-007
feature: FS-134
title: "Generic Algorithm for Any SpecWeave Project"
status: not_started
priority: P1
created: 2025-12-09
project: specweave
related_projects: [MyApp (3 repos)]
---

# US-007: Generic Algorithm for Any SpecWeave Project

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave framework developer
**I want** the living docs engine to work on any user project
**So that** users get intelligent docs without custom configuration

---

## Acceptance Criteria

- [ ] **AC-US7-01**: System works with single-repo projects (no umbrella)
- [ ] **AC-US7-02**: System works with multi-repo umbrella projects
- [ ] **AC-US7-03**: System auto-detects tech stack (Node.js, Go, Python, Java, Rust, etc.)
- [ ] **AC-US7-04**: System handles projects without existing ADRs (synthesizes from code)
- [ ] **AC-US7-05**: System handles projects with existing ADRs (merges discoveries)
- [ ] **AC-US7-06**: System works in CI/CD environments (non-interactive mode)

---

## Implementation

**Increment**: [0134-intelligent-living-docs-deep-analysis](../../../../increments/0134-intelligent-living-docs-deep-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-002**: Implement RepoScanner with Multi-Repo Support
- [ ] **T-022**: Create CLI Command `/specweave:living-docs update`
- [ ] **T-025**: Implement Error Handling & Graceful Degradation
