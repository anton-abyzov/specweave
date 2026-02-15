---
id: US-007
feature: FS-183
title: "Error Handling & Fallback (P1)"
status: not_started
priority: P1
created: "2026-02-04T00:00:00.000Z"
tldr: "**As a** developer when LSP fails
**I want** graceful fallback and clear error messages
**So that** I can still get results and troubleshoot."
project: specweave
---

# US-007: Error Handling & Fallback (P1)

**Feature**: [FS-183](./FEATURE.md)

**As a** developer when LSP fails
**I want** graceful fallback and clear error messages
**So that** I can still get results and troubleshoot

---

## Acceptance Criteria

- [ ] **AC-US7-01**: Given LSP error, when handling, then fail fast with clear error message (no silent retry)
- [ ] **AC-US7-02**: Given LSP crash mid-operation, when detected, then fallback to grep-based search with warning
- [ ] **AC-US7-03**: Given unknown project (no .sln/package.json/etc.), when analyzing, then suggest LSP based on file extension counts
- [ ] **AC-US7-04**: Given command run from subdirectory, when detecting project root, then search upward until project file found

---

## Implementation

**Increment**: [0183-multi-language-lsp](../../../../increments/0183-multi-language-lsp/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-019**: [RED] Write failing tests for error handling
- [x] **T-020**: [GREEN] Implement fail-fast error handling with grep fallback
- [x] **T-021**: [RED] Write failing tests for project root detection
- [x] **T-022**: [GREEN] Implement project root detection
