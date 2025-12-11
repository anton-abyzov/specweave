---
name: specweave:sync-progress
description: Comprehensive progress sync - tasks.md → living docs → external tools (GitHub/JIRA/ADO). Updates all systems with latest task completion status.
---

# Sync Progress (Comprehensive Multi-System Sync)

You are executing the SpecWeave comprehensive progress synchronization command. This orchestrates the complete flow:

**tasks.md (source of truth) → living docs (ACs, user stories) → external tools (GitHub, JIRA, ADO)**

This is the **"single button"** to sync all progress across the entire SpecWeave ecosystem.

---

## STEP 1: Parse Arguments and Detect Active Increment

```
Arguments provided: [user's arguments]
```

**Parse the input**:
- Check for increment ID: `0053`, `0001`, etc., or none (auto-detect from active state)
- Check for flags: `--dry-run`, `--no-github`, `--no-jira`, `--no-ado`, `--force`

**Auto-detect active increment**:

```bash
# Read active increment from state file
ACTIVE_STATE=".specweave/state/active-increment.json"
if [ -f "$ACTIVE_STATE" ]; then
  INCREMENT_ID=$(jq -r '.ids[0]' "$ACTIVE_STATE" 2>/dev/null)

  if [ "$INCREMENT_ID" != "null" ] && [ -n "$INCREMENT_ID" ]; then
    echo "🔍 Auto-detected active increment: $INCREMENT_ID"
  fi
fi

# If no increment ID found, prompt user
if [ -z "$INCREMENT_ID" ]; then
  echo "❌ No active increment found."
  echo "Usage: /sw:sync-progress <increment-id>"
  echo "   or: /sw:sync-progress (auto-detects active increment)"
  exit 1
fi
```

**Validate increment exists**:

```bash
INCREMENT_DIR=".specweave/increments/$INCREMENT_ID"
if [ ! -d "$INCREMENT_DIR" ]; then
  echo "❌ Increment $INCREMENT_ID not found at $INCREMENT_DIR"
  exit 1
fi

echo "✅ Found increment: $INCREMENT_ID"
```

**Output**:
```
🔍 Auto-detected active increment: 0053-safe-feature-deletion
✅ Found increment: 0053-safe-feature-deletion

📊 Starting comprehensive progress sync...
```

---

## STEP 2: Sync Tasks → Living Docs (ACs and User Stories)

**Purpose**: Update living docs with task completion status

### 2.1: Sync Acceptance Criteria (ACs)

Use the existing AC sync mechanism (post-task-completion hook logic):

```bash
echo "📝 Step 1/4: Syncing ACs from tasks.md to spec.md..."

# Run AC sync (same logic as post-task-completion.sh hook)
bash plugins/specweave/hooks/post-task-completion.sh "$INCREMENT_DIR"

if [ $? -eq 0 ]; then
  echo "   ✅ AC sync complete"
else
  echo "   ⚠️  AC sync had warnings (check logs)"
fi
```

**What this does**:
- Parses tasks.md to find completed tasks
- Finds linked ACs (via `**Satisfies ACs**: AC-US1-01, AC-US1-02`)
- Updates spec.md to mark ACs as complete: `- [ ]` → `- [x]`
- Updates metadata.json with AC completion count

### 2.2: Sync to Living Docs (User Stories)

Call the existing `/sw:sync-specs` command:

```bash
echo "📚 Step 2/4: Syncing increment to living docs..."

# Sync increment specs to living docs structure
npx specweave sync-specs "$INCREMENT_ID"

if [ $? -eq 0 ]; then
  echo "   ✅ Living docs sync complete"
else
  echo "   ❌ Living docs sync failed"
  exit 1
fi
```

**What this does**:
- Syncs spec.md → living docs user stories
- Updates user story completion status
- Generates/updates feature ID if needed
- Updates README.md in feature folder

---

## STEP 3: Detect External Tool Configuration

**Check which external tools are configured**:

