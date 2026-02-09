#!/bin/bash

# SpecWeave GitHub AC Sync Handler (v1.0.236+)
# Background handler: posts progress comments to GitHub after AC sync.
#
# Triggered by post-tool-use.sh after task-ac-sync-guard updates spec.md ACs.
# Runs in BACKGROUND via safe_run_background — never blocks the main chain.
#
# Features:
# - 5s debounce (batches rapid AC changes)
# - Circuit breaker (3 consecutive failures → auto-disable)
# - File locking (prevents concurrent handler executions)
# - Non-blocking (all errors → exit 0 with logging)
#
# Usage: github-ac-sync-handler.sh <INCREMENT_ID>
# Called by: safe_run_background in post-tool-use.sh

set +e  # Never crash Claude Code

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

# ============================================================================
# PROJECT ROOT DETECTION
# ============================================================================

find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

PROJECT_ROOT="$(find_project_root "$(pwd)")"
if [[ -z "$PROJECT_ROOT" ]]; then
  exit 0
fi
cd "$PROJECT_ROOT" 2>/dev/null || exit 0

# ============================================================================
# ARGUMENTS
# ============================================================================

INC_ID="$1"
if [[ -z "$INC_ID" ]]; then
  exit 0
fi

SPEC_PATH="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
if [[ ! -f "$SPEC_PATH" ]]; then
  exit 0
fi

# ============================================================================
# LOGGING
# ============================================================================

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOGS_DIR/github-ac-sync.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-ac-sync] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# ============================================================================
# CIRCUIT BREAKER
# ============================================================================

STATE_DIR="$PROJECT_ROOT/.specweave/state"
CIRCUIT_BREAKER_FILE="$STATE_DIR/.hook-circuit-breaker-github-ac"
CIRCUIT_BREAKER_THRESHOLD=3

mkdir -p "$STATE_DIR" 2>/dev/null || true

if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  if (( FAILURE_COUNT >= CIRCUIT_BREAKER_THRESHOLD )); then
    log "Circuit breaker OPEN ($FAILURE_COUNT failures). Skipping."
    exit 0
  fi
fi

# ============================================================================
# FILE LOCKING
# ============================================================================

LOCK_FILE="$STATE_DIR/.hook-github-ac-sync.lock"
LOCK_TIMEOUT=15

LOCK_ACQUIRED=false
for i in {1..10}; do
  if mkdir "$LOCK_FILE" 2>/dev/null; then
    LOCK_ACQUIRED=true
    trap 'rmdir "$LOCK_FILE" 2>/dev/null || true' EXIT
    break
  fi

  # Check for stale lock
  if [[ -d "$LOCK_FILE" ]]; then
    LOCK_AGE=$(($(date +%s) - $(stat -f "%m" "$LOCK_FILE" 2>/dev/null || echo 0)))
    if (( LOCK_AGE > LOCK_TIMEOUT )); then
      rmdir "$LOCK_FILE" 2>/dev/null || true
      continue
    fi
  fi

  sleep 0.3
done

if [[ "$LOCK_ACQUIRED" == "false" ]]; then
  log "Lock not acquired. Another instance running. Skipping."
  exit 0
fi

# ============================================================================
# DEBOUNCE (5s window)
# ============================================================================

SIGNAL_FILE="$STATE_DIR/.github-ac-pending-$INC_ID"

if [[ -f "$SIGNAL_FILE" ]]; then
  SIGNAL_AGE=$(($(date +%s) - $(stat -f "%m" "$SIGNAL_FILE" 2>/dev/null || echo 0)))
  if (( SIGNAL_AGE < 5 )); then
    # Another invocation was recent — let a later one handle it
    log "Debounce: signal file age ${SIGNAL_AGE}s < 5s. Deferring."
    exit 0
  fi
fi

# Create/update signal file and wait for debounce window
echo "$(date +%s)" > "$SIGNAL_FILE" 2>/dev/null || true
sleep 5

