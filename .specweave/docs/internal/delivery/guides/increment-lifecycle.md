# Increment Lifecycle Guide

**Complete guide to increment lifecycle management in SpecWeave**

This guide covers the complete lifecycle of SpecWeave increments, from creation to closure.

---

## Table of Contents

1. [Lifecycle Overview](#lifecycle-overview)
2. [Increment Sizing: Keep It Small](#increment-sizing-keep-it-small)
3. [Status Progression](#status-progression)
4. [WIP Limits](#wip-limits)
5. [Task vs Increment Decision](#task-vs-increment-decision)
6. [Adding Tasks to Current Increment](#adding-tasks-to-current-increment)
7. [Closing Increments with Leftover Transfer](#closing-increments-with-leftover-transfer)
8. [Increment Lifecycle Commands](#increment-lifecycle-commands)
9. [Frontmatter Schema](#frontmatter-schema)
10. [Example Workflows](#example-workflows)

---

## Lifecycle Overview

**CRITICAL**: SpecWeave enforces structured increment lifecycle with WIP limits to prevent context-switching overhead and ensure high-quality delivery.

### Increment Structure (Complete Anatomy)

```
.specweave/increments/0001-user-authentication/
│
├── spec.md                          # WHAT & WHY (< 250 lines)
│   ├── YAML frontmatter             # Metadata, status, priorities
│   ├── Overview                     # High-level feature description
│   ├── User Stories                 # US1-001, US1-002, etc.
│   ├── Acceptance Criteria          # TC-0001, TC-0002 (testable conditions)
│   └── References                   # Links to strategy docs
│
├── plan.md                          # HOW (< 500 lines)
│   ├── Technical Approach           # Architecture decisions
│   ├── Component Design             # Modules, services, APIs
│   ├── Data Model                   # Database schema, entities
│   ├── Integration Points           # External systems, APIs
│   └── References                   # Links to ADRs, architecture docs
│
├── tasks.md                         # Implementation Steps + Tests (v0.7.0+)
│   ├── YAML frontmatter             # Total tasks, test_mode, coverage_target
│   ├── Task List                    # [ ] T001, [x] T002, [T] T003 (transferred)
│   ├── Embedded Test Plans          # BDD format (Given/When/Then) per task
│   ├── Test Cases                   # Unit/Integration/E2E with coverage targets
│   ├── Priorities                   # P1 (critical), P2 (important), P3 (nice-to-have)
│   ├── Dependencies                 # Task → Task dependencies
│   └── Estimates                    # Time estimates per task
│
├── context-manifest.yaml            # Context Loading (70%+ token reduction)
│   ├── spec_sections                # Which strategy docs to load
│   ├── documentation                # Which architecture docs to load
│   ├── max_context_tokens           # Token budget (e.g., 10000)
│   └── priority                     # high | medium | low
│
├── logs/                            # Execution History
│   ├── execution.log                # Task execution timeline
│   ├── errors.log                   # Error tracking, debugging
│   ├── ai-session.log               # AI conversation logs
│   └── human-input.log              # User clarifications requested
│
├── scripts/                         # Automation & Helpers
│   ├── migration.sql                # Database migrations
│   ├── setup.sh                     # Environment setup
│   ├── validation.py                # Data validation scripts
│   └── cleanup.js                   # Teardown/cleanup scripts
│
└── reports/                         # Analysis & Documentation
    ├── completion.md                # Completion report (when closed)
    ├── test-results.md              # Test execution results
    ├── performance.md               # Performance analysis
    ├── security.md                  # Security review
    └── retrospective.md             # What went well, what to improve
```

### Increment Sizing: Keep It Small

**CRITICAL**: Small increments = maximum productivity for both humans AND AI.

#### Recommended Size

| Metric | Target Range | Why |
|--------|--------------|-----|
| **Tasks** | 5-15 tasks | Trackable, completable in reasonable time |
| **User Stories** | 1-3 stories | Focused scope, clear goals |
| **Duration** | 1-3 days | Fast feedback loops, quick wins |
| **Spec lines** | < 250 lines | Fits in AI context window efficiently |

#### Benefits for Humans

- ✅ **Easier progress tracking**: "12 of 15 tasks done" feels achievable
- ✅ **Faster feedback loops**: Ship something every few days
- ✅ **Less overwhelming**: Always know exactly what to do next
- ✅ **Reduced context-switching**: Complete one thing before starting another

#### Benefits for AI Tools

- ✅ **Better context retention**: Smaller specs fit better in context windows
- ✅ **Higher accuracy per task**: Fewer competing requirements to track
- ✅ **Cleaner validation**: Easier to verify acceptance criteria
- ✅ **Reduced hallucination risk**: Less chance of "forgetting" requirements

#### Anti-Pattern: The Mega-Increment

```
❌ BAD: 50-task increment running for 3 weeks
   - You lose mental context after week 1
   - AI tools struggle with sprawling specs
   - Progress feels slow (10% done after 3 days?)
   - Scope creep inevitable
   - Higher risk of incomplete delivery
```

#### Best Practice: Quick Iterations

```
✅ GOOD: 10-task increment completed in 2 days
   - Clear start and end
   - Visible progress (30% after a few hours!)
   - Ship → feedback → iterate
   - Each increment COMPLETE before the next
   - Clean living docs sync
```

#### Rule of Thumb

**If your increment has more than 15 tasks, split it.** Extract logical chunks into separate increments. You'll ship faster and maintain higher quality.

---

### Key Files Explained

| File | Purpose | Max Size | Generated By |
|------|---------|----------|--------------|
| **spec.md** | WHAT & WHY (business requirements) | < 250 lines | PM Agent |
| **plan.md** | HOW (technical design + test strategy) | < 500 lines | Architect Agent |
| **tasks.md** | Implementation checklist + embedded tests (v0.7.0+) | Variable | test-aware-planner Agent |
| **context-manifest.yaml** | Context loading config | < 50 lines | Context Loader |

### Folder Purposes

| Folder | Purpose | When Created |
|--------|---------|--------------|
| **logs/** | Execution history, errors | First task execution |
| **scripts/** | Automation helpers | When scripts needed |
| **reports/** | Analysis documents | During/after implementation |

---

## Status Progression

### 5 Lifecycle Stages

```
backlog → planned → in-progress → completed → closed
   ↓         ↓          ↓             ↓          ↓
 Idea    Ready to   Work      All done    Archived
         start      ongoing   & tested    & reviewed
```

### Status Definitions

| Status | Definition | Location | Criteria |
|--------|------------|----------|----------|
| **backlog** | Idea identified, not yet planned | `.specweave/increments/_backlog/0001-name.md` | Basic idea documented |
| **planned** | Spec created, ready to start | `.specweave/increments/0001-name/` | spec.md + tasks.md created, dependencies identified |
| **in-progress** | Active development | Same location | ≥1 task started, WIP limit not exceeded |
| **completed** | All P1 tasks done, tests passing | Same location | All P1 tasks complete, tests pass, docs updated |
| **closed** | Reviewed, archived, WIP freed | Same location | Closure report generated, leftovers transferred |

### Lifecycle State Progression

```
Increment Created
    ↓
spec.md (YAML: status: planned)
    ↓
User starts work
    ↓
spec.md (YAML: status: in-progress)
    ↓
Tasks executed → logs/ created
    ↓
All P1 tasks done
    ↓
spec.md (YAML: status: completed)
    ↓
User closes increment
    ↓
reports/completion.md generated
    ↓
spec.md (YAML: status: closed)
```

### 🆕 Reopening Completed Increments (v0.19.0)

**NEW**: COMPLETED is no longer terminal! You can now reopen increments when issues are discovered post-completion.

#### Reopen State Transitions (NEW)

```
completed → active (reopen for fixes)
completed → abandoned (mark as failed, rare)
```

**When to Reopen**:
- ✅ Production bug found after completion
- ✅ Acceptance criteria not actually met
- ✅ Regression discovered
- ✅ External integration broken

**Reopen Workflow**:
```
Issue Discovered
    ↓
Smart Detector suggests reopen
    ↓
/specweave:reopen 0031 --reason "GitHub sync failing"
    ↓
WIP limit validation (warns if exceeded)
    ↓
Status: COMPLETED → ACTIVE
    ↓
Tasks marked [ ] (reopened)
    ↓
Audit trail created
    ↓
External tools synced
    ↓
Fix the issue
    ↓
/specweave:done 0031 (close again)
```

#### Three Reopen Levels

**1. Task-Level** (Surgical Fix):
```bash
/specweave:reopen 0031 --task T-003 --reason "API rate limiting"
```
- Updates only specific task
- Doesn't change increment status
- Best for small, isolated bugs

**2. User Story-Level** (Feature Fix):
```bash
/specweave:reopen 0031 --user-story US-001 --reason "AC not met"
```
- Reopens all related tasks
- Updates living docs spec
- Best for incomplete features

**3. Increment-Level** (Systemic Fix):
```bash
/specweave:reopen 0031 --reason "Multiple production issues"
```
- Transitions COMPLETED → ACTIVE
- Validates WIP limits
- Reopens all incomplete tasks
- Best for systemic problems

#### Smart Auto-Detection

Just report the issue naturally:
```
"The GitHub sync isn't working"
```

The `smart-reopen-detector` skill will:
1. 🔍 Scan recent work (active + 7 days completed)
2. 🎯 Find related items (relevance scoring)
3. 💡 Suggest exact reopen command

#### WIP Limits During Reopen

Reopening respects WIP limits:
```
⚠️  WIP LIMIT WARNING:
   Current: 2/2 features active
   Reopening will EXCEED limit!

Options:
1. Pause: /specweave:pause 0030
2. Force: /specweave:reopen 0031 --force --reason "Production critical"
```

#### Audit Trail

Every reopen is tracked in metadata.json:
```json
{
  "reopened": {
    "count": 1,
    "history": [
      {
        "date": "2025-11-14T15:30:00Z",
        "reason": "GitHub sync failing",
        "previousStatus": "completed"
      }
    ]
  }
}
```

**See**: [ADR-0033](../../architecture/adr/0033-smart-reopen-functionality.md) for complete architecture

---

## Backlog Management

### What is the Backlog?

The `_backlog` folder (`.specweave/increments/_backlog/`) is where you **capture ideas before full planning**.

**Purpose**:
- ✅ Capture feature ideas quickly without blocking current work
- ✅ Store ideas when WIP limit is reached
- ✅ Allow PM-led analysis before committing to full increment
- ✅ Keep increment folder clean (only planned/active work)

**Location**: `.specweave/increments/_backlog/####-feature-name.md`

### Backlog Item Structure

**Simple markdown file** with basic information:

```markdown
# Feature Name - Backlog Item

**Status**: backlog
**Priority**: P1/P2/P3
**Estimate**: Days/weeks
**Created**: YYYY-MM-DD

## Overview

[1-3 paragraphs describing the idea]

## Key Components

[Bullet points of main parts]

## User Value

**Problem**: [What problem does this solve?]

**Solution**: [High-level solution approach]

## Dependencies

**Blocked By**: [Other increments that must complete first]

**Requires**: [External resources, tools, services]

## When to Prioritize

**Start this increment when**:
1. [Condition 1]
2. [Condition 2]
3. [Condition 3]

**Estimated Impact**: HIGH/MEDIUM/LOW

## Next Steps

When ready to start:
1. Close current in-progress increments (free WIP slot)
2. Run `/inc "Feature Name"` to promote to full increment
3. PM Agent will create complete spec.md + plan.md + tasks.md
```

### Workflow Diagram: Backlog → Increment

```
User Idea
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question: Can we start immediately?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓                           ↓
YES (WIP < limit)          NO (WIP at limit)
    ↓                           ↓
/inc "feature"         Add to backlog
    ↓                           ↓
PM creates           Save as markdown:
full increment       _backlog/####-name.md
    ↓                           ↓
Start work           [Wait for WIP slot]
                                ↓
                    When ready (WIP freed)
                                ↓
                    Promote to increment:
                    /inc "feature name"
                                ↓
                    PM creates full increment
                                ↓
                    Start work
```

### Example Workflows

#### Example 1: Add Idea to Backlog (WIP at Limit)

**User request**:
```
User: "I have an idea for API integration enhancement, but I know
we're working on core enhancements right now."
```

**Claude response**:
```
📊 Checking WIP status...
   Current WIP: 2/2 (at limit)
   Active: 0001-core-framework, 0002-core-enhancements

✅ Good instinct! Since WIP is at limit, let's capture this in backlog.

Creating backlog item: _backlog/0003-api-integration-enhancement.md

I'll document:
- Overview (problem statement, solution approach)
- Key components (what needs to be built)
- User value (why this matters)
- Dependencies (what blocks this)
- When to prioritize (conditions for starting)

[Creates file]

✅ Backlog item created!

When ready to start:
1. Close 0001 or 0002 to free WIP slot
2. Run: /inc "API integration enhancement"
3. I'll promote backlog item to full increment
```

#### Example 2: Promote Backlog Item to Increment

**User request**:
```
User: "Increment 0001 is done. Let's work on that API integration
we discussed."
```

**Claude response**:
```
🔍 Found backlog item: _backlog/0003-api-integration-enhancement.md

📊 Checking WIP status...
   Current WIP: 1/2 (slot available!)

✅ Ready to promote! Starting PM-led planning...

Loading backlog item...
→ Reading context from _backlog/0003-api-integration-enhancement.md
→ Problem statement ✓
→ Solution approach ✓
→ Key components ✓

Activating PM Agent for complete planning...

PM Agent: Analyzing API integration requirements...
→ Market research complete
→ Creating spec.md (WHAT & WHY)
→ Architect creating plan.md (HOW + test strategy)
→ test-aware-planner generating tasks.md with embedded tests (v0.7.0+)

✅ Increment 0003-api-integration-enhancement created!

Created:
  ✅ spec.md (12 user stories, 34 AC-IDs)
  ✅ plan.md (5 phases, architecture diagrams, test strategy)
  ✅ tasks.md (23 tasks with embedded tests, 85% coverage target)

Status: planned → Ready to start!

Next: /do to begin implementation
```

#### Example 3: List Backlog Items

**User request**:
```
User: "What ideas do we have in the backlog?"
```

**Claude response**:
```
📋 Backlog Items (.specweave/increments/_backlog/)

1. 0003-api-integration-enhancement.md [P2]
   → Enhanced REST API with rate limiting and caching
   → Estimate: 3-4 days
   → Dependencies: None
   → Impact: HIGH

2. 0004-github-sync-improvements.md [P3]
   → Bidirectional GitHub sync with subtasks
   → Estimate: 2 days
   → Dependencies: None
   → Impact: MEDIUM

Total: 2 backlog items

To promote: /inc "feature name"
```

#### Example 4: Quick Add to Backlog (User Prompt)

**User request**:
```
User: "Add 'Advanced analytics dashboard' to backlog for later"
```

**Claude response**:
```
✅ Adding to backlog...

Creating: _backlog/0005-analytics-dashboard.md

Quick template:
- Overview: Advanced analytics dashboard
- Priority: P3 (nice-to-have)
- Estimate: TBD (needs PM analysis)
- Status: backlog
- Created: 2025-10-28

💡 When ready to plan fully, run:
   /inc "Advanced analytics dashboard"

This will promote to full increment with PM-led analysis.
```

### Best Practices

**✅ DO**:
- Add ideas to backlog when WIP limit reached
- Keep backlog items simple (1-page markdown)
- Update priorities as business needs change
- Review backlog regularly (weekly/bi-weekly)
- Promote backlog items with `/inc "name"` for full PM planning

**❌ DON'T**:
- Create full increments while at WIP limit (forces closure)
- Over-plan backlog items (PM does this during promotion)
- Let backlog grow indefinitely (prune stale ideas)
- Skip backlog when WIP available (go direct to `/inc`)

### Backlog Lifecycle

```
Idea captured
    ↓
Saved in _backlog/
    ↓
[Wait for WIP slot]
    ↓
User promotes: /inc "name"
    ↓
PM Agent analyzes
    ↓
Full increment created
    ↓
_backlog/ file archived (kept for history)
```

---

## WIP Limits

### Purpose

**Prevent context-switching overhead** (20-40% productivity loss), ensure focus, improve quality.

### WIP Limit Guidelines

| Project Type | WIP Limit | Rationale |
|--------------|-----------|-----------|
| **Framework development** (SpecWeave repo) | 2-3 in progress | Allows core + 1-2 independent features |
| **User projects** (solo/small team 1-5) | 1-2 in progress | Better focus, higher quality |
| **User projects** (large team 10+) | 3-5 in progress | Multiple sub-teams, still limited |

### Enforcement

- ✅ `/create-increment` checks WIP limit before creating
- ✅ `/start-increment` checks WIP limit before starting
- ✅ Must close increment to free WIP slot

### Override

```bash
/create-increment "..." --force  # Override WIP limit (use sparingly)
```

**When to override** ✅:
- Truly independent work (no dependencies)
- Critical bug fix (production down)
- Blocked on external dependency

**When NOT to override** ❌:
- Impatient to start new work
- Avoiding difficult tasks
- Poor planning

---

## Increment Discipline (The Iron Rule)

### Core Philosophy: ONE Active Increment = Maximum Focus

Simplified from complex per-type limits to **focus-first architecture**:
- ✅ **Default**: 1 active increment (maximum productivity)
- ✅ **Emergency ceiling**: 2 active max (hotfix/bug can interrupt)
- ✅ **Hard cap**: Never >2 active (enforced)

**Why 1?** Research shows:
- 1 task = 100% productivity
- 2 tasks = 20% slower (context switching cost)
- 3+ tasks = 40% slower + more bugs

### ⛔ THE IRON RULE

**You CANNOT start increment N+1 until increment N is DONE**

This is **NOT negotiable**. It is a **hard enforcement** to prevent:
- Multiple incomplete increments piling up
- No clear source of truth ("which increment are we working on?")
- Living docs becoming stale (sync doesn't know what's current)
- Scope creep (jumping between features without finishing)
- Quality degradation (tests not run, docs not updated)

### What "DONE" Means

An increment is DONE if **ONE** of the following is true:

1. **All tasks completed**: All tasks in `tasks.md` marked `[x] Completed`
2. **Completion report exists**: `COMPLETION-SUMMARY.md` with "✅ COMPLETE" status
3. **Explicit closure**: Closed via `/specweave:done` with documentation

### Enforcement

**When you try to start a new increment**:

```bash
/specweave:increment "new feature"
```

**If previous increments are incomplete, you'll see**:

```
❌ Cannot create new increment!

Previous increments are incomplete:

📋 Increment 0002-core-enhancements
   Status: 73% complete (11/15 tasks)
   Pending:
     - T-008: Migrate content
     - T-010: Create context manifest
     - ... (3 more tasks)

💡 What would you like to do?

1️⃣  Close incomplete increments: /specweave:close
2️⃣  Check status: /specweave:status
3️⃣  Force create (DANGEROUS): Add --force flag

⚠️  The discipline exists for a reason:
   - Prevents scope creep
   - Ensures completions are tracked
   - Maintains living docs accuracy
   - Keeps work focused
```

### How to Resolve Incomplete Increments

**Option 1: Complete the Work** (Recommended)
```bash
# Continue working on incomplete increment
/specweave:do

# Once all tasks done, it's automatically complete
/specweave:increment "new feature"  # ✅ Now works!
```

**Option 2: Close Interactively**
```bash
# Interactive closure with options
/specweave:close

# You'll be asked to choose:
# - Force complete (mark all tasks done)
# - Move tasks to next increment (defer work)
# - Reduce scope (mark tasks as won't-do)
```

**Option 3: Check Status First**
```bash
# See all incomplete increments
/specweave:status

# Output shows completion percentages
```

**Option 4: Force Create** (Emergency Only!)
```bash
# Bypass the check (USE SPARINGLY!)
/specweave:increment "urgent-hotfix" --force

# This is logged and should be explained
```

### Three Options for Closing

When using `/specweave:close`:

**1. Adjust Scope** (Simplest - Recommended)
- Remove features from `spec.md`
- Regenerate `plan.md` and `tasks.md`
- Now 100% complete!

**2. Move Scope to Next Increment**
- Transfer incomplete tasks
- Old increment closed
- New increment gets the work

**3. Extend Existing Increment** (Merge Work)
- Don't start new increment
- Update `spec.md` to include new features
- Add new tasks to `tasks.md`
- Work on combined scope in ONE increment

### Helper Commands

| Command | Purpose |
|---------|---------|
| `/specweave:status` | Show all increments and completion status |
| `/specweave:close` | Interactive closure of incomplete increments |
| `/specweave:force-close <id>` | Mark all tasks complete (dangerous!) |

### Philosophy: Discipline = Quality

**Why enforce this strictly?**

- **Focus**: Work on ONE thing at a time
- **Completion**: Finish before starting new
- **Quality**: Tests run, docs updated, code reviewed
- **Clarity**: Everyone knows what's current
- **Velocity**: Actually shipping > endless WIP

**Old Way** (suggest):
- User: "Just let me start the new feature, I'll come back to this"
- Result: 5 incomplete increments, nothing ships

**New Way** (enforce):
- Framework: "Close this first, then start new"
- User: *closes increment properly*
- Result: Clean increments, clear progress, shipping regularly

### Exception: The `--force` Flag

For **emergencies only** (hotfixes, urgent features):

```bash
/specweave:increment "urgent-security-fix" --force
```

**This bypasses the check** but:
- ✅ Logs the force creation
- ✅ Warns in CLI output
- ✅ Should be explained in PR/standup
- ✅ Should close previous increments ASAP

**Use sparingly!** The discipline exists for a reason.

---

## Task vs Increment Decision

### Decision Tree

```
New work request
      ↓
How long will this take?
      ↓
  Hours-Days  →  How many components?
                       ↓
                    1 component  →  TASK (add to current increment)
                    2+ components  →  INCREMENT (if WIP allows)
      ↓
  Weeks+  →  Check WIP limit
                ↓
            WIP < limit  →  NEW INCREMENT
            WIP at limit  →  Close existing or add to backlog
```

### Examples

| Request | Duration | Components | Decision |
|---------|----------|------------|----------|
| "Fix error in context-loader" | 2 hours | 1 skill | **TASK** - Add to current increment |
| "Add caching to context-loader" | 1 day | 1 skill | **TASK** - Add to current increment |
| "Add complete JIRA integration" | 2 weeks | 2 agents + 1 skill | **INCREMENT** - New folder (if WIP allows) |
| "Optimize performance" | 3 days | Multiple files | **TASK** or **INCREMENT** - Depends on scope |

### Rule of Thumb

- **< 1 day + 1 component** = TASK
- **Weeks + multiple components** = INCREMENT

---

## Adding Tasks to Current Increment

### When to Add ✅

- Bugs discovered during implementation
- Small enhancements (< 1 day)
- Error handling improvements
- Documentation updates
- Test additions
- Edge case handling

### How to Add

#### Option 1: Using Slash Command

```bash
/add-tasks 001 "Fix error handling in context-loader"
/add-tasks 001 --priority P2 "Add caching to skill-router"
```

#### Option 2: Manual Addition (tasks.md)

```markdown
## Additional Tasks (Added During Implementation)

### T051: Fix error handling in context-loader
**Added**: 2025-10-26
**Discovered**: During integration testing
**Priority**: P1
**Estimated**: 2 hours
**Status**: [ ] Pending

**Implementation**:
- Check if manifest file exists
- Return helpful error message
- Log warning to logs/errors.log
```

#### Option 3: Update Frontmatter (spec.md)

```yaml
---
updated: 2025-10-26  # ← Update this
total_tasks: 51      # ← Increment
---
```

---

## Closing Increments with Leftover Transfer

### When to Close ✅

- ✅ All P1 (critical) tasks completed
- ✅ All tests passing
- ✅ Documentation updated
- ❌ P2/P3 tasks MAY remain (can transfer)

### Valid Reasons to Transfer Leftovers

1. **Time-boxed completion** - 2 weeks up, 80% done is enough
2. **Lower priority work remains** - P2/P3 can wait
3. **Scope clarification** - Some tasks no longer relevant
4. **Blocked tasks** - Waiting on external dependencies
5. **Business pivot** - Priorities changed

### Closure Workflow

```bash
/close-increment 001

# System validates:
→ All P1 tasks completed? ✅
→ All tests passing? ✅
→ Documentation updated? ✅

# Identifies leftovers:
→ Leftovers: 6 tasks (3 P2, 3 P3)

# Presents options:
Transfer options:
A) Create new increment "0002-enhancements" with leftovers
B) Add to existing increment (select: 0002, 0003, 0004)
C) Cancel leftovers (document why)

Your choice? [A]

# Generates closure report:
→ Creating .specweave/increments/0001-core-framework/reports/closure-report.md
→ Completion: 88% (44/50 tasks)
→ Transferred to 0002-enhancements: 6 tasks
→ Status: closed
→ WIP slot freed (2/2 → 1/2)

✅ Increment 0001-core-framework closed successfully
```

### Closure Report Format

```markdown
# Increment Closure Report

**Increment**: 0001-core-framework
**Closed Date**: 2025-10-26
**Completion**: 88% (44/50 tasks)

## Transferred Tasks (to 0002-enhancements)

| Task | Description | Priority | Reason |
|------|-------------|----------|--------|
| T045 | Add caching to context-loader | P2 | Performance optimization |
| T046 | Add retry logic to skill-router | P2 | Error handling enhancement |
| T047 | Create skill usage analytics | P3 | Nice-to-have monitoring |

## Retrospective

**What went well**: Clear spec reduced scope creep
**What to improve**: Better task estimation
```

### Task Status Markers

- `[x]` - Completed
- `[ ]` - Not started
- `[-]` - In progress (optional)
- `[T]` - Transferred to another increment
- `[C]` - Canceled (no longer relevant)

### Transferred Task Tracking

**In target increment** (0002-enhancements/tasks.md):

```markdown
## Transferred Tasks (from 0001-core-framework)

### T001: Add caching to context-loader
**Transferred from**: 0001-core-framework (T045)
**Transfer date**: 2025-10-26
**Original priority**: P2
**Current priority**: P1 (promoted - now critical)
```

---

## Increment Lifecycle Commands

### Available Slash Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/create-increment` | Create new increment (checks WIP) | `/create-increment "JIRA Integration"` |
| `/start-increment` | Start planned increment (checks WIP) | `/start-increment 002` |
| `/add-tasks` | Add tasks to existing increment | `/add-tasks 001 "Fix bug in context-loader"` |
| `/close-increment` | Close with leftover transfer | `/close-increment 001` |
| `/list-increments` | View all increments and WIP status | `/list-increments --status in-progress` |

---

## Frontmatter Schema

### Complete spec.md Frontmatter

```yaml
---
increment: 0001-core-framework
title: "SpecWeave Core Framework"
priority: P1
status: in-progress  # backlog | planned | in-progress | completed | closed
created: 2025-01-25
updated: 2025-10-26
started: 2025-02-01      # When status → in-progress
completed: null           # When all P1 tasks done
closed: null              # When closure report generated
structure: user-stories

# Completion tracking
total_tasks: 50
completed_tasks: 44
completion_rate: 88

# Leftover tracking (when closed)
transferred_to: null      # e.g., "0002-enhancements"
transferred_tasks: 0
canceled_tasks: 0
transfer_reason: null

# Dependencies
dependencies:
  - none

# WIP tracking
wip_slot: 1               # Which WIP slot (1, 2, or 3)
---
```

---

## Example Workflows

### Example 1: Complete Project Lifecycle

```bash
# Week 1: Create and start core framework
/create-increment "Core Framework"     # Creates 001
/start-increment 001                   # Status: planned → in-progress
# WIP: 1/2

# Week 2-12: Add tasks as discovered
/add-tasks 001 "Fix error in context-loader"
/add-tasks 001 "Add retry logic"

# Week 12: 88% done, ready to move on
/close-increment 001

# System prompts:
→ Completion: 88% (44/50 tasks)
→ Leftovers: 6 P2/P3 tasks
→ Transfer to 0002-enhancements? [Yes]
→ Closure report generated
→ Status: closed
→ WIP freed: 1/2 → 0/2

# Week 13: Start new work
/create-increment "JIRA Integration"   # Creates 003
/start-increment 003
# WIP: 1/2

# Week 14: Can start another (independent work)
/create-increment "Analytics Dashboard"  # Creates 004
/start-increment 004
# WIP: 2/2 (at limit)

# Week 15: Try to start third
/create-increment "GitHub Sync"        # Creates 005
/start-increment 005
# ⚠️ WIP limit reached (2/2)
# Options:
# A) Close 003 or 004 first
# B) Wait until one completes
# C) Override with --force (not recommended)
```

### Example 2: Real Increment with Frontmatter

```yaml
# spec.md frontmatter
---
increment: 0001-user-authentication
title: "User Authentication System"
priority: P1
status: in-progress
created: 2025-01-25
started: 2025-02-01
completed: null
closed: null

structure: user-stories
total_tasks: 25
completed_tasks: 18
completion_rate: 72

dependencies:
  - none

wip_slot: 1
---
```

### Example 3: Token Savings with Context Manifest

**Without manifest**: Load ALL strategy docs (50k tokens)
**With manifest**: Load ONLY auth docs (15k tokens)
**Savings: 70%** ✅

```yaml
# context-manifest.yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/authentication/overview.md
  - .specweave/docs/internal/strategy/authentication/requirements.md

documentation:
  - .specweave/docs/internal/architecture/auth-system.md
  - .specweave/docs/internal/architecture/adr/0001-auth-method.md

max_context_tokens: 15000
priority: high
---
```

---

## Related Documentation

- **CLAUDE.md** - Quick reference guide (see repository root)
- [Increment Validation](./increment-validation.md) - Validation workflow
- [Testing Strategy](./testing-strategy.md) - Test strategy and coverage
- [Branch Strategy](../branch-strategy.md) - Git workflow and branching
- [Context Loading](../../architecture/concepts/context-loading.md) - Context manifests

---

**This guide provides complete details on increment lifecycle management. For a quick overview, see CLAUDE.md.**
