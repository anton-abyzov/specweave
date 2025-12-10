---
id: US-002
feature: FS-134
title: "ADR Discovery & Synthesis from Codebase"
status: not_started
priority: P1
created: 2025-12-09
project: specweave
related_projects: [MyApp (3 repos)]
---

# US-002: ADR Discovery & Synthesis from Codebase

**Feature**: [FS-134](./FEATURE.md)

**As a** technical lead
**I want** the system to discover implicit architecture decisions in the codebase
**So that** ADRs are automatically created without manual documentation

---

## Acceptance Criteria

- [ ] **AC-US2-01**: System scans for explicit ADR files: `docs/adr/*.md`, `docs/architecture/*.md`, `.specweave/docs/internal/architecture/adr/*.md`
- [ ] **AC-US2-02**: System detects implicit decisions from code patterns:
- [ ] **AC-US2-03**: System analyzes import patterns to detect framework choices
- [ ] **AC-US2-04**: LLM synthesizes ADR document for each discovered decision with:
- [ ] **AC-US2-05**: ADRs numbered automatically: `0001-use-redux-state-management.md`
- [ ] **AC-US2-06**: Existing ADRs preserved, new ADRs appended (incremental discovery)

---

## Implementation

**Increment**: [0134-intelligent-living-docs-deep-analysis](../../../../increments/0134-intelligent-living-docs-deep-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-005**: Create PatternAnalyzer - State Management Detection
- [ ] **T-006**: Implement ADR Discovery from Explicit Files
- [ ] **T-013**: Create ADRSynthesizer with LLM Integration
- [ ] **T-016**: Merge New ADRs with Existing ADRs
