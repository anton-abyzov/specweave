---
id: US-005
feature: FS-172
title: Project Type Detection Module
status: not_started
priority: critical
created: 2026-01-19
project: specweave
external:
  github:
    issue: 1027
    url: https://github.com/anton-abyzov/specweave/issues/1027
---

# US-005: Project Type Detection Module

**Feature**: [FS-172](./FEATURE.md)

**As a** system that pre-loads plugins,
**I want** accurate project type detection,
**So that** the right plugins are pre-installed.

---

## Acceptance Criteria

- [ ] **AC-US5-01**: Module at `src/core/lazy-loading/project-detector.ts`
- [ ] **AC-US5-02**: Detects frontend frameworks: React, Vue, Angular, Svelte, Next.js, Nuxt
- [ ] **AC-US5-03**: Detects backend frameworks: Express, FastAPI, Django, NestJS, Spring Boot
- [ ] **AC-US5-04**: Detects infrastructure: Docker, Kubernetes, Terraform, Pulumi
- [ ] **AC-US5-05**: Detects integrations: GitHub Actions, JIRA config, Azure DevOps
- [ ] **AC-US5-06**: Returns list of recommended plugin groups
- [ ] **AC-US5-07**: Detection is fast (<1 second) using file existence checks, not content parsing

---

## Implementation

**Increment**: [0172-true-auto-plugin-loading](../../../../increments/0172-true-auto-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-004**: Create detect-project CLI Command
- [ ] **T-005**: Create Project Detector Module
