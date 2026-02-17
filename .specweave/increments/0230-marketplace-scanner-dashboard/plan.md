# Implementation Plan: Marketplace Scanner Dashboard

## Overview

Add a 6th background worker that scans GitHub for community Claude Code skills, feeds them through a file-based submission queue with automated Tier 1/Tier 2 security verification, and surfaces everything through a new Marketplace dashboard page with real-time SSE updates.

## Architecture

### Data Flow
```
GitHub Search API ──> Scanner Worker ──> SubmissionQueue
                                              │
                    ┌─────────────────────────┤
                    │                         │
              SecurityScanner           skill-submissions.json
              (Tier 1 auto)                   │
                    │                    FileWatcher (300ms)
              SecurityJudge                   │
              (Tier 2 manual)           SSEManager.broadcast()
                    │                         │
              SubmissionQueue           MarketplacePage.tsx
              (status update)           (real-time UI)
```

### Components

1. **SubmissionQueue** (`src/core/fabric/submission-queue.ts`): File-based queue with locking, status pipeline, backup/recovery. Reuses file-locking pattern from `BackgroundJobManager`.

2. **MarketplaceScannerWorker** (`src/cli/workers/marketplace-scanner-worker.ts`): Detached process following `clone-worker.ts` pattern. Scans GitHub Search API, feeds SubmissionQueue.

3. **MarketplaceAggregator** (`src/dashboard/server/data/marketplace-aggregator.ts`): Server-side data layer reading from queue + job state for API responses.

4. **MarketplacePage** (`src/dashboard/client/src/pages/MarketplacePage.tsx`): React page with 4 sections: Scanner Status, Queue, Verified Skills, Insights.

### Data Model

**SkillSubmission**:
```typescript
interface SkillSubmission {
  id: string;                    // uuid
  repoFullName: string;          // "author/repo-name"
  repoUrl: string;               // GitHub URL
  skillPath: string;             // path to SKILL.md in repo
  author: string;                // GitHub username
  stars: number;
  lastUpdated: string;           // ISO date
  status: SubmissionStatus;      // pipeline state
  tier1Result?: { passed: boolean; findings: number; score: number };
  tier2Result?: { verdict: string; score: number; threats: string[] };
  discoveredAt: string;
  updatedAt: string;
  rejectedReason?: string;
}

type SubmissionStatus = 'discovered' | 'queued' | 'scanning' | 'tier1_passed'
  | 'tier1_failed' | 'tier2_pending' | 'verified' | 'rejected';
```

**MarketplaceScanJobConfig** (extends existing JobConfig union):
```typescript
interface MarketplaceScanJobConfig {
  type: 'marketplace-scan';
  projectPath: string;
  searchTopics: string[];
  searchFilenames: string[];
  maxResultsPerScan: number;
  intervalMinutes: number;
  checkpoint?: { lastCursor: string; seenRepos: string[] };
}
```

