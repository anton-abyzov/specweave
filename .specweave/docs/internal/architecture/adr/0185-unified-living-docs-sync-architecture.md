# ADR-0185: Unified Living Docs Sync Architecture

**Status**: Accepted
**Date**: 2025-12-01
**Author**: Anton Abyzov (Tech Lead), Claude (Architect)
**Scope**: Living Documentation Synchronization Strategy
**Related**: ADR-0030, ADR-0066, ADR-0135, ADR-0152

## Context

### Problem Statement

SpecWeave has multiple entry points that affect living documentation, but lacks a unified sync strategy:

**Current Sync Triggers:**
1. **Task Completion** (TodoWrite hook) - Works well
2. **Increment Completion** (/specweave:done) - Works well
3. **Increment Creation** (ADR-0135) - Pending implementation
4. **Bulk Import** (ADO/JIRA/GitHub 10K+ items) - No living docs sync
5. **Manual Changes** (skipping increments) - No detection
6. **Brownfield Import** (Notion exports) - One-time classification only

**Key Questions:**

1. **Bulk Import Scale**: How to sync living docs when importing 10,000+ ADO work items?
2. **Mid-Project Imports**: How to handle additional imports (Notion, Confluence) mid-project?
3. **Manual Changes**: How to detect and sync changes made outside increments?
4. **Consistency Requirements**: Who needs consistent docs and why?

### Stakeholder Consistency Requirements

| Stakeholder | Consistency Need | Use Case | Impact of Stale Docs |
|-------------|------------------|----------|---------------------|
| **Business Analytics** | Feature completion rates | ROI reporting, velocity metrics | Incorrect metrics, bad decisions |
| **Architects** | Current system state | Design reviews, capacity planning | Wrong assumptions, rework |
| **Security Team** | Audit trails | Compliance audits (SOC 2, HIPAA) | Audit failures, legal risk |
| **Tech Leads** | Accurate specs | Sprint planning, estimation | Over/under commitment |
| **New Hires** | Onboarding docs | Ramping up quickly | Longer onboarding, confusion |
| **Product Managers** | Feature status | Roadmap updates, stakeholder comms | Misaligned expectations |

**Conclusion**: Documentation consistency is **critical** for multiple stakeholders.

## Decision

**Implement a unified event-driven living docs sync architecture** with:

1. **5 Event Sources** for sync triggers
2. **Eventual Consistency Model** for most operations
3. **Drift Detection** for manual changes
4. **Batch Processing** for bulk imports

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Event Sources (Layer 1)                      │
├─────────────────────────────────────────────────────────────────┤
│  TodoWrite       IncrementCreated    /specweave:done            │
│  (task done)     (ADR-0135)          (increment done)           │
│       ↓                ↓                    ↓                    │
│  Import Job      Git Commit          Manual Reconcile           │
│  Complete        (drift detect)      (/reconcile)               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Sync Coordinator (Layer 2)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │ Permission  │  │ Throttling  │  │ Idempotency  │            │
│  │ Gates (1-4) │  │ (60s window)│  │ (3-layer)    │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐            │
│  │              Error Isolation                     │            │
│  │  (circuit breaker, graceful degradation)        │            │
│  └─────────────────────────────────────────────────┘            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               Living Docs Engine (Layer 3)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │    Spec     │  │ User Story  │  │   Feature    │            │
│  │ Extraction  │  │ Generation  │  │ Organization │            │
│  └─────────────┘  └─────────────┘  └──────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐            │
│  │           AC/Status Tracking                     │            │
│  │  (checkbox sync, completion percentage)         │            │
│  └─────────────────────────────────────────────────┘            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Adapters (Layer 4)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ GitHub  │  │  JIRA   │  │   ADO   │  │ Future: │           │
│  │  Sync   │  │  Sync   │  │  Sync   │  │ Linear, │           │
│  │         │  │         │  │         │  │ Notion  │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Scenarios Matrix

| Scenario | Trigger | Sync Type | Consistency | Timing |
|----------|---------|-----------|-------------|--------|
| Task Completion | TodoWrite hook | Incremental | Eventually (60s throttle) | Background |
| Increment Creation | IncrementCreated hook | Full | Immediate | Background |
| Increment Completion | /specweave:done | Full | Immediate | Foreground |
| Bulk Import (10K+) | Job completion event | Batch | Eventually | Background |
| Brownfield Import | /import-docs | Classification | Eventually | Foreground |
| Manual Changes | Drift detection | Reconciliation | Eventually | On-demand |

