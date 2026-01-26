#!/usr/bin/env bash
# session-start-cache-validation.sh
# Add to hooks/v2/dispatchers/session-start.sh after dashboard cache validation

# ============================================================================
# MINIMAL STATUS CACHE VALIDATION (v1.0.110+)
# ============================================================================
# Rebuild status cache if missing or stale (>5 min old)
# This catches edge cases: archive, restore, manual deletion

CACHE_FILE="$PROJECT_ROOT/.specweave/state/status-cache.json"
REBUILD_SCRIPT="$SCRIPTS_DIR/rebuild-status-cache.sh"

if [[ -f "$REBUILD_SCRIPT" ]]; then
  SHOULD_REBUILD=false

  # Check if cache exists
  if [[ ! -f "$CACHE_FILE" ]]; then
    SHOULD_REBUILD=true
    log_debug "Status cache missing - will rebuild"
  else
    # Check cache age (rebuild if >5 min old)
    if [[ "$(uname)" == "Darwin" ]]; then
      CACHE_MTIME=$(stat -f "%m" "$CACHE_FILE" 2>/dev/null || echo "0")
    else
      CACHE_MTIME=$(stat -c "%Y" "$CACHE_FILE" 2>/dev/null || echo "0")
    fi

    NOW=$(date +%s)
    CACHE_AGE=$((NOW - CACHE_MTIME))

    if [[ $CACHE_AGE -gt 300 ]]; then
      # Cache older than 5 minutes
      SHOULD_REBUILD=true
      log_debug "Status cache stale ($CACHE_AGE seconds) - will rebuild"
    fi
  fi

  # Rebuild if needed (background, non-blocking)
  if [[ "$SHOULD_REBUILD" == "true" ]]; then
    log_debug "Rebuilding status cache in background..."
    nohup bash "$REBUILD_SCRIPT" --quiet > /dev/null 2>&1 &
  else
    log_debug "Status cache is fresh (age: ${CACHE_AGE}s)"
  fi
fi

# ============================================================================
# END MINIMAL STATUS CACHE VALIDATION
# ============================================================================
