---
id: US-003
feature: FS-122
title: Frontend Framework Detection
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 860
    url: https://github.com/anton-abyzov/specweave/issues/860
---

# US-003: Frontend Framework Detection

**Feature**: [FS-122](./FEATURE.md)

**As a** frontend developer
**I want** coding standards documented for React/Angular/Vue
**So that** I know component naming, state management, and CSS conventions

---

## Acceptance Criteria

- [x] **AC-US3-01**: Detect React via `package.json` dependencies and ESLint `plugin:react/*`
- [x] **AC-US3-02**: Detect Angular via `angular.json`
- [x] **AC-US3-03**: Detect Vue via `package.json` dependencies and ESLint `plugin:vue/*`
- [x] **AC-US3-04**: Generate `governance/standards/react.md` with JSX, hooks, testing conventions
- [x] **AC-US3-05**: Generate `governance/standards/angular.md` with module, component conventions
- [x] **AC-US3-06**: Generate `governance/standards/vue.md` with composition API, SFC conventions

---

## Implementation

**Increment**: [0122-multi-technology-governance](../../../../increments/0122-multi-technology-governance/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-005**: Create Frontend Framework Detector
- [x] **T-006**: Create Standards Markdown Generator
