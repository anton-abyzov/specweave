---
sidebar_position: 14
slug: 13-increment-lifecycle
title: "Lesson 13: Increment Lifecycle Management"
description: "Master cleanup, archiving, status transitions, and workspace management"
---

# Lesson 13: Increment Lifecycle Management

**Time**: 45 minutes
**Goal**: Master the full increment lifecycle from creation to archival

---

## The Increment Lifecycle

Every increment goes through a predictable lifecycle:

```
                    ┌─────────────┐
                    │   BACKLOG   │
                    │  (planned)  │
                    └──────┬──────┘
                           │
            /sw:resume
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│    ┌──────────┐    ┌────────────┐    ┌───────────┐          │
│    │ PLANNING │───▶│   ACTIVE   │───▶│  CLOSING  │          │
│    └──────────┘    └─────┬──────┘    └─────┬─────┘          │
│                          │                  │                │
│                          │                  │                │
│                    /sw:pause    /sw:done      │
│                          │                  │                │
│                          ▼                  ▼                │
│                    ┌──────────┐      ┌───────────┐          │
│                    │  PAUSED  │      │ COMPLETED │          │
│                    └──────────┘      └─────┬─────┘          │
│                                            │                │
│                                    /sw:archive       │
│                                            │                │
│                                            ▼                │
│                                     ┌───────────┐           │
│                                     │ ARCHIVED  │           │
│                                     └───────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                    /sw:abandon
                           │
                           ▼
                    ┌───────────┐
                    │ ABANDONED │
                    └───────────┘
```

---

## Status Management Commands

### Viewing Status

```bash
# All increments (active, paused, backlog)
/sw:status

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECWEAVE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTIVE (2/2 WIP slots used)
  0042-user-authentication   ████████░░  75%  (3 days)
  0043-payment-processing    ██░░░░░░░░  20%  (1 day)

PAUSED (1)
  0040-notification-system   ████░░░░░░  40%  (blocked: external API)

BACKLOG (3)
  0044-analytics-dashboard   📋 Planned for next sprint
  0045-mobile-app           📋 Planned for Q2
  0046-performance-tuning   📋 Tech debt

COMPLETED THIS WEEK (2)
  0041-dashboard-redesign   ✅ 2 days ago
  0039-bug-fix-login       ✅ 5 days ago
```

### Detailed Increment Status

```bash
# Specific increment details
/sw:status 0042

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCREMENT: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ACTIVE
Progress: 75% (12/16 tasks)
Started: 2025-11-20
Elapsed: 3 days

USER STORIES:
  US-001: User login            ✅ Complete
  US-002: Password reset        🔄 In progress
  US-003: OAuth integration     📋 Pending

TASKS (recent):
  ✅ T-001: Create AuthService
  ✅ T-002: Implement JWT tokens
  ✅ T-003: Add login endpoint
  🔄 T-004: Password reset flow (current)
  📋 T-005: OAuth Google
  📋 T-006: OAuth GitHub

EXTERNAL SYNC:
  GitHub Issue: #142 (synced 5 min ago)
  JIRA Epic: AUTH-100 (synced 5 min ago)
```

---

## Pausing and Resuming Increments

### When to Pause

Pause an increment when:
- **External blocker**: Waiting for API access, third-party service
- **Priority shift**: Urgent work takes precedence
- **Context needed**: Need information from stakeholder
- **Resource constraint**: Team member unavailable

### Pausing

```bash
/sw:pause 0042

# Optional: Provide reason
/sw:pause 0042 --reason "Waiting for Stripe API credentials"
```

**What happens**:
1. Status changes to `PAUSED`
2. WIP slot freed (allows new active increment)
3. Reason recorded in `metadata.json`
4. External tools updated (GitHub label: "on-hold")

### Resuming

```bash
/sw:resume 0042

# If WIP limit reached:
# "Cannot resume: 2/2 WIP slots in use. Complete or pause another increment first."
```

**What happens**:
1. Status changes to `ACTIVE`
2. WIP slot consumed
3. Resume timestamp recorded
4. External tools updated (GitHub label removed)

---

## Backlog Management

### Moving to Backlog

For increments you've planned but aren't ready to start:

