---
id: US-002
feature: FS-172
title: User-Prompt Keyword Detection Hook
status: not_started
priority: critical
created: 2026-01-19
project: specweave
external:
  github:
    issue: 1024
    url: https://github.com/anton-abyzov/specweave/issues/1024
---

# US-002: User-Prompt Keyword Detection Hook

**Feature**: [FS-172](./FEATURE.md)

**As a** developer typing a prompt,
**I want** the system to detect keywords and install matching plugins,
**So that** the relevant commands are available for Claude's response.

---

## Acceptance Criteria

- [ ] **AC-US2-01**: user-prompt-submit hook runs `specweave detect-intent` on every prompt
- [ ] **AC-US2-02**: Detection uses existing `detectSpecWeaveIntent()` function
- [ ] **AC-US2-03**: Matching plugins installed BEFORE Claude processes the prompt
- [ ] **AC-US2-04**: Installation is silent (no output that disrupts UX)
- [ ] **AC-US2-05**: Hook completes in <500ms to avoid noticeable delay
- [ ] **AC-US2-06**: Multiple plugins can be installed in single hook execution
- [ ] **AC-US2-07**: Hook failure does not block Claude response (graceful degradation)

---

## Implementation

**Increment**: [0172-true-auto-plugin-loading](../../../../increments/0172-true-auto-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-006**: Create User-Prompt-Submit Auto-Load Hook
- [ ] **T-007**: Add Hook to Dispatcher Chain
- [ ] **T-010**: Implement Graceful Degradation
