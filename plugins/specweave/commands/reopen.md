---
description: |
  Reopen completed increments, tasks, or user stories when issues are discovered.
  Validates WIP limits, creates audit trail, and syncs to external tools.
  Use when recently completed work has issues that need fixing.
disable-model-invocation: true
---

# Reopen Increment, Task, or User Story

Reopen completed work when issues are discovered after completion.

## Quick Start

```bash
# Reopen entire increment (natural language - RECOMMENDED)
/sw:reopen 0043 Bug found in AC sync implementation

# OR with explicit --reason flag
/sw:reopen 0031 --reason "GitHub sync failing"

# Reopen specific task
/sw:reopen 0031 --task T-003 --reason "API integration broken"

# Reopen user story (all related tasks)
/sw:reopen 0031 --user-story US-001 --reason "Acceptance criteria not met"
```

### Natural Language Syntax (NEW!)

You can now use natural language without the `--reason` flag:

```bash
# ✅ WORKS: Natural language (everything after increment ID is the reason)
/sw:reopen 0043 Bug found in implementation, need to fix

# ✅ WORKS: Traditional syntax with flag
/sw:reopen 0043 --reason "Bug found in implementation"

# ✅ WORKS: With task ID
/sw:reopen 0043 --task T-005 Found edge case not covered
```

**How it works**: All text after the increment ID (and any flags) is treated as the reason. No quotes needed!

## Smart Detection First!

**Before using this command manually**, try reporting your issue naturally:
```
"The GitHub sync isn't working"
```

The `smart-reopen-detector` skill will:
1. 🔍 Scan recent work
2. 🎯 Find related items
3. 💡 Suggest the exact command to run

## Usage

### Reopen Entire Increment

Reopens the increment and marks all tasks as active.

```bash
/sw:reopen <increment-id> --reason "Why reopening"
```

**Example**:
```bash
/sw:reopen 0031-external-tool-status-sync --reason "GitHub sync failing in production"
```

**What happens**:
1. ✅ Changes status: COMPLETED → ACTIVE
2. 📋 Reopens all completed tasks: [x] → [ ]
3. ⚠️  Checks WIP limits (warns if exceeded)
4. 📝 Creates audit trail in metadata.json
5. 🔄 Syncs to external tools (GitHub/JIRA/ADO)
6. 📊 Updates status line

### Reopen Specific Task

Reopens a single task without changing increment status.

```bash
/sw:reopen <increment-id> --task <task-id> --reason "Why reopening"
```

**Example**:
```bash
/sw:reopen 0031 --task T-003 --reason "GitHub API returning 500 errors"
```

**What happens**:
1. ✅ Updates task status: [x] → [ ]
2. 📝 Adds annotation: "Reopened: YYYY-MM-DD - reason"
3. 🔄 Unchecks task checkbox in external issue (if synced)
4. 📊 Updates status line progress

### Reopen User Story

Reopens a user story and all its related tasks.

```bash
/sw:reopen <increment-id> --user-story <us-id> --reason "Why reopening"
```

**Example**:
```bash
/sw:reopen 0031 --user-story US-001 --reason "Authentication not working as specified"
```

**What happens**:
1. ✅ Finds all tasks with AC-US1-XX
2. 📋 Reopens each task: [x] → [ ]
3. 📄 Updates user story status in living docs
4. 🔄 Syncs to external tools

### Force Reopen (Bypass WIP Limits)

Use `--force` to bypass WIP limit checks (use sparingly!).

```bash
/sw:reopen <increment-id> --force --reason "Critical production issue"
```

**Example**:
```bash
/sw:reopen 0031 --force --reason "Production down, need immediate fix"
```

**⚠️  Warning**: This can violate WIP limits. Use only for:
- Critical production incidents
- Hotfixes
- When no other increment can be paused

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<increment-id>` | Yes | Increment to reopen (e.g., `0031` or `0031-external-tool-status-sync`) |
| `--reason <text>` | Optional* | Why reopening (for audit trail). *Can use natural language instead! |
| `--task <id>` | No | Reopen specific task (e.g., `T-003`) |
| `--user-story <id>` | No | Reopen user story + related tasks (e.g., `US-001`) |
| `--force` | No | Bypass WIP limit checks |

**Natural Language**: If `--reason` is not provided, all remaining text is used as the reason.

Examples:
- `/sw:reopen 0043 Bug found` → reason = "Bug found"
- `/sw:reopen 0043 --task T-005 Edge case` → reason = "Edge case"
- `/sw:reopen 0043 --reason "Formal reason"` → reason = "Formal reason" (explicit)

## WIP Limit Validation

The command automatically checks WIP limits before reopening increments.

**Example (limit exceeded)**:
```
⚠️  WIP LIMIT WARNING:
   Current active: 2 features
   Limit: 2 features
   Reopening 0031 will EXCEED the limit (3/2)!

Options:
1. Pause another feature: /sw:pause 0030 --reason "Paused for critical fix"
2. Complete another feature: /sw:done 0029
3. Force reopen: /sw:reopen 0031 --force --reason "Production critical"

Continue? (y/n)
```

**Unlimited types** (no WIP check):
- `hotfix` - Critical production fixes
- `bug` - Production bug investigations
- `experiment` - POCs and spikes

## Audit Trail

Every reopen is tracked in the increment's metadata.json:

```json
{
  "id": "0031-external-tool-status-sync",
  "status": "active",
  "reopened": {
    "count": 1,
    "history": [
      {
        "date": "2025-11-14T15:30:00Z",
        "reason": "GitHub sync failing",
        "previousStatus": "completed",
        "by": "user"
      }
    ]
  }
}
```

Tasks are also annotated:

```markdown
### T-003: GitHub Content Sync

