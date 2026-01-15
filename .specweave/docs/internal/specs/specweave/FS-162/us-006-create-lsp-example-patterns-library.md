---
id: US-006
feature: FS-162
title: "Create LSP Example Patterns Library"
status: not_started
priority: P1
created: 2026-01-07
project: specweave-dev
---

# US-006: Create LSP Example Patterns Library

**Feature**: [FS-162](./FEATURE.md)

**As a** skill author
**I want** a reusable library of LSP usage patterns
**So that** I can copy-paste proven LSP integration examples

---

## Acceptance Criteria

- [ ] **AC-US6-01**: Create `plugins/specweave/lib/lsp-patterns.md` with common patterns
- [ ] **AC-US6-02**: Pattern: "Find all references to a function before refactoring"
- [ ] **AC-US6-03**: Pattern: "Extract API surface from a module"
- [ ] **AC-US6-04**: Pattern: "Detect dead code (0 references)"
- [ ] **AC-US6-05**: Pattern: "Navigate type hierarchies with goToDefinition"
- [ ] **AC-US6-06**: Pattern: "Get type info on hover for JSDoc extraction"
- [ ] **AC-US6-07**: Each pattern includes: Use case, LSP operation, Expected output

---

## Implementation

**Increment**: [0162-lsp-skill-integration](../../../../increments/0162-lsp-skill-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-009**: Create LSP Patterns Library
- [ ] **T-010**: Add Pre-Refactoring Pattern
- [ ] **T-011**: Add API Extraction Pattern
- [ ] **T-012**: Add Dead Code Detection, Type Navigation, and JSDoc Patterns