### API Contracts

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/marketplace/scanner/status` | GET | Worker health, last scan, repos scanned, rate limit |
| `/api/marketplace/scanner/start` | POST | Launch scanner via job manager |
| `/api/marketplace/scanner/stop` | POST | Kill scanner job |
| `/api/marketplace/queue` | GET | Paginated queue (query: status, limit, offset) |
| `/api/marketplace/queue/:id` | GET | Single submission detail |
| `/api/marketplace/queue/:id/approve` | POST | Mark as verified |
| `/api/marketplace/queue/:id/reject` | POST | Mark as rejected (body: reason) |
| `/api/marketplace/verified` | GET | Verified skills only |
| `/api/marketplace/insights` | GET | Aggregated analytics |

### SSE Events

| Event Type | Payload | Trigger |
|------------|---------|---------|
| `marketplace-scan` | `{ reposFound: number, newRepos: number }` | Scanner discovers repos |
| `submission-update` | `{ id, status, repoFullName }` | Queue item changes |
| `verification-complete` | `{ id, verdict, score }` | Tier 1 or Tier 2 finishes |

## Technology Stack

- **Language**: TypeScript (ESM, .js extensions)
- **Worker**: Node.js detached process (spawn, PID file)
- **HTTP Client**: Native fetch() (no extra deps in worker)
- **Queue**: File-based JSON with file locking
- **Frontend**: React with existing hooks (useProjectApi, useSSEEvent)
- **Testing**: Vitest with vi.hoisted() + vi.mock()

## Architecture Decisions

### ADR-1: File-based queue over SQLite/Redis
**Context**: Need persistent queue for skill submissions.
**Decision**: JSON file at `.specweave/state/skill-submissions.json` with file locking.
**Rationale**: Every state in SpecWeave uses file-based JSON. Adding SQLite/Redis would be a new dependency and pattern for medium-scale (500-5000 items).
**Alternatives**: SQLite (overkill), Redis (external dependency), BullMQ (requires Redis).

### ADR-2: Native fetch over Octokit
**Context**: Worker needs to call GitHub Search API.
**Decision**: Use native `fetch()` for GitHub API.
**Rationale**: Worker is a standalone detached process. Minimizing deps reduces startup time. GitHub Search API is simple REST. Rate limit headers parsed manually.
**Alternatives**: Octokit (already a dep but heavy for detached process).

### ADR-3: Tier 2 opt-in only
**Context**: Tier 2 uses LLM API (~$0.03/skill).
**Decision**: Tier 2 NOT automatic. Triggered via config `autoTier2: true` or manual dashboard action.
**Rationale**: Users must not be surprised by API charges. Consent gate pattern already exists.

### ADR-4: Auto-recovery for queue corruption
**Context**: File-based queue can corrupt on crash.
**Decision**: Backup queue file before every write, validate JSON on load, rebuild from backup if corrupted.
**Rationale**: User chose auto-recovery. Clone-worker already uses checkpoint pattern for resilience.

## Implementation Phases

### Phase 1: Core Types & Queue
- Add `marketplace-scan` to JobType union in `types.ts`
- Create `submission-queue-types.ts` (shared interfaces)
- Implement `SubmissionQueue` class with file locking, backup/recovery
- TDD: Write failing tests first

### Phase 2: Scanner Worker
- Add `launchMarketplaceScanJob()` to `job-launcher.ts`
- Implement `marketplace-scanner-worker.ts` (GitHub API, dedup, checkpoint)
- Write worker tests with mocked GitHub API

### Phase 3: Dashboard Server
- Add 3 SSE event types to `dashboard/types.ts`
- Add file watcher target for `skill-submissions.json`
- Implement `MarketplaceAggregator`
- Register 9 API routes in `dashboard-server.ts`

### Phase 4: Dashboard Client
- Add SSE events to `SSEContext.tsx`
- Create `MarketplacePage.tsx` (Scanner Status, Queue, Verified, Insights)
- Add route to `App.tsx`, nav item to `Sidebar.tsx`

### Phase 5: Integration
- Add config schema for `marketplace.scanner` section
- End-to-end verification

## Testing Strategy

- **Unit tests**: SubmissionQueue (add, dedup, status transitions, recovery), worker logic (GitHub API mocking, checkpoint), MarketplaceAggregator
- **Mocking pattern**: `vi.hoisted()` for module mocks, `vi.mock()` for dependencies
- **Coverage target**: 80% per config

## Technical Challenges

### Challenge 1: GitHub API Rate Limiting
**Solution**: Parse `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers. When remaining < 5, sleep until reset time. Exponential backoff on 403 responses.
**Risk**: Unauthenticated limit is only 10/min. Mitigation: Encourage GITHUB_TOKEN in config.

### Challenge 2: Queue File Corruption
**Solution**: Write to `.bak` first, then atomic rename. Validate JSON structure on load. If invalid, restore from `.bak`.
**Risk**: Both files corrupt simultaneously. Mitigation: Extremely unlikely; log error and start with empty queue.

### Challenge 3: Worker Lifecycle Management
**Solution**: Reuse existing `BackgroundJobManager` (PID tracking, stale detection, kill). Scanner is long-running daemon — different from batch workers but same lifecycle.
**Risk**: Scanner might run indefinitely consuming resources. Mitigation: configurable max scan count per session.