## Implementation Details

### 1. Bulk Import Living Docs Sync (10K+ Items)

**Problem**: Importing 10,000+ ADO items generates massive living docs updates.

**Solution**: Batch processing with chunked writes.

```typescript
// src/importers/living-docs-batch-sync.ts

interface BatchSyncConfig {
  batchSize: number;         // Items per batch (default: 100)
  delayBetweenBatches: number; // ms (default: 100)
  progressCallback?: (progress: BatchProgress) => void;
}

async function syncImportedItemsToLivingDocs(
  items: ExternalItem[],
  config: BatchSyncConfig = { batchSize: 100, delayBetweenBatches: 100 }
): Promise<BatchSyncResult> {
  const batches = chunk(items, config.batchSize);
  const results: BatchResult[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    // Process batch
    const batchResult = await processLivingDocsBatch(batch);
    results.push(batchResult);

    // Report progress
    config.progressCallback?.({
      current: (i + 1) * config.batchSize,
      total: items.length,
      percentage: Math.round(((i + 1) / batches.length) * 100),
      currentBatch: i + 1,
      totalBatches: batches.length
    });

    // Delay to prevent file system saturation
    if (i < batches.length - 1) {
      await sleep(config.delayBetweenBatches);
    }
  }

  return aggregateResults(results);
}

async function processLivingDocsBatch(items: ExternalItem[]): Promise<BatchResult> {
  // Group by feature/epic for efficient writes
  const groups = groupByFeature(items);

  for (const [featureId, featureItems] of groups) {
    // Create/update feature folder
    await ensureFeatureFolder(featureId);

    // Write all user stories in one pass
    await writeUserStoryBatch(featureId, featureItems);

    // Update feature README
    await updateFeatureReadme(featureId);
  }

  return { processedCount: items.length, errors: [] };
}
```

**Integration Point**: `import-worker.ts` triggers batch sync after import completes:

```typescript
// src/cli/workers/import-worker.ts (enhancement)

async function onImportComplete(result: ImportResult): Promise<void> {
  const items = result.items;

  if (items.length > 0) {
    logger.info(`🔄 Syncing ${items.length} items to living docs...`);

    await syncImportedItemsToLivingDocs(items, {
      batchSize: 100,
      delayBetweenBatches: 100,
      progressCallback: (progress) => {
        jobManager.updateProgress(jobId, {
          phase: 'living-docs-sync',
          ...progress
        });
      }
    });

    logger.info(`✅ Living docs sync complete`);
  }
}
```

### 2. Mid-Project Brownfield Import

**Problem**: User imports additional docs (Notion export) mid-project.

**Solution**: Incremental merge with conflict detection.

```typescript
// src/importers/brownfield-merger.ts

interface MergeResult {
  added: string[];      // New docs added
  merged: string[];     // Docs merged with existing
  conflicts: ConflictInfo[]; // Conflicts requiring review
  skipped: string[];    // Duplicates skipped
}

async function mergeImportedDocs(
  importedDocs: ImportedDoc[],
  targetDir: string
): Promise<MergeResult> {
  const result: MergeResult = { added: [], merged: [], conflicts: [], skipped: [] };

  for (const doc of importedDocs) {
    const existingPath = findMatchingDoc(doc, targetDir);

    if (!existingPath) {
      // New document - add directly
      await writeDoc(doc, targetDir);
      result.added.push(doc.title);
    } else {
      // Existing document - check for conflicts
      const conflict = detectConflict(doc, existingPath);

      if (conflict.hasConflict) {
        result.conflicts.push({
          imported: doc,
          existing: existingPath,
          conflictType: conflict.type,
          suggestedAction: conflict.suggestion
        });
      } else {
        // Safe to merge
        await mergeDoc(doc, existingPath);
        result.merged.push(doc.title);
      }
    }
  }

  return result;
}
```

**Conflict Types**:
- `TITLE_COLLISION`: Same title, different content
- `FEATURE_ID_COLLISION`: Same feature ID assigned
- `SEMANTIC_DUPLICATE`: AI-detected duplicate content
- `VERSION_MISMATCH`: Imported version older than existing

### 3. Drift Detection for Manual Changes

**Problem**: User fixes bugs or implements features without creating an increment.

**Solution**: Git commit analysis + optional reconciliation.

