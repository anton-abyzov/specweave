---
id: US-006
feature: FS-156
title: LSP Integration Examples for Skills
status: completed
priority: P1
created: 2026-01-06
project: specweave
external:
  github:
    issue: 976
    url: https://github.com/anton-abyzov/specweave/issues/976
---

# US-006: LSP Integration Examples for Skills

**Feature**: [FS-156](./FEATURE.md)

**As a** SpecWeave skill developer
**I want** clear LSP integration examples
**So that** skills can leverage semantic code understanding

---

## Acceptance Criteria

- [x] **AC-US6-01**: Examples for .NET (OmniSharp, Roslyn)
- [x] **AC-US6-02**: Examples for Node.js/TypeScript (typescript-language-server)
- [x] **AC-US6-03**: Examples for JavaScript (typescript-language-server with allowJs)
- [x] **AC-US6-04**: Examples for Python (python-lsp-server, Pylance)
- [x] **AC-US6-05**: Examples for Java (jdtls)
- [x] **AC-US6-06**: Examples for Scala (metals)
- [x] **AC-US6-07**: Examples for Swift (sourcekit-lsp)
- [x] **AC-US6-08**: Each example shows: setup, common operations, error handling

---

## Implementation

**Increment**: [0156-per-skill-reflection-memory-override](../../../../increments/0156-per-skill-reflection-memory-override/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-028**: Create LSP integration guide structure
- [x] **T-029**: Add .NET LSP examples
- [x] **T-030**: Add Node.js/TypeScript LSP examples
- [x] **T-031**: Add JavaScript LSP examples
- [x] **T-032**: Add Python LSP examples
- [x] **T-033**: Add Java/Scala/Swift LSP examples
- [x] **T-034**: Update CLAUDE.md with LSP instructions
