# /start-increment - Start Planned Increment

**Command**: `/start-increment <increment-id> [options]`

**Purpose**: Change increment status from "planned" to "in-progress" (with WIP limit check)

**Framework**: Framework-agnostic (works with all tech stacks)

---

## Usage

```bash
/start-increment 002                 # Start increment 002
/start-increment 002 --force         # Override WIP limit (use sparingly)
```

## Arguments

- `<increment-id>` (required): Increment number (e.g., `001`, `002`)
- `--force` (optional): Override WIP limit check

---

## Workflow

### Step 1: Check WIP Limit

```
Checking WIP limit...

→ Current WIP: 2/2 (at limit)
→ Increments in progress:
  - 001-core-framework (88% complete)
  - 003-jira-integration (40% complete)

⚠️ WIP limit reached (2/2)

Cannot start 002 without closing an existing increment.

Options:
A) Close 001-core-framework (88% done, ready to close)
   Run: /close-increment 001

B) Close 003-jira-integration (40% done, transfer leftovers)
   Run: /close-increment 003

C) Wait until 001 or 003 completes

D) Override WIP limit (not recommended)
   Run: /start-increment 002 --force

Your choice?
```

### Step 2: Check Dependencies

```
Checking dependencies...

→ Increment 002 depends on: 001-core-framework
→ Dependency status: in-progress (88% complete)

⚠️ Dependency 001 not yet completed

Options:
A) Wait for 001 to complete (recommended)
B) Start anyway if 001 is far enough along
   (If 002 only needs partial 001 functionality)

Your choice?
```

### Step 3: Start Increment

**If checks pass**:

```
✅ Starting increment 002-enhancements...

→ Status: planned → in-progress
→ Started: 2025-10-26
→ WIP: 1/2 (slot 1 assigned)
→ Creating execution log...
```

Update `spec.md` frontmatter:

```yaml
---
status: in-progress      # ← Changed from "planned"
started: 2025-10-26      # ← Start date
wip_slot: 1              # ← WIP slot assigned
---
```

Create initial log entry:

```markdown
# Execution Log

## 2025-10-26: Increment Started
- Status: planned → in-progress
- Total tasks: 15
- Dependencies: 001-core-framework (completed)
- Estimated duration: 2 weeks
```

### Step 4: Confirm

```
✅ Increment 002-enhancements started

Summary:
→ Status: in-progress
→ Started: 2025-10-26
→ Total tasks: 15
→ WIP: 1/2
→ Estimated completion: 2025-11-09 (2 weeks)

Next steps:
1. Review tasks.md
2. Start with first P1 task
3. Mark tasks complete as you go
4. Close with /close-increment 002 when P1 tasks done
```

---

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md#increment-lifecycle-management) - Lifecycle guide
- [INCREMENT-LIFECYCLE-DESIGN.md](../../.specweave/increments/001-core-framework/reports/INCREMENT-LIFECYCLE-DESIGN.md) - Lifecycle design

---

**Command Type**: Lifecycle management
**Framework Support**: All
**WIP Impact**: Occupies 1 WIP slot
