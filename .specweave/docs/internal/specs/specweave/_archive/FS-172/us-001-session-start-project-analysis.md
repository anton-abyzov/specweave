---
id: US-001
feature: FS-172
title: Session-Start Project Analysis
status: not_started
priority: critical
created: 2026-01-19
project: specweave
external:
  github:
    issue: 1023
    url: https://github.com/anton-abyzov/specweave/issues/1023
---

# US-001: Session-Start Project Analysis

**Feature**: [FS-172](./FEATURE.md)

**As a** developer opening Claude Code in a project,
**I want** relevant plugins to be pre-installed automatically,
**So that** commands are available from my first prompt.

---

## Acceptance Criteria

- [ ] **AC-US1-01**: session-start hook analyzes project files (package.json, requirements.txt, etc.)
- [ ] **AC-US1-02**: React/Vue/Angular projects trigger sw-frontend installation
- [ ] **AC-US1-03**: Python projects with FastAPI/Django trigger sw-backend installation
- [ ] **AC-US1-04**: Projects with .github/ trigger sw-github installation
- [ ] **AC-US1-05**: Projects with k8s/, helm/, or Kubernetes manifests trigger sw-k8s installation
- [ ] **AC-US1-06**: Projects with Dockerfile/docker-compose trigger sw-infra installation
- [ ] **AC-US1-07**: Analysis completes in <3 seconds
- [ ] **AC-US1-08**: Already-installed plugins are not re-installed (idempotent)

---

## Implementation

**Increment**: [0172-true-auto-plugin-loading](../../../../increments/0172-true-auto-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-008**: Create Session-Start Auto-Load Hook
- [ ] **T-009**: Add Session-Start Hook to Dispatcher