**Status**: [ ] (Reopened: 2025-11-14 - GitHub sync failing)

**Previous Completions**:
- Completed: 2025-11-12T10:00:00Z
- Reopened: 2025-11-14T15:30:00Z - GitHub sync failing
```

## External Tool Sync

When you reopen an increment/task, it syncs to external tools:

### GitHub
- Reopens closed issue
- Updates issue body: "⚠️  **Reopened**: [reason]"
- Unchecks completed task checkboxes
- Adds label: `reopened`

### JIRA
- Transitions issue: Done → In Progress
- Adds comment: "Reopened: [reason]"
- Updates resolution: None

### Azure DevOps
- Updates work item state: Closed → Active
- Adds comment: "Reopened: [reason]"

## Examples

### Example 1: Production Bug
```bash
# Discover via smart detector
"The payment processing is broken after deployment"

# Suggested command (from smart detector)
/sw:reopen 0028-payment-integration --reason "Payment processing failing in prod"

# Result
✅ Increment 0028 reopened
⚠️  WIP LIMIT: 3/2 active features (EXCEEDED)
📋 Reopened 5 tasks
🔄 Synced to GitHub issue #123
💡 Continue work: /sw:do 0028
```

### Example 2: Specific Task Fix
```bash
# Surgical reopen (just one task)
/sw:reopen 0031 --task T-003 --reason "GitHub API rate limiting not handled"

# Result
✅ Task T-003 reopened
📊 Progress: 23/24 tasks (95%)
💡 Fix and mark complete: [x] in tasks.md
```

### Example 3: User Story Not Met
```bash
# Reopen entire user story
/sw:reopen 0025 --user-story US-002 --reason "Security requirements not satisfied"

# Result
✅ User story US-002 reopened
📋 Reopened 3 related tasks: T-004, T-005, T-006
📄 Updated living docs: us-002-security-requirements.md
🔄 Synced to JIRA story AUTH-123
```

## Status Line Integration

After reopening, the status line shows:

```
📊 0031-external-tool-status-sync | ⚠️  REOPENED | 23/24 tasks (95%) | GitHub sync failing
```

The `⚠️  REOPENED` badge indicates the increment was previously completed.

## Common Scenarios

### Scenario 1: Tests Passing Locally, Failing in CI

```bash
# Reopen increment to investigate
/sw:reopen 0032 --reason "CI tests failing, passing locally"

# Debug CI config
# Fix issue
# Mark complete again
```

### Scenario 2: Feature Works but Acceptance Criteria Not Met

```bash
# Reopen specific user story
/sw:reopen 0029 --user-story US-003 --reason "Missing error handling requirement"

# Implement missing AC
# Complete user story
```

### Scenario 3: Regression Found

```bash
# Reopen old increment (if within 7 days)
/sw:reopen 0027 --task T-012 --reason "Regression: login timeout increased"

# Fix regression
# Add regression test
# Complete
```

## Integration with Workflow

**Full workflow**:
```bash
# 1. Report issue (triggers smart detector)
"The GitHub sync is broken"

# 2. Smart detector suggests
# /sw:reopen 0031 --task T-003 --reason "GitHub sync broken"

# 3. Execute reopen
/sw:reopen 0031 --task T-003 --reason "GitHub sync broken"

# 4. Check status
/sw:status

# 5. Fix the issue
# Edit code...

# 6. Mark complete
# Update tasks.md: [ ] → [x]

# 7. Close increment (if all tasks done)
/sw:done 0031
```

## Best Practices

### ✅ Do
- Always provide a clear `--reason`
- Check WIP limits first (`/sw:status`)
- Use task-level reopen for surgical fixes
- Use increment reopen for systemic issues
- Add reopened annotation to tasks.md

### ❌ Don't
- Abuse `--force` (respect WIP limits)
- Reopen old increments (>7 days) without investigation
- Reopen without understanding the issue
- Skip the reason (audit trail is critical)

## Troubleshooting

**Problem**: "Cannot reopen: increment status is active, not completed"

**Solution**: Increment is already active, no need to reopen. Just continue work.

---

**Problem**: "WIP limit exceeded"

**Solution**: Pause or complete another increment first:
```bash
/sw:pause 0030 --reason "Paused for critical fix"
/sw:reopen 0031 --reason "Production issue"
```

---

**Problem**: "Task T-003 not found in tasks.md"

**Solution**: Check task ID spelling:
```bash
# List all tasks
cat .specweave/increments/0031-external-tool-status-sync/tasks.md | grep "^##"
```

---

**Problem**: "User story US-001 not found"

**Solution**: Check spec.md for correct user story ID.

## Related Commands

- `/sw:status` - Check WIP limits
- `/sw:progress` - See increment progress
- `/sw:do` - Continue work after reopening
- `/sw:pause` - Pause another increment to make room
- `/sw:done` - Close increment when fixed

## Technical Details

**Implementation**:
- Core logic: `src/core/increment/increment-reopener.ts`
- Smart detection: `src/core/increment/recent-work-scanner.ts`
- Status transitions: Updated in `increment-metadata.ts`

**Validation**:
- ✅ Increment exists
- ✅ Current status is COMPLETED
- ✅ WIP limits (unless --force)
- ✅ Task/User story exists

**External Sync**:
- GitHub: `plugins/specweave-github/hooks/post-task-completion.sh`
- JIRA: `plugins/specweave-jira/hooks/post-task-completion.sh`
- ADO: `plugins/specweave-ado/hooks/post-task-completion.sh`

---

**Related Skills**: `smart-reopen-detector`
**Auto-activation**: Report issues like "not working", "broken", "failing"