```bash
echo "🔧 Step 3/4: Detecting external tool configuration..."

CONFIG_FILE=".specweave/config.json"
EXTERNAL_TOOLS=()

# Check GitHub
if grep -q '"provider":\s*"github"' "$CONFIG_FILE" 2>/dev/null; then
  EXTERNAL_TOOLS+=("github")
  echo "   ✅ GitHub integration detected"
fi

# Check JIRA
if grep -q '"provider":\s*"jira"' "$CONFIG_FILE" 2>/dev/null; then
  EXTERNAL_TOOLS+=("jira")
  echo "   ✅ JIRA integration detected"
fi

# Check Azure DevOps
if grep -q '"provider":\s*"azure-devops"' "$CONFIG_FILE" 2>/dev/null; then
  EXTERNAL_TOOLS+=("ado")
  echo "   ✅ Azure DevOps integration detected"
fi

if [ ${#EXTERNAL_TOOLS[@]} -eq 0 ]; then
  echo "   ℹ️  No external tools configured (skip external sync)"
fi
```

**Output**:
```
🔧 Step 3/4: Detecting external tool configuration...
   ✅ GitHub integration detected
   ℹ️  No JIRA integration
   ℹ️  No Azure DevOps integration
```

---

## STEP 4: Sync to External Tools

**For each detected external tool, sync progress**:

### 4.1: Sync to GitHub (if enabled)

```bash
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " github " ]] && [ "$NO_GITHUB" != "true" ]; then
  echo "🔗 Step 4/4: Syncing to GitHub..."

  # Run GitHub sync command
  if [ "$DRY_RUN" = "true" ]; then
    echo "   [DRY-RUN] Would sync to GitHub"
  else
    /sw-github:sync "$INCREMENT_ID"

    if [ $? -eq 0 ]; then
      echo "   ✅ GitHub sync complete"
    else
      echo "   ⚠️  GitHub sync had warnings (check logs)"
    fi
  fi
else
  echo "🔗 Step 4/4: Skipping GitHub sync (--no-github or not configured)"
fi
```

**What GitHub sync does**:
- Reads completed user stories from living docs
- Closes GitHub issues for completed user stories
- Updates epic issue checklist with task progress
- Posts completion comments with stats
- Updates issue labels (in-progress → completed)

### 4.2: Sync to JIRA (if enabled)

```bash
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " jira " ]] && [ "$NO_JIRA" != "true" ]; then
  echo "🔗 Syncing to JIRA..."

  if [ "$DRY_RUN" = "true" ]; then
    echo "   [DRY-RUN] Would sync to JIRA"
  else
    /sw-jira:sync "$INCREMENT_ID"

    if [ $? -eq 0 ]; then
      echo "   ✅ JIRA sync complete"
    else
      echo "   ⚠️  JIRA sync had warnings"
    fi
  fi
fi
```

### 4.3: Sync to Azure DevOps (if enabled)

```bash
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " ado " ]] && [ "$NO_ADO" != "true" ]; then
  echo "🔗 Syncing to Azure DevOps..."

  if [ "$DRY_RUN" = "true" ]; then
    echo "   [DRY-RUN] Would sync to ADO"
  else
    /sw-ado:sync "$INCREMENT_ID"

    if [ $? -eq 0 ]; then
      echo "   ✅ ADO sync complete"
    else
      echo "   ⚠️  ADO sync had warnings"
    fi
  fi
fi
```

---

## STEP 5: Update Status Line Cache

**Refresh status line with latest completion data**:

```bash
echo "📊 Updating status line cache..."

# Force update status line cache
/sw:update-status

echo "   ✅ Status line updated"
```

---

## STEP 6: Generate Comprehensive Report

**Show detailed sync summary**:

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ PROGRESS SYNC COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Increment: $INCREMENT_ID"
echo ""
echo "✅ Synced:"
echo "   • Tasks → ACs (spec.md)"
echo "   • Spec → Living docs (user stories)"
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " github " ]]; then
  echo "   • Living docs → GitHub issues"
fi
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " jira " ]]; then
  echo "   • Living docs → JIRA stories"
fi
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " ado " ]]; then
  echo "   • Living docs → Azure DevOps work items"
fi
echo "   • Status line cache"
echo ""

