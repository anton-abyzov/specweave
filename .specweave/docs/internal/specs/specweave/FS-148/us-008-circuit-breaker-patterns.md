---
id: US-008
feature: FS-148
title: Circuit Breaker Patterns for External Services
status: planned
priority: P1
created: 2025-12-29
project: specweave
external:
  github:
    issue: 958
    url: https://github.com/anton-abyzov/specweave/issues/958
---

# US-008: Circuit Breaker Patterns for External Services

## User Story

**As a** developer, I want autopilot to handle external service failures gracefully with circuit breaker patterns, so that temporary outages don't cause cascade failures.

## Background

GitHub API, JIRA, ADO, and other external services may experience rate limits or outages.

## Acceptance Criteria

- [ ] **AC-US8-01**: Implement circuit breaker for GitHub API calls (open after 3 failures in 5 minutes)
- [ ] **AC-US8-02**: Implement circuit breaker for JIRA/ADO sync operations
- [ ] **AC-US8-03**: When circuit open, queue operations for retry (exponential backoff)
- [ ] **AC-US8-04**: Circuit auto-closes after 5 minutes of no failures (half-open state test)
- [ ] **AC-US8-05**: Rate limit detection: parse `X-RateLimit-*` headers and pause accordingly
- [ ] **AC-US8-06**: Log all circuit breaker state transitions to `.specweave/logs/circuit-breaker.log`
- [ ] **AC-US8-07**: Autopilot continues with local operations while external services recover
- [ ] **AC-US8-08**: Sync operations resume automatically when circuits close
