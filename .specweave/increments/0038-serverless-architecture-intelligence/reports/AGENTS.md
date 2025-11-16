# AGENTS.md - SpecWeave for Non-Claude Tools

This file provides **manual instructions** for using SpecWeave with **non-Claude Code tools** (Cursor, GitHub Copilot, ChatGPT, etc.).

**Note**: Claude Code has native support via plugins and hooks. If you're using Claude Code, these manual steps are **automatic**.

---

## Table of Contents

1. [Spec Synchronization](#spec-synchronization)
2. [Increment Lifecycle](#increment-lifecycle)
3. [Living Docs Sync](#living-docs-sync)
4. [Task Management](#task-management)

---

## Spec Synchronization

### Problem

In spec-driven development, **spec.md is the source of truth**. When spec.md changes after plan.md and tasks.md have been created, those files can become **out of sync**, leading to:

- Implementation following outdated plans
- Tasks that don't match current requirements
- Confusion about what to actually build

### Solution (Manual for Non-Claude Tools)

Follow these steps to manually synchronize plan.md and tasks.md when spec.md changes.

---

### Step 1: Detect Spec Changes

#### macOS/Linux:

```bash
#!/bin/bash
# File: scripts/detect-spec-change.sh

INCREMENT_ID="$1"
INCREMENT_DIR=".specweave/increments/$INCREMENT_ID"

if [[ ! -d "$INCREMENT_DIR" ]]; then
  echo "Error: Increment $INCREMENT_ID not found"
  exit 1
fi

SPEC_FILE="$INCREMENT_DIR/spec.md"
PLAN_FILE="$INCREMENT_DIR/plan.md"

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "Error: spec.md not found"
  exit 1
fi

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "No plan.md yet (planning phase)"
  exit 0
fi

# Get modification times
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS
  SPEC_TIME=$(stat -f %m "$SPEC_FILE")
  PLAN_TIME=$(stat -f %m "$PLAN_FILE")
else
  # Linux
  SPEC_TIME=$(stat -c %Y "$SPEC_FILE")
  PLAN_TIME=$(stat -c %Y "$PLAN_FILE")
fi

# Compare
if [[ $SPEC_TIME -gt $PLAN_TIME ]]; then
  echo "⚠️  SPEC CHANGED - SYNC NEEDED"
  echo ""
  echo "spec.md: $(date -r $SPEC_TIME)"
  echo "plan.md: $(date -r $PLAN_TIME)"
  echo ""
  echo "Actions required:"
  echo "  1. Regenerate plan.md"
  echo "  2. Regenerate tasks.md"
  echo "  3. Preserve task completion status"
  exit 1
else
  echo "✅ spec.md and plan.md are in sync"
  exit 0
fi
```

#### Windows (PowerShell):

```powershell
# File: scripts/detect-spec-change.ps1

param(
  [Parameter(Mandatory=$true)]
  [string]$IncrementId
)

$IncrementDir = ".specweave/increments/$IncrementId"
$SpecFile = "$IncrementDir/spec.md"
$PlanFile = "$IncrementDir/plan.md"

if (-not (Test-Path $SpecFile)) {
  Write-Error "spec.md not found"
  exit 1
}

if (-not (Test-Path $PlanFile)) {
  Write-Host "No plan.md yet (planning phase)"
  exit 0
}

$specTime = (Get-Item $SpecFile).LastWriteTime
$planTime = (Get-Item $PlanFile).LastWriteTime

if ($specTime -gt $planTime) {
  Write-Host "⚠️  SPEC CHANGED - SYNC NEEDED" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "spec.md: $specTime"
  Write-Host "plan.md: $planTime"
  Write-Host ""
  Write-Host "Actions required:"
  Write-Host "  1. Regenerate plan.md"
  Write-Host "  2. Regenerate tasks.md"
  Write-Host "  3. Preserve task completion status"
  exit 1
} else {
  Write-Host "✅ spec.md and plan.md are in sync" -ForegroundColor Green
  exit 0
}
```

---

### Step 2: Backup Existing Files

Before regenerating, **always backup** your current plan.md and tasks.md:

```bash
#!/bin/bash
# File: scripts/backup-increment-files.sh

INCREMENT_ID="$1"
INCREMENT_DIR=".specweave/increments/$INCREMENT_ID"
BACKUP_DIR="$INCREMENT_DIR/backups/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [[ -f "$INCREMENT_DIR/plan.md" ]]; then
  cp "$INCREMENT_DIR/plan.md" "$BACKUP_DIR/plan.md.backup"
  echo "✅ Backed up plan.md"
fi

if [[ -f "$INCREMENT_DIR/tasks.md" ]]; then
  cp "$INCREMENT_DIR/tasks.md" "$BACKUP_DIR/tasks.md.backup"
  echo "✅ Backed up tasks.md"
fi

echo "Backup created at: $BACKUP_DIR"
```

---

### Step 3: Regenerate plan.md

#### Using Cursor/AI Assistant:

1. **Read the updated spec.md**:
   ```
   Open: .specweave/increments/{id}/spec.md
   ```

2. **Prompt your AI assistant**:
   ```
   I need you to regenerate plan.md based on this updated spec.md.

   The plan.md should follow this structure:
   - Architecture Overview
   - Technology Stack
   - Component Design (detailed API, methods, dependencies)
   - Implementation Phases
   - File Structure
   - Testing Strategy
   - Performance Targets
   - Security Considerations
   - Integration Points
   - Risks & Mitigations
   - Success Metrics

   Please read the existing plan.md first to maintain the same format and style.

   spec.md content:
   [PASTE SPEC.MD CONTENT HERE]

   existing plan.md content:
   [PASTE CURRENT PLAN.MD CONTENT HERE]

   Generate the updated plan.md, preserving sections that haven't changed
   and updating only the sections affected by the spec changes.
   ```

3. **Review and save**:
   - Review the AI-generated plan.md
   - Check that it accurately reflects the updated spec.md
   - Save to `.specweave/increments/{id}/plan.md`

---

### Step 4: Regenerate tasks.md

#### Using Cursor/AI Assistant:

1. **Read the updated plan.md**:
   ```
   Open: .specweave/increments/{id}/plan.md
   ```

2. **Extract task completion status** (CRITICAL):
   ```bash
   # Extract completed tasks before regenerating
   grep -E "^\s*-\s*\[x\]\s*\*\*T-[0-9]+\*\*" .specweave/increments/{id}/tasks.md > /tmp/completed-tasks.txt
   ```

3. **Prompt your AI assistant**:
   ```
   I need you to regenerate tasks.md based on this updated plan.md.

   The tasks.md should follow this structure:
   - Task Notation section (explaining T-###, [P], [US#], [x], AC, test plans)
   - Phases (matching plan.md phases)
   - For each User Story:
     - Multiple tasks (T-###)
     - Each task has: AC reference, File, Test Plan (Given/When/Then), Dependencies, Estimated time
     - Test plans embedded in BDD format
   - Summary section (total tasks, coverage target, estimated duration, AC coverage)

   Please read the existing tasks.md first to maintain the same format and numbering.

   plan.md content:
   [PASTE UPDATED PLAN.MD CONTENT HERE]

   existing tasks.md content:
   [PASTE CURRENT TASKS.MD CONTENT HERE]

   Generate the updated tasks.md. IMPORTANT: I will manually restore completion status next.
   ```

4. **Restore task completion status** (CRITICAL):
   ```bash
   #!/bin/bash
   # File: scripts/restore-task-status.sh

   OLD_TASKS="$1"  # Path to backup tasks.md
   NEW_TASKS="$2"  # Path to regenerated tasks.md

   if [[ ! -f "$OLD_TASKS" ]] || [[ ! -f "$NEW_TASKS" ]]; then
     echo "Error: Files not found"
     exit 1
   fi

   # Extract completed task IDs from old file
   COMPLETED_IDS=$(grep -oE "\[x\] \*\*T-[0-9]+\*\*" "$OLD_TASKS" | grep -oE "T-[0-9]+" | sort -u)

   # For each completed task, mark it as [x] in new file
   for task_id in $COMPLETED_IDS; do
     # Replace [ ] with [x] for this task ID
     sed -i.bak "s/\(\[ \] \*\*$task_id\*\*\)/[x] **$task_id**/g" "$NEW_TASKS"
     echo "✅ Restored completion status for $task_id"
   done

   rm -f "$NEW_TASKS.bak"
   echo "✅ Task completion status restored"
   ```

   **Usage**:
   ```bash
   ./scripts/restore-task-status.sh \
     .specweave/increments/{id}/backups/20250116-120000/tasks.md.backup \
     .specweave/increments/{id}/tasks.md
   ```

---

### Step 5: Verify Sync

1. **Visual diff**:
   ```bash
   # Compare old vs new plan.md
   diff -u backups/{timestamp}/plan.md.backup plan.md | less

   # Compare old vs new tasks.md (after status restoration)
   diff -u backups/{timestamp}/tasks.md.backup tasks.md | less
   ```

2. **Verify task completion**:
   ```bash
   # Count completed tasks (should match before and after)
   echo "Old tasks.md:"
   grep -c "\[x\]" backups/{timestamp}/tasks.md.backup

   echo "New tasks.md:"
   grep -c "\[x\]" tasks.md
   ```

3. **Manual review**:
   - Read through the changes
   - Ensure new content reflects spec.md updates
   - Verify no important information was lost
   - Check that completed tasks are still marked [x]

---

### Quick Reference

**Complete workflow**:

```bash
# 1. Detect change
./scripts/detect-spec-change.sh 0039

# 2. Backup files
./scripts/backup-increment-files.sh 0039

# 3. Regenerate plan.md (using AI assistant - see above)

# 4. Regenerate tasks.md (using AI assistant - see above)

# 5. Restore task completion status
./scripts/restore-task-status.sh \
  .specweave/increments/0039/backups/{timestamp}/tasks.md.backup \
  .specweave/increments/0039/tasks.md

# 6. Verify
diff -u backups/{timestamp}/plan.md.backup plan.md
diff -u backups/{timestamp}/tasks.md.backup tasks.md
```

---

### Edge Cases

#### spec.md deleted:
- **Action**: Do not sync
- **Warning**: "spec.md is missing - cannot sync"

#### plan.md doesn't exist yet:
- **Action**: No sync needed (planning phase)
- **Reason**: Normal workflow - run `/specweave:plan` first

#### tasks.md doesn't exist:
- **Action**: Only regenerate plan.md
- **Reason**: Tasks will be generated when plan is ready

#### Concurrent edits:
- **Action**: Use modification times to detect conflicts
- **Warning**: "Both spec.md and plan.md modified recently - manual review needed"

#### Invalid spec.md format:
- **Action**: Skip sync, show error
- **Error**: "spec.md is not valid markdown - fix formatting first"

---

## VS Code File Watcher (Optional)

For automatic detection in VS Code:

```json
{
  "tasks": [
    {
      "label": "Detect Spec Changes",
      "type": "shell",
      "command": "./scripts/detect-spec-change.sh",
      "args": ["${input:incrementId}"],
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "incrementId",
      "type": "promptString",
      "description": "Increment ID (e.g., 0039)"
    }
  ]
}
```

Add to `.vscode/tasks.json`.

---

## Cursor Rules (.cursorrules)

For Cursor users, add this to `.cursorrules`:

```markdown
# SpecWeave Spec Sync Rules

When editing spec.md in .specweave/increments/{id}/:
1. Check if plan.md exists
2. If yes, warn: "⚠️  plan.md exists - sync may be needed after editing spec.md"
3. After saving spec.md, suggest: "Run: ./scripts/detect-spec-change.sh {id}"

When regenerating plan.md or tasks.md:
- Preserve existing structure and formatting
- Only update sections affected by spec changes
- For tasks.md: **ALWAYS** preserve [x] completion status
- Show diff of changes before saving
```

---

## Troubleshooting

### "Completed tasks lost after regeneration"

**Cause**: Forgot to run `restore-task-status.sh`

**Fix**:
```bash
# Restore from backup
cp backups/{timestamp}/tasks.md.backup tasks.md

# Then properly regenerate with status preservation
./scripts/restore-task-status.sh backups/{timestamp}/tasks.md.backup tasks.md
```

### "Too many changes - hard to review"

**Cause**: Large spec changes

**Solution**:
- Make smaller, incremental spec.md changes
- Regenerate after each change
- Review diffs carefully

### "Task IDs changed - can't map completion status"

**Cause**: Tasks were renumbered

**Solution**:
- Try to preserve task IDs when regenerating
- If renumbering is unavoidable, manually review and restore [x] status by task description (not just ID)

---

## Future: Automated Sync (Coming Soon)

We're working on automated sync support for non-Claude tools:

1. **File watcher**: Auto-detect spec.md changes
2. **One-click sync**: Button in VS Code to trigger sync
3. **Smarter merging**: Preserve manual edits where possible
4. **Conflict resolution**: Interactive UI for merge conflicts

**Track progress**: [SpecWeave GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

---

## Increment Lifecycle

**Coming soon** - Manual instructions for increment lifecycle management in non-Claude tools.

## Living Docs Sync

**Coming soon** - Manual instructions for living docs synchronization in non-Claude tools.

## Task Management

**Coming soon** - Manual instructions for task tracking and completion in non-Claude tools.

---

**Questions?** [Open an issue](https://github.com/anton-abyzov/specweave/issues) or check the [documentation](https://spec-weave.com)