# Show completion stats
METADATA="$INCREMENT_DIR/metadata.json"
if [ -f "$METADATA" ]; then
  TOTAL_ACS=$(jq -r '.total_acs // 0' "$METADATA")
  COMPLETED_ACS=$(jq -r '.completed_acs // 0' "$METADATA")
  PERCENTAGE=0

  if [ "$TOTAL_ACS" -gt 0 ]; then
    PERCENTAGE=$((COMPLETED_ACS * 100 / TOTAL_ACS))
  fi

  echo "📊 Completion:"
  echo "   • ACs: $COMPLETED_ACS/$TOTAL_ACS ($PERCENTAGE%)"
fi

echo ""
echo "Next steps:"
echo "   • Review status line for updated progress"
echo "   • Check external tools (GitHub/JIRA/ADO) for synced updates"
echo "   • Run /sw:validate $INCREMENT_ID to validate quality"
echo "   • Run /sw:done $INCREMENT_ID when ready to close"
echo ""
```

**Example Output**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ PROGRESS SYNC COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Increment: 0053-safe-feature-deletion

✅ Synced:
   • Tasks → ACs (spec.md)
   • Spec → Living docs (user stories)
   • Living docs → GitHub issues
   • Status line cache

📊 Completion:
   • ACs: 70/70 (100%)

Next steps:
   • Review status line for updated progress
   • Check external tools (GitHub/JIRA/ADO) for synced updates
   • Run /sw:validate 0053 to validate quality
   • Run /sw:done 0053 when ready to close
```

---

## STEP 7: Dry-Run Mode (If --dry-run flag)

**If dry-run mode is enabled, show what WOULD be synced without executing**:

```bash
if [ "$DRY_RUN" = "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  🔍 DRY-RUN MODE (No changes made)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📦 Increment: $INCREMENT_ID"
  echo ""
  echo "Would sync:"
  echo "   • 37 completed tasks → 70 ACs in spec.md"
  echo "   • spec.md → 6 user stories in living docs"
  echo "   • Living docs → 6 GitHub issues (would close completed)"
  echo "   • Status line cache (would update completion %)"
  echo ""
  echo "Run without --dry-run to execute sync."
  exit 0
fi
```

---

## Error Handling

**Graceful error handling at each step**:

```bash
# If any critical step fails, show error and exit
handle_error() {
  local step="$1"
  local error_msg="$2"

  echo "❌ Error in $step: $error_msg"
  echo ""
  echo "Sync aborted. Manual recovery may be needed."
  echo "Check logs for details."
  exit 1
}

# Non-critical errors (external tools) → log warning, continue
handle_warning() {
  local step="$1"
  local warning_msg="$2"

  echo "⚠️  Warning in $step: $warning_msg"
  echo "   Continuing with sync..."
}
```

**Examples**:

```bash
# Critical error (blocks sync)
if ! sync_acs; then
  handle_error "AC sync" "Failed to update spec.md"
fi

# Non-critical error (logs warning, continues)
if ! sync_github; then
  handle_warning "GitHub sync" "Rate limit exceeded, some issues not closed"
fi
```

---

## Flags

**Supported flags**:

- `--dry-run`: Preview sync without executing (shows what would be synced)
- `--no-github`: Skip GitHub sync (even if configured)
- `--no-jira`: Skip JIRA sync (even if configured)
- `--no-ado`: Skip Azure DevOps sync (even if configured)
- `--force`: Force sync even if validation fails (use with caution)

**Examples**:

```bash
# Dry-run mode (preview only)
/sw:sync-progress 0053 --dry-run

# Skip GitHub sync
/sw:sync-progress 0053 --no-github

# Skip all external tools
/sw:sync-progress 0053 --no-github --no-jira --no-ado

# Auto-detect active increment
/sw:sync-progress
```

---

## Use Cases

### Use Case 1: After Completing Tasks

**Scenario**: You've completed 5 tasks and marked them as done in tasks.md. Now you want to sync progress everywhere.

```bash
# Single command syncs everything
/sw:sync-progress
```

**What happens**:
1. ✅ ACs in spec.md marked complete (based on completed tasks)
2. ✅ Living docs user stories updated
3. ✅ GitHub issues closed for completed user stories
4. ✅ Epic issue checklist updated with task progress
5. ✅ Status line shows updated completion %

### Use Case 2: Before Closing Increment

