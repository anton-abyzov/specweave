---
sidebar_position: 3
---

# resume

Resume a paused or abandoned increment.

## Synopsis

```bash
specweave resume <increment-id> [options]
```

## Description

The `resume` command restarts work on a paused or abandoned increment. It validates WIP limits before resuming to ensure you don't exceed your focus capacity.

**Use resume when**:
- ✅ Blockage resolved (API access granted, approval received)
- ✅ Priorities shifted back (urgent work complete)
- ✅ Decided to continue abandoned work

:::tip WIP Limit Enforcement
Resume command **enforces WIP limits**. If you're at your limit, pause another increment first or use `--force`.
:::

## Options

### `<increment-id>` (required)

The increment to resume (e.g., `0007-payment-integration`).

```bash
specweave resume 0007-payment-integration
```

### `--force` or `-f`

Bypass WIP limit checks (emergency use only).

```bash
specweave resume 0007 --force
```

:::warning Use --force Sparingly
Only bypass limits for emergencies (production down, critical deadline). Document why you used it.
:::

## Examples

### Example 1: Resume After Blockage Resolved

```bash
# Earlier: paused due to blockage
$ specweave pause 0007 --reason "Waiting for API keys"

# API keys arrived
$ specweave resume 0007

# Output:
▶️  Resuming increment 0007-payment-integration...

✅ Increment 0007-payment-integration resumed
▶️  Now counts as active
📝 Was paused for: Waiting for API keys

💡 Continue work with: specweave do 0007-payment-integration
```

### Example 2: WIP Limit Prevents Resume

```bash
$ specweave status
▶️  Active (1): 0008-feature-y
⏸️  Paused (1): 0007-feature-x

$ specweave resume 0007

# Output:
▶️  Resuming increment 0007...

⚠️  WARNING: WIP Limit Reached
   Current active: 1
   Limit: 1
   Resuming will exceed limit

   Complete or pause another increment first
   Or use --force to bypass this warning
```

**Solution**:
```bash
# Option 1: Pause other increment
$ specweave pause 0008 --reason "Pausing for 0007"
$ specweave resume 0007  # ✅ Works now

# Option 2: Force (emergency only)
$ specweave resume 0007 --force
```

### Example 3: Resume Abandoned Work

```bash
# Earlier: abandoned due to requirements change
$ specweave abandon 0005 --reason "Requirements changed"

# Later: requirements changed back
$ specweave resume 0005

✅ Increment 0005 resumed
📝 Was abandoned for: Requirements changed
```

### Example 4: Resume with Force

```bash
# Already at limit
$ specweave status
▶️  Active (1): 0008-feature

# Need to work on both (emergency)
$ specweave resume 0007 --force

✅ Increment 0007 resumed (forced)
⚠️  WARNING: WIP limit exceeded (2/1 active)
📝 Document why you used --force in your next standup/PR
```

## Behavior

### Status Transitions

```mermaid
graph LR
    A[Paused] -->|resume| B[Active]
    C[Abandoned] -->|resume| B
    B -->|pause| A
```

**Valid transitions**:
- `paused` → `active` ✅
- `abandoned` → `active` ✅

**Invalid transitions**:
- `active` → `active` (already active) ℹ️
- `completed` → `active` ❌

### Metadata Changes

```json
// Before resume (paused)
{
  "id": "0007-payment-integration",
  "status": "paused",
  "pausedReason": "Waiting for API keys",
  "pausedAt": "2025-11-04T10:00:00Z",
  "lastActivity": "2025-11-04T10:00:00Z"
}

// After resume
{
  "id": "0007-payment-integration",
  "status": "active",                        // ← Changed
  "pausedReason": "Waiting for API keys",    // ← Preserved (history)
  "pausedAt": "2025-11-04T10:00:00Z",        // ← Preserved (history)
  "lastActivity": "2025-11-05T14:30:00Z"     // ← Updated
}
```

### WIP Limit Validation

```typescript
// Pseudo-code
if (activeCount >= limit && !force) {
  show_warning();
  exit(1);
}

// Allow resume
update_status(increment, 'active');
```

