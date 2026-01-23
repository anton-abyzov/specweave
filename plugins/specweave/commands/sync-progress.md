---
name: sw:sync-progress
description: Comprehensive progress sync - tasks.md → living docs → external tools (GitHub/JIRA/ADO). AUTO-CREATES missing external issues. Updates all systems with latest task completion status. TRUE single-button sync.
---

# Sync Progress (Comprehensive Multi-System Sync)

You are executing the SpecWeave comprehensive progress synchronization command. This orchestrates the complete flow:

**tasks.md (source of truth) → living docs (ACs, user stories) → external tools (GitHub, JIRA, ADO)**

This is the **TRUE "single button"** to sync all progress across the entire SpecWeave ecosystem.

## ⚠️ CRITICAL MANDATORY BEHAVIOR - AUTO-CREATE EXTERNAL ISSUES

**You MUST use the Skill tool to invoke `/sw-github:create` (or JIRA/ADO equivalent) when:**
1. GitHub is configured in config.json (`sync.github.enabled: true` OR profiles with `provider: "github"`)
2. No GitHub issue is linked to this increment (check metadata.json for `github.issue` field)
3. The `--no-create` flag was NOT passed

**THIS IS NOT OPTIONAL. If these conditions are met, you MUST call:**
```
Skill({ skill: "sw-github:create", args: "<increment-id>" })
```

**DO NOT just report "No issues linked" and suggest manual creation. AUTO-CREATE is the DEFAULT behavior.**

---

## STEP 1: Parse Arguments and Detect Active Increment

```
Arguments provided: [user's arguments]
```

**Parse the input**:
- Check for increment ID: `0053`, `0001`, etc., or none (auto-detect from active state)
- Check for flags: `--dry-run`, `--no-github`, `--no-jira`, `--no-ado`, `--force`, `--no-create`

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

**Validate increment exists** (check active AND archive directories):

```bash
INCREMENT_DIR=".specweave/increments/$INCREMENT_ID"
INCREMENT_STATUS="active"

if [ ! -d "$INCREMENT_DIR" ]; then
  # Check archive directory for completed increments
  ARCHIVE_DIR=".specweave/increments/_archive/$INCREMENT_ID"
  if [ -d "$ARCHIVE_DIR" ]; then
    INCREMENT_DIR="$ARCHIVE_DIR"
    INCREMENT_STATUS="completed"
    echo "📦 Found ARCHIVED increment: $INCREMENT_ID (status: completed)"
  else
    echo "❌ Increment $INCREMENT_ID not found in active or archive"
    exit 1
  fi
else
  echo "✅ Found increment: $INCREMENT_ID"
fi
```

### ⚠️ IMPORTANT: DO NOT SKIP SYNC FOR COMPLETED/ARCHIVED INCREMENTS

**Even if INCREMENT_STATUS="completed", you MUST proceed with ALL sync steps:**
- ✅ Still create missing GitHub issues (critical for historical tracking)
- ✅ Still sync to living docs
- ✅ Still close issues if they were just created
- ❌ DO NOT print "no sync needed" for completed increments

**Output**:
```
🔍 Auto-detected active increment: 0053-safe-feature-deletion
✅ Found increment: 0053-safe-feature-deletion

📊 Starting comprehensive progress sync...
```

**OR for archived/completed**:
```
📦 Found ARCHIVED increment: 0001-content-repurposer-mvp (status: completed)
📊 Syncing COMPLETED increment (will create/close GitHub issues)...
```

---

## STEP 2: Sync Tasks → Living Docs (ACs and User Stories)

**Purpose**: Update living docs with task completion status

### 2.1: Sync Acceptance Criteria (ACs)

Use the existing AC sync mechanism (post-task-completion hook logic):

