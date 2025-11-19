#!/bin/bash

# SpecWeave Post-Task-Completion Hook
# Runs automatically after ANY task is marked complete via TodoWrite
#
# SMART SESSION-END DETECTION (v2.0):
# =====================================
# Problem: Claude creates multiple todo lists in one conversation
# - List 1: [A, B, C] → completes → sound plays
# - List 2: [D, E] → completes 30s later → sound plays again
# - User hears sounds while Claude is still working!
#
# Solution: Inactivity-based detection
# - Track time gaps BETWEEN TodoWrite calls
# - If all tasks complete AND gap > INACTIVITY_THRESHOLD (15s)
#   → Session is winding down → Play sound
# - If rapid completions (gap < threshold)
#   → Claude still actively working → Skip sound
#
# Example:
# 10:00:00 - Task done (gap: 5s) → skip sound
# 10:00:05 - Task done (gap: 5s) → skip sound
# 10:00:10 - All done (gap: 5s) → skip sound (rapid work)
# ...
# 10:01:00 - All done (gap: 50s) → PLAY SOUND! (session ending)
#
# DEBOUNCING: Prevents duplicate fires (Claude Code calls hooks twice)

set -e

# Find project root by searching upward for .specweave/ directory
# Works regardless of where hook is installed (source or .claude/hooks/)
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

# Debounce window to prevent duplicate hook fires
DEBOUNCE_SECONDS=2

# Inactivity threshold to detect session end
# If gap between TodoWrite calls > this value, assume session is ending
INACTIVITY_THRESHOLD=15  # seconds (configurable)

# File paths
LOGS_DIR=".specweave/logs"
LAST_FIRE_FILE="$LOGS_DIR/last-hook-fire"
LAST_TODOWRITE_FILE="$LOGS_DIR/last-todowrite-time"
DEBUG_LOG="$LOGS_DIR/hooks-debug.log"
TASKS_LOG="$LOGS_DIR/tasks.log"

mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# DEBOUNCING
# ============================================================================

CURRENT_TIME=$(date +%s)

# Skip if hook fired within last N seconds (prevents duplicates)
if [ -f "$LAST_FIRE_FILE" ]; then
  LAST_FIRE=$(cat "$LAST_FIRE_FILE" 2>/dev/null || echo "0")
  TIME_DIFF=$((CURRENT_TIME - LAST_FIRE))

  if [ "$TIME_DIFF" -lt "$DEBOUNCE_SECONDS" ]; then
    echo "[$(date)] ⏭️  Debounced (last fire: ${TIME_DIFF}s ago)" >> "$DEBUG_LOG" 2>/dev/null || true
    cat <<EOF
{
  "continue": true
}
EOF
    exit 0
  fi
fi

echo "$CURRENT_TIME" > "$LAST_FIRE_FILE"

# ============================================================================
# CAPTURE INPUT
# ============================================================================

STDIN_DATA=$(mktemp)
cat > "$STDIN_DATA"

echo "[$(date)] 📋 TodoWrite hook fired" >> "$DEBUG_LOG" 2>/dev/null || true
echo "[$(date)] Input JSON:" >> "$DEBUG_LOG" 2>/dev/null || true
cat "$STDIN_DATA" >> "$DEBUG_LOG" 2>/dev/null || true
echo "" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# INACTIVITY DETECTION
# ============================================================================

INACTIVITY_GAP=0
PREVIOUS_TODOWRITE_TIME=0

if [ -f "$LAST_TODOWRITE_FILE" ]; then
  PREVIOUS_TODOWRITE_TIME=$(cat "$LAST_TODOWRITE_FILE" 2>/dev/null || echo "0")
  INACTIVITY_GAP=$((CURRENT_TIME - PREVIOUS_TODOWRITE_TIME))
  echo "[$(date)] ⏱️  Inactivity gap: ${INACTIVITY_GAP}s (threshold: ${INACTIVITY_THRESHOLD}s)" >> "$DEBUG_LOG" 2>/dev/null || true
else
  echo "[$(date)] 🆕 First TodoWrite in session" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# Save current timestamp for next call
echo "$CURRENT_TIME" > "$LAST_TODOWRITE_FILE"

# ============================================================================
# PARSE TASK COMPLETION STATE
# ============================================================================