```bash
/sw:backlog 0044

# Or during creation:
/sw:increment "Analytics dashboard" --backlog
```

**Backlog vs Paused**:
- **Backlog**: Never started, planned for future
- **Paused**: Was active, temporarily stopped

### Prioritizing Backlog

```bash
# View backlog with priorities
/sw:status --backlog

# Output:
BACKLOG (3 items)
  Priority 1: 0044-analytics-dashboard   (Next sprint)
  Priority 2: 0045-mobile-app           (Q2)
  Priority 3: 0046-performance-tuning   (When time permits)

# Reorder backlog
/sw:backlog reorder
# Interactive: Drag and drop priority
```

---

## Completing Increments

### The Done Command

```bash
/sw:done 0042
```

**What happens**:
1. **Task validation**: Are all tasks marked complete?
2. **Quality gate**: Runs `/sw:qa --gate`
3. **PM validation**: AI reviews against acceptance criteria
4. **Completion report**: Generated in increment folder
5. **External sync**: Closes GitHub issue, updates JIRA status
6. **Status change**: `ACTIVE` → `COMPLETED`

### If Quality Gate Fails

```
/sw:done 0042

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PM VALIDATION: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gate 1: Tasks ❌ (14/16 complete)
  Missing:
  - T-015: Write E2E tests
  - T-016: Update documentation

Gate 2: Tests ⚠️ (85% coverage, target: 90%)

Gate 3: Docs ❌
  Missing:
  - AC-US2-03 not checked off

RESULT: ❌ CANNOT CLOSE

Fix these issues and try again.
```

### Forcing Completion (Use Sparingly)

```bash
# Skip quality gates (hotfix scenario)
/sw:done 0042 --expedite

# Requires confirmation:
# "This will close without validation. Are you sure? (y/N)"
```

---

## Archiving Completed Increments

### Why Archive?

Over time, completed increments accumulate:

```
.specweave/increments/
├── 0001-initial-setup/
├── 0002-user-auth/
├── 0003-dashboard/
...
├── 0089-performance-fix/
├── 0090-security-patch/
└── 0091-current-feature/

# 90+ folders = slow searches, cluttered workspace
```

### Manual Archive

```bash
/sw:archive 0042
```

**What happens**:
1. Moves to `.specweave/increments/_archive/0042-user-authentication/`
2. Keeps full history (spec, plan, tasks, completion report)
3. Updates living docs references
4. Frees main increments folder

### Bulk Archive

```bash
# Archive all completed increments older than 30 days
/sw:archive --completed --older-than 30d

# Archive specific list
/sw:archive 0042 0043 0044

# Preview what would be archived (dry run)
/sw:archive --completed --dry-run
```

### Archive Best Practices

```
Recommended schedule:
  Weekly: Archive increments completed > 7 days ago
  Monthly: Archive all completed increments

Automated (via cron or CI):
  /sw:archive --completed --older-than 7d --auto-yes
```

---

## Restoring Archived Increments

Need to reference an old increment? Restore it:

```bash
# Restore to active folder
/sw:restore 0042

# Just view without restoring
/sw:restore 0042 --view-only
```

---

## Abandoning Increments

For increments that won't be completed (requirements changed, feature cancelled):

```bash
/sw:abandon 0042

# With reason (recommended)
/sw:abandon 0042 --reason "Feature cancelled by stakeholder"
```

**What happens**:
1. Status changes to `ABANDONED`
2. Moved to `_archive/abandoned/`
3. Reason recorded for future reference
4. External tools updated (GitHub issue closed with "won't fix")

### Abandoned vs Archived

- **Archived**: Successfully completed, historical reference
- **Abandoned**: Not completed, cancelled or obsolete

---

## Workspace Cleanup Commands

### Sync Status

Fix any status desync between files:

```bash
/sw:sync-status

# Output:
Checking status consistency...
  0042: metadata.json says "active", spec.md says "planning"
  → Auto-fixing: Using metadata.json as source of truth

All statuses synced.
```

### Validate Workspace

Check for issues:

```bash
/sw:validate --all

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKSPACE VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 0042-user-authentication: Valid
✅ 0043-payment-processing: Valid
⚠️ 0040-notification-system:
   - Missing plan.md (created spec, never planned)
❌ 0044-analytics-dashboard:
   - tasks.md references non-existent AC-US9-01

Total: 2 valid, 1 warning, 1 error
```

