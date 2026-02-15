---
id: US-003
feature: FS-162
title: Update Database Optimizer Agent with LSP
status: not_started
priority: P1
created: 2026-01-07
project: specweave-dev
external:
  github:
    issue: 998
    url: "https://github.com/anton-abyzov/specweave/issues/998"
---

# US-003: Update Database Optimizer Agent with LSP

**Feature**: [FS-162](./FEATURE.md)

**As a** backend developer
**I want** the database-optimizer agent to use LSP for query analysis
**So that** I get accurate impact analysis before schema changes

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Add `findReferences` to find all usages of database functions
- [ ] **AC-US3-02**: Add `goToDefinition` to navigate to query definitions
- [ ] **AC-US3-03**: Add `hover` to extract ORM function signatures
- [ ] **AC-US3-04**: Add example: "Use findReferences on database/models/User.ts:getUserById"
- [ ] **AC-US3-05**: Update AGENT.md with LSP integration section

---

## Implementation

**Increment**: [0162-lsp-skill-integration](../../../../increments/0162-lsp-skill-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.