ALL_COMPLETED=false

if command -v jq >/dev/null 2>&1; then
  # Use jq if available (more reliable)
  PENDING_COUNT=$(jq -r '.tool_input.todos // [] | map(select(.status != "completed")) | length' "$STDIN_DATA" 2>/dev/null || echo "1")
  TOTAL_COUNT=$(jq -r '.tool_input.todos // [] | length' "$STDIN_DATA" 2>/dev/null || echo "0")

  echo "[$(date)] 📊 Tasks: $((TOTAL_COUNT - PENDING_COUNT))/$TOTAL_COUNT completed" >> "$DEBUG_LOG" 2>/dev/null || true

  if [ "$PENDING_COUNT" = "0" ] && [ "$TOTAL_COUNT" != "0" ]; then
    ALL_COMPLETED=true
  fi
else
  # Fallback: Simple grep check (less reliable but works without jq)
  if grep -q '"status":"pending"\|"status":"in_progress"' "$STDIN_DATA" 2>/dev/null; then
    ALL_COMPLETED=false
  else
    ALL_COMPLETED=true
  fi
fi

rm -f "$STDIN_DATA"

# ============================================================================
# SESSION-END DETECTION LOGIC
# ============================================================================

SESSION_ENDING=false
DECISION_REASON=""

if [ "$ALL_COMPLETED" = "true" ]; then
  if [ "$INACTIVITY_GAP" -ge "$INACTIVITY_THRESHOLD" ]; then
    SESSION_ENDING=true
    DECISION_REASON="All tasks complete + ${INACTIVITY_GAP}s inactivity ≥ ${INACTIVITY_THRESHOLD}s threshold"
    echo "[$(date)] 🎉 SESSION ENDING DETECTED! ($DECISION_REASON)" >> "$DEBUG_LOG" 2>/dev/null || true
  else
    DECISION_REASON="All tasks complete, but rapid activity (${INACTIVITY_GAP}s < ${INACTIVITY_THRESHOLD}s) - Claude likely creating more work"
    echo "[$(date)] ⚡ $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  DECISION_REASON="Tasks remaining in current list"
  echo "[$(date)] 🔄 $DECISION_REASON (no sound)" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# UPDATE TASKS.MD (NEW in v0.6.1)
# ============================================================================

if command -v node &> /dev/null; then
  # Detect current increment (latest non-backlog increment)
  CURRENT_INCREMENT=$(ls -t .specweave/increments/ 2>/dev/null | grep -v "_backlog" | head -1)

  if [ -n "$CURRENT_INCREMENT" ] && [ -f ".specweave/increments/$CURRENT_INCREMENT/tasks.md" ]; then
    echo "[$(date)] 📝 Updating tasks.md for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Run task updater (non-blocking, best-effort)
    node ${CLAUDE_PLUGIN_ROOT}/lib/hooks/update-tasks-md.js "$CURRENT_INCREMENT" 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
      echo "[$(date)] ⚠️  Failed to update tasks.md (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
    }
  else
    echo "[$(date)] ℹ️  No current increment or tasks.md found, skipping tasks.md update" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  echo "[$(date)] ⚠️  Node.js not found, skipping tasks.md update" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# SYNC LIVING DOCS (NEW in v0.6.1)
# ============================================================================

