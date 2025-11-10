#!/bin/bash

# SpecWeave GitHub Sync Hook
# Runs after task completion to sync progress to GitHub Issues
#
# This hook is part of the specweave-github plugin and handles:
# - Updating GitHub issue checkboxes based on tasks.md completion status
# - Posting progress comments to GitHub issues
# - Syncing task completion state bidirectionally
#
# Dependencies:
# - gh CLI (GitHub CLI) must be installed and authenticated
# - jq for JSON parsing
# - metadata.json must have .github.issue field

set -e

# ============================================================================
# PROJECT ROOT DETECTION
# ============================================================================

# Find project root by searching upward for .specweave/ directory
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  # Fallback: try current directory
  if [ -d "$(pwd)/.specweave" ]; then
    pwd
  else
    echo "$(pwd)"
  fi
}

PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# ============================================================================
# CONFIGURATION
# ============================================================================

LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# PRECONDITIONS CHECK
# ============================================================================

echo "[$(date)] [GitHub] 🔗 GitHub sync hook fired" >> "$DEBUG_LOG" 2>/dev/null || true

# Detect current increment
CURRENT_INCREMENT=$(ls -t .specweave/increments/ 2>/dev/null | grep -v "_backlog" | head -1)

if [ -z "$CURRENT_INCREMENT" ]; then
  echo "[$(date)] [GitHub] ℹ️  No active increment, skipping GitHub sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for metadata.json
METADATA_FILE=".specweave/increments/$CURRENT_INCREMENT/metadata.json"

if [ ! -f "$METADATA_FILE" ]; then
  echo "[$(date)] [GitHub] ℹ️  No metadata.json for $CURRENT_INCREMENT, skipping GitHub sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for GitHub issue link
if ! command -v jq &> /dev/null; then
  echo "[$(date)] [GitHub] ⚠️  jq not found, skipping GitHub sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

GITHUB_ISSUE=$(jq -r '.github.issue // empty' "$METADATA_FILE" 2>/dev/null)

if [ -z "$GITHUB_ISSUE" ]; then
  echo "[$(date)] [GitHub] ℹ️  No GitHub issue linked to $CURRENT_INCREMENT, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Check for gh CLI
if ! command -v gh &> /dev/null; then
  echo "[$(date)] [GitHub] ⚠️  GitHub CLI (gh) not found, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# ============================================================================
# GITHUB SYNC LOGIC
# ============================================================================

echo "[$(date)] [GitHub] 🔄 Syncing to GitHub issue #$GITHUB_ISSUE" >> "$DEBUG_LOG" 2>/dev/null || true

TASKS_FILE=".specweave/increments/$CURRENT_INCREMENT/tasks.md"

if [ ! -f "$TASKS_FILE" ]; then
  echo "[$(date)] [GitHub] ℹ️  tasks.md not found for $CURRENT_INCREMENT, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

echo "[$(date)] [GitHub] 📊 Syncing task checkboxes to GitHub issue #$GITHUB_ISSUE" >> "$DEBUG_LOG" 2>/dev/null || true

# Get list of completed tasks from tasks.md
# Find all "## T-XXX:" headers where the task has "[x]" checkbox
COMPLETED_TASK_IDS=$(awk '
  /^## T-[0-9]+:/ {
    task_id = $2
    gsub(/:/, "", task_id)
    current_task = task_id
    task_title = substr($0, index($0, $3))
    next
  }
  /^- \[x\]/ && current_task != "" {
    # Found a completed checkbox under a task
    print current_task
    current_task = ""
  }
' "$TASKS_FILE" 2>/dev/null)

echo "[$(date)] [GitHub] Completed tasks found: $COMPLETED_TASK_IDS" >> "$DEBUG_LOG" 2>/dev/null || true

# Read current issue body
ISSUE_BODY=$(gh issue view "$GITHUB_ISSUE" --json body -q .body 2>/dev/null || echo "")

