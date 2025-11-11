---
name: specweave:revert-wip-limit
description: Revert WIP limit to original value after temporary adjustment
---

# Revert WIP Limit Command

**Purpose**: Restore WIP (Work In Progress) limit to original value after temporary adjustment

## What This Command Does

When you temporarily adjust the WIP limit using the migration system:
```bash
bash plugins/specweave/hooks/lib/migrate-increment-work.sh adjust-wip 3
```

This command reverts it back to the original value (usually 2).

## Usage

```bash
/specweave:revert-wip-limit
```

## What Gets Reverted

1. **WIP Limit**: Restored to original `hardCap` value (stored in `config.limits.originalHardCap`)
2. **Timestamp**: Cleared (`wipAdjustedAt` removed)
3. **Backup**: Original config backup is kept for safety

## Example Workflow

```bash
# 1. WIP limit reached, temporarily adjust
bash plugins/specweave/hooks/lib/migrate-increment-work.sh adjust-wip 3

# 2. Work on both increments (20% productivity cost)

# 3. Complete one increment
/specweave:done 0026

# 4. Revert WIP limit back to 2
/specweave:revert-wip-limit
```

## Output

```
✅ WIP limit reverted to original value: 2
   Previous limit: 3
   Adjusted at: 2025-11-11T15:30:00Z
   Duration: 2 hours 15 minutes
```

## Implementation

You should:

1. Read `.specweave/config.json`
2. Check if `limits.originalHardCap` exists
3. If yes:
   - Restore `limits.hardCap = limits.originalHardCap`
   - Remove `limits.wipAdjustedAt`
   - Remove `limits.originalHardCap`
   - Save config
4. If no: Show "No temporary WIP adjustment to revert"

## Safety

- ✅ Creates backup before reverting (`.specweave/config.json.bak`)
- ✅ Validates config structure
- ✅ Shows confirmation message
- ✅ Non-destructive (can manually restore from backup if needed)

## Best Practice

**Revert ASAP!** Temporary WIP adjustments are for emergencies only. The longer you work with 3+ active increments, the more productivity suffers.

**Research shows**:
- 1 active increment = 100% productivity ✅
- 2 active increments = 80% productivity (20% cost) ⚠️
- 3+ active increments = 60% productivity (40% cost) ❌
