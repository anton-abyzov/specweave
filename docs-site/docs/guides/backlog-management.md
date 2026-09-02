import CommandTabs from '@site/src/components/CommandTabs';

# Backlog Management Guide

## Overview

SpecWeave's backlog feature allows you to plan and organize future work without inflating the active (Work In Progress) count. Backlog increments are planned but not yet started, providing a clear separation between active work and future plans.

## When to Use Backlog

Use the backlog when you want to:

- **Plan ahead**: Create specifications for future features without starting work
- **Prioritize work**: Have multiple ideas and need to queue lower-priority items
- **Handle stakeholder requests**: Capture requested features for later implementation
- **Wait for approvals**: Spec is ready, but waiting for decisions before starting

## Key Differences

| Aspect | Backlog | Active | Paused |
|--------|---------|--------|--------|
| **Started?** | No | Yes | Yes |
| **Counts towards WIP?** | ❌ No | ✅ Yes | ❌ No |
| **Use Case** | Future plans | Current work | Blocked work |
| **When to use** | Low priority, future | Ready to work | Waiting on dependency |

## Commands

### Move to Backlog

<CommandTabs
  natural="Let's build Feature B"
  claude='sw:increment "Feature B"'
  other='increment "Feature B"'
/>

Then move to backlog:
```bash
specweave status 0032 --reason="Low priority, focus on 0031 first"
```

### Resume from Backlog

```bash
# When ready to start work
specweave resume 0032
sw:do
```

### View Backlog

```bash
# Show all backlog increments
specweave status --backlog
```

## Backlog Workflow

### 1. Plan Multiple Features

```bash
# Create three feature specs
sw:increment "User Authentication"  # 0030
sw:increment "Payment Integration"  # 0031
sw:increment "Email Notifications"  # 0032

# Prioritize: Start with 0030, backlog the rest
specweave status 0031 --reason="Lower priority, do after auth"
specweave status 0032 --reason="Depends on auth completion"

# Now work on 0030
sw:do
```

**Result**:
- ✅ 0030 is active (counts towards WIP)
- ✅ 0031 and 0032 are in backlog (do NOT count towards WIP)
- ✅ Clear prioritization

### 2. Capture Stakeholder Requests

```bash
# Stakeholder requests new feature during sprint
sw:increment "Admin Dashboard" --type feature
specweave status 0033 --reason="Requested by stakeholders, plan for Q2"

# Continue current work without interruption
sw:do
```

**Benefit**: Capture ideas immediately without context switching

### 3. Progressive Planning

```bash
# Morning: Plan your week
sw:increment "Feature A"  # High priority
sw:increment "Feature B"  # Medium priority
sw:increment "Feature C"  # Low priority

# Organize by priority
specweave status 0035 --reason="Medium priority, do after 0034"
specweave status 0036 --reason="Low priority, nice-to-have"

# Start with highest priority
sw:do

# Later: Complete 0034, start next
sw:done 0034
specweave resume 0035  # Pull from backlog
sw:do
```

## Backlog Status Display

### View All Statuses

```bash
specweave status

🔥 Active (1):
  🔧 0034-feature-a [feature] (50% done)

🗂️  Backlog (2):
  📦 0035-feature-b [feature]
     In backlog: 2 days
     Reason: Medium priority

  📦 0036-feature-c [feature]
     In backlog: 2 days
     Reason: Low priority

⏸️  Paused (0)
✅ Completed (33)
```

### Filter Backlog Only

```bash
specweave status --backlog

🗂️  Backlog (2):
  📦 0035-feature-b [feature] (in backlog 2 days)
     Reason: Medium priority

  📦 0036-feature-c [feature] (in backlog 2 days)
     Reason: Low priority

💡 Start work: specweave resume <id>
```

## Best Practices

### ✅ Do

- **Plan ahead**: Create specs for next sprint/quarter
- **Clear reasons**: Always provide context for why it's backlog
- **Review regularly**: Weekly backlog grooming (prioritize, abandon obsolete)
- **Small batches**: Don't let backlog grow unbounded (max 10-15 items)
- **Prioritize clearly**: Establish order of execution

### ❌ Don't

- **Don't use as procrastination**: Backlog ≠ avoiding work
- **Don't confuse with paused**: Paused = blocked, Backlog = not started
- **Keep WIP low anyway**: backlog doesn't mean unlimited active work
- **Don't let it grow unbounded**: Review and clean up regularly
- **Don't mix priorities**: Keep backlog ordered by value

## Backlog vs Paused: When to Use Which?

### Use Backlog When:
- ❌ Work hasn't started yet
- ✅ Lower priority than active work
- ✅ Waiting for decisions/approvals before starting
- ✅ Planning future sprints/quarters

### Use Paused When:
- ✅ Work already started
- ✅ Blocked by external dependency (API keys, approvals)
- ✅ Temporary interruption (code review, waiting on teammate)
- ✅ Deprioritized but progress already made

## Example: E-Commerce Platform

```bash
# Sprint Planning: Plan 5 features
sw:increment "Product Catalog MVP"         # 0050 - P0
sw:increment "Shopping Cart"               # 0051 - P0
sw:increment "Checkout Flow"               # 0052 - P1
sw:increment "Payment Providers"           # 0053 - P1
sw:increment "Order Tracking"              # 0054 - P2

# Prioritize: MVP first, rest to backlog
specweave status 0051 --reason="P0 - Do after product catalog"
specweave status 0052 --reason="P1 - Depends on cart"
specweave status 0053 --reason="P1 - Depends on checkout"
specweave status 0054 --reason="P2 - Post-MVP feature"

# Week 1: Build product catalog
sw:do  # Work on 0050

# Complete and pull next from backlog
sw:done 0050
specweave resume 0051  # Pull shopping cart from backlog
sw:do

# Week 2: Shopping cart blocked by Stripe API keys
specweave pause 0051 --reason="Waiting for Stripe production keys"

# Pull next from backlog while waiting
specweave resume 0052  # Start checkout flow
sw:do

# Keys arrive, resume cart, move checkout back to backlog
specweave status 0052 --reason="Pausing to finish cart first"
specweave resume 0051
sw:do
```

**Key Insight**: Backlog provides flexibility while maintaining WIP discipline!

## Warnings and Notifications

### Large Backlog Warning

If backlog grows too large (10+ items), `specweave status` warns:

```bash
🗂️  Backlog (12):
  📦 0040-feature-a [feature]
  ... (11 more)

⚠️  Large backlog! Consider:
   - Abandoning obsolete items
   - Consolidating similar features
   - Reviewing priorities

💡 Actions:
   specweave resume <id>  # Start highest priority
   specweave abandon <id> # Remove obsolete items
```

### Stale Backlog Items

Items in backlog >30 days trigger review prompts:

```bash
🗂️  Backlog (1):
  📦 0045-old-feature [feature]
     In backlog: 35 days
     ⚠️  STALE! Review or abandon?

💡 Consider:
   - Still relevant? → specweave resume 0045
   - No longer needed? → specweave abandon 0045
```

## Related Commands

- `sw:increment` - Create new increment
- `specweave status <id>` - Move to backlog
- `specweave resume <id>` - Move from backlog to active
- `specweave pause <id>` - Pause active work (different from backlog)
- `specweave status` - View all increments
- `specweave status --backlog` - View backlog only

## Learn More

- Increment Glossary
- [Status Management Commands](/docs/reference/commands)
- [Philosophy](/docs/overview/philosophy) — Plan as source of truth, one increment at a time
