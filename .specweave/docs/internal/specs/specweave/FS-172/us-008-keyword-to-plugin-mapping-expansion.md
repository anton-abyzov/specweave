---
id: US-008
feature: FS-172
title: Keyword-to-Plugin Mapping Expansion
status: not_started
priority: critical
created: 2026-01-19
project: specweave
external:
  github:
    issue: 1030
    url: https://github.com/anton-abyzov/specweave/issues/1030
---

# US-008: Keyword-to-Plugin Mapping Expansion

**Feature**: [FS-172](./FEATURE.md)

**As a** user mentioning various technologies,
**I want** comprehensive keyword detection,
**So that** the right plugins load regardless of how I phrase things.

---

## Acceptance Criteria

- [ ] **AC-US8-01**: Release keywords: release, publish, npm, version, changelog, semver
- [ ] **AC-US8-02**: Frontend keywords: react, vue, angular, svelte, next.js, nuxt, frontend, UI, component
- [ ] **AC-US8-03**: Backend keywords: API, REST, GraphQL, database, SQL, PostgreSQL, MongoDB, Redis
- [ ] **AC-US8-04**: Infra keywords: kubernetes, k8s, docker, terraform, aws, azure, gcp, deploy
- [ ] **AC-US8-05**: GitHub keywords: github, PR, pull request, issue, actions, workflow
- [ ] **AC-US8-06**: Testing keywords: test, TDD, vitest, jest, playwright, e2e, coverage
- [ ] **AC-US8-07**: Payments keywords: stripe, payment, checkout, subscription, billing
- [ ] **AC-US8-08**: Mobile keywords: react native, expo, ios, android, mobile app

---

## Implementation

**Increment**: [0172-true-auto-plugin-loading](../../../../increments/0172-true-auto-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-015**: Expand Keyword-to-Plugin Mapping
- [ ] **T-016**: Add Negative Pattern Expansion
- [ ] **T-017**: Add Confidence Threshold Tuning