if command -v node &> /dev/null; then
  if [ -n "$CURRENT_INCREMENT" ]; then
    echo "[$(date)] 📚 Checking living docs sync for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # ========================================================================
    # EXTRACT FEATURE ID (NEW in v0.23.0 - Increment 0047: US-Task Linkage)
    # ========================================================================
    # Extract epic field from spec.md frontmatter (e.g., epic: FS-047)
    # This ensures sync uses the explicitly defined feature ID rather than
    # auto-generating one, maintaining traceability with living docs structure.

    FEATURE_ID=""
    SPEC_MD_PATH=".specweave/increments/$CURRENT_INCREMENT/spec.md"

    if [ -f "$SPEC_MD_PATH" ]; then
      # Extract epic field from YAML frontmatter
      FEATURE_ID=$(awk '
        BEGIN { in_frontmatter=0 }
        /^---$/ {
          if (in_frontmatter == 0) {
            in_frontmatter=1; next
          } else {
            exit
          }
        }
        in_frontmatter == 1 && /^epic:/ {
          gsub(/^epic:[ \t]*/, "");
          gsub(/["'\'']/, "");
          print;
          exit
        }
      ' "$SPEC_MD_PATH" | tr -d '\r\n')

      if [ -n "$FEATURE_ID" ]; then
        echo "[$(date)]   📎 Extracted feature ID from spec.md: $FEATURE_ID" >> "$DEBUG_LOG" 2>/dev/null || true
      else
        echo "[$(date)]   ⚠️  No epic field found in spec.md frontmatter" >> "$DEBUG_LOG" 2>/dev/null || true
        echo "[$(date)]   ℹ️  Sync will auto-generate feature ID from increment number" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    else
      echo "[$(date)]   ⚠️  spec.md not found at $SPEC_MD_PATH" >> "$DEBUG_LOG" 2>/dev/null || true
    fi

    # Extract project ID from config or metadata (defaults to "default")
    PROJECT_ID="default"
    if [ -f ".specweave/config.json" ]; then
      # Try to extract activeProject from config
      if command -v jq >/dev/null 2>&1; then
        ACTIVE_PROJECT=$(jq -r '.activeProject // "default"' ".specweave/config.json" 2>/dev/null || echo "default")
        if [ -n "$ACTIVE_PROJECT" ] && [ "$ACTIVE_PROJECT" != "null" ]; then
          PROJECT_ID="$ACTIVE_PROJECT"
        fi
      fi
    fi
    echo "[$(date)]   📁 Project ID: $PROJECT_ID" >> "$DEBUG_LOG" 2>/dev/null || true

    # Determine which sync script to use (project local or global)
    SYNC_SCRIPT=""
    if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
      # Development: Use in-place compiled hooks (esbuild, not tsc)
      SYNC_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js"
      echo "[$(date)]   Using in-place compiled hook: $SYNC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
      # Development: Use project's compiled files (has node_modules)
      SYNC_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
      echo "[$(date)]   Using local dist: $SYNC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
      # Installed as dependency: Use node_modules version
      SYNC_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
      echo "[$(date)]   Using node_modules: $SYNC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js" ]; then
      # Fallback: Plugin marketplace (may fail if deps missing)
      SYNC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js"
      echo "[$(date)]   Using plugin marketplace: $SYNC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    fi

    if [ -n "$SYNC_SCRIPT" ]; then
      # Run living docs sync with feature ID (non-blocking, best-effort)
      # Pass FEATURE_ID and PROJECT_ID as environment variables if available
      if [ -n "$FEATURE_ID" ]; then
        (cd "$PROJECT_ROOT" && FEATURE_ID="$FEATURE_ID" PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$CURRENT_INCREMENT") 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] ⚠️  Failed to sync living docs (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      else
        # No explicit feature ID - sync will auto-generate
        (cd "$PROJECT_ROOT" && PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$CURRENT_INCREMENT") 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] ⚠️  Failed to sync living docs (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      fi
    else
      echo "[$(date)] ⚠️  sync-living-docs.js not found in any location" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# ============================================================================
# UPDATE AC STATUS (NEW in v0.18.3 - Acceptance Criteria Checkbox Update)
# ============================================================================
# Updates acceptance criteria checkboxes in spec.md based on completed tasks
# - Extracts AC-IDs from completed tasks (AC-US1-01, AC-US1-02, etc.)
# - Checks off corresponding AC in spec.md
# - Ensures external tool sync reflects current AC completion status

if command -v node &> /dev/null; then
  if [ -n "$CURRENT_INCREMENT" ]; then
    echo "[$(date)] ✓ Updating AC status for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Determine which AC update script to use (project local or global)
    UPDATE_AC_SCRIPT=""
    if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/update-ac-status.js" ]; then
      # Development: Use in-place compiled hooks (esbuild, not tsc)
      UPDATE_AC_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/update-ac-status.js"
      echo "[$(date)]   Using in-place compiled hook: $UPDATE_AC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/update-ac-status.js" ]; then
      # Development: Use project's compiled files (has node_modules)
      UPDATE_AC_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/update-ac-status.js"
      echo "[$(date)]   Using local dist: $UPDATE_AC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/update-ac-status.js" ]; then
      # Installed as dependency: Use node_modules version
      UPDATE_AC_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/update-ac-status.js"
      echo "[$(date)]   Using node_modules: $UPDATE_AC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/update-ac-status.js" ]; then
      # Fallback: Plugin marketplace (may fail if deps missing)
      UPDATE_AC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/update-ac-status.js"
      echo "[$(date)]   Using plugin marketplace: $UPDATE_AC_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    fi

    if [ -n "$UPDATE_AC_SCRIPT" ]; then
      # Run AC status update (non-blocking, best-effort)
      (cd "$PROJECT_ROOT" && node "$UPDATE_AC_SCRIPT" "$CURRENT_INCREMENT") 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
        echo "[$(date)] ⚠️  Failed to update AC status (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
      }
    else
      echo "[$(date)] ⚠️  update-ac-status.js not found in any location" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# ============================================================================