if [ -z "$ISSUE_BODY" ]; then
  echo "[$(date)] [GitHub] ⚠️  Failed to read issue body, skipping sync" >> "$DEBUG_LOG" 2>/dev/null || true
  cat <<EOF
{
  "continue": true
}
EOF
  exit 0
fi

# Create temporary file for updated body
TEMP_BODY=$(mktemp)
echo "$ISSUE_BODY" > "$TEMP_BODY"

# Update checkboxes for completed tasks
# Pattern: "- [ ] task-name" -> "- [x] task-name"
for task_id in $COMPLETED_TASK_IDS; do
  # Update checkbox for this task ID
  # Look for patterns like "[ ] T-013:" or "[ ] CLAUDE.md updates" etc.
  sed -i.bak "s/- \[ \] \(.*${task_id}.*\)/- [x] \1/g" "$TEMP_BODY" 2>/dev/null || true
  sed -i.bak "s/- \[ \] \(.*T-0*${task_id#T-}[: ].*\)/- [x] \1/g" "$TEMP_BODY" 2>/dev/null || true

  echo "[$(date)] [GitHub] Updated checkbox for task: $task_id" >> "$DEBUG_LOG" 2>/dev/null || true
done

# Also update based on task names (more reliable)
# Check for common patterns in issue body
if grep -q "test-aware-planner" "$TASKS_FILE" && grep -q "\[x\]" "$TASKS_FILE"; then
  sed -i.bak "s/- \[ \] \(.*test-aware-planner.*\)/- [x] \1/g" "$TEMP_BODY" 2>/dev/null || true
fi
if grep -q "PM.*increment-planner" "$TASKS_FILE" && grep -q "\[x\]" "$TASKS_FILE"; then
  sed -i.bak "s/- \[ \] \(.*PM.*increment-planner.*\)/- [x] \1/g" "$TEMP_BODY" 2>/dev/null || true
  sed -i.bak "s/- \[ \] \(.*Enhanced PM.*\)/- [x] \1/g" "$TEMP_BODY" 2>/dev/null || true
fi
if grep -q "CLAUDE.md" "$TASKS_FILE" && grep -q "\[x\]" "$TASKS_FILE"; then
  sed -i.bak "s/- \[ \] \(.*CLAUDE\.md.*\)/- [x] \1/g" "$TEMP_BODY" 2>/dev/null || true
fi

# Read updated body
UPDATED_BODY=$(cat "$TEMP_BODY")

# Update issue with new body
gh issue edit "$GITHUB_ISSUE" --body "$UPDATED_BODY" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
  echo "[$(date)] [GitHub] ⚠️  Failed to update issue description (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
}

# Cleanup
rm -f "$TEMP_BODY" "$TEMP_BODY.bak"

echo "[$(date)] [GitHub] ✅ Issue description checkboxes updated" >> "$DEBUG_LOG" 2>/dev/null || true

# Calculate progress for comment
TOTAL_TASKS=$(grep -c "^## T-[0-9]" "$TASKS_FILE" 2>/dev/null || echo "0")
COMPLETED_TASKS=$(echo "$COMPLETED_TASK_IDS" | wc -w | tr -d ' ')

if [ "$TOTAL_TASKS" -gt 0 ]; then
  PROGRESS_PCT=$((COMPLETED_TASKS * 100 / TOTAL_TASKS))

  # Post progress comment
  gh issue comment "$GITHUB_ISSUE" --body "**Progress Update**: $COMPLETED_TASKS/$TOTAL_TASKS tasks ($PROGRESS_PCT%)

Increment: \`$CURRENT_INCREMENT\`

---
🤖 Auto-updated by SpecWeave GitHub plugin" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
    echo "[$(date)] [GitHub] ⚠️  Failed to comment on GitHub issue (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
  }

  echo "[$(date)] [GitHub] ✅ Progress comment posted ($PROGRESS_PCT%)" >> "$DEBUG_LOG" 2>/dev/null || true
fi

echo "[$(date)] [GitHub] ✅ GitHub sync complete" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

cat <<EOF
{
  "continue": true
}
EOF