```typescript
// src/sync/drift-detector.ts

interface DriftReport {
  unmatchedCommits: UnmatchedCommit[];  // Commits without increments
  staleSpecs: StaleSpec[];              // Specs not matching code
  suggestedActions: SuggestedAction[];  // Reconciliation suggestions
}

async function detectDrift(options: DriftOptions = {}): Promise<DriftReport> {
  const report: DriftReport = {
    unmatchedCommits: [],
    staleSpecs: [],
    suggestedActions: []
  };

  // 1. Find commits without increment references
  const recentCommits = await getCommitsSince(options.since || '-30d');

  for (const commit of recentCommits) {
    const hasIncrement = await matchCommitToIncrement(commit);

    if (!hasIncrement && isFeatureCommit(commit)) {
      report.unmatchedCommits.push({
        sha: commit.sha,
        message: commit.message,
        files: commit.files,
        suggestedFeature: inferFeatureFromCommit(commit)
      });
    }
  }

  // 2. Find living docs that don't match code reality
  const livingDocs = await getAllLivingDocs();

  for (const doc of livingDocs) {
    const codeReality = await analyzeCodeForFeature(doc.featureId);

    if (doc.status === 'in-progress' && codeReality.isComplete) {
      report.staleSpecs.push({
        doc,
        reason: 'MARKED_INCOMPLETE_BUT_CODE_COMPLETE',
        codeEvidence: codeReality.evidence
      });
    }

    if (doc.status === 'complete' && !codeReality.exists) {
      report.staleSpecs.push({
        doc,
        reason: 'MARKED_COMPLETE_BUT_CODE_MISSING',
        codeEvidence: null
      });
    }
  }

  // 3. Generate reconciliation suggestions
  report.suggestedActions = generateSuggestions(report);

  return report;
}

function isFeatureCommit(commit: GitCommit): boolean {
  // Analyze commit message for feature indicators
  const featurePatterns = [
    /^feat(\(.+\))?:/i,     // Conventional commits
    /^add\s/i,              // "Add feature..."
    /^implement\s/i,        // "Implement..."
    /^fix(\(.+\))?:/i,      // Bug fixes
    /^refactor(\(.+\))?:/i, // Refactoring
  ];

  return featurePatterns.some(p => p.test(commit.message));
}
```

**Reconciliation Command**:

```bash
# Detect drift
/specweave:detect-drift

# Output:
# 📊 Drift Detection Report
#
# Unmatched Commits (last 30 days):
# - abc123: "feat: add user profile endpoint" (5 files)
#   → Suggested: Create increment for US-profile
# - def456: "fix: auth token expiry bug" (2 files)
#   → Suggested: Update FS-AUTH status
#
# Stale Living Docs:
# - FS-042: Marked complete, but code removed
#   → Suggested: Archive or mark deprecated
#
# Run `/specweave:reconcile` to fix automatically

# Auto-reconcile
/specweave:reconcile --auto

# Interactive reconcile
/specweave:reconcile --interactive
```

### 4. Event-Driven Sync Triggers

**New Events**:

```typescript
// src/sync/events.ts

enum SyncEvent {
  TASK_COMPLETED = 'task:completed',
  INCREMENT_CREATED = 'increment:created',
  INCREMENT_COMPLETED = 'increment:completed',
  IMPORT_COMPLETED = 'import:completed',
  MANUAL_RECONCILE = 'reconcile:requested',
  DRIFT_DETECTED = 'drift:detected'
}

interface SyncEventPayload {
  event: SyncEvent;
  incrementId?: string;
  featureId?: string;
  items?: ExternalItem[];
  source: 'hook' | 'command' | 'background-job' | 'drift-detector';
  timestamp: Date;
}

// Event handler registration
const syncEventHandlers: Map<SyncEvent, SyncEventHandler[]> = new Map();

function registerSyncHandler(event: SyncEvent, handler: SyncEventHandler): void {
  const handlers = syncEventHandlers.get(event) || [];
  handlers.push(handler);
  syncEventHandlers.set(event, handlers);
}

// Built-in handlers
registerSyncHandler(SyncEvent.IMPORT_COMPLETED, async (payload) => {
  await syncImportedItemsToLivingDocs(payload.items);
});

registerSyncHandler(SyncEvent.INCREMENT_CREATED, async (payload) => {
  await syncIncrementToLivingDocs(payload.incrementId);
  await syncToExternalTools(payload.incrementId);
});

registerSyncHandler(SyncEvent.DRIFT_DETECTED, async (payload) => {
  await notifyDriftDetected(payload);
});
```