```bash
echo "📝 Step 1/5: Syncing ACs from tasks.md to spec.md..."

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

### 2.2: Sync to Living Docs (User Stories) - MANDATORY BEFORE EXTERNAL SYNC

### ⚠️ CRITICAL: THIS STEP IS MANDATORY AND MUST COMPLETE BEFORE ANY EXTERNAL TOOL OPERATIONS

**Why?** External tools (GitHub, JIRA, ADO) sync FROM living docs. If you skip this step:
- External issues will have stale/outdated content
- User stories won't reflect completed status
- AC checkboxes in GitHub issues won't be checked

**You MUST invoke the `/sw:sync-specs` command:**

```bash
echo "📚 Step 2/5: Syncing increment to living docs..."
echo "   ⚠️  THIS MUST COMPLETE BEFORE EXTERNAL TOOL SYNC"

# MANDATORY: Sync increment specs to living docs structure
# This populates .specweave/docs/internal/specs/{project}/FS-XXX/
npx specweave sync-specs "$INCREMENT_ID"

if [ $? -eq 0 ]; then
  echo "   ✅ Living docs sync complete"
  echo "   📁 Updated: .specweave/docs/internal/specs/{project}/FS-XXX/"
else
  echo "   ❌ Living docs sync failed - BLOCKING external sync"
  exit 1
fi
```

**What this does**:
- Syncs spec.md → living docs user stories in `.specweave/docs/internal/specs/`
- Updates user story completion status
- Generates/updates feature ID if needed
- Updates README.md in feature folder
- **Creates the content that external tools will sync FROM**

### ⛔ DO NOT PROCEED TO STEP 3 UNTIL THIS COMPLETES SUCCESSFULLY

---

## STEP 3: Detect External Tool Configuration and Permissions

**Check which external tools are configured AND their permissions**:

```bash
echo "🔧 Step 3/5: Detecting external tool configuration..."

CONFIG_FILE=".specweave/config.json"
EXTERNAL_TOOLS=()
GITHUB_PROFILES=()
JIRA_PROFILES=()
ADO_PROFILES=()

# Read config
CONFIG_CONTENT=$(cat "$CONFIG_FILE" 2>/dev/null)

# Check permissions (CRITICAL for external operations)
CAN_UPSERT=$(echo "$CONFIG_CONTENT" | jq -r '.sync.settings.canUpsertInternalItems // false')
CAN_UPDATE_EXTERNAL=$(echo "$CONFIG_CONTENT" | jq -r '.sync.settings.canUpdateExternalItems // false')

echo "   📋 Permissions:"
echo "      canUpsertInternalItems: $CAN_UPSERT"
echo "      canUpdateExternalItems: $CAN_UPDATE_EXTERNAL"

# Check GitHub profiles
GITHUB_PROFILE_COUNT=$(echo "$CONFIG_CONTENT" | jq -r '[.sync.profiles // {} | to_entries[] | select(.value.provider == "github")] | length')
if [ "$GITHUB_PROFILE_COUNT" -gt 0 ]; then
  EXTERNAL_TOOLS+=("github")
  GITHUB_PROFILES=$(echo "$CONFIG_CONTENT" | jq -r '[.sync.profiles // {} | to_entries[] | select(.value.provider == "github") | .key] | join(", ")')
  echo "   ✅ GitHub integration detected ($GITHUB_PROFILE_COUNT profiles: $GITHUB_PROFILES)"
fi

# Check JIRA profiles
JIRA_PROFILE_COUNT=$(echo "$CONFIG_CONTENT" | jq -r '[.sync.profiles // {} | to_entries[] | select(.value.provider == "jira")] | length')
if [ "$JIRA_PROFILE_COUNT" -gt 0 ]; then
  EXTERNAL_TOOLS+=("jira")
  JIRA_PROFILES=$(echo "$CONFIG_CONTENT" | jq -r '[.sync.profiles // {} | to_entries[] | select(.value.provider == "jira") | .key] | join(", ")')
  echo "   ✅ JIRA integration detected ($JIRA_PROFILE_COUNT profiles: $JIRA_PROFILES)"
