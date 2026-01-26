# Auto Module

**Location**: `src/core/auto/`
**Last Updated**: 2025-12-30
**Status**: Active
**Previous Name**: Autopilot (deprecated)

## Overview

The Auto module provides autonomous execution capabilities for SpecWeave. It enables continuous, unattended execution of tasks until all increments are completed, with built-in safety mechanisms including human gates, circuit breakers, and test gates.

Using a stop hook feedback loop pattern, this module is fully integrated with SpecWeave's spec-driven workflow, living docs, and external tool synchronization.

## Architecture

```
src/core/auto/
  index.ts              # Module exports
  types.ts              # Type definitions (AutoSession, AutoConfig, etc.)
  session-state.ts      # Session persistence and recovery
  config.ts             # Configuration loading and validation
  logger.ts             # Auto-specific logging
  cost-estimator.ts     # Token/cost estimation
  report-generator.ts   # Session reports (markdown)
  increment-queue.ts    # Increment queue management
  test-gate.ts          # Test-driven validation
  human-gate.ts         # Human approval detection
  circuit-breaker.ts    # External service protection
  sync-checkpoint.ts    # Periodic sync operations
```

## Key Components

### SessionStateManager

Manages auto session state persistence and recovery.

**Features**:
- Session creation with unique IDs (`auto-YYYY-MM-DD-xxxxxx`)
- State persistence to `.specweave/state/auto-session.json`
- Lock management for preventing parallel sessions
- Iteration tracking with max limits
- Increment queue progression

**Public API**:
```typescript
createSession(options: SessionOptions): AutoSession
save(session: AutoSession): boolean
load(): AutoSession | null
hasActiveSession(): boolean
getActiveSession(): AutoSession | null
updateStatus(status: AutoSessionStatus, reason?: string): boolean
incrementIteration(): number
moveToNextIncrement(): string | null
markIncrementFailed(reason?: string): void
acquireLock(): boolean
releaseLock(): void
delete(): void
```

### TestGate

Enforces test-driven validation before increment transitions.

**Features**:
- Run unit/integration/E2E tests
- Enforce coverage thresholds
- Retry failed tests with fix attempts (max 3)
- Escalate to human after max retries
- Auto-detect test frameworks (Vitest, Jest, Playwright, Cypress)

**Configuration**:
```typescript
interface TestGateConfig {
  testCommand: string;           // Default: 'npm test'
  coverageThreshold: number;     // Default: 80
  maxRetries: number;            // Default: 3
  timeout: number;               // Default: 300000 (5 min)
  e2eCommand?: string;
  integrationCommand?: string;
  coverageReportPath: string;    // Default: 'coverage/coverage-summary.json'
}
```

### HumanGateDetector

Detects and handles operations requiring human approval.

**Default Gated Patterns**:
- `deploy`, `migrate`, `publish`
- `push --force`, `rm -rf`
- `drop table`, `delete from`
- `npm publish`, `terraform apply`
- `production`, `api.*key`, `secret`, `password`

**Never Auto-Approve**:
- `push --force`, `rm -rf /`, `rm -rf ~`
- `drop database`, `format c:`
- `production deploy`, `npm publish`

**Public API**:
```typescript
detectGate(content: string): DetectionResult
createRequest(operation: string, pattern: string, context: string): GateRequest
checkApproval(gateId: string): GateResponse | null
approveGate(gateId: string): GateResponse
denyGate(gateId: string, reason?: string): GateResponse
getPendingGate(): GateRequest | null
isNeverAutoApprove(operation: string): boolean
addPreApproved(pattern: string): void
```

### CircuitBreaker

Protects auto from external service failures using the circuit breaker pattern.

**States**:
- `closed` - Normal operation, calls allowed
- `open` - Service failure detected, calls blocked
- `half-open` - Testing if service recovered

**Default Services**:
- GitHub API (threshold: 3 failures, reset: 60s)
- JIRA API (threshold: 5 failures, reset: 120s)
- Azure DevOps API (threshold: 5 failures, reset: 120s)

**Features**:
- Failure counting within sliding window
- Automatic transition to half-open after reset timeout
- Operation queuing when circuit is open
- Rate limit header parsing

**Public API**:
```typescript
execute<T>(operation: () => Promise<T>): Promise<T>
isOpen(): boolean
isCallAllowed(): boolean
recordSuccess(): void
recordFailure(error?: unknown): void
queueOperation(operation: string, params: unknown): string
getStatus(): CircuitStatus
reset(): void
```

### ReportGenerator

Generates session reports in markdown format.

