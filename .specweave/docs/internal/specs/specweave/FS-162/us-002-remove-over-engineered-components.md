---
id: US-002
feature: FS-162
title: Update Frontend Architect Agent with LSP
status: not_started
priority: P1
created: 2026-01-07
project: specweave-dev
external:
  github:
    issue: 997
    url: "https://github.com/anton-abyzov/specweave/issues/997"
---

# US-002: Update Frontend Architect Agent with LSP

**Feature**: [FS-162](./FEATURE.md)

**As a** frontend developer
**I want** the frontend-architect agent to use LSP for component analysis
**So that** I get accurate component structure mapping and type information

---

## Acceptance Criteria

- [ ] **AC-US2-01**: Add `documentSymbol` usage to map React component structure
- [ ] **AC-US2-02**: Add `findReferences` before refactoring component props
- [ ] **AC-US2-03**: Add `hover` to extract TypeScript type signatures
- [ ] **AC-US2-04**: Add example: "Use documentSymbol on src/components/Button.tsx to map exports"
- [ ] **AC-US2-05**: Update AGENT.md with LSP integration section

---

## Implementation

**Increment**: [0162-lsp-skill-integration](../../../../increments/0162-lsp-skill-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.