**Scenario**: All tasks complete, ready to close increment. Want to ensure all systems are in sync.

```bash
# Final sync before /sw:done
/sw:sync-progress 0053

# Then close increment
/sw:done 0053
```

### Use Case 3: Preview Sync (Dry-Run)

**Scenario**: Want to see what will be synced before executing.

```bash
# Preview mode
/sw:sync-progress 0053 --dry-run
```

**Output**:
```
🔍 DRY-RUN MODE (No changes made)

Would sync:
   • 37 completed tasks → 70 ACs in spec.md
   • spec.md → 6 user stories in living docs
   • Living docs → 6 GitHub issues (would close completed)
   • Status line cache (would update completion %)
```

### Use Case 4: Local-Only Sync (No External Tools)

**Scenario**: Want to sync tasks → docs but NOT to GitHub/JIRA (offline work).

```bash
# Skip all external tools
/sw:sync-progress 0053 --no-github --no-jira --no-ado
```

---

## Architecture

**Multi-System Sync Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│                   /sw:sync-progress                  │
│                  (Single Orchestrator Command)              │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │ Tasks   │    │ Living  │    │ External│
    │ → ACs   │    │ Docs    │    │ Tools   │
    │(spec.md)│    │(stories)│    │ (sync)  │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         │               │        ┌──────┼──────┐
         │               │        │      │      │
         │               │   ┌────▼─┐ ┌─▼──┐ ┌─▼──┐
         │               │   │GitHub│ │JIRA│ │ADO │
         │               │   └──────┘ └────┘ └────┘
         │               │
    ┌────▼───────────────▼────┐
    │   Status Line Cache     │
    │  (Auto-Update Display)  │
    └─────────────────────────┘
```

**Key Design Principles**:

1. **Single Command, Multi-System**: One command orchestrates all sync operations
2. **Graceful Degradation**: External tool failures don't block core sync
3. **Dry-Run Support**: Preview changes before executing
4. **Selective Sync**: Flags to skip specific external tools
5. **Auto-Detection**: Finds active increment automatically
6. **Comprehensive Reporting**: Shows exactly what was synced

---

## Integration with Existing Commands

**How this relates to other sync commands**:

| Command | Purpose | Scope |
|---------|---------|-------|
| `/sw:sync-acs` | Sync tasks → ACs (spec.md) | Tasks to spec only |
| `/sw:sync-specs` | Sync spec → living docs | Spec to docs only |
| `/sw:sync-tasks` | Sync GitHub → tasks | External to tasks |
| `/sw-github:sync` | Sync to GitHub | Living docs to GitHub |
| **`/sw:sync-progress`** | **Comprehensive multi-system sync** | **Tasks → Docs → External** |

**When to use each**:

- Use `/sw:sync-acs` when you only want to update ACs in spec.md
- Use `/sw:sync-specs` when you only want to sync to living docs
- Use `/sw-github:sync` when you only want to sync to GitHub
- **Use `/sw:sync-progress` for complete end-to-end sync** ✅ (Recommended!)

---

## Troubleshooting

### Issue: AC sync warnings

**Error**:
```
⚠️  AC sync had warnings: 5 ACs not found in spec.md
```

**Fix**:
```bash
# Embed ACs from living docs into spec.md
/sw:embed-acs 0053

# Then retry sync
/sw:sync-progress 0053
```

### Issue: GitHub sync failed (rate limit)

**Error**:
```
⚠️  GitHub sync had warnings: Rate limit exceeded
```

**Fix**: GitHub sync is non-critical, increment still synced to docs. Retry later when rate limit resets, or manually close issues.

### Issue: No active increment found

**Error**:
```
❌ No active increment found
```

**Fix**:
```bash
# Provide increment ID explicitly
/sw:sync-progress 0053
```

---

## Next Steps After Sync

**After successful sync, typical workflow**:

```bash
# 1. Sync progress (this command)
/sw:sync-progress 0053

# 2. Validate quality
/sw:validate 0053 --quality

# 3. Close increment (PM validation)
/sw:done 0053
```

---

**See**:
- ADR-0032 (Universal Hierarchy Mapping)
- Increment 0050 (External Tool Import Phase 1b)
- Increment 0051 (Automatic GitHub Sync)