**Report Types**:
- Session summaries (timing, iterations, success rate)
- Per-increment reports (tasks completed, status)
- Human gate history (approved/denied/timeout)
- Circuit breaker status
- Cancellation summaries

**Output**: `.specweave/logs/{sessionId}-summary.md`

## Configuration

Located in `.specweave/config.json` under the `auto` key:

```typescript
interface AutoConfig {
  enabled: boolean;              // Default: true
  maxIterations: number;         // Default: 500
  maxHours?: number;             // Default: 120
  testCommand: string;           // Default: 'npm test'
  coverageThreshold: number;     // Default: 80
  enforceTestFirst: boolean;     // Default: false
  humanGated: {
    patterns: string[];
    timeout: number;             // Default: 1800 (30 min)
    neverAutoApprove: string[];
  };
  circuitBreakers: {
    failureThreshold: number;    // Default: 3
    resetTimeout: number;        // Default: 300 (5 min)
  };
  sync: {
    batchInterval: number;       // Default: 300 (5 min)
    forceOnComplete: boolean;    // Default: true
  };
  warnOnParallelSession: boolean; // Default: true
}
```

## Session Lifecycle

```
/sw:auto
    |
    v
Create Session
    |
    v
Acquire Lock -----> Fail if locked
    |
    v
Load Increment Queue
    |
    +----------------+
    |                |
    v                |
Execute Task         |
    |                |
    v                |
Test Gate ------> Retry (max 3)
    |                |
    v                |
Human Gate? -----> Wait for approval
    |                |
    v                |
Update Task Status   |
    |                |
    v                |
Circuit Breaker? --> Queue operation
    |                |
    v                |
Sync Checkpoint      |
    |                |
    v                |
Next Task <----------+
    |
    v
All Complete? -----> Generate Report
    |
    v
Release Lock
```

## Session States

```typescript
type AutoSessionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
```

| State | Description |
|-------|-------------|
| running | Session actively executing tasks |
| paused | Session paused (human gate pending) |
| completed | All increments successfully completed |
| failed | Session failed due to unrecoverable error |
| cancelled | Session cancelled by user |

## Completion Criteria

Session completes when:
1. All tasks in all queued increments are marked complete
2. All test gates pass
3. All required human gates are approved
4. OR max iterations reached
5. OR max hours exceeded

## Simple Mode

When `simple: true`, the session operates in simple mode:
- No session state persistence
- No queues or circuit breakers
- Direct execution loop
- Minimal overhead

## Integration Points

### With Increment System
- Reads increment queue from active increments
- Updates task status in tasks.md
- Triggers increment transitions (ready_for_review)

### With Living Docs
- Syncs specs and ACs on completion
- Updates feature documentation

### With External Tools
- GitHub issue sync (via circuit breaker)
- JIRA ticket sync (via circuit breaker)
- Azure DevOps work item sync (via circuit breaker)

### With Analytics
- Tracks session metrics
- Reports iteration counts
- Logs gate/breaker events

## Commands

| Command | Description |
|---------|-------------|
| `/sw:auto` | Start autonomous execution |
| `/sw:auto-status` | Check session progress |
| `/sw:cancel-auto` | Cancel active session |
| `/sw:approve-gate` | Approve pending human gate |
| `/sw:deny-gate` | Deny pending human gate |

## Error Recovery

**Session Crash**:
1. Lock becomes stale after 30 minutes
2. Next `/sw:auto` acquires lock
3. Session resumes from last checkpoint

**External Service Failure**:
1. Circuit breaker opens
2. Operations queued
3. Retry after reset timeout
4. Manual intervention if repeated failures

**Test Failure**:
1. Retry up to 3 times
2. Log failures for debugging
3. Escalate to human gate if persistent

## Logging

**Locations**:
- Session state: `.specweave/state/auto-session.json`
- Session lock: `.specweave/state/active-session.lock`
- Circuit breakers: `.specweave/logs/circuit-breakers.log`
- Session reports: `.specweave/logs/{sessionId}-summary.md`

## Testing

Test files: `tests/unit/core/auto/*.test.ts`

Key test scenarios:
- Session creation and persistence
- Lock acquisition and release
- Iteration limits
- Test gate validation
- Human gate detection
- Circuit breaker state transitions
- Report generation accuracy

## Migration from Autopilot

The Auto module replaces the deprecated Autopilot module with:
- Cleaner architecture
- Better state management
- Improved circuit breaker implementation
- Human gate pattern matching
- Session reporting

## Related Documentation

- [Analytics Module](./analytics.md) - Usage tracking
- [Increment System](./increment.md) - Task management
- [External Sync](../sync/external-sync.md) - GitHub/JIRA/ADO integration
- [Configuration](../configuration.md) - Global config options
