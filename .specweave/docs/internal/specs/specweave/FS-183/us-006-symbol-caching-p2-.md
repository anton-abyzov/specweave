---
id: US-006
feature: FS-183
title: "Symbol Caching (P2)"
status: not_started
priority: P1
created: "2026-02-04T00:00:00.000Z"
tldr: "**As a** developer running multiple LSP commands
**I want** symbol locations cached between invocations
**So that** subsequent queries are faster without re-indexing."
project: specweave
---

# US-006: Symbol Caching (P2)

**Feature**: [FS-183](./FEATURE.md)

**As a** developer running multiple LSP commands
**I want** symbol locations cached between invocations
**So that** subsequent queries are faster without re-indexing

---

## Acceptance Criteria

- [ ] **AC-US6-01**: Given LSP query result, when caching, then symbols are stored in `.specweave/cache/lsp/`
- [ ] **AC-US6-02**: Given cached symbols, when source file changes (mtime), then cache is invalidated for that file
- [ ] **AC-US6-03**: Given cache key, when generated, then it includes file path, symbol name, language, and server version

---

## Implementation

**Increment**: [0183-multi-language-lsp](../../../../increments/0183-multi-language-lsp/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-027**: [RED] Write failing tests for symbol cache
- [x] **T-028**: [GREEN] Implement symbol cache with mtime invalidation
