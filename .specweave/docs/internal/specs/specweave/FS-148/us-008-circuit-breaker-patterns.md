---
id: US-008
feature: FS-148
title: "Circuit Breaker Patterns for External Services"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-008: Circuit Breaker Patterns for External Services

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US8-01**: Implement circuit breaker for GitHub API calls (open after 3 failures in 5 minutes)
- [x] **AC-US8-02**: Implement circuit breaker for JIRA/ADO sync operations
- [x] **AC-US8-03**: When circuit open, queue operations for retry (exponential backoff)
- [x] **AC-US8-04**: Circuit auto-closes after 5 minutes of no failures (half-open state test)
- [x] **AC-US8-05**: Rate limit detection: parse `X-RateLimit-*` headers and pause accordingly
- [x] **AC-US8-06**: Log all circuit breaker state transitions to `.specweave/logs/circuit-breaker.log`
- [x] **AC-US8-07**: Auto continues with local operations while external services recover
- [x] **AC-US8-08**: Sync operations resume automatically when circuits close

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.
