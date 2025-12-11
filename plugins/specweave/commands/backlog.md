---
name: specweave:backlog
description: Move an increment to backlog (planned but not ready to start)
usage: /specweave:backlog <increment-id> --reason="<reason>"
---

# Backlog Increment Command

**Usage**: `/specweave:backlog <increment-id> --reason="<reason>"`

---

## Purpose

Move an increment to backlog when:
- **Planned** but not ready to start yet
- **Low priority** compared to other work
- **Waiting** for decisions or approvals before starting
- **Multiple ideas** you want to plan without violating WIP limits

**Key Difference**:
- **Backlog** = Never started, planned for future (does NOT count towards WIP)
- **Paused** = Started but blocked (does NOT count towards WIP)

---

## Behavior

1. **Validates** increment exists and is "active"
2. **Prompts** for reason if not provided via --reason flag
3. **Updates** metadata.json:
   - `status`: "active" → "backlog"
   - `backlogReason`: User-provided reason
   - `backlogAt`: Current timestamp
4. **Displays** confirmation message
5. **Suggests** next actions (`/specweave:resume` to start work)

---

## Examples

### Move to backlog with reason
```bash
/specweave:backlog 0032 --reason="Low priority, focus on 0031 first"

✅ Increment 0032 moved to backlog
📝 Reason: Low priority, focus on 0031 first
🗂️  No longer counts toward WIP limits
💡 Start work with: /specweave:resume 0032
```

### Move to backlog without reason (prompts)
```bash
/specweave:backlog 0032

❓ Why are you moving this to backlog?
   1. Low priority
   2. Waiting for decisions/approvals
   3. Multiple planned ideas
   4. Other (type reason)

> 1

✅ Increment 0032 moved to backlog
📝 Reason: Low priority
💡 Start work with: /specweave:resume 0032
```

---

## Edge Cases

### Already in Backlog
```bash
/specweave:backlog 0032 --reason="Different reason"

⚠️  Increment 0032 is already in backlog
   Previous reason: Low priority
   New reason: Different reason

Update reason? [Y/n]: y

✅ Reason updated
📝 New reason: Different reason
```

### Cannot Backlog Completed
```bash
/specweave:backlog 0005

❌ Cannot move increment 0005 to backlog
   Status: completed
   Completed increments cannot be moved to backlog
```

### Cannot Backlog Paused
```bash
/specweave:backlog 0008

❌ Cannot move increment 0008 to backlog
   Status: paused
   Paused work should be resumed or abandoned, not moved to backlog
   Resume it: /specweave:resume 0008
```

### Increment Not Found
```bash
/specweave:backlog 9999

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

// Validate can move to backlog
if (metadata.status !== IncrementStatus.ACTIVE) {
  throw new Error(`Cannot move increment with status: ${metadata.status}`);
}

// Update status
MetadataManager.updateStatus(incrementId, IncrementStatus.BACKLOG, reason);
```

---

## Status Flow

```
active ──backlog──> backlog
   │
   └──resume──> active
```

---

## Related Commands

- `/specweave:resume <id>` - Move from backlog to active (start work)
- `/specweave:pause <id>` - Pause active work (different from backlog)
- `/specweave:status` - Show all increment statuses including backlog
- `/specweave:abandon <id>` - Abandon increment (permanent)

---

## Best Practices

✅ **Use backlog for planning** - Plan multiple increments without violating WIP

✅ **Prioritize backlog regularly** - Review and reorder based on value

✅ **Clear reasons** - Helps with prioritization decisions

✅ **Start when ready** - Use `/specweave:resume` to move from backlog to active

❌ **Don't confuse with paused** - Backlog = never started, Paused = started but blocked

❌ **Don't let backlog grow unbounded** - Review and abandon obsolete items

---

## Backlog vs Paused

| Aspect | Backlog | Paused |
|--------|---------|--------|
| **Definition** | Planned but not started | Started but blocked |
| **WIP Count** | NO | NO |
| **Use Case** | Low priority, future work | Blocked, deprioritized |
| **Resume** | Start from beginning | Continue where left off |

---

## Warning: Large Backlog

If your backlog grows too large (10+ increments), `/specweave:status` will warn:

```bash
/specweave:status

🗂️  Backlog (12):
  📦 0032-feature-a [feature] - Low priority
  📦 0033-feature-b [feature] - Waiting for decisions
  📦 0034-feature-c [feature] - Multiple planned ideas
  ... (9 more)

⚠️  Large backlog! Consider:
   - Abandoning obsolete items
   - Consolidating similar features
   - Reviewing priorities

💡 Actions:
   /specweave:resume <id>  # Start work on highest priority
   /specweave:abandon <id> # Remove obsolete items
```

---

**Command**: `/specweave:backlog`
**Plugin**: specweave (core)
**Version**: v0.19.0+
**Part of**: Backlog Support Feature
