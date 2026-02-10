---
id: US-006
feature: FS-172
title: Silent Plugin Installation Mode
status: not_started
priority: critical
created: 2026-01-19
project: specweave
external:
  github:
    issue: 1028
    url: https://github.com/anton-abyzov/specweave/issues/1028
---

# US-006: Silent Plugin Installation Mode

**Feature**: [FS-172](./FEATURE.md)

**As a** hook that installs plugins,
**I want** silent installation mode,
**So that** user experience is not disrupted by output.

---

## Acceptance Criteria

- [ ] **AC-US6-01**: `specweave load-plugins X --silent` produces no stdout
- [ ] **AC-US6-02**: Errors still written to stderr for debugging
- [ ] **AC-US6-03**: Exit codes still work correctly for hook logic
- [ ] **AC-US6-04**: Logging still happens to `~/.specweave/logs/lazy-loading.log`

---

## Implementation

**Increment**: [0172-true-auto-plugin-loading](../../../../increments/0172-true-auto-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-003**: Add --silent Flag to detect-intent
- [ ] **T-021**: Add --silent Flag to load-plugins
- [ ] **T-022**: Add Silent Mode to Cache Manager
