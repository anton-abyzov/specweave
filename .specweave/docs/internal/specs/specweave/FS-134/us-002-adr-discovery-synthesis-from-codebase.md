---
id: US-002
feature: FS-134
title: "ADR Discovery & Synthesis from Codebase"
status: in_progress
priority: P1
created: 2025-12-09
project: specweave
---

# US-002: ADR Discovery & Synthesis from Codebase

**Feature**: [FS-134](./FEATURE.md)

**As a** technical lead
**I want** the system to discover implicit architecture decisions in the codebase
**So that** ADRs are automatically created without manual documentation

---

## Acceptance Criteria

- [x] **AC-US2-01**: System scans for explicit ADR files: `docs/adr/*.md`, `docs/architecture/*.md`, `.specweave/docs/internal/architecture/adr/*.md`
- [x] **AC-US2-02**: System detects implicit decisions from code patterns:
- [ ] **AC-US2-03**: System analyzes import patterns to detect framework choices
- [x] **AC-US2-04**: LLM synthesizes ADR document for each discovered decision with:
- [x] **AC-US2-05**: ADRs numbered automatically: `0001-use-redux-state-management.md`
- [x] **AC-US2-06**: Existing ADRs preserved, new ADRs appended (incremental discovery)
- [x] **AC-US2-01**: System scans for explicit ADR files
- [x] **AC-US2-02**: System detects implicit decisions from code patterns
- [ ] **AC-US2-03**: System analyzes import patterns to detect framework choices
- [x] **AC-US2-04**: LLM synthesizes ADR document for each discovered decision
- [x] **AC-US2-05**: ADRs numbered automatically
- [x] **AC-US2-06**: Existing ADRs preserved, new ADRs appended

---

## Implementation

**Increment**: [0134-living-docs-core-engine](../../../../increments/0134-living-docs-core-engine/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create PatternAnalyzer - State Management Detection
- [x] **T-006**: Implement ADR Discovery from Explicit Files
- [x] **T-013**: Create ADRSynthesizer with LLM Integration
- [x] **T-016**: Merge New ADRs with Existing ADRs
