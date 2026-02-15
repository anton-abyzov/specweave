---
id: US-002
feature: FS-183
title: "Configurable Timeouts (P1)"
status: not_started
priority: P1
created: "2026-02-04T00:00:00.000Z"
tldr: "**As a** developer with large projects
**I want** to configure LSP timeouts globally and per-language
**So that** I can accommodate slow-indexing language servers like csharp-ls."
project: specweave
---

# US-002: Configurable Timeouts (P1)

**Feature**: [FS-183](./FEATURE.md)

**As a** developer with large projects
**I want** to configure LSP timeouts globally and per-language
**So that** I can accommodate slow-indexing language servers like csharp-ls

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Given `lsp.timeout: 120` in config, when LSP operation runs, then 120s timeout is used
- [ ] **AC-US2-02**: Given `lsp.warmupTimeout: 90` in config, when warm-up runs, then 90s timeout is used for warm-up phase
- [ ] **AC-US2-03**: Given `lsp.perLanguage.csharp.timeout: 180`, when C# LSP operation runs, then 180s is used (overrides global)
- [ ] **AC-US2-04**: Given timeout values in config, when parsed, then they are interpreted as seconds (not milliseconds)
- [ ] **AC-US2-05**: Given no config, when LSP runs, then default of 120s global and 90s warmup is used

---

## Implementation

**Increment**: [0183-multi-language-lsp](../../../../increments/0183-multi-language-lsp/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: [RED] Write failing tests for LspConfig schema
- [x] **T-002**: [GREEN] Implement LspConfig schema with Zod
- [x] **T-003**: [RED] Write failing tests for timeout resolution
- [x] **T-004**: [GREEN] Implement TimeoutResolver with per-language overrides
- [x] **T-032**: Integrate timeout config into LSP clients
