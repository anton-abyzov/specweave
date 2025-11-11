#!/bin/bash

# SpecWeave Increment Work Migration Utility
# Purpose: Smart migration options when WIP limit is reached
#
# Options:
#   1. Transfer work (move incomplete tasks to new increment)
#   2. Adjust WIP limit (temporarily allow 3 active)
#   3. Force-close (mark as complete without transferring work)

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SPECWEAVE_DIR="${SPECWEAVE_DIR:-.specweave}"
CONFIG_FILE="$SPECWEAVE_DIR/config.json"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Get incomplete tasks from increment
get_incomplete_tasks() {
  local increment_id="$1"
  local tasks_file="$SPECWEAVE_DIR/increments/$increment_id/tasks.md"

  if [[ ! -f "$tasks_file" ]]; then
    echo ""
    return
  fi

  # Extract unchecked tasks (lines starting with "- [ ]")
  grep -E "^\s*-\s*\[ \]" "$tasks_file" 2>/dev/null || echo ""
}

# Count incomplete tasks
count_incomplete_tasks() {
  local increment_id="$1"
  local tasks=$(get_incomplete_tasks "$increment_id")

  if [[ -z "$tasks" ]]; then
    echo "0"
  else
    echo "$tasks" | wc -l | xargs
  fi
}

# Transfer work from old increment to new increment
transfer_work() {
  local source_increment="$1"
  local target_increment="$2"

  echo "🔄 Transferring incomplete work from $source_increment to $target_increment..."

  # Get incomplete tasks
  local incomplete_tasks=$(get_incomplete_tasks "$source_increment")

  if [[ -z "$incomplete_tasks" ]]; then
    echo "✅ No incomplete tasks to transfer"
    return 0
  fi

  local task_count=$(echo "$incomplete_tasks" | wc -l | xargs)
  echo "   📋 Found $task_count incomplete tasks"

  # Append to target increment's tasks.md
  local target_tasks="$SPECWEAVE_DIR/increments/$target_increment/tasks.md"

  if [[ ! -f "$target_tasks" ]]; then
    echo "❌ Target increment tasks.md not found: $target_tasks"
    return 1
  fi

  # Add separator and transferred tasks
  cat >> "$target_tasks" <<EOF

---

## 🔄 Transferred from $source_increment

$incomplete_tasks

EOF

  echo "   ✅ Transferred $task_count tasks to $target_tasks"

  # Mark source increment as completed-with-work-transfer
  local source_metadata="$SPECWEAVE_DIR/increments/$source_increment/metadata.json"

  if [[ -f "$source_metadata" ]]; then
    node -e "
      const fs = require('fs');
      const path = '$source_metadata';
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      data.status = 'completed';
      data.completionNote = 'Work transferred to $target_increment';
      data.completedAt = new Date().toISOString();
      data.workTransferredTo = '$target_increment';
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
    "
    echo "   ✅ Updated $source_increment metadata (status: completed, work transferred)"
  fi

  # Update target increment metadata
  local target_metadata="$SPECWEAVE_DIR/increments/$target_increment/metadata.json"

  if [[ -f "$target_metadata" ]]; then
    node -e "
      const fs = require('fs');
      const path = '$target_metadata';
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      data.workTransferredFrom = data.workTransferredFrom || [];
      data.workTransferredFrom.push('$source_increment');
      fs.writeFileSync(path, JSON.stringify(data, null, 2));
    "
    echo "   ✅ Updated $target_increment metadata (work received from $source_increment)"
  fi

  echo "✅ Work transfer complete!"
  return 0
}

# Adjust WIP limit temporarily
adjust_wip_limit() {
  local new_limit="$1"

  echo "⚠️  Temporarily adjusting WIP limit to $new_limit..."

  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    return 1
  fi

  # Update config.json (create backup first)
  cp "$CONFIG_FILE" "$CONFIG_FILE.bak"

  node -e "
    const fs = require('fs');
    const path = '$CONFIG_FILE';
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));

    // Ensure limits object exists
    if (!data.limits) {
      data.limits = {};
    }

    // Store original limit
    if (!data.limits.originalHardCap) {
      data.limits.originalHardCap = data.limits.hardCap || 2;
    }

    // Set new limit
    data.limits.hardCap = parseInt('$new_limit', 10);
    data.limits.wipAdjustedAt = new Date().toISOString();

    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  "

  echo "   ✅ WIP limit adjusted to $new_limit"
  echo "   ⚠️  Remember to revert after completing one increment!"
  echo "   💡 Run: specweave revert-wip-limit"

  return 0
}

# Force-close increment
force_close() {
  local increment_id="$1"

  echo "⚠️  Force-closing $increment_id..."

  local metadata_file="$SPECWEAVE_DIR/increments/$increment_id/metadata.json"

  if [[ ! -f "$metadata_file" ]]; then
    echo "❌ Metadata file not found: $metadata_file"
    return 1
  fi

  node -e "
    const fs = require('fs');
    const path = '$metadata_file';
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    data.status = 'completed';
    data.completionNote = 'Force-closed to start new increment (WIP limit reached)';
    data.completedAt = new Date().toISOString();
    data.forceCloseReason = 'wip-limit-reached';
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  "

  echo "   ✅ $increment_id marked as completed (force-closed)"
  echo "   ⚠️  Incomplete work was not transferred!"

  return 0
}

# ============================================================================
# MAIN CLI
# ============================================================================

case "${1:-}" in
  transfer)
    if [[ $# -ne 3 ]]; then
      echo "Usage: $0 transfer <source_increment> <target_increment>"
      exit 1
    fi
    transfer_work "$2" "$3"
    ;;

  adjust-wip)
    if [[ $# -ne 2 ]]; then
      echo "Usage: $0 adjust-wip <new_limit>"
      exit 1
    fi
    adjust_wip_limit "$2"
    ;;

  force-close)
    if [[ $# -ne 2 ]]; then
      echo "Usage: $0 force-close <increment_id>"
      exit 1
    fi
    force_close "$2"
    ;;

  count-incomplete)
    if [[ $# -ne 2 ]]; then
      echo "Usage: $0 count-incomplete <increment_id>"
      exit 1
    fi
    count_incomplete_tasks "$2"
    ;;

  *)
    echo "SpecWeave Increment Work Migration Utility"
    echo ""
    echo "Usage:"
    echo "  $0 transfer <source> <target>    # Transfer work from source to target"
    echo "  $0 adjust-wip <limit>             # Adjust WIP limit temporarily"
    echo "  $0 force-close <increment>        # Force-close increment"
    echo "  $0 count-incomplete <increment>   # Count incomplete tasks"
    exit 1
    ;;
esac
