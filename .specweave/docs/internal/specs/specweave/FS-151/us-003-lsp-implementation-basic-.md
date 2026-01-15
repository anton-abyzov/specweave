---
id: US-003
feature: FS-151
title: LSP Implementation (Basic)
status: completed
priority: P0
created: 2025-12-31
project: specweave
external:
  github:
    issue: 988
    url: https://github.com/anton-abyzov/specweave/issues/988
---

# US-003: LSP Implementation (Basic)

**Feature**: [FS-151](./FEATURE.md)

**As a** developer working with Python/C#/Go projects
**I want** LSP to actually provide semantic code analysis
**So that** living docs and code understanding are accurate

---

## Acceptance Criteria

- [x] **AC-US3-01**: TypeScript/JavaScript LSP integration works (goToDefinition, findReferences)
- [x] **AC-US3-02**: Python LSP integration works (pylsp or pyright)
- [x] **AC-US3-03**: LSP initialization occurs on living-docs commands
- [x] **AC-US3-04**: Fallback to grep when LSP unavailable
- [x] **AC-US3-05**: E2E test proves LSP finds symbols faster than grep

---

## Implementation

**Increment**: [0151-plugin-lsp-activation-e2e-tests](../../../../increments/0151-plugin-lsp-activation-e2e-tests/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-011**: Create LSP client wrapper
- [x] **T-012**: TypeScript/JavaScript LSP integration
- [x] **T-013**: Python LSP integration
- [x] **T-014**: Integrate LSP into living-docs
- [x] **T-015**: Grep fallback when LSP unavailable
- [x] **T-016**: E2E test for LSP vs grep performance
