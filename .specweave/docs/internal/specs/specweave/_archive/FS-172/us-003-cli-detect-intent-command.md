---
id: US-003
feature: FS-172
title: CLI detect-intent Command
status: not_started
priority: critical
created: 2026-01-19
project: specweave
external:
  github:
    issue: 1025
    url: https://github.com/anton-abyzov/specweave/issues/1025
---

# US-003: CLI detect-intent Command

**Feature**: [FS-172](./FEATURE.md)

**As a** hook developer,
**I want** a CLI command to detect intent from a prompt,
**So that** I can call it from shell hooks.

---

## Acceptance Criteria

- [ ] **AC-US3-01**: `specweave detect-intent "prompt text"` command exists
- [ ] **AC-US3-02**: Returns JSON with detected plugins: `{"plugins": ["release", "github"]}`
- [ ] **AC-US3-03**: Returns empty array if no match: `{"plugins": []}`
- [ ] **AC-US3-04**: Supports `--install` flag to also install detected plugins
- [ ] **AC-US3-05**: Supports `--silent` flag for hook usage (no stdout)
- [ ] **AC-US3-06**: Exit code 0 if plugins detected, 1 if none

---

## Implementation

**Increment**: [0172-true-auto-plugin-loading](../../../../increments/0172-true-auto-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create detect-intent CLI Command
- [x] **T-002**: Add --install Flag to detect-intent
- [x] **T-003**: Add --silent Flag to detect-intent
