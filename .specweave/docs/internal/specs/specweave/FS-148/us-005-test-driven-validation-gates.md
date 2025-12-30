---
id: US-005
feature: FS-148
title: Test-Driven Validation Gates
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 955
    url: https://github.com/anton-abyzov/specweave/issues/955
---

# US-005: Test-Driven Validation Gates

## User Story

**As a** developer, I want auto to enforce test passing before transitioning between increments, so that I have confidence in autonomous execution quality.

## Background

Tests are the ultimate validation. Auto must not proceed if tests fail.

## Acceptance Criteria

- [ ] **AC-US5-01**: Before closing any increment, run full test suite (`npm test` or configured command)
- [ ] **AC-US5-02**: If tests fail, auto pauses and attempts fix (up to 3 retries)
- [ ] **AC-US5-03**: After 3 failed fix attempts, transition to `NEEDS_HUMAN_INTERVENTION` state
- [ ] **AC-US5-04**: Unit tests must pass before integration tests run
- [ ] **AC-US5-05**: Integration tests must pass before E2E tests run (if configured)
- [ ] **AC-US5-06**: Coverage threshold enforcement: block if coverage drops below target
- [ ] **AC-US5-07**: Test results logged to `.specweave/logs/auto-tests-{iteration}.json`
- [ ] **AC-US5-08**: Playwright E2E integration: detect `playwright.config.ts` and run E2E suite