fi

# Check ADO profiles
ADO_PROFILE_COUNT=$(echo "$CONFIG_CONTENT" | jq -r '[.sync.profiles // {} | to_entries[] | select(.value.provider == "ado" or .value.provider == "azure-devops")] | length')
if [ "$ADO_PROFILE_COUNT" -gt 0 ]; then
  EXTERNAL_TOOLS+=("ado")
  ADO_PROFILES=$(echo "$CONFIG_CONTENT" | jq -r '[.sync.profiles // {} | to_entries[] | select(.value.provider == "ado" or .value.provider == "azure-devops") | .key] | join(", ")')
  echo "   ✅ Azure DevOps integration detected ($ADO_PROFILE_COUNT profiles: $ADO_PROFILES)"
fi

if [ ${#EXTERNAL_TOOLS[@]} -eq 0 ]; then
  echo "   ℹ️  No external tools configured (skip external sync)"
fi
```

**Output**:
```
🔧 Step 3/5: Detecting external tool configuration...
   📋 Permissions:
      canUpsertInternalItems: true
      canUpdateExternalItems: true
   ✅ GitHub integration detected (3 profiles: api, web, worker)
   ℹ️  No JIRA integration
   ℹ️  No Azure DevOps integration
```

---

## STEP 4: External Issues - ALWAYS Create If Missing, Then Sync/Close

**⚠️ THIS STEP REQUIRES YOU TO ACTUALLY INVOKE THE SKILL TOOL - NOT JUST REPORT STATUS!**

### MANDATORY AUTO-CREATE BEHAVIOR

| INCREMENT_STATUS | Issue EXISTS | Action |
|------------------|--------------|--------|
| `active` | No | ✅ **MUST invoke** `Skill({ skill: "sw-github:create", args: "<id>" })` |
| `active` | Yes | ✅ SYNC (update progress) |
| `completed` | No | ✅ **MUST invoke** create skill + THEN close |
| `completed` | Yes | ✅ CLOSE the existing issue |

### 🚨 GITHUB AUTO-CREATE (MANDATORY ACTION)

**When GitHub is configured AND no issue exists AND `--no-create` not passed:**

1. **READ** the metadata.json to check for `github.issue` field
2. **IF** no issue exists:
   - **Log**: "📝 No GitHub issue linked - AUTO-CREATING..."
   - **INVOKE THE SKILL**: You MUST use the Skill tool:
     ```
     Skill({ skill: "sw-github:create", args: "<increment-id>" })
     ```
   - **WAIT** for the skill to complete
   - **LOG** the result: "✅ GitHub issue auto-created: #<number>"
3. **IF** issue exists:
   - **Log**: "✅ GitHub issue exists: #<number>"

**YOU MUST ACTUALLY CALL THE SKILL TOOL. DO NOT SKIP THIS.**

### Permission Check (Before Auto-Create)

Read `.specweave/config.json` and check:
- `sync.settings.canUpsertInternalItems` OR `sync.settings.canUpdateExternalItems` should be `true`
- If BOTH are `false`, log permission denied warning and skip creation

### Pseudo-code (you must execute, not just read):

```
IF github configured AND no issue linked AND --no-create NOT set:
    IF permissions allow:
        LOG "📝 No GitHub issue linked - AUTO-CREATING..."

        >>> ACTUALLY INVOKE: Skill({ skill: "sw-github:create", args: incrementId })

        THEN re-read metadata.json to get issue number
        LOG "✅ GitHub issue auto-created: #<number>"
    ELSE:
        LOG "⚠️ Permission denied - enable canUpsertInternalItems in config"
ELSE IF issue exists:
    LOG "✅ GitHub issue exists: #<number>"
```

### 🚨 JIRA AUTO-CREATE (If JIRA configured)

**Same mandatory pattern as GitHub:**
- Check metadata.json for `jira.issue` field
- If no issue AND permissions allow AND `--no-create` not set:
  - **INVOKE**: `Skill({ skill: "sw-jira:create", args: "<increment-id>" })`

### 🚨 ADO AUTO-CREATE (If Azure DevOps configured)

**Same mandatory pattern as GitHub:**
- Check metadata.json for `ado.workItem` field
- If no work item AND permissions allow AND `--no-create` not set:
  - **INVOKE**: `Skill({ skill: "sw-ado:create", args: "<increment-id>" })`

---

**Summary of STEP 4 Actions:**

For EACH configured external tool (GitHub, JIRA, ADO):
1. Read metadata.json to check if issue/work item exists
2. If NO issue exists AND auto-create allowed:
   - **MUST INVOKE** the corresponding create skill
   - Wait for completion
   - Log success/failure
3. If issue exists:
   - Log that it exists, proceed to STEP 5 for sync

---

## STEP 5: Sync to External Tools (Full Two-Way Sync)

**For each configured external tool, perform full two-way sync**:

### 5.1: Sync to GitHub (if configured)

```bash
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " github " ]] && [ "$NO_GITHUB" != "true" ]; then
  echo "🔄 Step 5/5: Syncing to external tools..."
  echo ""
  echo "   🐙 GitHub sync:"

  # Re-check if issue exists now (may have been auto-created)
  GITHUB_ISSUE=$(jq -r '.github.issue // .github.issues[0].number // .external_sync.github.issueNumber // ""' "$METADATA" 2>/dev/null)

  if [ -z "$GITHUB_ISSUE" ] || [ "$GITHUB_ISSUE" = "null" ]; then
    echo "      ⚠️  No GitHub issue linked - skipping sync"
    echo "      💡 Create issue first: /sw-github:create $INCREMENT_ID"
  else
    if [ "$DRY_RUN" = "true" ]; then
      echo "      [DRY-RUN] Would sync to GitHub issue #$GITHUB_ISSUE"
    else
      echo "      ⏳ Syncing to GitHub issue #$GITHUB_ISSUE..."

      # INVOKE: /sw-github:sync $INCREMENT_ID (two-way by default)
      /sw-github:sync "$INCREMENT_ID"

      if [ $? -eq 0 ]; then
        echo "      ✅ GitHub sync complete"
      else
        echo "      ⚠️  GitHub sync had warnings (check logs)"
      fi

      # SPECIAL CASE: For completed/archived increments, also CLOSE the issue
      if [ "$INCREMENT_STATUS" = "completed" ]; then
        echo "      🔒 Closing GitHub issue (increment is completed)..."
        /sw-github:close "$INCREMENT_ID"
        echo "      ✅ GitHub issue closed"
      fi
    fi
  fi
