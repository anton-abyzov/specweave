---
id: US-004
feature: FS-183
title: "Custom LSP Server Registration (P2)"
status: not_started
priority: P1
created: "2026-02-04T00:00:00.000Z"
tldr: "**As a** developer using uncommon languages
**I want** to register custom LSP servers via configuration
**So that** I can use SpecWeave with any language that has an LSP server."
project: specweave
---

# US-004: Custom LSP Server Registration (P2)

**Feature**: [FS-183](./FEATURE.md)

**As a** developer using uncommon languages
**I want** to register custom LSP servers via configuration
**So that** I can use SpecWeave with any language that has an LSP server

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Given `lsp.servers.myLang` config with command/args/filePatterns, when LSP initializes, then custom server is registered
- [ ] **AC-US4-02**: Given first use of custom server, when initialized, then security warning is shown requiring user confirmation
- [ ] **AC-US4-03**: Given custom server command, when pre-flight runs, then binary existence and executability is validated
- [ ] **AC-US4-04**: Given invalid custom server path, when validation fails, then clear error with fix suggestion is shown

---

## Implementation

**Increment**: [0183-multi-language-lsp](../../../../increments/0183-multi-language-lsp/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-023**: [RED] Write failing tests for custom server config
- [x] **T-024**: [GREEN] Implement custom server config parsing
- [x] **T-025**: [RED] Write failing tests for security validation
- [x] **T-026**: [GREEN] Implement security warning and binary validation
