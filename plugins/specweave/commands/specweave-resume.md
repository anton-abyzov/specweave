---
name: specweave:resume
description: Resume a paused increment
usage: /specweave:resume <increment-id>
aliases: [resume]
---

# Resume Increment Command

**Usage**: `/specweave:resume <increment-id>`

**Shortcut**: `/resume <increment-id>`

---

## Purpose

Resume a paused increment when:
- **Blocker resolved** (API keys arrived, approval granted)
- **Ready to continue** after deprioritization
- **Prerequisite completed** (can now proceed)

---

## Behavior

1. **Validates** increment exists and is "paused"
2. **Calculates** pause duration (days, hours)
3. **Updates** metadata.json:
   - `status`: "paused" → "active"
   - Clears `pausedReason` and `pausedAt`
   - Updates `lastActivity` timestamp
4. **Displays** context (pause duration, last activity)
5. **Suggests** next actions (/do to continue work)

---

## Examples

### Resume after a few days
```bash
/resume 0006

✅ Increment 0006 resumed
⏱️  Was paused for: 3 days, 4 hours
💡 Last activity: Created translation pipeline
📋 Continue with: /do
```

### Resume after a few hours
```bash
/resume 0007

✅ Increment 0007 resumed
⏱️  Was paused for: 2 hours
📋 Continue with: /do
```

---

## Edge Cases

### Already Active
```bash
/resume 0006

⚠️  Increment 0006 is already active
   No action needed. Continue with: /do
```

### Cannot Resume Completed
```bash
/resume 0005

❌ Cannot resume increment 0005
   Status: completed
   Increment is already complete
```

### Resume Abandoned (Confirmation Required)
```bash
/resume 0008

⚠️  Increment 0008 is abandoned
   Reason: Requirements changed

   Are you sure you want to resume? [y/N]: y

✅ Increment 0008 resumed
⚠️  Note: Was abandoned 5 days ago
💡 Review spec.md to ensure still relevant
📋 Continue with: /do
```

### Increment Not Found
```bash
/resume 9999

❌ Increment not found: 9999
💡 Check paused increments: /status --paused
```

---

## Implementation

This command uses the MetadataManager to update increment status:

```typescript
import { MetadataManager, IncrementStatus } from '../src/core/increment/metadata-manager';

// Read current metadata
const metadata = MetadataManager.read(incrementId);

// Validate can resume
if (metadata.status === IncrementStatus.COMPLETED) {
  throw new Error('Cannot resume completed increment');
}

// Calculate pause duration
const pauseDuration = calculateDuration(metadata.pausedAt, new Date());

// Update status
MetadataManager.updateStatus(incrementId, IncrementStatus.ACTIVE);

// Display context
console.log(`Was paused for: ${pauseDuration}`);
console.log(`Last activity: ${getLastActivity(incrementId)}`);
```

---

## Status Flow

```
paused ──resume──> active
   │
abandoned ──resume──> active (with confirmation)
```

---

## Related Commands

- `/pause <id>` - Pause active increment
- `/status` - Show all increment statuses
- `/status --paused` - Show only paused increments
- `/do` - Continue work after resuming

---

## Best Practices

✅ **Review spec.md first** - Especially after long pauses

✅ **Check for changes** - Dependencies, requirements may have changed

✅ **Update estimates** - If scope changed during pause

✅ **Communicate** - Let team know you're resuming (if collaborative)

❌ **Don't blindly resume** - Re-validate context first

❌ **Don't resume abandoned without review** - Understand why it was abandoned

---

## Automatic Suggestions

When you run `/status`, stale paused increments trigger suggestions:

```bash
/status

⏸️  Paused (2):
  🔄 0006-stripe [feature]
     Paused: 3 days ago
     Reason: Waiting for API keys
     💡 Check if API keys arrived → /resume 0006

  🔄 0007-refactor [refactor]
     Paused: 10 days ago
     Reason: Deprioritized
     ⚠️  STALE! Consider resuming or abandoning
```

---

## Context Recovery

After resuming, the command shows helpful context:

```bash
/resume 0006

✅ Increment 0006 resumed

📊 Status before pause:
   - Progress: 30% (6/20 tasks done)
   - Last completed: T-005 (Create translation pipeline)
   - Paused reason: Waiting for Stripe API keys

💡 Next steps:
   1. Review spec.md (requirements may have changed)
   2. Check dependencies (are API keys available?)
   3. Continue with: /do

📋 Quick commands:
   /do           # Resume work
   /progress     # See detailed progress
   /validate     # Check increment health
```

---

**Command**: `/specweave:resume` (or `/resume`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
**Part of**: Increment 0007 - Smart Status Management
