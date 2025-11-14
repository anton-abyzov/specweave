# ADR-0031: GitHub Actions API Polling vs Webhooks

**Date**: 2025-11-12
**Status**: Accepted
**Context**: Increment 0029 - CI/CD Failure Detection & Claude Auto-Fix System

---

## Context

We need to monitor GitHub Actions workflows to detect failures in real-time and trigger automated fixes. There are two primary approaches: API polling and webhooks.

**Requirements**:
- Detect workflow failures within 2 minutes
- Monitor multiple workflows (DORA metrics, tests, builds, deployments)
- Support local development (no public endpoint required)
- Stay within GitHub API rate limits (5000 requests/hour authenticated)
- Minimal setup complexity

**Current System**:
- Existing GitHub integration via `specweave-github` plugin (ADR-0022)
- GitHub CLI (`gh`) wrapper for API calls
- Multi-repository sync profiles (ADR-0026)
- Rate limiting protection built-in

**Polling Approach**:
```
Poll every 60 seconds → Fetch workflow runs → Filter for failures → Process new failures
```

**Webhook Approach**:
```
GitHub → Webhook payload → HTTP endpoint → Process failure
```

---

## Decision

**Use API polling** with GitHub REST API, polling every 60 seconds for workflow status.

### Polling Architecture

```typescript
interface WorkflowMonitor {
  poll(): Promise<void>;
  checkWorkflow(workflowId: number): Promise<WorkflowStatus>;
  processFailure(run: WorkflowRun): Promise<void>;
}

class GitHubActionsMonitor {
  private interval: NodeJS.Timer;
  private pollInterval: number = 60_000; // 60 seconds
  private lastPoll: Date;
  private state: CICDState;

  async start(): Promise<void> {
    // Initial poll
    await this.poll();

    // Schedule recurring polls
    this.interval = setInterval(() => {
      this.poll().catch(error => {
        console.error('Polling error:', error);
      });
    }, this.pollInterval);
  }

  async poll(): Promise<void> {
    const since = this.lastPoll || new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

    // GET /repos/{owner}/{repo}/actions/runs
    const runs = await this.client.listWorkflowRuns({
      status: 'completed',
      created: `>${since.toISOString()}`,
    });

    // Filter for failures
    const failures = runs.filter(run => run.conclusion === 'failure');

    // Process new failures
    for (const run of failures) {
      if (!this.state.hasProcessed(run.id)) {
        await this.processFailure(run);
        this.state.markProcessed(run.id);
      }
    }

    this.lastPoll = new Date();
  }

  async processFailure(run: WorkflowRun): Promise<void> {
    // Extract logs
    const logs = await this.extractLogs(run);

    // Analyze with Claude
    const analysis = await this.analyzeFailure(run, logs);

    // Generate fix
    const fix = await this.generateFix(analysis);

    // Notify user
    await this.notifyUser(run, fix);
  }
}
```

### API Endpoints Used

```typescript
// List workflow runs (polling endpoint)
GET /repos/{owner}/{repo}/actions/runs
  ?status=completed
  &created=>{timestamp}
  &per_page=100

// Get workflow run details
GET /repos/{owner}/{repo}/actions/runs/{run_id}

// Get job details
GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs

// Download job logs
GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs
```

### Rate Limit Analysis

**API Calls per Poll**:
- List workflow runs: 1 call
- Get job details: N calls (N = failed jobs per run)
- Download logs: N calls

**Example Scenario** (10 workflows, 1 failure per hour):
```
Polls per hour: 60 (every 60 seconds)
Base API calls: 60 (list workflow runs)
Failure processing: ~5 (per failure)
Total: ~65 API calls per hour

Rate limit: 5000/hour
Usage: 1.3% of quota ✅
```

**Worst Case** (5 failures per hour, each with 3 jobs):
```
Base API calls: 60
Failure processing: 5 * (1 + 3 + 3) = 35
Total: 95 API calls per hour

Usage: 1.9% of quota ✅
```

### State Persistence

```typescript
interface CICDState {
  lastPoll: Date;
  processedRuns: Set<number>; // Deduplication
  workflows: {
    [workflowId: string]: {
      status: 'success' | 'failure';
      lastRun: Date;
      failureCount: number;
      lastFailure?: {
        runId: number;
        logs: string;
        analysis?: string;
        fixProposed?: FixProposal;
        fixApplied?: boolean;
      };
    };
  };
}

// Stored in: .specweave/state/cicd-monitor.json
```

### Conditional Requests (Optimization)

Use `If-Modified-Since` header to reduce bandwidth:

```typescript
const response = await fetch(
  'https://api.github.com/repos/{owner}/{repo}/actions/runs',
  {
    headers: {
      'If-Modified-Since': lastPoll.toUTCString(),
    },
  }
);

if (response.status === 304) {
  // No changes since last poll
  return;
}
```