### Fix Duplicates

If duplicate increments were created:

```bash
/sw:fix-duplicates

# Output:
Found duplicates:
  0042-user-authentication (created: Nov 20)
  0042-user-authentication (created: Nov 22)  ← duplicate

Keep the original (Nov 20) and remove duplicate? (Y/n)
```

---

## The Progress Command

Track ongoing work:

```bash
/sw:progress

# Output for active increment:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESS: 0042-user-authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall: ████████████░░░░░░░░  60% (12/20 tasks)

BY USER STORY:
  US-001 (Login):        ████████████████████  100%
  US-002 (Password):     ████████████░░░░░░░░   60%
  US-003 (OAuth):        ░░░░░░░░░░░░░░░░░░░░    0%

RECENT ACTIVITY:
  ✅ T-008: Password reset email (2 hours ago)
  ✅ T-007: Reset token generation (3 hours ago)

NEXT UP:
  → T-009: Reset confirmation page
  → T-010: Password strength validation
```

---

## Full Sync Command

Synchronize everything at once:

```bash
/sw:sync-progress

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FULL PROGRESS SYNC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Verify tasks.md
  ✓ 20 tasks validated

Step 2: Update spec.md ACs
  ✓ 8/15 ACs marked complete

Step 3: Sync to living docs
  ✓ FEATURES.md updated
  ✓ FS-001/progress.md updated

Step 4: Sync to external tools
  GitHub: ✓ Issue #142 checkboxes updated
  JIRA: ✓ Epic AUTH-100 progress: 60%

All systems synchronized!
```

---

## Workflow Command

Get intelligent guidance on what to do next:

```bash
/sw:workflow

# Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW NAVIGATOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current State: 0042-user-authentication

Phase: IMPLEMENTATION (60% complete)

Recommended Actions:
  1. Continue implementation: /sw:do
  2. Check progress: /sw:progress
  3. Validate quality: /sw:qa 0042

Blockers Detected: None

External Status:
  GitHub: In sync ✓
  JIRA: In sync ✓

Ready for: Continue implementing tasks
```

---

## Quick Exercise

Practice lifecycle management:

```bash
# 1. Create a test increment
/sw:increment "Test lifecycle feature"

# 2. Check status
/sw:status

# 3. Pause it
/sw:pause 0001 --reason "Testing pause"

# 4. Resume it
/sw:resume 0001

# 5. Move to backlog
/sw:backlog 0001

# 6. Abandon it (cleanup)
/sw:abandon 0001 --reason "Test complete"
```

---

## Best Practices

### 1. Keep WIP Low

```
❌ 5 active increments = context switching nightmare
✅ 1-2 active increments = focused, fast delivery
```

### 2. Archive Regularly

```bash
# Add to weekly routine:
/sw:archive --completed --older-than 7d
```

### 3. Use Backlog for Future Work

```bash
# Don't start what you can't finish
/sw:increment "Future feature" --backlog
```

### 4. Always Provide Reasons

```bash
# Good:
/sw:pause 0042 --reason "Waiting for Stripe API keys"
/sw:abandon 0042 --reason "Feature cancelled per PM decision"

# Bad:
/sw:pause 0042  # Why? No one will remember
```

---

## Key Takeaways

1. **Increments have clear states**: Planning → Active → Completed → Archived
2. **Pause when blocked**, not when busy with other work
3. **Archive completed work** to keep workspace clean
4. **Abandon obsolete increments** rather than leaving them in limbo
5. **Use /sw:workflow** for intelligent guidance

---

## Glossary Terms Used

- **[Increment](/docs/glossary/terms/increments)** — A unit of work
- **[WIP Limits](/docs/glossary/terms/wip-limits)** — Work-in-progress constraints
- **[Quality Gate](/docs/glossary/terms/quality-gate)** — Validation checkpoint
- **[Living Docs](/docs/glossary/terms/living-docs)** — Auto-synced documentation

---

## What's Next?

Now that you understand the full increment lifecycle, let's dive deep into GitHub integration — the most popular external tool sync.

**:next** → [Lesson 14: GitHub Integration Guide](./14-github-integration)
