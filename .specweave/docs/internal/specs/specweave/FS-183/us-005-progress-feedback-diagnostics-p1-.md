---
id: US-005
feature: FS-183
title: "Progress Feedback & Diagnostics (P1)"
status: not_started
priority: P1
created: "2026-02-04T00:00:00.000Z"
tldr: "**As a** developer waiting for LSP indexing
**I want** progress feedback and diagnostic tools
**So that** I know what's happening and can troubleshoot issues."
project: specweave
---

# US-005: Progress Feedback & Diagnostics (P1)

**Feature**: [FS-183](./FEATURE.md)

**As a** developer waiting for LSP indexing
**I want** progress feedback and diagnostic tools
**So that** I know what's happening and can troubleshoot issues

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Given LSP indexing in progress, when waiting, then progress bar with elapsed time is shown
- [ ] **AC-US5-02**: Given LSP warm-up complete, when reported, then detailed breakdown is shown (e.g., "847 symbols: 423 functions, 312 classes, 112 interfaces")
- [ ] **AC-US5-03**: Given `specweave lsp doctor` command, when run, then comprehensive diagnostics are output
- [ ] **AC-US5-04**: Given doctor command, when checking, then installed servers, connectivity, warm-up test, and suggestions are reported
- [ ] **AC-US5-05**: Given LSP operation, when complete, then structured logs are written to `.specweave/logs/lsp-*.log`

---

## Implementation

**Increment**: [0183-multi-language-lsp](../../../../increments/0183-multi-language-lsp/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-015**: Implement progress bar for LSP operations
- [x] **T-016**: Implement detailed symbol count reporting
- [x] **T-017**: [RED] Write failing tests for lsp doctor command
- [x] **T-018**: [GREEN] Implement lsp doctor command
