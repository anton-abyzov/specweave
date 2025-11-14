# ADR-0031-003: Bidirectional Sync Implementation

**Status**: Accepted
**Date**: 2025-11-12
**Increment**: [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/)

---

## Context

Status synchronization can happen in three directions:
1. **To-External**: SpecWeave → GitHub/JIRA/ADO (push changes)
2. **From-External**: GitHub/JIRA/ADO → SpecWeave (pull changes)
3. **Bidirectional**: Both ways (two-way sync)

We need to decide on the sync model: pull-based, push-based, or hybrid.

---

## Decision

Implement **hybrid bidirectional sync** with intelligent conflict detection.

---

## Sync Directions

### To-External (Push)

**Trigger**: After `/specweave:done` or manual sync
**Flow**:
1. Check if external link exists (`metadata.json` has GitHub issue, JIRA story, or ADO work item)
2. Map SpecWeave status → external status
3. Update external issue via API
4. Log sync event

**Example**:
```
SpecWeave: completed → GitHub: closed
JIRA: In Progress → SpecWeave: active
```

### From-External (Pull)

**Trigger**: Manual sync or scheduled polling
**Flow**:
1. Fetch external issue status
2. Map external status → SpecWeave status
3. Detect conflicts (both changed since last sync)
4. Resolve conflict (via strategy)
5. Update SpecWeave metadata
6. Log sync event

**Example**:
```
GitHub: closed → SpecWeave: completed
ADO: Removed → SpecWeave: abandoned
```

### Bidirectional (Two-Way)

**Trigger**: Manual sync with `--direction bidirectional`
**Flow**:
1. Fetch external status
2. Compare with SpecWeave status
3. If different → detect conflict
4. Resolve via configured strategy
5. Sync final status in both directions
6. Log sync event

---

## Rationale

### Why Hybrid?

1. **To-External is automatic** (after `/specweave:done`)
   - Users expect external tools to update after completion
   - Natural workflow: finish work → close issue

2. **From-External is manual** (user-initiated)
   - Polling external tools wastes API calls
   - User knows when external status changed
   - Pull on-demand when needed

3. **Bidirectional for conflicts**
   - Detects simultaneous changes
   - Resolves via configured strategy
   - Keeps both sides in sync

### Why Not Full Automation?

**Polling** (rejected):
- ❌ Wastes API calls (rate limits)
- ❌ Battery drain (constant requests)
- ❌ Not needed 90% of time

**Webhooks** (deferred to future):
- ✅ Real-time updates
- ❌ Complex setup (server required)
- ❌ Not all tools support webhooks (JIRA Cloud requires paid plan)

---

## Pull vs Push Trade-offs

| Aspect | Pull-Based | Push-Based | Hybrid (Selected) |
|--------|-----------|-----------|------------------|
| **Latency** | High (manual) | Low (automatic) | Medium (context-dependent) |
| **API Calls** | Low (on-demand) | Medium (per update) | Low (smart triggers) |
| **Complexity** | Low (simple) | Low (simple) | Medium (conflict detection) |
| **User Control** | High (explicit) | Low (automatic) | High (configurable) |
| **Conflicts** | None (one-way) | None (one-way) | Handled (two-way) |

---

## Implementation

### To-External (Automatic)

Triggered by `/specweave:done`:

```typescript
async function syncToExternal(incrementId: string) {
  const metadata = await loadMetadata(incrementId);

  if (!metadata.github && !metadata.jira && !metadata.ado) {
    console.log('No external link found, skipping sync');
    return;
  }

  const specweaveStatus = metadata.status;
  const externalStatus = mapToExternal(specweaveStatus, tool);

  await updateExternalIssue(metadata.github.issue, externalStatus);
  await logSyncEvent({ direction: 'to-external', ... });
}
```

### From-External (Manual)

Triggered by `/specweave-github:sync-from <id>`:

```typescript
async function syncFromExternal(incrementId: string) {
  const metadata = await loadMetadata(incrementId);
  const externalStatus = await fetchExternalStatus(metadata.github.issue);
  const specweaveStatus = mapFromExternal(externalStatus);

  if (metadata.status !== specweaveStatus) {
    // Conflict detected - resolve via strategy
    const resolution = await resolveConflict(metadata.status, specweaveStatus);
    metadata.status = resolution.finalStatus;
    await saveMetadata(incrementId, metadata);
  }

  await logSyncEvent({ direction: 'from-external', ... });
}
```

### Bidirectional (Manual)

Triggered by `/specweave-github:sync <id>`:

```typescript
async function syncBidirectional(incrementId: string) {
  // 1. Fetch both statuses
  const specweaveStatus = await loadMetadata(incrementId).status;
  const externalStatus = await fetchExternalStatus(...);

  // 2. Detect conflict
  const conflict = detectConflict(specweaveStatus, externalStatus, lastSyncTime);

  if (conflict) {
    // 3. Resolve via strategy
    const resolution = await resolveConflict(conflict);

    // 4. Sync final status to both sides
    await updateSpecWeave(resolution.finalStatus);
    await updateExternal(resolution.finalStatus);
  }

  await logSyncEvent({ direction: 'bidirectional', ... });
}
```

---

## Consequences

### Positive
- ✅ Automatic to-external (good UX)
- ✅ Manual from-external (saves API calls)
- ✅ Bidirectional for conflicts (safe)
- ✅ Configurable strategies (team-specific)

### Neutral
- ⚠️ Not real-time (acceptable for most teams)
  - Future: Webhooks for real-time (v2 feature)

---

## Sync Event Logging

All sync operations logged to `.specweave/logs/sync-events.json`:

```json
{
  "timestamp": "2025-11-10T12:00:00Z",
  "incrementId": "0031-external-tool-status-sync",
  "tool": "github",
  "direction": "to-external",
  "fromStatus": "active",
  "toStatus": "completed",
  "externalStatus": "closed",
  "success": true,
  "triggeredBy": "user"
}
```

---

## Related

- **ADR**: [Status Mapping Strategy](0031-001-status-mapping-strategy.md) - How statuses are mapped
- **ADR**: [Conflict Resolution Approach](0031-002-conflict-resolution-approach.md) - How conflicts are resolved
- **Increment**: [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/)