# TRANSLATE LIVING DOCS (NEW in v0.6.0 - i18n)
# ============================================================================

if command -v node &> /dev/null; then
  if [ -n "$CURRENT_INCREMENT" ]; then
    echo "[$(date)] 🌐 Checking if living docs translation is needed for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Determine which translation script to use (project local or global)
    TRANSLATE_SCRIPT=""
    if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/translate-living-docs.js" ]; then
      # Development: Use in-place compiled hooks (esbuild, not tsc)
      TRANSLATE_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/translate-living-docs.js"
      echo "[$(date)]   Using in-place compiled hook: $TRANSLATE_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/translate-living-docs.js" ]; then
      # Development: Use project's compiled files (has node_modules)
      TRANSLATE_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/translate-living-docs.js"
      echo "[$(date)]   Using local dist: $TRANSLATE_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/translate-living-docs.js" ]; then
      # Installed as dependency: Use node_modules version
      TRANSLATE_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/translate-living-docs.js"
      echo "[$(date)]   Using node_modules: $TRANSLATE_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/translate-living-docs.js" ]; then
      # Fallback: Plugin marketplace (may fail if deps missing)
      TRANSLATE_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/translate-living-docs.js"
      echo "[$(date)]   Using plugin marketplace: $TRANSLATE_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
    fi

    if [ -n "$TRANSLATE_SCRIPT" ]; then
      # Run living docs translation (non-blocking, best-effort)
      (cd "$PROJECT_ROOT" && node "$TRANSLATE_SCRIPT" "$CURRENT_INCREMENT") 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
        echo "[$(date)] ⚠️  Failed to translate living docs (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
      }
    else
      echo "[$(date)] ⚠️  translate-living-docs.js not found in any location" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  fi
fi

# ============================================================================
# EXTERNAL TRACKER SYNC (REMOVED in v0.13.0 - Moved to Plugin Hooks)
# ============================================================================
#
# External tool sync logic has been moved to respective plugin hooks:
# - GitHub sync: plugins/specweave-github/hooks/post-task-completion.sh
# - JIRA sync: plugins/specweave-jira/hooks/post-task-completion.sh
# - Azure DevOps sync: plugins/specweave-ado/hooks/post-task-completion.sh
#
# When multiple plugins are installed, Claude Code fires all hooks in parallel.
# This architecture provides:
# - Clean separation of concerns (core vs. external tools)
# - Optional plugins (GitHub sync only runs if specweave-github installed)
# - Independent testing and maintenance
# - No external tool dependencies in core plugin
#
# See: .specweave/increments/0018-strict-increment-discipline-enforcement/reports/HOOKS-ARCHITECTURE-ANALYSIS.md

echo "[$(date)] ℹ️  External tracker sync moved to plugin hooks (GitHub/JIRA/ADO)" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# SELF-REFLECTION (NEW in v0.12.0-beta - AI Self-Reflection System)
# ============================================================================