fi
```

**What GitHub sync does**:
- Two-way sync (pull changes from GitHub + push changes to GitHub)
- Updates task checklist in issue body
- Posts progress comments
- Updates labels based on status
- Pulls external changes (comments, status changes from team)

**SPECIAL CASE: Completed/Archived Increments**:
- If `INCREMENT_STATUS="completed"` and issue was just created → ALSO close the issue
- Use `/sw-github:close $INCREMENT_ID` to close with completion comment
- This provides complete historical tracking

### 5.2: Sync to JIRA (if configured)

```bash
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " jira " ]] && [ "$NO_JIRA" != "true" ]; then
  echo ""
  echo "   📋 JIRA sync:"

  JIRA_ISSUE=$(jq -r '.jira.issue // .jira.issues[0].key // .external_sync.jira.issueKey // ""' "$METADATA" 2>/dev/null)

  if [ -z "$JIRA_ISSUE" ] || [ "$JIRA_ISSUE" = "null" ]; then
    echo "      ⚠️  No JIRA issue linked - skipping sync"
    if [ "$INCREMENT_STATUS" != "completed" ]; then
      echo "      💡 Create issue first: /sw-jira:create $INCREMENT_ID"
    fi
  else
    if [ "$DRY_RUN" = "true" ]; then
      echo "      [DRY-RUN] Would sync to JIRA issue $JIRA_ISSUE"
    else
      echo "      ⏳ Syncing to JIRA issue $JIRA_ISSUE..."

      # INVOKE: /sw-jira:sync $INCREMENT_ID (two-way by default)
      /sw-jira:sync "$INCREMENT_ID"

      if [ $? -eq 0 ]; then
        echo "      ✅ JIRA sync complete"
      else
        echo "      ⚠️  JIRA sync had warnings"
      fi

      # SPECIAL CASE: For completed/archived increments, transition to 'Done'
      if [ "$INCREMENT_STATUS" = "completed" ]; then
        echo "      🔒 Transitioning JIRA issue to 'Done' (increment is completed)..."
        /sw-jira:close "$INCREMENT_ID"
        echo "      ✅ JIRA issue transitioned to Done"
      fi
    fi
  fi
