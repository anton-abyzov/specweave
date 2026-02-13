#!/bin/bash

# SpecWeave Provider-Agnostic AC Sync Dispatcher (v1.0.255+)
# Background handler: syncs AC progress to ALL enabled providers (GitHub, JIRA, ADO).
#
# Replaces the GitHub-only github-ac-sync-handler.sh with a unified dispatcher
# that calls syncACProgressToProviders() for all configured providers.
#
# Triggered by post-tool-use.sh after task-ac-sync-guard updates spec.md ACs.
# Runs in BACKGROUND via safe_run_background — never blocks the main chain.
#
# Features:
# - 5s debounce (batches rapid AC changes)
# - Per-provider circuit breakers (managed in TypeScript)
# - File locking (prevents concurrent handler executions)
# - Non-blocking (all errors → exit 0 with logging)
#
# Usage: ac-sync-dispatcher.sh <INCREMENT_ID>
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
METADATA_PATH="$PROJECT_ROOT/.specweave/increments/$INC_ID/metadata.json"
CONFIG_PATH="$PROJECT_ROOT/.specweave/config.json"

if [[ ! -f "$SPEC_PATH" ]]; then
  exit 0
fi

# ============================================================================
# LOGGING
# ============================================================================

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOGS_DIR/ac-sync-dispatcher.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ac-sync] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# ============================================================================
# CHECK ANY PROVIDER ENABLED
# ============================================================================

if [[ ! -f "$CONFIG_PATH" ]] || ! command -v jq >/dev/null 2>&1; then
  log "Config not found or jq unavailable. Skipping."
  exit 0
fi

GH_ENABLED=$(jq -r '.sync.github.enabled // false' "$CONFIG_PATH" 2>/dev/null)
JIRA_ENABLED=$(jq -r '.sync.jira.enabled // false' "$CONFIG_PATH" 2>/dev/null)
ADO_ENABLED=$(jq -r '.sync.ado.enabled // false' "$CONFIG_PATH" 2>/dev/null)

if [[ "$GH_ENABLED" != "true" && "$JIRA_ENABLED" != "true" && "$ADO_ENABLED" != "true" ]]; then
  log "No providers enabled. Skipping."
  exit 0
fi

# ============================================================================
# FILE LOCKING
# ============================================================================

STATE_DIR="$PROJECT_ROOT/.specweave/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true

LOCK_FILE="$STATE_DIR/.hook-ac-sync-dispatcher.lock"
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

SIGNAL_FILE="$STATE_DIR/.ac-sync-pending-$INC_ID"

if [[ -f "$SIGNAL_FILE" ]]; then
  SIGNAL_AGE=$(($(date +%s) - $(stat -f "%m" "$SIGNAL_FILE" 2>/dev/null || echo 0)))
  if (( SIGNAL_AGE < 5 )); then
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
    log "Debounce: newer invocation detected. Exiting."
    exit 0
  fi
fi

rm -f "$SIGNAL_FILE" 2>/dev/null || true

# ============================================================================
# PRECONDITIONS
# ============================================================================

if ! command -v node &>/dev/null; then
  log "Node.js not found. Skipping."
  exit 0
fi

# ============================================================================
# EXTRACT AFFECTED USER STORY IDS
# ============================================================================

# Get all US IDs that have external links from metadata.json
AFFECTED_US_IDS="[]"
if [[ -f "$METADATA_PATH" ]]; then
  # Collect US IDs from all provider external links
  AFFECTED_US_IDS=$(jq -r '
    [
      (.externalLinks.github.issues // {} | keys[]),
      (.externalLinks.jira.userStories // {} | keys[]),
      (.externalLinks.ado.userStories // {} | keys[])
    ] | unique
  ' "$METADATA_PATH" 2>/dev/null) || AFFECTED_US_IDS="[]"
fi

if [[ "$AFFECTED_US_IDS" == "[]" || -z "$AFFECTED_US_IDS" ]]; then
  log "No affected US IDs found. Skipping."
  exit 0
fi

# ============================================================================
# BUILD CONFIG FROM SPECWEAVE CONFIG + METADATA
# ============================================================================

# Find the sync module (compiled output)
SYNC_MODULE="$PROJECT_ROOT/dist/src/core/ac-progress-sync.js"
if [[ ! -f "$SYNC_MODULE" ]]; then
  log "Sync module not found at $SYNC_MODULE. Skipping."
  exit 0
fi

log "Syncing AC progress for increment $INC_ID to enabled providers..."
log "Providers: github=$GH_ENABLED jira=$JIRA_ENABLED ado=$ADO_ENABLED"
log "Affected US IDs: $AFFECTED_US_IDS"

# ============================================================================
# RUN PROVIDER-AGNOSTIC SYNC
# ============================================================================

# Build inline Node.js script that constructs config and calls sync
OUTPUT=$(node --input-type=module -e "
import { readFile } from 'fs/promises';
import { syncACProgressToProviders } from '${SYNC_MODULE}';

const configPath = '${CONFIG_PATH}';
const metadataPath = '${METADATA_PATH}';
const specPath = '${SPEC_PATH}';
const incrementId = '${INC_ID}';
const affectedUSIds = ${AFFECTED_US_IDS};

try {
  const rawConfig = JSON.parse(await readFile(configPath, 'utf-8'));
  const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

  const config = {
    sync: {
      github: { enabled: rawConfig?.sync?.github?.enabled === true },
      jira: { enabled: rawConfig?.sync?.jira?.enabled === true },
      ado: { enabled: rawConfig?.sync?.ado?.enabled === true },
    },
    github: rawConfig?.sync?.github || {},
    jira: rawConfig?.sync?.jira || {},
    ado: rawConfig?.sync?.ado || {},
    externalLinks: metadata?.externalLinks || {},
  };

  const result = await syncACProgressToProviders(
    incrementId, affectedUSIds, specPath, config,
  );

  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('AC sync dispatcher error:', err.message || err);
  process.exit(1);
}
" 2>&1) || true

EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
  log "Sync failed (exit $EXIT_CODE): $OUTPUT"
  exit 0
fi

log "Sync completed: $OUTPUT"
exit 0
