---
id: US-008
feature: FS-162
title: "Integration Tests for LSP Usage"
status: not_started
priority: P1
created: 2026-01-07
project: specweave-dev
---

# US-008: Integration Tests for LSP Usage

**Feature**: [FS-162](./FEATURE.md)

**As a** SpecWeave maintainer
**I want** integration tests that verify LSP operations work
**So that** we catch LSP regressions early

---

## Acceptance Criteria

- [ ] **AC-US8-01**: Create `tests/integration/lsp/lsp-operations.test.ts`
- [ ] **AC-US8-02**: Test `documentSymbol` on sample TypeScript file
- [ ] **AC-US8-03**: Test `findReferences` on sample function
- [ ] **AC-US8-04**: Test `goToDefinition` navigation
- [ ] **AC-US8-05**: Test `hover` type information extraction
- [ ] **AC-US8-06**: Test `getDiagnostics` on file with errors
- [ ] **AC-US8-07**: All tests use real typescript-language-server

---

## Implementation

**Increment**: [0162-lsp-skill-integration](../../../../increments/0162-lsp-skill-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-023**: Create LSP Integration Test Suite
- [ ] **T-024**: Test documentSymbol Operation
- [ ] **T-025**: Test findReferences, goToDefinition, hover
- [ ] **T-026**: Test getDiagnostics and Error Cases
