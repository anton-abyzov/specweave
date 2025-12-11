---
increment: 0117-instant-dashboard-cache
project: specweave
type: feature
priority: P1
status: completed
---

# Instant Dashboard Cache

## Problem Statement

Status commands (`/specweave:progress`, `/specweave:status`, `/specweave:jobs`, `/specweave:workflow`) currently:

1. **Re-parse files on every invocation** - Each command scans `metadata.json` and `tasks.md` files
2. **Spawn Node processes** - Even with script delegation (v0.33.0), we spawn `node scripts/progress.js`
3. **I/O overhead compounds** - 26 increments × 3 files each = 78 file reads per status check
4. **Response times vary** - 100-500ms depending on increment count

**User impact**: Status commands feel slow compared to instant CLI tools like `git status`.

## Solution: Pre-computed State Cache

Implement a **write-time cache** pattern where state is computed incrementally when changes happen, not when status is queried.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CACHE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  WRITE PATH (triggered by post-tool-use hooks):                  │
│  ─────────────────────────────────────────────────────────────── │
│  1. Hook detects change to:                                      │
│     - metadata.json → status/type changes                        │
│     - tasks.md → task completion                                 │
│     - spec.md → AC updates                                       │
│     - background-jobs.json → job state                           │
│                                                                   │
│  2. Incremental update (NOT full rebuild):                       │
│     update-dashboard-cache.sh <incrementId> <changeType>         │
│                                                                   │
│  3. Atomic write to:                                             │
│     .specweave/state/dashboard.json                              │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  READ PATH (hook intercepts command):                            │
│  ─────────────────────────────────────────────────────────────── │
│  1. Hook detects /specweave:progress|status|jobs|workflow        │
│                                                                   │
│  2. Pure bash + jq reads pre-computed state:                     │
│     jq '.summary' .specweave/state/dashboard.json                │
│                                                                   │
│  3. Format output with bash printf/awk                           │
│     Target: <10ms response time                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Schema

```json
{
  "version": 1,
  "updatedAt": "2025-12-06T...",
  "increments": {
    "0116-livingspec-universal-standard": {
      "status": "completed",
      "type": "feature",
      "priority": "P1",
      "tasks": { "total": 8, "completed": 8 },
      "acs": { "total": 14, "completed": 14 },
      "createdAt": "2025-12-06T14:30:00Z",
      "lastActivity": "2025-12-06T23:59:00Z",
      "userStories": ["US-001", "US-002", ...]
    }
  },
  "summary": {
    "total": 26,
    "active": 0,
    "paused": 0,
    "backlog": 0,
    "completed": 26,
    "abandoned": 0,
    "archived": 15,
    "byType": {
      "feature": 20,
      "hotfix": 3,
      "bug": 2,
      "refactor": 1
    },
    "byPriority": {
      "P0": 2,
      "P1": 15,
      "P2": 9
    }
  },
  "jobs": {
    "running": [],
    "paused": [],
    "failed": [],
    "completedCount": 5
  },
  "costs": {
    "totalTokens": 0,
    "totalCost": 0,
    "byIncrement": {}
  }
}
```

## User Stories

### US-001: Cache Infrastructure
**As a** SpecWeave developer
**I want** a pre-computed dashboard cache
**So that** status commands have O(1) read complexity

**Acceptance Criteria:**
- [x] **AC-US1-01**: `dashboard.json` schema defined with version field for migrations
- [x] **AC-US1-02**: Cache includes increments, summary, jobs, and costs sections
- [x] **AC-US1-03**: Atomic writes prevent corruption (write to temp, rename)
- [x] **AC-US1-04**: Cache rebuilds automatically if missing or corrupted

### US-002: Write Path - Incremental Updates
**As a** SpecWeave user
**I want** cache to update incrementally when I complete tasks
**So that** updates are O(1) not O(n) where n = increment count

**Acceptance Criteria:**
- [x] **AC-US2-01**: Post-tool-use hook triggers cache update on metadata.json changes
- [x] **AC-US2-02**: Post-tool-use hook triggers cache update on tasks.md changes
- [x] **AC-US2-03**: Updates are incremental (only changed increment, not full rebuild)
- [x] **AC-US2-04**: Summary section recomputed efficiently (delta update)
- [x] **AC-US2-05**: Stale cache detection via mtime comparison

