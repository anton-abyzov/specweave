---
id: US-005
feature: FS-162
title: Update Explore Agent with LSP Navigation
status: not_started
priority: P1
created: 2026-01-07
project: specweave-dev
external:
  github:
    issue: 1000
    url: "https://github.com/anton-abyzov/specweave/issues/1000"
---

# US-005: Update Explore Agent with LSP Navigation

**Feature**: [FS-162](./FEATURE.md)

**As a** developer exploring a codebase
**I want** the Explore agent to prefer LSP navigation over grep
**So that** I get semantic navigation instead of text search

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Add instruction: "ALWAYS use goToDefinition instead of grep for symbol navigation"
- [ ] **AC-US5-02**: Add `documentSymbol` to understand file/module structure quickly
- [ ] **AC-US5-03**: Add `getDiagnostics` to assess code quality during exploration
- [ ] **AC-US5-04**: Add hybrid approach: "Use LSP for symbols, grep for text patterns"
- [ ] **AC-US5-05**: Update explore agent documentation with LSP examples

---

## Implementation

**Increment**: [0162-lsp-skill-integration](../../../../increments/0162-lsp-skill-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.
