#!/bin/bash

# SpecWeave Session Start Reconcile Hook (NEW in v0.28.33)
#
# Runs on Claude Code session start to detect and fix GitHub status drift.
# This is a lightweight hook that runs in background to not block startup.
#
# Features:
# - Debounced: Only runs if >1 hour since last reconcile
# - Non-blocking: Runs in background, errors logged but don't crash
# - Optional: Controlled by config.sync.github.autoReconcileOnSessionStart
#
# Trigger: SessionStart hook event

set +e  # Prevent crashes

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# Find project root
find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
LAST_RECONCILE_FILE="$STATE_DIR/.last-reconcile-timestamp"
DEBUG_LOG="$PROJECT_ROOT/.specweave/logs/hooks-debug.log"

mkdir -p "$STATE_DIR" 2>/dev/null || true
mkdir -p "$(dirname "$DEBUG_LOG")" 2>/dev/null || true

# Consume stdin (required for hooks)
cat > /dev/null

echo "[$(date)] session-start-reconcile: Hook fired" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# CHECK IF AUTO-RECONCILE IS ENABLED
# ============================================================================

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[$(date)] session-start-reconcile: No config.json - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Check config (requires jq)
if ! command -v jq &> /dev/null; then
  echo "[$(date)] session-start-reconcile: jq not found - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Check if auto-reconcile is enabled
AUTO_RECONCILE=$(jq -r '.sync.github.autoReconcileOnSessionStart // false' "$CONFIG_FILE" 2>/dev/null)

if [[ "$AUTO_RECONCILE" != "true" ]]; then
  echo "[$(date)] session-start-reconcile: Disabled in config - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

echo "[$(date)] session-start-reconcile: Auto-reconcile enabled" >> "$DEBUG_LOG" 2>/dev/null || true

# ============================================================================
# DEBOUNCE: Only run if >1 hour since last reconcile
# ============================================================================

DEBOUNCE_SECONDS=3600  # 1 hour

if [[ -f "$LAST_RECONCILE_FILE" ]]; then
  LAST_TIMESTAMP=$(cat "$LAST_RECONCILE_FILE" 2>/dev/null || echo "0")
  CURRENT_TIMESTAMP=$(date +%s)
  ELAPSED=$((CURRENT_TIMESTAMP - LAST_TIMESTAMP))

  if [[ $ELAPSED -lt $DEBOUNCE_SECONDS ]]; then
    REMAINING=$((DEBOUNCE_SECONDS - ELAPSED))
    echo "[$(date)] session-start-reconcile: Debounced - last run ${ELAPSED}s ago (wait ${REMAINING}s)" >> "$DEBUG_LOG" 2>/dev/null || true
    exit 0
  fi
fi

echo "[$(date)] session-start-reconcile: Debounce passed - running reconcile" >> "$DEBUG_LOG" 2>/dev/null || true

# Update timestamp BEFORE running (prevents concurrent runs)
date +%s > "$LAST_RECONCILE_FILE"

# ============================================================================
# RUN RECONCILE IN BACKGROUND (non-blocking)
# ============================================================================

if ! command -v node &> /dev/null; then
  echo "[$(date)] session-start-reconcile: Node.js not found - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Find reconcile script
RECONCILE_SCRIPT=""
if [[ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/session-start-reconcile-worker.js" ]]; then
  RECONCILE_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/session-start-reconcile-worker.js"
elif [[ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/session-start-reconcile-worker.js" ]]; then
  RECONCILE_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/session-start-reconcile-worker.js"
elif [[ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/session-start-reconcile-worker.js" ]]; then
  RECONCILE_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/session-start-reconcile-worker.js"
fi

if [[ -z "$RECONCILE_SCRIPT" ]]; then
  echo "[$(date)] session-start-reconcile: Worker script not found - skipping" >> "$DEBUG_LOG" 2>/dev/null || true
  exit 0
fi

# Load GITHUB_TOKEN from .env
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  GITHUB_TOKEN_FROM_ENV=$(grep -E '^GITHUB_TOKEN=' "$PROJECT_ROOT/.env" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
  if [[ -n "$GITHUB_TOKEN_FROM_ENV" ]]; then
    export GITHUB_TOKEN="$GITHUB_TOKEN_FROM_ENV"
  fi
fi

# Run in background with nohup (fully detached)
# Output goes to debug log, doesn't block session start
echo "[$(date)] session-start-reconcile: Starting background reconcile" >> "$DEBUG_LOG" 2>/dev/null || true

(
  cd "$PROJECT_ROOT" && \
  node "$RECONCILE_SCRIPT" >> "$DEBUG_LOG" 2>&1
) &

# Immediately exit (don't wait for background job)
exit 0
