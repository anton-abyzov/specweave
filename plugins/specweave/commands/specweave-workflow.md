---
name: specweave:workflow
description: Smart workflow navigator - shows current phase, reviews spec/tasks, suggests next step (validate, close, sync). Shows external tool status.
---

# Smart Workflow Navigator

**Intelligent workflow guidance**: Shows where you are, what's done, and what to do next.

You are helping the user navigate through the SpecWeave increment workflow with context-aware suggestions.

## Usage

```bash
/specweave:workflow [increment-id]
```

**No arguments**: Auto-detects active increment

---

## STEP 1: Detect Active Increment and Load Context

```bash
# Auto-detect from state or use provided ID
ACTIVE_STATE=".specweave/state/active-increment.json"
if [ -f "$ACTIVE_STATE" ]; then
  INCREMENT_ID=$(jq -r '.ids[0]' "$ACTIVE_STATE" 2>/dev/null)
fi

# Load increment files
INCREMENT_DIR=".specweave/increments/$INCREMENT_ID"
SPEC_FILE="$INCREMENT_DIR/spec.md"
TASKS_FILE="$INCREMENT_DIR/tasks.md"
METADATA_FILE="$INCREMENT_DIR/metadata.json"
```

**Read and parse**:
1. **spec.md**: Extract AC count, completed ACs, status
2. **tasks.md**: Extract task count, completed tasks, priorities
3. **metadata.json**: Get linked external tools, feature_id, dates

---

## STEP 2: Determine Current Workflow Phase

**Analyze state and determine phase**:

```typescript
type WorkflowPhase =
  | 'PLANNING'        // spec.md exists but no tasks or plan
  | 'IMPLEMENTING'    // Tasks in progress (< 100% complete)
  | 'REVIEW_READY'    // All tasks done, needs review
  | 'VALIDATE_READY'  // Ready for validation
  | 'CLOSE_READY'     // Validation passed, ready to close
  | 'SYNC_PENDING'    // Closed but not synced to external tools
  | 'COMPLETED'       // Fully completed and synced
```

**Phase Detection Logic**:

```javascript
function detectPhase(spec, tasks, metadata) {
  const taskCompletion = tasks.completedCount / tasks.totalCount;
  const acCompletion = spec.completedACs / spec.totalACs;

  if (taskCompletion === 0) return 'PLANNING';
  if (taskCompletion < 1) return 'IMPLEMENTING';
  if (taskCompletion === 1 && !metadata.lastValidation) return 'REVIEW_READY';
  if (taskCompletion === 1 && metadata.lastValidation?.passed) return 'CLOSE_READY';
  if (metadata.status === 'completed' && !metadata.externalSynced) return 'SYNC_PENDING';
  if (metadata.status === 'completed') return 'COMPLETED';
  return 'VALIDATE_READY';
}
```

---

## STEP 3: Display Workflow Status Dashboard

**Show comprehensive status with phase indicator**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORKFLOW NAVIGATOR: 0053-safe-feature-deletion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT PHASE: REVIEW_READY

━━━ WORKFLOW PROGRESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [x] Planning     - spec.md and plan.md created
  [x] Tasks        - tasks.md generated (37 tasks)
  [x] Implementing - All tasks completed (37/37)
  [ ] Review       - Review spec.md and tasks.md
  [ ] Validate     - Run quality validation
  [ ] Close        - PM validation and closure
  [ ] Sync         - Update living docs & external tools

━━━ COMPLETION STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Tasks:  ████████████████████ 100% (37/37)
  ACs:    ████████████████████ 100% (70/70)

  Priority Breakdown:
    P1 (Critical):   12/12 ✅
    P2 (Important):  18/18 ✅
    P3 (Nice-to-have): 7/7 ✅