fi
```

### 5.3: Sync to Azure DevOps (if configured)

```bash
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " ado " ]] && [ "$NO_ADO" != "true" ]; then
  echo ""
  echo "   🔷 Azure DevOps sync:"

  ADO_ITEM=$(jq -r '.ado.workItem // .ado.workItems[0].id // .external_sync.ado.workItemId // ""' "$METADATA" 2>/dev/null)

  if [ -z "$ADO_ITEM" ] || [ "$ADO_ITEM" = "null" ]; then
    echo "      ⚠️  No ADO work item linked - skipping sync"
    if [ "$INCREMENT_STATUS" != "completed" ]; then
      echo "      💡 Create work item first: /sw-ado:create $INCREMENT_ID"
    fi
  else
    if [ "$DRY_RUN" = "true" ]; then
      echo "      [DRY-RUN] Would sync to ADO work item #$ADO_ITEM"
    else
      echo "      ⏳ Syncing to ADO work item #$ADO_ITEM..."

      # INVOKE: /sw-ado:sync $INCREMENT_ID (two-way by default)
      /sw-ado:sync "$INCREMENT_ID"

      if [ $? -eq 0 ]; then
        echo "      ✅ ADO sync complete"
      else
        echo "      ⚠️  ADO sync had warnings"
      fi

      # SPECIAL CASE: For completed/archived increments, transition to 'Closed'
      if [ "$INCREMENT_STATUS" = "completed" ]; then
        echo "      🔒 Transitioning ADO work item to 'Closed' (increment is completed)..."
        /sw-ado:close "$INCREMENT_ID"
        echo "      ✅ ADO work item transitioned to Closed"
      fi
    fi
  fi
fi
```

---

## STEP 6: Update Status Line Cache

**Refresh status line with latest completion data**:

```bash
echo "📊 Step 6/6: Updating status line cache..."

# Force update status line cache
/sw:update-status

echo "   ✅ Status line updated"
```

---

## STEP 7: Generate Comprehensive Report

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
  if [ -n "$GITHUB_CREATED" ]; then
    echo "   • GitHub issue AUTO-CREATED: #$GITHUB_ISSUE"
  fi
  echo "   • Living docs → GitHub issue #$GITHUB_ISSUE"
fi
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " jira " ]]; then
  if [ -n "$JIRA_CREATED" ]; then
    echo "   • JIRA issue AUTO-CREATED: $JIRA_ISSUE"
  fi
  echo "   • Living docs → JIRA story $JIRA_ISSUE"
fi
if [[ " ${EXTERNAL_TOOLS[@]} " =~ " ado " ]]; then
  if [ -n "$ADO_CREATED" ]; then
    echo "   • ADO work item AUTO-CREATED: #$ADO_ITEM"
  fi
  echo "   • Living docs → ADO work item #$ADO_ITEM"
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

**Example Output (Active Increment)**:

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

**Example Output (COMPLETED/Archived Increment - WITH linked issue)**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ PROGRESS SYNC COMPLETE (ARCHIVED INCREMENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Increment: 0001-content-repurposer-mvp
📊 Status: completed (archived)

✅ Synced:
   • Tasks → ACs (spec.md)          54/54 ACs ✓
   • Spec → Living docs             10/10 user stories ✓
   • Status line cache              100% complete ✓

🔗 External Tools:
   • GitHub issue #123 SYNCED (final state)
   • GitHub issue #123 CLOSED (increment complete)

📊 Completion:
   • Tasks: 35/35 (100%)
   • ACs: 54/54 (100%)
   • User Stories: 10/10 (100%)

ℹ️  Archived increment synced successfully!
   Existing linked issues updated and closed.
```

