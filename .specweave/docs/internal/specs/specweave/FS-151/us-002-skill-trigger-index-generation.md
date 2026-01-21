---
id: US-002
feature: FS-151
title: Skill Trigger Index Generation
status: completed
priority: P0
created: 2025-12-31
project: specweave
external:
  github:
    issue: 987
    url: https://github.com/anton-abyzov/specweave/issues/987
---

# US-002: Skill Trigger Index Generation

**Feature**: [FS-151](./FEATURE.md)

**As a** developer
**I want** an auto-generated skill trigger index that maps keywords to skills
**So that** Claude can match user prompts to the right skills

---

## Acceptance Criteria

- [x] **AC-US2-01**: Script extracts trigger keywords from all 119 SKILL.md files
- [x] **AC-US2-02**: Generates `.specweave/state/skill-triggers-index.json`
- [x] **AC-US2-03**: Index maps keywords → skill names (e.g., "EKS" → "kubernetes-architect")
- [x] **AC-US2-04**: Index is refreshed on plugin installation
- [x] **AC-US2-05**: Unit tests verify index generation works

---

## Implementation

**Increment**: [0151-plugin-lsp-activation-e2e-tests](../../../../increments/0151-plugin-lsp-activation-e2e-tests/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create skill trigger extractor script
- [x] **T-002**: Generate skill-triggers-index.json
- [x] **T-003**: Hook index refresh on plugin installation
- [x] **T-004**: Unit tests for trigger extraction