**Benefit**: 304 responses don't count against rate limit!

---

## Alternatives Considered

### Alternative 1: GitHub Webhooks

**Approach**: Configure webhook to receive `workflow_run` events

```yaml
# GitHub webhook configuration
POST https://your-server.com/webhooks/github
Events: workflow_run (completed)
```

**Pros**:
- ✅ Real-time updates (no polling delay)
- ✅ Zero API calls (GitHub pushes data)
- ✅ No rate limit concerns
- ✅ Lower latency (&lt;1 second vs 60 seconds)

**Cons**:
- ❌ Requires public endpoint (security risk)
- ❌ Complex setup (ngrok, port forwarding, or cloud hosting)
- ❌ HTTPS certificate required
- ❌ Firewall/NAT issues
- ❌ Webhook secret management
- ❌ No support for local development
- ❌ User must configure webhook per repository

**Why Not**: Setup complexity and security concerns outweigh latency benefits. 60-second detection is acceptable for CI/CD monitoring.

### Alternative 2: GitHub Actions Workflow (Self-Monitoring)

**Approach**: Add monitoring step to every workflow

```yaml
# .github/workflows/main.yml
steps:
  - name: Notify on failure
    if: failure()
    run: |
      curl -X POST https://your-server.com/failures \
        -d '{"workflow": "${{ github.workflow }}", "run_id": "${{ github.run_id }}"}'
```

**Pros**:
- ✅ Immediate notification (no delay)
- ✅ No polling needed
- ✅ Workflow context included

**Cons**:
- ❌ Must modify every workflow file
- ❌ Requires HTTP endpoint (same as webhooks)
- ❌ Tight coupling (failure detection in workflows)
- ❌ Hard to maintain (scattered across workflows)
- ❌ What if notification step fails?

**Why Not**: Too invasive and brittle.

### Alternative 3: GitHub GraphQL API

**Approach**: Use GraphQL for more efficient queries

```graphql
query {
  repository(owner: "owner", name: "repo") {
    workflowRuns(last: 10) {
      nodes {
        id
        status
        conclusion
        workflowName
        jobs {
          nodes {
            name
            conclusion
            steps {
              name
              conclusion
            }
          }
        }
      }
    }
  }
}
```

**Pros**:
- ✅ Single query for all data
- ✅ More efficient (fetch only needed fields)
- ✅ Reduced API calls

**Cons**:
- ❌ More complex implementation
- ❌ Less familiar to developers
- ❌ Same rate limits as REST (5000/hour)
- ❌ GitHub Actions support in GraphQL is limited
- ❌ Overkill for simple status checks

**Why Not**: REST API is simpler and sufficient. GraphQL doesn't provide significant benefits for this use case.

### Alternative 4: Long Polling

**Approach**: Keep connection open until workflow completes

```typescript
// Long poll endpoint
GET /repos/{owner}/{repo}/actions/runs/{run_id}
  ?wait=true
  &timeout=300
```

**Pros**:
- ✅ Lower latency than periodic polling
- ✅ Fewer API calls

**Cons**:
- ❌ Not supported by GitHub API
- ❌ Complex to implement (server-side)
- ❌ Connection management overhead
- ❌ Timeout issues

**Why Not**: Not supported by GitHub.

### Alternative 5: Event Streaming (GitHub Events API)

**Approach**: Subscribe to repository events

```
GET /repos/{owner}/{repo}/events
```

**Pros**:
- ✅ Lower latency
- ✅ All events in one stream

**Cons**:
- ❌ Events API doesn't include workflow_run events
- ❌ Limited to last 300 events
- ❌ No filtering (must process all events)
- ❌ Deprecated in favor of webhooks

**Why Not**: Doesn't support workflow events.

---

## Consequences

### Positive

**Simplicity**:
- ✅ No external dependencies (no HTTP server, ngrok, etc.)
- ✅ Works on localhost (no public endpoint needed)
- ✅ Easy to test and debug
- ✅ Familiar REST API patterns

**Reliability**:
- ✅ Retry logic built-in (polling continues even if one fails)
- ✅ No webhook delivery failures
- ✅ No webhook secret management
- ✅ Stateless (can restart anytime)

**Rate Limits**:
- ✅ Stays within limits (1-2% of quota)
- ✅ Conditional requests reduce bandwidth
- ✅ 304 responses don't count against limits

**Developer Experience**:
- ✅ No configuration required (just start monitoring)
- ✅ Works immediately after `gh auth login`
- ✅ No firewall/NAT issues

### Negative

**Latency**:
- ❌ Detection delay: 60 seconds average (vs &lt;1s with webhooks)
- ❌ Worst case: 120 seconds (if failure happens just after poll)

