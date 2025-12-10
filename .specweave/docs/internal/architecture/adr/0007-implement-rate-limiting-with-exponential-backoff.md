# 0007-implement-rate-limiting-with-exponential-backoff: Implement Rate Limiting with Exponential Backoff

**Status**: Detected
**Confidence**: medium

## Context

Found Rate Limiting with Exponential Backoff pattern in 2 repositories.

## Decision

The team has adopted Rate Limiting with Exponential Backoff as a standard approach.

## Consequences

- Consistent Rate Limiting with Exponential Backoff implementation across services
- Team familiarity with the pattern
- Standardization benefits for 2 repositories

## Evidence

- **metrics, importers**: handleRateLimit() method in github-client.ts; X-RateLimit-Reset header handling; Automatic retry on 403 status; RateLimiter class with configurable thresholds; x-ratelimit-remaining header parsing for GitHub