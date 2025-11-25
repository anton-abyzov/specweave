---
id: specweave-status
title: /specweave:status Command
sidebar_label: specweave:status
---

# /specweave:status Command

The **`/specweave:status`** command shows a comprehensive overview of all [increments](/docs/glossary/terms/increments) with [WIP limits](/docs/glossary/terms/wip-limits) and smart suggestions.

## What It Does

**Key information:**
- Overall progress (X/Y complete, Z%)
- Active increments (currently working)
- Paused increments (blocked with reasons)
- Completed increments (shipped)
- Abandoned increments (cancelled)
- WIP limit status
- Smart suggestions

## Usage

```bash
# View all increments
/specweave:status

# Verbose mode (detailed)
/specweave:status --verbose

# Filter by type
/specweave:status --type=feature
```

## Output Example

```bash
$ /specweave:status

📊 Increment Status

📈 Overall Progress: 3/8 increments complete (38%)

▶️  Active (1):
  ● 0007-user-authentication [feature] (80% complete)

⏸️  Paused (1):
  ⏸ 0005-kubernetes-migration [feature]
     Reason: Waiting for DevOps approval

✅ Completed (3):
  0001-core-framework
  0002-core-enhancements
  0004-plugin-architecture

❌ Abandoned (3):
  0003-old-approach (Requirements changed)

📈 WIP Limit:
  ✅ Active increments: 1/1

💡 Continue work with: /specweave:do
```

## Status Icons

| Status | Icon | Meaning |
|--------|------|---------|
| Active | ● | Currently working |
| Paused | ⏸ | Temporarily blocked |
| Completed | ✅ | Done and shipped |
| Abandoned | ❌ | Cancelled/obsolete |
| Stale | ⚠️ | Paused >7 days |

## WIP Limit Warnings

When exceeding limits:

```bash
📈 WIP Limit:
  ⚠️  Active increments: 3/1 (EXCEEDS LIMIT!)
     💡 Run 'specweave pause <id>' to pause one

⚠️  WARNING: High context switching detected!
   Research shows: 3+ concurrent tasks = 40-60% productivity loss
```

## Related

- [WIP Limits](/docs/glossary/terms/wip-limits) - Work-in-progress limits
- [Increments](/docs/glossary/terms/increments) - Work units
- [/specweave:progress](/docs/glossary/terms/specweave-progress) - Detailed progress
- [Commands: status](/docs/commands/status) - Full documentation
