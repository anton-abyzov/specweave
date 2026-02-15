---
id: US-004
feature: FS-162
title: Update Living Docs Command with LSP Instructions
status: not_started
priority: P1
created: 2026-01-07
project: specweave-dev
external:
  github:
    issue: 999
    url: "https://github.com/anton-abyzov/specweave/issues/999"
---

# US-004: Update Living Docs Command with LSP Instructions

**Feature**: [FS-162](./FEATURE.md)

**As a** SpecWeave user
**I want** `/sw:living-docs` to actively use LSP for API extraction
**So that** documentation generation is accurate and semantic

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Add LSP usage instructions to living-docs.md command documentation
- [ ] **AC-US4-02**: Document `documentSymbol` usage for API surface extraction
- [ ] **AC-US4-03**: Document `findReferences` for dead code detection (0 refs = unused)
- [ ] **AC-US4-04**: Add example: "Use documentSymbol to extract all exported functions"
- [ ] **AC-US4-05**: Clarify LSP is default, `--no-lsp` is fallback

---

## Implementation

**Increment**: [0162-lsp-skill-integration](../../../../increments/0162-lsp-skill-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.