## Error Handling

### Already Active

```bash
$ specweave resume 0007
⚠️  Increment 0007 is already active
   Nothing to resume
```

**Solution**: It's already active. Continue working on it.

### Cannot Resume Completed

```bash
$ specweave resume 0001
❌ Cannot resume increment 0001
   Status: completed
   Completed increments cannot be resumed
```

**Solution**: Increment is done. Start a new one if needed.

### WIP Limit Reached

```bash
$ specweave resume 0007
⚠️  WARNING: WIP Limit Reached
   Current active: 1
   Limit: 1
   Resuming will exceed limit
```

**Solutions**:
```bash
# 1. Complete current work (best)
$ specweave do

# 2. Pause current work
$ specweave pause 0008 --reason "..."

# 3. Force (emergency only)
$ specweave resume 0007 --force
```

## Best Practices

### 1. Check Status Before Resume

```bash
# ❌ Bad - blind resume
specweave resume 0007

# ✅ Good - check first
$ specweave status
▶️  Active (1): 0008-feature
⏸️  Paused (1): 0007-feature

$ specweave pause 0008 --reason "..."
$ specweave resume 0007
```

### 2. Document Force Usage

If you use `--force`, document why:

```bash
$ specweave resume 0007 --force

# Then in git commit or standup:
"Used --force to resume 0007 because production was down and we needed both hotfixes running in parallel"
```

### 3. Clean Resume Flow

**Good pattern**:
```bash
# 1. Check what's paused
$ specweave status

# 2. Verify blockage resolved
# (check email, IT ticket, etc.)

# 3. Resume
$ specweave resume <id>

# 4. Continue work
$ specweave do
```

### 4. Review Paused Before Resume

```bash
# Don't resume blindly
$ specweave status
⏸️  Paused (5):  # Lots of paused work!

# Review each one
# - Still relevant? Resume
# - No longer needed? Abandon
# - Still blocked? Keep paused, update reason
```

## Common Scenarios

### Scenario 1: Dependency Resolved

```bash
# Day 1: Blocked
$ specweave pause 0007 --reason "Waiting for API keys (IT#1234)"

# Day 3: Keys arrived
$ specweave resume 0007
$ specweave do
```

### Scenario 2: Priority Shift

```bash
# Week 1: Regular feature, but hotfix needed
$ specweave pause 0007 --reason "Pausing for hotfix 0009"
$ specweave inc "0009-critical-fix"
$ specweave do

# Week 2: Hotfix done, resume feature
$ specweave resume 0007
$ specweave do
```

### Scenario 3: Multiple Paused, Selective Resume

```bash
$ specweave status
⏸️  Paused (3):
  ⏸ 0005 (30 days ago)
  ⏸ 0007 (7 days ago)
  ⏸ 0008 (2 days ago)

# Resume most recent
$ specweave resume 0008  # Most fresh in memory

# Abandon old ones
$ specweave abandon 0005 --reason "Too old, requirements likely changed"
```

## Integration with Other Commands

### status → resume

```bash
$ specweave status
⏸️  Paused (1): 0007-payment
$ specweave resume 0007
```

### pause → resume

```bash
$ specweave pause 0007 --reason "Blocked"
# ... blockage resolved ...
$ specweave resume 0007
```

### resume → do

```bash
$ specweave resume 0007
$ specweave do  # Continue work
```

## See Also

- [`pause`](./pause.md) - Pause active work
- [`abandon`](./abandon.md) - Cancel work permanently
- [`status`](./status.md) - Check current status
- [Status Management Guide](./status-management.md) - Complete workflow guide

## Summary

**Key Points**:
- ✅ Resume paused or abandoned work
- ✅ WIP limits enforced (use `--force` sparingly)
- ✅ Preserved history (paused reason, timestamps)
- ✅ Check status before resuming

**Command**:
```bash
specweave resume <increment-id> [--force]
```

**Philosophy**:
> Resume when unblocked. Respect WIP limits. Document exceptions.