### US-003: Read Path - Pure Bash Readers
**As a** SpecWeave user
**I want** status commands to respond in <10ms
**So that** they feel instant like native CLI tools

**Acceptance Criteria:**
- [x] **AC-US3-01**: `/specweave:progress` reads from cache with pure bash + jq
- [x] **AC-US3-02**: `/specweave:status` reads from cache with pure bash + jq
- [x] **AC-US3-03**: `/specweave:jobs` reads from cache with pure bash + jq
- [x] **AC-US3-04**: No Node.js process spawned for any read operation
- [x] **AC-US3-05**: Graceful fallback to Node scripts if jq unavailable

### US-004: Cache Initialization and Recovery
**As a** SpecWeave user
**I want** cache to self-heal
**So that** I never have stale or missing data

**Acceptance Criteria:**
- [x] **AC-US4-01**: Session start hook rebuilds cache if missing
- [x] **AC-US4-02**: Cache validates version and rebuilds if schema changed
- [x] **AC-US4-03**: Manual rebuild command: `specweave cache --rebuild`
- [x] **AC-US4-04**: Cache age shown in status output (debug mode)

### US-005: Additional Instant Commands
**As a** SpecWeave user
**I want** more commands to be instant
**So that** my workflow is consistently fast

**Acceptance Criteria:**
- [x] **AC-US5-01**: `/specweave:workflow` reads from cache (current phase, suggestions)
- [x] **AC-US5-02**: `/specweave:costs` reads from cache (token/cost tracking)
- [x] **AC-US5-03**: Cache includes enough data for workflow suggestions

## Technical Design

### Files to Create

| File | Purpose |
|------|---------|
| `plugins/specweave/scripts/update-dashboard-cache.sh` | Incremental cache updater (bash) |
| `plugins/specweave/scripts/rebuild-dashboard-cache.sh` | Full cache rebuild (bash) |
| `plugins/specweave/scripts/read-progress.sh` | Pure bash progress reader |
| `plugins/specweave/scripts/read-status.sh` | Pure bash status reader |
| `plugins/specweave/scripts/read-jobs.sh` | Pure bash jobs reader |

### Files to Modify

| File | Change |
|------|--------|
| `plugins/specweave/hooks/user-prompt-submit.sh` | Replace Node scripts with bash readers |
| `plugins/specweave/hooks/v2/dispatchers/post-tool-use.sh` | Add cache update triggers |
| `plugins/specweave/hooks/v2/dispatchers/session-start.sh` | Add cache validation/rebuild |

### Performance Targets

| Command | Current | Target | Method |
|---------|---------|--------|--------|
| `/specweave:progress` | 100-500ms | <10ms | Pure bash + jq |
| `/specweave:status` | 100-500ms | <10ms | Pure bash + jq |
| `/specweave:jobs` | 100-300ms | <10ms | Pure bash + jq |
| `/specweave:workflow` | 3+ minutes | <10ms | Pure bash + jq |
| Cache update | N/A | <50ms | Incremental bash |

### Fallback Strategy

If `jq` is not available:
1. Detect at hook start: `command -v jq >/dev/null 2>&1`
2. Fall back to existing Node scripts (progress.js, status.js, jobs.js)
3. Show one-time warning: "Install jq for instant status commands"

## Dependencies

- None (pure bash + jq, no new npm packages)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache becomes stale | Wrong status shown | Mtime validation + periodic rebuild |
| Concurrent writes corrupt cache | Crash | Atomic write pattern (temp file + rename) |
| jq not installed | Slower fallback | Graceful degradation to Node scripts |
| Cache file grows too large | Slow reads | Prune archived increments from cache |

## Out of Scope

- Real-time streaming updates (WebSocket)
- Cross-machine cache sync
- Encrypted cache storage
- Historical metrics/trends (keep only current state)

## Success Metrics

1. **Response time**: Status commands <10ms (measured via `time` command)
2. **No regressions**: All existing output formats preserved
3. **Self-healing**: Cache automatically rebuilds if corrupted
4. **Zero dependencies**: Works on any system with bash (jq optional but recommended)
