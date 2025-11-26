# ADR-0031-002: Conflict Resolution Approach

**Status**: Accepted
**Date**: 2025-11-12
**Increment**: [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/)

---

## Context

When synchronizing statuses bidirectionally, conflicts can occur:
- User updates SpecWeave increment status to `completed`
- Teammate closes GitHub issue externally
- Both changes happen around the same time
- Which status should win?

---

## Decision

Use **prompt-first conflict resolution** with configurable strategies.

---

## Available Strategies

### 1. `prompt` (Default - Safest)
- **Behavior**: Ask user how to resolve conflict
- **Use when**: Safety is critical, manual verification needed
- **UX**: Shows both statuses with timestamps, user chooses

### 2. `last-write-wins`
- **Behavior**: Use most recent timestamp
- **Use when**: Trust timestamp accuracy, fast-paced projects
- **UX**: Automatic resolution, logs decision

### 3. `specweave-wins`
- **Behavior**: Always prefer SpecWeave status
- **Use when**: SpecWeave is source of truth
- **UX**: Automatic resolution, external tool reflects SpecWeave

### 4. `external-wins`
- **Behavior**: Always prefer external tool status
- **Use when**: External tool is source of truth (PM manages JIRA)
- **UX**: Automatic resolution, SpecWeave reflects external

---

## Rationale

### Why Prompt-First?

1. **Safety**: User verification prevents accidental overrides
2. **Transparency**: User sees both sides of conflict
3. **Learning**: User understands why conflicts happen
4. **Trust**: User controls resolution (no black-box decisions)

### Why Configurable?

- Different teams have different workflows
- Some teams prefer automation (`last-write-wins`)
- Some teams prefer manual control (`prompt`)
- Configuration enables team-specific policies

---

## Configuration

```json
{
  "sync": {
    "statusSync": {
      "enabled": true,
      "conflictResolution": "prompt"  // prompt|last-write-wins|specweave-wins|external-wins
    }
  }
}
```

---

## Conflict Detection Algorithm

```typescript
function detectConflict(
  specweaveStatus: string,
  externalStatus: string,
  lastSyncTime: Date
): ConflictInfo | null {

  // No conflict if statuses match
  if (specweaveStatus === mapToExternal(externalStatus)) {
    return null;
  }

  // Get timestamps
  const specweaveTime = getLastModifiedTime('metadata.json');
  const externalTime = getExternalIssueModifiedTime();

  // Conflict if both changed since last sync
  if (specweaveTime > lastSyncTime && externalTime > lastSyncTime) {
    return {
      specweaveStatus,
      externalStatus,
      specweaveTime,
      externalTime,
      conflict: true
    };
  }

  return null;
}
```

---

## Prompt UX Example

```
🔄 Conflict detected!

SpecWeave: completed (changed 2025-11-10 12:00)
GitHub:    open (changed 2025-11-10 11:00)

How to resolve?
  1. Use SpecWeave status (completed → close GitHub issue)
  2. Use GitHub status (open → revert SpecWeave to active)
  3. Cancel sync
```

---

## Consequences

### Positive
- ✅ User has full control (safe)
- ✅ Transparent decision-making
- ✅ Flexible (configurable strategies)
- ✅ Trust-building (no surprises)

### Neutral
- ⚠️ User interaction required (for `prompt` strategy)
  - Mitigated by: other strategies available

---

## Conflict Logging

All conflict resolutions logged to `.specweave/logs/sync-events.json`:

```json
{
  "timestamp": "2025-11-10T12:05:00Z",
  "incrementId": "0031-external-tool-status-sync",
  "tool": "github",
  "conflictDetected": true,
  "specweaveStatus": "completed",
  "externalStatus": "open",
  "resolution": "specweave-wins",
  "resolvedBy": "user",
  "finalStatus": "completed"
}
```

---

## Related

- **ADR**: [Status Mapping Strategy](0031-001-status-mapping-strategy.md) - How statuses are mapped
- **ADR**: [Bidirectional Sync Implementation](0031-003-bidirectional-sync-implementation.md) - Sync flow
- **Increment**: [0031-external-tool-status-sync](../../../../increments/0031-external-tool-status-sync/)