**API Calls**:
- ❌ Constant API usage (60 calls/hour minimum)
- ❌ Wastes calls even when no workflows running
- ❌ Multiple repos = multiple poll loops

**Scalability**:
- ❌ Limited to 80+ repositories per instance (rate limits)
- ❌ Must run continuously (background process/daemon)

### Neutral

**Performance**:
- Negligible CPU usage (&lt;0.1%)
- Negligible memory usage (&lt;10MB)
- Network bandwidth: ~1KB per poll

**Cost**:
- Zero (GitHub API is free for authenticated users)

---

## Implementation Plan

### Phase 1: Basic Polling (Week 1)

```typescript
// src/core/cicd/workflow-monitor.ts
export class WorkflowMonitor {
  async start(): Promise<void> {
    // Start polling loop
  }

  async poll(): Promise<void> {
    // Fetch workflow runs
    // Process failures
  }

  async stop(): Promise<void> {
    // Stop polling loop
  }
}
```

### Phase 2: State Management (Week 1)

```typescript
// src/core/cicd/state-manager.ts
export class CICDStateManager {
  load(): CICDState;
  save(state: CICDState): void;
  markProcessed(runId: number): void;
  hasProcessed(runId: number): boolean;
}
```

### Phase 3: Rate Limiting (Week 2)

```typescript
// Use existing rate limiter from ADR-0016
import { RateLimiter } from '../sync/rate-limiter';

const limiter = new RateLimiter({
  maxCallsPerHour: 5000,
  safeThreshold: 0.8, // Warn at 80% usage
});
```

### Phase 4: Conditional Requests (Week 2)

```typescript
// Optimize with If-Modified-Since
const lastModified = state.lastPoll?.toUTCString();
const response = await fetch(url, {
  headers: { 'If-Modified-Since': lastModified },
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('WorkflowMonitor', () => {
  test('polls GitHub API every 60 seconds', async () => {
    const monitor = new WorkflowMonitor();
    await monitor.start();

    await sleep(120_000); // 2 minutes

    expect(mockGitHubAPI.callCount).toBeGreaterThanOrEqual(2);
  });

  test('processes failures only once', async () => {
    const monitor = new WorkflowMonitor();
    mockGitHubAPI.mockFailure({ runId: 123 });

    await monitor.poll();
    await monitor.poll(); // Second poll

    expect(mockProcessFailure).toHaveBeenCalledTimes(1);
  });

  test('handles API failures gracefully', async () => {
    const monitor = new WorkflowMonitor();
    mockGitHubAPI.mockError('rate_limit_exceeded');

    await expect(monitor.poll()).resolves.not.toThrow();
  });
});
```

### Integration Tests

```typescript
describe('GitHub Actions Integration', () => {
  test('detects real workflow failure', async () => {
    // Trigger workflow failure on test repository
    await triggerTestWorkflow({ shouldFail: true });

    // Wait for poll
    await sleep(70_000); // 70 seconds

    // Verify detection
    const state = await loadState();
    expect(state.workflows).toHaveProperty('test-workflow');
    expect(state.workflows['test-workflow'].status).toBe('failure');
  });
});
```

---

## Migration Path

**Existing users**: No migration needed (new feature)

**Future webhook support**: Can add webhooks as optional enhancement:
```typescript
// .specweave/config.json
{
  "cicd": {
    "detectionMode": "polling", // or "webhook" or "hybrid"
    "pollingInterval": 60,
    "webhookPort": 3000,
    "webhookSecret": "..."
  }
}
```

---

## Related Decisions

- **ADR-0022**: GitHub Sync Architecture (reuses GitHub CLI wrapper)
- **ADR-0026**: GitHub API Validation (reuses rate limiting)
- **ADR-0032**: Haiku vs Sonnet for Log Parsing (analysis phase)
- **ADR-0033**: Auto-Apply vs Manual Review (fix application)

---

## References

**GitHub API Documentation**:
- Workflow Runs: https://docs.github.com/en/rest/actions/workflow-runs
- Jobs: https://docs.github.com/en/rest/actions/workflow-jobs
- Rate Limiting: https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting

**Implementation Files**:
- `src/core/cicd/workflow-monitor.ts` (new)
- `src/core/cicd/state-manager.ts` (new)
- `plugins/specweave-github/lib/github-client-v2.ts` (existing)

**User Stories**:
- US-001: Monitor GitHub Actions Workflows
- US-002: Detect DORA Metrics Workflow Failures
- US-003: Detect Version Bump Workflow Failures
- US-004: Detect Test Failure Workflows

---

## Acceptance Criteria

- [x] Polling architecture designed and documented
- [x] Rate limit analysis shows &lt;2% quota usage
- [x] Conditional requests strategy defined
- [x] State persistence format defined
- [x] Testing strategy covers polling scenarios
- [x] Migration path for future webhook support defined
