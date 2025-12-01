#!/bin/bash
# living-specs-handler.sh - Update living SPECS on lifecycle events
# Events: increment.created, increment.done, increment.archived, increment.reopened
#
# This handler updates the specs/ folder structure when increment lifecycle changes.
# It is called by the event processor, NOT directly by post-tool-use.
#
# IMPORTANT: This script must be fast (<100ms) and never crash Claude
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

EVENT="${1:-}"
INC_ID="${2:-}"

[[ -z "$EVENT" ]] && exit 0
[[ -z "$INC_ID" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# Throttle: max once per 60 seconds per increment
STATE_DIR="$PROJECT_ROOT/.specweave/state"
THROTTLE_FILE="$STATE_DIR/.living-specs-$INC_ID"
mkdir -p "$STATE_DIR" 2>/dev/null

if [[ -f "$THROTTLE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    AGE=$(($(date +%s) - $(stat -f %m "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  else
    AGE=$(($(date +%s) - $(stat -c %Y "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  fi
  [[ $AGE -lt 60 ]] && exit 0
fi
touch "$THROTTLE_FILE"

# Find the sync script
SYNC_SCRIPT=""
for path in \
  "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js" \
  "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" \
  "${CLAUDE_PLUGIN_ROOT:-}/lib/hooks/sync-living-docs.js"; do
  [[ -f "$path" ]] && { SYNC_SCRIPT="$path"; break; }
done

# Log event (silent, async)
LOG_FILE="$PROJECT_ROOT/.specweave/logs/hooks.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
echo "[$(date '+%Y-%m-%d %H:%M:%S')] living-specs-handler: $EVENT $INC_ID" >> "$LOG_FILE" 2>/dev/null

# Get increment paths
INC_DIR="$PROJECT_ROOT/.specweave/increments/$INC_ID"
ARCHIVE_DIR="$PROJECT_ROOT/.specweave/increments/_archive/$INC_ID"
SPEC_FILE="$INC_DIR/spec.md"
ARCHIVE_SPEC="$ARCHIVE_DIR/spec.md"

# Extract feature ID from spec.md (fast grep)
get_feature_id() {
  local spec="$1"
  [[ -f "$spec" ]] && grep -E "^(epic|feature_id):" "$spec" 2>/dev/null | head -1 | sed 's/.*:[[:space:]]*//' | tr -d '"'"'"
}

# Cross-platform timeout wrapper
# Uses GNU timeout, gtimeout (macOS with coreutils), or fallback
run_with_timeout() {
  local timeout_secs="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$timeout_secs" "$@" 2>/dev/null || true
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$timeout_secs" "$@" 2>/dev/null || true
  else
    "$@" 2>/dev/null || true
  fi
}

case "$EVENT" in
  increment.created)
    # Create spec entry in living docs via Node.js script
    if [[ -n "$SYNC_SCRIPT" ]] && [[ -f "$SPEC_FILE" ]]; then
      FEATURE_ID=$(get_feature_id "$SPEC_FILE")
      cd "$PROJECT_ROOT" || exit 0
      if [[ -n "$FEATURE_ID" ]]; then
        FEATURE_ID="$FEATURE_ID" run_with_timeout 30 node "$SYNC_SCRIPT" "$INC_ID" >/dev/null 2>&1 &
      else
        run_with_timeout 30 node "$SYNC_SCRIPT" "$INC_ID" >/dev/null 2>&1 &
      fi
    fi
    ;;

  increment.done)
    # Update status to complete in living docs
    if [[ -n "$SYNC_SCRIPT" ]] && [[ -f "$SPEC_FILE" ]]; then
      FEATURE_ID=$(get_feature_id "$SPEC_FILE")
      cd "$PROJECT_ROOT" || exit 0

      # Mark as complete in FEATURE.md if it exists
      if [[ -n "$FEATURE_ID" ]]; then
        SPECS_DIR="$PROJECT_ROOT/.specweave/docs/internal/specs"
        # Find FEATURE.md for this feature
        FEATURE_FILE=$(find "$SPECS_DIR" -path "*/$FEATURE_ID/FEATURE.md" 2>/dev/null | head -1)

        if [[ -f "$FEATURE_FILE" ]]; then
          # Update status in FEATURE.md (in-progress -> complete)
          sed -i.bak 's/status: in-progress/status: complete/g' "$FEATURE_FILE" 2>/dev/null
          rm -f "${FEATURE_FILE}.bak" 2>/dev/null

          # Update increment row status
          sed -i.bak "s/\[$INC_ID\].*in-progress/[$INC_ID](..\/..\/..\/..\/increments\/$INC_ID\/spec.md) | complete/g" "$FEATURE_FILE" 2>/dev/null
          rm -f "${FEATURE_FILE}.bak" 2>/dev/null
        fi

        # Also run full sync for completeness
        FEATURE_ID="$FEATURE_ID" run_with_timeout 30 node "$SYNC_SCRIPT" "$INC_ID" >/dev/null 2>&1 &
      else
        run_with_timeout 30 node "$SYNC_SCRIPT" "$INC_ID" >/dev/null 2>&1 &
      fi
    fi
    ;;

  increment.archived)
    # Move spec entry to _archive section in living docs
    if [[ -f "$ARCHIVE_SPEC" ]]; then
      FEATURE_ID=$(get_feature_id "$ARCHIVE_SPEC")

      if [[ -n "$FEATURE_ID" ]]; then
        SPECS_DIR="$PROJECT_ROOT/.specweave/docs/internal/specs"
        ACTIVE_FEATURE=$(find "$SPECS_DIR" -path "*/$FEATURE_ID/FEATURE.md" -not -path "*/_archive/*" 2>/dev/null | head -1)
        ARCHIVE_SPECS="$SPECS_DIR/specweave/_archive"

        if [[ -f "$ACTIVE_FEATURE" ]]; then
          # Check if all increments for this feature are archived
          FEATURE_DIR=$(dirname "$ACTIVE_FEATURE")
          ACTIVE_INC_COUNT=$(ls -1 "$FEATURE_DIR"/*.md 2>/dev/null | grep -v FEATURE.md | grep -v README.md | wc -l | tr -d ' ')

          if [[ "$ACTIVE_INC_COUNT" -eq 0 ]]; then
            # Move entire feature folder to archive
            mkdir -p "$ARCHIVE_SPECS" 2>/dev/null
            mv "$FEATURE_DIR" "$ARCHIVE_SPECS/" 2>/dev/null
          else
            # Just update status in FEATURE.md
            sed -i.bak "s/\[$INC_ID\].*|.*$/[$INC_ID](..\/..\/..\/..\/increments\/_archive\/$INC_ID\/spec.md) | archived/g" "$ACTIVE_FEATURE" 2>/dev/null
            rm -f "${ACTIVE_FEATURE}.bak" 2>/dev/null
          fi
        fi
      fi
    fi
    ;;

  increment.reopened)
    # Restore from archive section in living docs
    if [[ -f "$SPEC_FILE" ]]; then
      FEATURE_ID=$(get_feature_id "$SPEC_FILE")

      if [[ -n "$FEATURE_ID" ]]; then
        SPECS_DIR="$PROJECT_ROOT/.specweave/docs/internal/specs"
        ARCHIVE_FEATURE="$SPECS_DIR/specweave/_archive/$FEATURE_ID"
        ACTIVE_SPECS="$SPECS_DIR/specweave"

        # Check if feature was archived, restore it
        if [[ -d "$ARCHIVE_FEATURE" ]]; then
          mv "$ARCHIVE_FEATURE" "$ACTIVE_SPECS/" 2>/dev/null

          # Update status back to in-progress
          FEATURE_FILE="$ACTIVE_SPECS/$FEATURE_ID/FEATURE.md"
          if [[ -f "$FEATURE_FILE" ]]; then
            sed -i.bak 's/status: archived/status: in-progress/g' "$FEATURE_FILE" 2>/dev/null
            sed -i.bak 's/status: complete/status: in-progress/g' "$FEATURE_FILE" 2>/dev/null
            rm -f "${FEATURE_FILE}.bak" 2>/dev/null
          fi
        else
          # Feature still exists, just update increment status
          FEATURE_FILE=$(find "$SPECS_DIR" -path "*/$FEATURE_ID/FEATURE.md" -not -path "*/_archive/*" 2>/dev/null | head -1)
          if [[ -f "$FEATURE_FILE" ]]; then
            sed -i.bak "s/\[$INC_ID\].*archived/[$INC_ID](..\/..\/..\/..\/increments\/$INC_ID\/spec.md) | in-progress/g" "$FEATURE_FILE" 2>/dev/null
            sed -i.bak "s/\[$INC_ID\].*complete/[$INC_ID](..\/..\/..\/..\/increments\/$INC_ID\/spec.md) | in-progress/g" "$FEATURE_FILE" 2>/dev/null
            rm -f "${FEATURE_FILE}.bak" 2>/dev/null
          fi
        fi

        # Run full sync to restore any missing content
        cd "$PROJECT_ROOT" || exit 0
        FEATURE_ID="$FEATURE_ID" run_with_timeout 30 node "$SYNC_SCRIPT" "$INC_ID" >/dev/null 2>&1 &
      fi
    fi
    ;;
esac

exit 0