### 5. Consistency Guarantees

**Eventual Consistency (Default)**:
- Sync happens asynchronously
- May take up to 60 seconds (throttle window)
- Safe for most use cases

**Immediate Consistency (Gates)**:
- `/specweave:done` validates before closing
- Blocks until sync complete
- Required for compliance scenarios

**Strong Consistency (Optional)**:
- Enable `sync.strongConsistency: true`
- All operations synchronous
- Higher latency, guaranteed accuracy

```json
// .specweave/config.json
{
  "sync": {
    "consistency": {
      "mode": "eventual",           // "eventual" | "immediate" | "strong"
      "throttleWindow": 60,         // seconds
      "maxRetries": 3,
      "retryDelay": 5000            // ms
    }
  }
}
```

## Alternatives Considered

### Alternative 1: Polling-Based Sync (Rejected)

**Approach**: Periodically poll for changes and sync.

```typescript
// Poll every 5 minutes
setInterval(async () => {
  const changes = await detectChanges();
  if (changes.length > 0) {
    await syncChanges(changes);
  }
}, 5 * 60 * 1000);
```

**Pros**:
- Simple implementation
- Works without hooks

**Cons**:
- ❌ Delayed sync (up to 5 minutes)
- ❌ Resource waste when idle
- ❌ Hard to debug timing issues
- ❌ Doesn't scale with activity

**Rejected because**: Event-driven is more efficient and responsive.

### Alternative 2: Synchronous Sync Only (Rejected)

**Approach**: All syncs are synchronous, blocking operations.

**Pros**:
- Strong consistency guaranteed
- Simple mental model

**Cons**:
- ❌ Blocks user on every task completion
- ❌ 10K item import would take hours interactively
- ❌ External API failures block workflow

**Rejected because**: Poor UX for bulk operations.

### Alternative 3: Manual Sync Only (Rejected)

**Approach**: User must explicitly run sync commands.

**Pros**:
- Full user control
- No unexpected behavior

**Cons**:
- ❌ Users forget to sync (30%+ miss rate observed)
- ❌ Docs drift immediately
- ❌ Defeats automation goal

**Rejected because**: History shows users don't sync manually.

## Consequences

### Positive

1. **Unified Architecture**: Single sync coordinator handles all scenarios
2. **Scalable**: Batch processing handles 100K+ items
3. **Resilient**: Eventual consistency tolerates transient failures
4. **Observable**: Drift detection catches manual changes
5. **Flexible**: Consistency mode configurable per use case

### Negative

1. **Complexity**: More moving parts than simple sync
2. **Debugging**: Event-driven flows harder to trace
3. **Learning Curve**: Users must understand consistency model

### Neutral

1. **Storage**: Drift detection requires commit analysis cache
2. **CPU**: Batch processing uses more CPU during imports

## Implementation Plan

### Phase 1: Bulk Import Sync (Week 1-2)
- Add `syncImportedItemsToLivingDocs()` to import-worker
- Implement batch processing with progress tracking
- Test with 10K+ ADO items

### Phase 2: Drift Detection (Week 3-4)
- Implement `detectDrift()` function
- Add `/specweave:detect-drift` command
- Add `/specweave:reconcile` command

### Phase 3: Event System (Week 5)
- Implement SyncEvent enum and handlers
- Migrate existing hooks to event system
- Add event logging for debugging

### Phase 4: Documentation (Week 6)
- Update public guides
- Add consistency model documentation
- Create troubleshooting guide

## Monitoring

**Metrics**:
- `sync_latency_ms`: Time from event to sync complete
- `sync_success_rate`: Percentage of successful syncs
- `drift_detected_count`: Number of drift instances found
- `batch_processing_rate`: Items per second during bulk import

**Alerts**:
- Alert if `sync_success_rate` < 95%
- Alert if `drift_detected_count` > 10 in 24h
- Alert if `sync_latency_ms` > 5000ms (p99)

## References

- **ADR-0030**: Intelligent Living Docs Sync (original design)
- **ADR-0066**: SyncCoordinator Integration Point
- **ADR-0135**: Increment Creation Sync Orchestration
- **ADR-0152**: Brownfield-First Specs Organization
- **docs/BACKGROUND-JOBS.md**: Background job infrastructure

---

**Approval Date**: 2025-12-01
**Review Date**: 2026-01-01 (30-day review)
