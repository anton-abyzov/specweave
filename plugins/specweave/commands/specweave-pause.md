---
name: specweave:pause
description: Pause an active increment (blocked by external dependency, deprioritized)
usage: /specweave:pause <increment-id> --reason="<reason>"
---

# Pause Increment Command

**Usage**: `/specweave:pause <increment-id> --reason="<reason>"`

---

## Purpose

Pause an active increment when:
- **Blocked** by external dependency (API keys, approvals, reviews)
- **Waiting** for another increment to complete
- **Deprioritized** (will return to later)
- **Needs discussion** before continuing

---

## Behavior

1. **Validates** increment exists and is "active"
2. **Prompts** for reason if not provided via --reason flag
3. **Updates** metadata.json:
   - `status`: "active" → "paused"
   - `pausedReason`: User-provided reason
   - `pausedAt`: Current timestamp
4. **Displays** confirmation message
5. **Suggests** next actions (/resume to continue)

---

## Examples

### Pause with reason
```bash
/specweave:pause 0006 --reason="Waiting for Stripe API keys"

✅ Increment 0006 paused
📝 Reason: Waiting for Stripe API keys
⏸️  No longer counts toward active limit
💡 Resume with: /specweave:resume 0006
```

### Pause without reason (prompts)
```bash
/specweave:pause 0006

❓ Why are you pausing this increment?
   1. Blocked by external dependency
   2. Waiting for code review
   3. Deprioritized
   4. Other (type reason)

> 1

✅ Increment 0006 paused
📝 Reason: Blocked by external dependency
💡 Resume with: /specweave:resume 0006
```

---

## Edge Cases

### Already Paused
```bash
/specweave:pause 0006 --reason="Different reason"

⚠️  Increment 0006 is already paused
   Previous reason: Waiting for Stripe API keys
   New reason: Different reason

Update reason? [Y/n]: y

✅ Reason updated
📝 New reason: Different reason
```

### Cannot Pause Completed
```bash
/specweave:pause 0005

❌ Cannot pause increment 0005
   Status: completed
   Completed increments cannot be paused
```

### Cannot Pause Abandoned
```bash
/specweave:pause 0008

❌ Cannot pause increment 0008
   Status: abandoned
   Resume it first: /specweave:resume 0008
```

### Increment Not Found
```bash
/specweave:pause 9999

❌ Increment not found: 9999
💡 Check available increments: /specweave:status
```

---

## Implementation

This command uses the MetadataManager to update increment status:

```typescript
import { MetadataManager, IncrementStatus } from '../src/core/increment/metadata-manager';

// Read current metadata
const metadata = MetadataManager.read(incrementId);

// Validate can pause
if (metadata.status !== IncrementStatus.ACTIVE) {
  throw new Error(`Cannot pause increment with status: ${metadata.status}`);
}

// Update status
MetadataManager.updateStatus(incrementId, IncrementStatus.PAUSED, reason);
```

---

## Status Flow

```
active ──pause──> paused
   │
   └──resume──> active
```

---

## Related Commands

- `/resume <id>` - Resume paused increment
- `/abandon <id>` - Abandon increment (permanent)
- `/status` - Show all increment statuses

---

## Best Practices

✅ **Always provide a reason** - Helps future you remember context

✅ **Review paused increments weekly** - Don't let them pile up

✅ **Set calendar reminder** - For external blockers (API keys, approvals)

✅ **Resume or abandon** - After 7+ days paused

❌ **Don't pause as procrastination** - Address scope/motivation issues instead

❌ **Don't pause to start new work** - Finish current work first (focus)

---

## Warning: Stale Paused Increments

Increments paused for **7+ days** trigger warnings in `/status`:

```bash
/status

⏸️  Paused (1):
  🔄 0007-stripe-integration [feature]
     Paused: 10 days ago
     Reason: Waiting for Stripe API keys
     ⚠️  STALE! Review or abandon?

💡 Actions:
   /resume 0007  # If unblocked
   /abandon 0007 # If no longer needed
```

---

**Command**: `/specweave:pause` (or `/pause`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
**Part of**: Increment 0007 - Smart Status Management