**Example Output (COMPLETED/Archived Increment - NO linked issue - NOW CREATES!)**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ PROGRESS SYNC COMPLETE (ARCHIVED INCREMENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Increment: 0001-content-repurposer-mvp
📊 Status: completed (archived)

✅ Synced:
   • Tasks → ACs (spec.md)          54/54 ACs ✓
   • Spec → Living docs             10/10 user stories ✓
   • Status line cache              100% complete ✓

🔗 External Tools:
   📝 GitHub issue AUTO-CREATED: #456 (historical tracking)
   🔒 GitHub issue #456 CLOSED (increment already complete)

📊 Completion:
   • Tasks: 35/35 (100%)
   • ACs: 54/54 (100%)
   • User Stories: 10/10 (100%)

✅ Archived increment synced with historical tracking!
   External issues created and closed for audit trail.
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
- `--no-create`: Skip auto-creation of missing external issues (sync existing issues only)
- `--no-github`: Skip GitHub sync (even if configured)
- `--no-jira`: Skip JIRA sync (even if configured)
- `--no-ado`: Skip Azure DevOps sync (even if configured)
- `--force`: Force sync even if validation fails (use with caution)

**Examples**:

```bash
# Full sync with auto-create (DEFAULT - just works!)
/sw:sync-progress

# Dry-run mode (preview only)
/sw:sync-progress 0053 --dry-run

# Sync only, don't create missing issues
/sw:sync-progress 0053 --no-create

# Skip GitHub sync
/sw:sync-progress 0053 --no-github

# Skip all external tools (local sync only)
/sw:sync-progress 0053 --no-github --no-jira --no-ado

# Explicit increment ID
/sw:sync-progress 0053
```

---

## Use Cases

### Use Case 1: First-Time Sync (No GitHub Issue Yet) ⭐ NEW DEFAULT BEHAVIOR

**Scenario**: You've created an increment with `/sw:increment`, completed some tasks, but never created a GitHub issue. Now you want to sync.

```bash
# Single command does EVERYTHING
/sw:sync-progress
```

**What happens**:
1. ✅ ACs in spec.md marked complete (based on completed tasks)
2. ✅ Living docs user stories updated
3. ✅ **GitHub issue AUTO-CREATED** (detects missing issue, creates it)
4. ✅ GitHub issue synced with task progress
5. ✅ Status line shows updated completion %

**No more "No GitHub issue linked" errors!** The command just works.

### Use Case 2: After Completing Tasks (Issue Already Exists)

**Scenario**: You've completed 5 tasks and marked them as done in tasks.md. GitHub issue already exists.

```bash
# Single command syncs everything
/sw:sync-progress
```

**What happens**:
1. ✅ ACs in spec.md marked complete
2. ✅ Living docs user stories updated
3. ✅ GitHub issue #123 detected, synced with task progress
4. ✅ Epic issue checklist updated
5. ✅ Status line shows updated completion %

### Use Case 3: Before Closing Increment

**Scenario**: All tasks complete, ready to close increment. Want to ensure all systems are in sync.

```bash
# Final sync before /sw:done
/sw:sync-progress 0053

# Then close increment
/sw:done 0053
```

### Use Case 4: Preview Sync (Dry-Run)

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
   • GitHub issue: Would AUTO-CREATE (none exists)
   • Living docs → GitHub issue (would sync after creation)
   • Status line cache (would update completion %)
```

### Use Case 5: Local-Only Sync (No External Tools)

**Scenario**: Want to sync tasks → docs but NOT to GitHub/JIRA (offline work).

```bash
# Skip all external tools
/sw:sync-progress 0053 --no-github --no-jira --no-ado
```

### Use Case 6: Sync Only (Don't Create Missing Issues)

**Scenario**: External issues should be created manually via team workflow. Only sync existing issues.

```bash
# Sync existing issues only, don't auto-create
/sw:sync-progress 0053 --no-create
```

**What happens**:
- If GitHub issue exists → sync it
- If GitHub issue doesn't exist → show warning, skip (no auto-create)

---

## Architecture

**Multi-System Sync Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│                   /sw:sync-progress                         │
│              (TRUE Single-Button Orchestrator)              │
└────────────────────────┬────────────────────────────────────┘
                         │
    Step 1-2             │            Step 4-5
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼───┐          ┌─────▼─────┐         ┌───▼────┐
│Tasks  │          │ External  │         │External│
│→ ACs  │          │AUTO-CREATE│         │ SYNC   │
│→ Docs │          │(if needed)│         │(2-way) │
└───┬───┘          └─────┬─────┘         └───┬────┘
    │                    │                   │
    │              ┌─────┼─────┐       ┌─────┼─────┐
    │              │     │     │       │     │     │
    │           ┌──▼─┐ ┌─▼─┐ ┌─▼─┐  ┌──▼─┐ ┌─▼─┐ ┌─▼─┐
    │           │ GH │ │JRA│ │ADO│  │ GH │ │JRA│ │ADO│
    │           │NEW │ │NEW│ │NEW│  │sync│ │sync│ │sync│
    │           └────┘ └───┘ └───┘  └────┘ └───┘ └───┘
    │                    │                   │
    └────────────────────┼───────────────────┘
                         │
                   ┌─────▼─────┐
                   │  Status   │
                   │  Update   │
                   └───────────┘
```

**Key Design Principles**:

1. **TRUE Single Button**: Auto-creates missing external issues, then syncs
2. **Just Works**: No manual `/sw-github:create` required - command handles everything
3. **Graceful Degradation**: External tool failures don't block core sync
4. **Permission-Aware**: Respects `canUpsertInternalItems` and `canUpdateExternalItems`
5. **Dry-Run Support**: Preview changes (including auto-create) before executing
6. **Selective Sync**: Flags to skip specific tools or auto-create (`--no-create`)
7. **Auto-Detection**: Finds active increment automatically
8. **Comprehensive Reporting**: Shows created issues, synced items, completion stats

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

### Issue: GitHub issue auto-create failed

**Error**:
```
⚠️  GitHub issue creation failed (will continue with sync)
💡 Debug: Check GITHUB_TOKEN in .env or run 'gh auth status'
```

**Fix**:
```bash
# Check GitHub authentication
gh auth status

# Check token in .env (presence only - never display value!)
grep -q GITHUB_TOKEN .env && echo "GITHUB_TOKEN found"

# Manually create if needed
/sw-github:create 0053
```

### Issue: Permission denied for external operations

**Error**:
```
⚠️  Permission denied: canUpsertInternalItems=false AND canUpdateExternalItems=false
```

**Fix**: Enable permissions in `.specweave/config.json`:
```json
{
  "sync": {
    "settings": {
      "canUpsertInternalItems": true,
      "canUpdateExternalItems": true
    }
  }
}
```

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

### Issue: Don't want auto-create (team workflow requires manual issue creation)

**Solution**: Use `--no-create` flag:
```bash
# Sync only, don't auto-create missing issues
/sw:sync-progress 0053 --no-create
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
