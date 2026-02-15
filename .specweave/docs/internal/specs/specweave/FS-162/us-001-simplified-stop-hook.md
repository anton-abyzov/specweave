---
id: US-001
feature: FS-162
title: LSP Integration Guide for Skill Authors
status: not_started
priority: P1
created: 2026-01-07
project: specweave-dev
external:
  github:
    issue: 996
    url: "https://github.com/anton-abyzov/specweave/issues/996"
---

# US-001: LSP Integration Guide for Skill Authors

**Feature**: [FS-162](./FEATURE.md)

**As a** skill/agent author
**I want** clear patterns showing HOW to use LSP in skill instructions
**So that** I can leverage semantic code understanding in my skills

---

## Acceptance Criteria

- [ ] **AC-US1-01**: Create `docs/guides/lsp-for-skills.md` with practical examples
- [ ] **AC-US1-02**: Document all 5 high-value LSP operations: goToDefinition, findReferences, documentSymbol, hover, getDiagnostics
- [ ] **AC-US1-03**: Show example skill YAML with LSP instructions
- [ ] **AC-US1-04**: Explain when to use LSP vs grep/glob
- [ ] **AC-US1-05**: Include error handling patterns for LSP failures

---

## Implementation

**Increment**: [0162-lsp-skill-integration](../../../../increments/0162-lsp-skill-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.