if command -v node &> /dev/null; then
  if [ -n "$CURRENT_INCREMENT" ] && [ "$ALL_COMPLETED" = "true" ]; then
    echo "[$(date)] 🤔 Preparing self-reflection context for $CURRENT_INCREMENT" >> "$DEBUG_LOG" 2>/dev/null || true

    # Detect latest completed task
    LATEST_TASK=$(grep "^## T-[0-9]" ".specweave/increments/$CURRENT_INCREMENT/tasks.md" 2>/dev/null | tail -1 | awk '{print $2}' | sed 's/://')

    if [ -n "$LATEST_TASK" ]; then
      # Determine which reflection script to use (project local or global)
      REFLECTION_SCRIPT=""
      if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/prepare-reflection-context.js" ]; then
        # Development: Use in-place compiled hooks (esbuild, not tsc)
        REFLECTION_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/prepare-reflection-context.js"
        echo "[$(date)]   Using in-place compiled hook: $REFLECTION_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
      elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js" ]; then
        # Development: Use project's compiled files (has node_modules)
        REFLECTION_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js"
        echo "[$(date)]   Using local dist: $REFLECTION_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
      elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js" ]; then
        # Installed as dependency: Use node_modules version
        REFLECTION_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/prepare-reflection-context.js"
        echo "[$(date)]   Using node_modules: $REFLECTION_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
      elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/prepare-reflection-context.js" ]; then
        # Fallback: Plugin marketplace (may fail if deps missing)
        REFLECTION_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/prepare-reflection-context.js"
        echo "[$(date)]   Using plugin marketplace: $REFLECTION_SCRIPT" >> "$DEBUG_LOG" 2>/dev/null || true
      fi

      if [ -n "$REFLECTION_SCRIPT" ]; then
        # Prepare reflection context (non-blocking, best-effort)
        (cd "$PROJECT_ROOT" && node "$REFLECTION_SCRIPT" "$CURRENT_INCREMENT" "$LATEST_TASK") 2>&1 | tee -a "$DEBUG_LOG" >/dev/null || {
          echo "[$(date)] ⚠️  Failed to prepare reflection context (non-blocking)" >> "$DEBUG_LOG" 2>/dev/null || true
        }
      else
        echo "[$(date)] ⚠️  prepare-reflection-context.js not found in any location" >> "$DEBUG_LOG" 2>/dev/null || true
      fi
    else
      echo "[$(date)] ℹ️  No tasks found in tasks.md, skipping reflection" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
  else
    echo "[$(date)] ℹ️  Skipping reflection (tasks still pending or no increment)" >> "$DEBUG_LOG" 2>/dev/null || true
  fi
else
  echo "[$(date)] ⚠️  Node.js not found, skipping reflection" >> "$DEBUG_LOG" 2>/dev/null || true
fi

# ============================================================================
# PLAY SOUND (only if session is truly ending)
# ============================================================================

play_sound() {
  case "$(uname -s)" in
    Darwin)
      afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
      ;;
    Linux)
      paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || \
      aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
      ;;
    MINGW*|MSYS*|CYGWIN*)
      powershell -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\chimes.wav').PlaySync();" 2>/dev/null || true
      ;;
  esac
}

# ============================================================================
# STATUS LINE UPDATE
# ============================================================================
# Update status line cache BEFORE playing sound (async, non-blocking)
# Cache will be read by status line renderer for fast display (<1ms)

echo "[$(date)] 📊 Updating status line cache" >> "$DEBUG_LOG" 2>/dev/null || true
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

if [ "$SESSION_ENDING" = "true" ]; then
  echo "[$(date)] 🔔 Playing completion sound" >> "$DEBUG_LOG" 2>/dev/null || true
  play_sound
fi

# ============================================================================
# LOGGING
# ============================================================================

echo "[$(date)] Status: All_completed=$ALL_COMPLETED, Session_ending=$SESSION_ENDING, Inactivity=${INACTIVITY_GAP}s" >> "$TASKS_LOG" 2>/dev/null || true
echo "[$(date)] Reason: $DECISION_REASON" >> "$TASKS_LOG" 2>/dev/null || true
echo "---" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# OUTPUT TO CLAUDE
# ============================================================================

if [ "$SESSION_ENDING" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "🎉 ALL WORK COMPLETED! Session ending detected (${INACTIVITY_GAP}s inactivity). Remember to update documentation with inline edits to CLAUDE.md and README.md as needed."
}
EOF
elif [ "$ALL_COMPLETED" = "true" ]; then
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task batch completed (${INACTIVITY_GAP}s since last activity). Continuing work..."
}
EOF
else
  cat <<EOF
{
  "continue": true,
  "systemMessage": "✅ Task completed. More tasks remaining - keep going!"
}
EOF
fi
