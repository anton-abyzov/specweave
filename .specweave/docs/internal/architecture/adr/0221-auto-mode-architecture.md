# 0221 - Auto Mode Architecture

**Date**: 2025-12-30
**Status**: Accepted
**Context**: SpecWeave v1.0.58
**Supersedes**: Autopilot module (deprecated)

## Decision

Redesign the autonomous execution engine with a modular architecture featuring session state management, circuit breakers, human gates, and test gates using a stop hook feedback loop pattern.

## Context

The original Autopilot module had limitations:
- Monolithic design made testing difficult
- No protection against external service failures
- Human-sensitive operations could execute unattended
- No test enforcement between task transitions
- Session recovery was fragile

Users need autonomous execution that is:
- Safe (human gates for dangerous operations)
- Resilient (circuit breakers for external failures)
- Testable (test gates for quality enforcement)
- Recoverable (session state persistence)
- Observable (reporting and logging)

## Architecture

### Module Decomposition

**Decision**: Split into focused, single-responsibility modules.

| Module | Responsibility |
|--------|----------------|
| `session-state.ts` | Session persistence and recovery |
| `config.ts` | Configuration loading and validation |
| `test-gate.ts` | Test execution and coverage enforcement |
| `human-gate.ts` | Sensitive operation detection and approval |
| `circuit-breaker.ts` | External service failure protection |
| `sync-checkpoint.ts` | Periodic synchronization |
| `increment-queue.ts` | Queue management and prioritization |
| `report-generator.ts` | Session reporting |

**Rationale**:
- Each module can be tested in isolation
- Clear interfaces between components
- Easy to extend or replace individual parts
- Reduces coupling between concerns

### Session State Design

**Decision**: Persist session state to JSON file with atomic writes.

**Location**: `.specweave/state/auto-session.json`

**Contents**:
- Session ID and status
- Iteration count and limits
- Increment queue and current increment
- Human gate status
- Circuit breaker states

**Rationale**:
- Enables crash recovery
- Provides visibility into session state
- Allows external monitoring

### Lock Management

**Decision**: Use file-based locking with stale detection.

**Implementation**:
- Lock file: `.specweave/state/active-session.lock`
- Stale timeout: 30 minutes
- Lock contains session ID, timestamp, PID

**Rationale**:
- Prevents concurrent auto sessions
- Stale detection enables recovery after crashes
- Simple, no external dependencies

## Human Gate Pattern

### Detection Strategy

**Decision**: Pattern-based detection with configurable patterns.

**Default Patterns**:
```
deploy, migrate, publish, push --force, rm -rf,
drop table, delete from, npm publish, terraform apply,
production, api.*key, secret, password
```

**Rationale**:
- Covers common dangerous operations
- Regex support for flexible matching
- User-configurable for project needs

### Never Auto-Approve List

**Decision**: Hard-coded list of patterns that can NEVER be auto-approved.

**List**:
```
push --force, rm -rf /, rm -rf ~, drop database,
format c:, production deploy, npm publish
```

**Rationale**:
- Some operations are too dangerous even with pre-approval
- Provides safety guardrails
- Cannot be overridden by configuration

### Approval Flow

1. Pattern detected in operation
2. Gate request created with timeout
3. Session pauses, waits for approval
4. User approves/denies via command
5. Session resumes or operation skipped

## Circuit Breaker Pattern

### State Machine

```
CLOSED ─────> OPEN ─────> HALF-OPEN
   ^            │              │
   │            │              │
   └────────────┴──────────────┘
```

**States**:
- `closed`: Normal operation, calls allowed
- `open`: Failure threshold reached, calls blocked
- `half-open`: Testing if service recovered

**Transitions**:
- closed -> open: N failures within window
- open -> half-open: Reset timeout elapsed
- half-open -> closed: M successes
- half-open -> open: Any failure

### Default Configuration

| Service | Failure Threshold | Reset Timeout | Success Threshold |
|---------|-------------------|---------------|-------------------|
| GitHub | 3 | 60s | 2 |
| JIRA | 5 | 120s | 2 |
| ADO | 5 | 120s | 2 |

**Rationale**:
- GitHub has strict rate limits, trip faster
- JIRA/ADO more tolerant, higher threshold
- Reset timeouts match typical rate limit windows

### Operation Queuing

**Decision**: Queue blocked operations for later retry.

**Rationale**:
- Operations not lost during outages
- Manual retry possible
- Provides visibility into blocked work

## Test Gate Pattern

### Execution Strategy

**Decision**: Run tests before task transitions with retry.

**Flow**:
1. Task implementation complete
2. Run test command (`npm test`)
3. Check coverage threshold (80%)
4. If fail: retry up to 3 times
5. If still fail: escalate to human gate

**Rationale**:
- Enforces quality without blocking
- Retries allow for flaky tests
- Human escalation as last resort

### Framework Detection

**Decision**: Auto-detect test framework from package.json.

**Detected Frameworks**:
- Playwright (`@playwright/test`)
- Cypress (`cypress`)
- Vitest/Jest (`npm test`)

**Rationale**:
- Zero configuration for common setups
- Fallback to standard npm test
- Override available in config

## Sync Checkpoint Pattern

**Decision**: Batch sync operations for efficiency.

**Triggers**:
- Every N tasks (default: 5)
- Increment completion
- Session end

**Synced Systems**:
- Living docs (local)
- GitHub issues (via circuit breaker)
- JIRA tickets (via circuit breaker)
- ADO work items (via circuit breaker)

**Rationale**:
- Reduces API calls
- Batching improves throughput
- Circuit breaker protects against failures

## Consequences

### Positive

- Modular, testable architecture
- Safe autonomous execution
- Resilient to external failures
- Recoverable from crashes
- Observable via reports and logs

### Negative

- More complex than original Autopilot
- Additional state management overhead
- Learning curve for configuration

### Mitigations

- Sensible defaults minimize configuration
- Simple mode for reduced overhead
- Comprehensive logging for debugging

## Migration from Autopilot

- No breaking changes to user commands
- `/sw:auto` remains primary command
- Session state format is new (fresh start)
- Old autopilot logs remain accessible

## Related

- [0220 - Analytics Module](./0220-analytics-module.md)
- [Auto Module Documentation](../specs/specweave/modules/auto.md)
