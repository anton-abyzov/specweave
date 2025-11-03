# /list-increments - View All Increments

**Command**: `/list-increments [options]`

**Purpose**: View all increments with status, completion, and WIP tracking

**Framework**: Framework-agnostic (works with all tech stacks)

---

## Usage

```bash
/list-increments                          # All increments
/list-increments --status in-progress     # Filter by status
/list-increments --priority P1            # Filter by priority
/list-increments --verbose                # Include task details
```

## Arguments

- `--status` (optional): Filter by status (backlog, planned, in-progress, completed, closed)
- `--priority` (optional): Filter by priority (P1, P2, P3)
- `--verbose` (optional): Show task breakdown
- `--wip-only` (optional): Show only in-progress increments

---

## Output

### Default View

```
📊 SpecWeave Increments Overview

WIP Status: 2/2 (at limit) ⚠️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: in-progress (2)

├── 001-core-framework [P1]
│   ├── Progress: 88% (44/50 tasks)
│   ├── Started: 2025-02-01 (8 months ago)
│   ├── P1: 100% (30/30) ✅
│   ├── P2: 80% (12/15) - 3 remaining
│   ├── P3: 40% (2/5) - 3 remaining
│   └── Ready to close (all P1 complete)
│
└── 003-jira-integration [P1]
    ├── Progress: 40% (8/20 tasks)
    ├── Started: 2025-09-15 (1 month ago)
    ├── P1: 50% (5/10) ⏳
    ├── P2: 30% (3/10)
    └── In progress

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: planned (3)

├── 002-enhancements [P2] - Ready to start
│   └── 15 tasks (transferred from 001)
│
├── 004-github-sync [P2] - Ready to start
│   └── 18 tasks
│
└── 005-cost-optimizer-v2 [P3] - Ready to start
    └── 10 tasks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: backlog (10 ideas)

├── Design system improvements
├── Performance optimizations
├── Mobile app support
├── Advanced analytics
└── ... (6 more)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: closed (1)

└── 000-project-setup [P1]
    ├── Closed: 2025-01-15
    ├── Completion: 100% (10/10 tasks)
    └── Duration: 2 weeks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Action needed:
→ WIP limit reached (2/2)
→ Close 001-core-framework to free WIP slot (88% complete, ready)
→ Run: /close-increment 001

Next steps:
1. Close 001 to free WIP slot
2. Start 002-enhancements
```

### Verbose View

```bash
/list-increments --verbose --status in-progress

📊 In-Progress Increments (Verbose)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

001-core-framework [P1]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Title: SpecWeave Core Framework
Status: in-progress
Priority: P1
Started: 2025-02-01 (8 months ago)
Progress: 88% (44/50 tasks)
WIP Slot: 1

Task Breakdown:
  P1 (Critical): 100% (30/30) ✅
    ✅ T001-T030: All complete

  P2 (Important): 80% (12/15)
    ✅ T031-T042: Complete
    ⏳ T043: In progress
    ❌ T044-T045: Not started

  P3 (Nice-to-have): 40% (2/5)
    ✅ T046-T047: Complete
    ❌ T048-T050: Not started

Dependencies: None
Dependent increments: 002-enhancements, 004-github-sync

Ready to close: YES (all P1 complete)
Leftover tasks: 6 (3 P2, 3 P3)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Filtered Views

```bash
# Only P1 increments
/list-increments --priority P1

📊 P1 (Critical) Increments

in-progress (2):
  - 001-core-framework: 88% complete
  - 003-jira-integration: 40% complete

planned (0): None

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Only WIP increments
/list-increments --wip-only

📊 WIP Increments (2/2 - at limit)

001-core-framework [P1]: 88% → Ready to close
003-jira-integration [P1]: 40% → In progress

⚠️ At WIP limit - close 001 to start new work
```

---

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md#increment-lifecycle-management) - Lifecycle guide
- [.specweave/increments/README.md](../../.specweave/increments/README.md) - Increments overview

---

**Command Type**: Status reporting
**Framework Support**: All
**Output**: Summary of all increments with actionable recommendations