━━━ EXTERNAL TOOLS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub:  ✅ Connected (Issue #142)
  JIRA:    ⚪ Not configured
  ADO:     ⚪ Not configured
```

---

## STEP 4: Provide Phase-Specific Suggestions

**Based on detected phase, suggest next action**:

### Phase: PLANNING

```
━━━ NEXT STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're in the PLANNING phase. Tasks need to be generated.

SUGGESTED ACTION:
  Run: /specweave:plan 0053

This will:
  • Generate plan.md with architecture design
  • Create tasks.md with implementation tasks
  • Link tasks to acceptance criteria
```

### Phase: IMPLEMENTING

```
━━━ NEXT STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're in the IMPLEMENTING phase. 23/37 tasks complete.

CURRENT TASK: T-024 - Implement soft delete mechanism
  Priority: P1 (Critical)
  User Story: US-003
  Satisfies: AC-US3-01, AC-US3-02

SUGGESTED ACTION:
  Continue: /specweave:do 0053

PROGRESS:
  Estimated remaining: ~4-6 hours
  Next milestone: US-003 completion (3 tasks left)
```

### Phase: REVIEW_READY (Key phase for user's request!)

```
━━━ NEXT STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All tasks complete! Time to review before validation.

REVIEW CHECKLIST:
  [ ] Review spec.md - Verify all ACs marked complete
  [ ] Review tasks.md - Verify all tasks marked complete
  [ ] Check test coverage - Ensure tests cover ACs
  [ ] Check docs - README, CHANGELOG updated

SUGGESTED ACTIONS (in order):

  1. REVIEW FILES:
     cat .specweave/increments/0053-*/spec.md | head -100
     cat .specweave/increments/0053-*/tasks.md | head -100

  2. VALIDATE QUALITY:
     /specweave:validate 0053 --quality

  3. IF VALIDATION PASSES:
     /specweave:done 0053

Quick commands:
  • /specweave:progress       - See task breakdown
  • /specweave:check-tests 0053 - Verify test coverage
```

### Phase: VALIDATE_READY

```
━━━ NEXT STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready for validation. Run quality checks before closing.

SUGGESTED ACTION:
  Run: /specweave:validate 0053 --quality

This will check:
  • 141 rule-based validation checks
  • AI quality assessment (7 dimensions)
  • AC coverage and traceability
  • Three-file canonical structure (ADR-0047)

After validation passes:
  Run: /specweave:done 0053
```

### Phase: CLOSE_READY

```
━━━ NEXT STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Validation passed! Ready to close increment.

VALIDATION SUMMARY:
  Last run: 2025-11-25 10:30:00
  Rule-based: 141/141 passed ✅
  Quality score: 87/100 (GOOD) ✅

SUGGESTED ACTION:
  Run: /specweave:done 0053

This will:
  • Run PM validation (3 gates: tasks, tests, docs)
  • Close increment with completion report
  • Run post-closure quality assessment
  • Trigger external tool sync (if configured)

After closure:
  • Living docs will be updated
  • GitHub issue #142 will be closed
  • Status line will show completion
```

### Phase: SYNC_PENDING

```
━━━ NEXT STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment closed! Sync to external tools pending.

SUGGESTED ACTION:
  Run: /specweave:sync-progress 0053

This will sync to:
  ✅ Living docs (user stories, features)
  ✅ GitHub issue #142 (close with summary)
  ⚪ JIRA (not configured)
  ⚪ ADO (not configured)

Or sync individually:
  • /specweave:sync-specs 0053  - Living docs only
  • /specweave-github:close-issue 0053 - GitHub only
```

### Phase: COMPLETED

```
━━━ NEXT STEP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment fully completed and synced!

SUMMARY:
  Closed: 2025-11-25 14:00:00
  Duration: 14 days (vs 21 estimated)
  Quality: 87/100 (GOOD)

EXTERNAL TOOLS STATUS:
  GitHub #142: Closed ✅
  Living docs: Synced ✅

WHAT'S NEXT:
  • Start new increment: /specweave:increment "feature name"
  • Check backlog: /specweave:status
  • Archive this increment: /specweave:archive 0053

Quick: /specweave:next (auto-suggests next work)
```

---

## STEP 5: Show External Tool Status (Always)

**Display status of connected external tools**:

```javascript
async function showExternalToolsStatus(metadata) {
  console.log('\n━━━ EXTERNAL TOOLS STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // GitHub
  if (metadata.github?.issue) {
    const status = await getGitHubIssueStatus(metadata.github.issue);
    console.log(`  GitHub Issue #${metadata.github.issue}:`);
    console.log(`    Status: ${status.state} ${status.state === 'closed' ? '✅' : '🔵'}`);
    console.log(`    URL: ${metadata.github.url}`);
    console.log(`    Last sync: ${metadata.github.lastSync || 'Not synced'}`);
  } else {
    console.log('  GitHub: ⚪ Not linked');
    console.log('    Setup: /specweave-github:create-issue 0053');
  }

  // JIRA
  if (metadata.jira?.issue) {
    const status = await getJiraIssueStatus(metadata.jira.issue);
    console.log(`\n  JIRA Issue ${metadata.jira.issue}:`);
    console.log(`    Status: ${status.status} ${status.status === 'Done' ? '✅' : '🔵'}`);
    console.log(`    URL: ${metadata.jira.url}`);
  } else {
    console.log('\n  JIRA: ⚪ Not configured');
  }

  // ADO
  if (metadata.ado?.workItem) {
    const status = await getAdoWorkItemStatus(metadata.ado.workItem);
    console.log(`\n  Azure DevOps #${metadata.ado.workItem}:`);
    console.log(`    Status: ${status.state} ${status.state === 'Closed' ? '✅' : '🔵'}`);
    console.log(`    URL: ${metadata.ado.url}`);
  } else {
    console.log('\n  Azure DevOps: ⚪ Not configured');
  }
}
```

**Example output**:

```
━━━ EXTERNAL TOOLS STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub Issue #142:
    Status: open 🔵
    URL: https://github.com/org/repo/issues/142
    Last sync: 2025-11-25 09:15:00

    Action needed: Run /specweave:sync-progress to update

  JIRA: ⚪ Not configured
    Setup: /specweave-jira:sync to connect

  Azure DevOps: ⚪ Not configured
```

---

## STEP 6: Suggest Living Docs Update (If Applicable)

**If increment modifies features, suggest living docs sync**:

```
━━━ LIVING DOCS STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Feature: FS-012 (Safe Feature Deletion)
  Location: .specweave/docs/public/specs/fs-012-safe-feature-deletion/

  User Stories:
    US-001: Delete feature with confirmation  [SYNCED] ✅
    US-002: Undo deletion within 30 days      [SYNCED] ✅
    US-003: Cascade delete child items        [PENDING] 🔵
    US-004: Audit log for deletions           [PENDING] 🔵

  Action: Run /specweave:sync-specs 0053 to update living docs
```

---

## Complete Example Output

**Full workflow navigator display**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORKFLOW NAVIGATOR: 0053-safe-feature-deletion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT PHASE: REVIEW_READY

━━━ WORKFLOW PROGRESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [x] Planning     - spec.md and plan.md created
  [x] Tasks        - tasks.md generated (37 tasks)
  [x] Implementing - All tasks completed (37/37)
  [ ] Review       - Review spec.md and tasks.md  <-- YOU ARE HERE
  [ ] Validate     - Run quality validation
  [ ] Close        - PM validation and closure
  [ ] Sync         - Update living docs & external tools

━━━ COMPLETION STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Tasks:  ████████████████████ 100% (37/37)
  ACs:    ████████████████████ 100% (70/70)

━━━ FILES TO REVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  spec.md:  70 ACs, 100% complete
    View: cat .specweave/increments/0053-*/spec.md

  tasks.md: 37 tasks, 100% complete
    View: cat .specweave/increments/0053-*/tasks.md

━━━ EXTERNAL TOOLS STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub Issue #142:
    Status: open 🔵
    Checklist: 35/37 tasks checked
    Action: Will auto-close after /specweave:done

  JIRA: ⚪ Not configured
  ADO:  ⚪ Not configured

━━━ LIVING DOCS STATUS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Feature: FS-012 (Safe Feature Deletion)
  User Stories: 4/6 synced (2 pending)
  Action: Will sync after closure

━━━ NEXT STEPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All tasks complete! Recommended workflow:

  1. REVIEW (current):
     Review spec.md and tasks.md for completeness

  2. VALIDATE:
     /specweave:validate 0053 --quality

  3. CLOSE (if validation passes):
     /specweave:done 0053

  4. SYNC (automatic after close):
     Living docs and GitHub will auto-sync

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quick: /specweave:workflow (refresh) | /specweave:next (auto-transition)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error Handling

**No active increment**:
```
❌ No active increment found.

Options:
  • Check status: /specweave:status
  • Start new: /specweave:increment "feature name"
  • Resume paused: /specweave:resume <id>

Available increments:
  0052-feature-a (paused)
  0054-feature-b (backlog)
```

**Increment not found**:
```
❌ Increment 0099 not found.

Available increments:
  0052-feature-a (in-progress)
  0053-feature-b (completed)

Usage: /specweave:workflow [increment-id]
```

---

## Related Commands

- `/specweave:progress` - Quick task completion view
- `/specweave:validate` - Quality validation
- `/specweave:done` - Close increment
- `/specweave:sync-progress` - Sync to external tools
- `/specweave:next` - Auto-transition to next work
- `/specweave:status` - Overview of all increments

---

**Key difference from `/specweave:next`**:
- `/specweave:workflow` = **Informational dashboard** (where am I? what's next?)
- `/specweave:next` = **Action-oriented** (auto-close and transition)

Use `/specweave:workflow` to **understand your position**, then use specific commands to act.