# After sleeping, check if a NEWER invocation took over
if [[ -f "$SIGNAL_FILE" ]]; then
  CURRENT_SIGNAL=$(cat "$SIGNAL_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  SIGNAL_AGE=$((NOW - CURRENT_SIGNAL))
  if (( SIGNAL_AGE > 6 )); then
    # Another invocation wrote a newer timestamp — it will handle this
    log "Debounce: newer invocation detected. Exiting."
    exit 0
  fi
fi

# Clean up signal file — we're the one handling it
rm -f "$SIGNAL_FILE" 2>/dev/null || true

# ============================================================================
# PRECONDITIONS
# ============================================================================

if ! command -v node &>/dev/null; then
  log "Node.js not found. Skipping."
  exit 0
fi

if ! command -v gh &>/dev/null; then
  log "GitHub CLI (gh) not found. Skipping."
  exit 0
fi

# Check GitHub sync is enabled in config
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
if [[ -f "$CONFIG_FILE" ]] && command -v jq >/dev/null 2>&1; then
  GH_ENABLED=$(jq -r '.sync.github.enabled // false' "$CONFIG_FILE" 2>/dev/null)
  if [[ "$GH_ENABLED" != "true" ]]; then
    log "GitHub sync not enabled in config. Skipping."
    exit 0
  fi
fi

# ============================================================================
# POST PROGRESS COMMENT
# ============================================================================

log "Posting progress comment for increment $INC_ID..."

# Find the comment poster module
POSTER_MODULE="$PROJECT_ROOT/plugins/specweave-github/lib/github-ac-comment-poster.js"
if [[ ! -f "$POSTER_MODULE" ]]; then
  # Try dist/ fallback
  POSTER_MODULE="$PROJECT_ROOT/dist/plugins/specweave-github/lib/github-ac-comment-poster.js"
fi

if [[ ! -f "$POSTER_MODULE" ]]; then
  log "Comment poster module not found. Skipping."
  exit 0
fi

# Run comment poster via node
OUTPUT=$(node -e "
  import { postACProgressComments } from '${POSTER_MODULE}';
  const specPath = '${SPEC_PATH}';
  const incrementId = '${INC_ID}';
  // Post for all user stories (the module filters by available issue links)
  const result = await postACProgressComments(incrementId, [], specPath, {
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
  });
  console.log(JSON.stringify(result));
" 2>&1) || true

EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
  log "Comment poster failed (exit $EXIT_CODE): $OUTPUT"

  # Update circuit breaker
  FAILURE_COUNT=$(cat "$CIRCUIT_BREAKER_FILE" 2>/dev/null || echo 0)
  echo "$((FAILURE_COUNT + 1))" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true

  exit 0
fi

log "Comment poster completed: $OUTPUT"

# Reset circuit breaker on success
echo "0" > "$CIRCUIT_BREAKER_FILE" 2>/dev/null || true

# ============================================================================
# AUTO-CLOSE COMPLETED USER STORIES (v1.0.236+)
# ============================================================================

CLOSER_MODULE="$PROJECT_ROOT/plugins/specweave-github/lib/github-us-auto-closer.js"
if [[ ! -f "$CLOSER_MODULE" ]]; then
  CLOSER_MODULE="$PROJECT_ROOT/dist/plugins/specweave-github/lib/github-us-auto-closer.js"
fi

if [[ -f "$CLOSER_MODULE" ]]; then
  log "Running auto-closer for increment $INC_ID..."

  CLOSE_OUTPUT=$(node -e "
    import { autoCloseCompletedUserStories } from '${CLOSER_MODULE}';
    const specPath = '${SPEC_PATH}';
    const incrementId = '${INC_ID}';
    const result = await autoCloseCompletedUserStories(incrementId, [], specPath, {
      owner: process.env.GITHUB_OWNER || '',
      repo: process.env.GITHUB_REPO || '',
    });
    console.log(JSON.stringify(result));
  " 2>&1) || true

  log "Auto-closer completed: $CLOSE_OUTPUT"
fi

exit 0
