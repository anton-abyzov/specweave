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

# Validate INC_ID format (defense-in-depth against injection)
if [[ ! "$INC_ID" =~ ^[0-9]{4}[A-Za-z0-9_-]*$ ]]; then
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

# Use shared provider detection (supports PROFILES, LEGACY DIRECT, LEGACY PROVIDER formats)
HANDLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_LIB="$HANDLER_DIR/../lib/check-provider-enabled.sh"
if [[ -f "$SHARED_LIB" ]]; then
  source "$SHARED_LIB"
fi

GH_ENABLED="false"
JIRA_ENABLED="false"
ADO_ENABLED="false"

if type check_provider_enabled &>/dev/null; then
  check_provider_enabled "$CONFIG_PATH" "github" && GH_ENABLED="true"
  check_provider_enabled "$CONFIG_PATH" "jira" && JIRA_ENABLED="true"
  check_provider_enabled "$CONFIG_PATH" "ado" && ADO_ENABLED="true"
else
  # Fallback to legacy jq check if shared lib not available
  GH_ENABLED=$(jq -r '.sync.github.enabled // false' "$CONFIG_PATH" 2>/dev/null)
  JIRA_ENABLED=$(jq -r '.sync.jira.enabled // false' "$CONFIG_PATH" 2>/dev/null)
  ADO_ENABLED=$(jq -r '.sync.ado.enabled // false' "$CONFIG_PATH" 2>/dev/null)
fi

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
    LOCK_AGE=$(($(date +%s) - $(stat -f%m "$LOCK_FILE" 2>/dev/null || stat -c%Y "$LOCK_FILE" 2>/dev/null || echo 0)))
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
  SIGNAL_AGE=$(($(date +%s) - $(stat -f%m "$SIGNAL_FILE" 2>/dev/null || stat -c%Y "$SIGNAL_FILE" 2>/dev/null || echo 0)))
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
# Reads BOTH new format (externalLinks.github.issues) and old format (github.issues[].userStory)
AFFECTED_US_IDS="[]"
if [[ -f "$METADATA_PATH" ]]; then
  AFFECTED_US_IDS=$(jq -r '
    [
      (.externalLinks.github.issues // {} | keys[]),
      (.externalLinks.jira.userStories // {} | keys[]),
      (.externalLinks.ado.userStories // {} | keys[]),
      (.github.issues // [] | .[].userStory // empty)
    ] | flatten | unique
  ' "$METADATA_PATH" 2>/dev/null) || AFFECTED_US_IDS="[]"
fi

if [[ "$AFFECTED_US_IDS" == "[]" || -z "$AFFECTED_US_IDS" ]]; then
  log "No affected US IDs found. Skipping."
  exit 0
fi

# Validate AFFECTED_US_IDS is valid JSON (defense-in-depth against injection)
if ! echo "$AFFECTED_US_IDS" | jq empty 2>/dev/null; then
  log "Invalid US IDs JSON. Skipping."
  exit 0
fi

# ============================================================================
# BUILD CONFIG FROM SPECWEAVE CONFIG + METADATA
# ============================================================================

# Find the sync module (compiled output) — check multiple locations
# Same fallback pattern as universal-auto-create-dispatcher.sh
SYNC_MODULE=""
# Derive package root from script location (handlers/ → v2/ → hooks/ → specweave/ → plugins/ → package root)
PKG_ROOT="$(cd "$HANDLER_DIR/../../../../.." 2>/dev/null && pwd)"
# 0. SPECWEAVE_PKG (set by Claude Code hook infrastructure, most reliable)
if [[ -n "${SPECWEAVE_PKG:-}" ]]; then
  CANDIDATE="${SPECWEAVE_PKG}/dist/src/core/ac-progress-sync.js"
  [[ -f "$CANDIDATE" ]] && SYNC_MODULE="$CANDIDATE"
fi
# 1. Package root (derived from script location — works for both npm and dev)
if [[ -z "$SYNC_MODULE" ]]; then
  CANDIDATE="${PKG_ROOT:-$PROJECT_ROOT}/dist/src/core/ac-progress-sync.js"
  [[ -f "$CANDIDATE" ]] && SYNC_MODULE="$CANDIDATE"
fi
# 2. node_modules/specweave/ (direct npm install)
if [[ -z "$SYNC_MODULE" ]]; then
  CANDIDATE="$PROJECT_ROOT/node_modules/specweave/dist/src/core/ac-progress-sync.js"
  [[ -f "$CANDIDATE" ]] && SYNC_MODULE="$CANDIDATE"
fi
# 3. Legacy: PROJECT_ROOT/dist/ (dev-only, running from source repo)
if [[ -z "$SYNC_MODULE" ]]; then
  CANDIDATE="$PROJECT_ROOT/dist/src/core/ac-progress-sync.js"
  [[ -f "$CANDIDATE" ]] && SYNC_MODULE="$CANDIDATE"
fi

if [[ -z "$SYNC_MODULE" ]]; then
  log "Sync module not found at any known path. Checked: SPECWEAVE_PKG=${SPECWEAVE_PKG:-unset}, PKG_ROOT=${PKG_ROOT:-unset}, node_modules, PROJECT_ROOT/dist. Skipping."
  exit 0
fi
log "Using sync module: $SYNC_MODULE"

log "Syncing AC progress for increment $INC_ID to enabled providers..."
log "Providers: github=$GH_ENABLED jira=$JIRA_ENABLED ado=$ADO_ENABLED"
log "Affected US IDs: $AFFECTED_US_IDS"

# ============================================================================
# RUN PROVIDER-AGNOSTIC SYNC
# ============================================================================

# Build inline Node.js script that constructs config and calls sync
# Pass all values via environment variables to prevent command injection
OUTPUT=$(SW_SYNC_MODULE="$SYNC_MODULE" \
  SW_CONFIG_PATH="$CONFIG_PATH" \
  SW_METADATA_PATH="$METADATA_PATH" \
  SW_SPEC_PATH="$SPEC_PATH" \
  SW_INC_ID="$INC_ID" \
  SW_AFFECTED_US_IDS="$AFFECTED_US_IDS" \
  SW_CLOSE_ALL="${SPECWEAVE_CLOSE_ALL:-0}" \
  node --input-type=module -e "
import { readFile } from 'fs/promises';

const { SW_SYNC_MODULE, SW_CONFIG_PATH, SW_METADATA_PATH,
        SW_SPEC_PATH, SW_INC_ID, SW_AFFECTED_US_IDS, SW_CLOSE_ALL } = process.env;

const mod = await import(SW_SYNC_MODULE);
const affectedUSIds = JSON.parse(SW_AFFECTED_US_IDS);

try {
  const rawConfig = JSON.parse(await readFile(SW_CONFIG_PATH, 'utf-8'));
  const metadata = JSON.parse(await readFile(SW_METADATA_PATH, 'utf-8'));

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

  let result;
  if (SW_CLOSE_ALL === '1' && mod.closeIncrementIssues) {
    // Force-close all external issues for completed increment
    result = await mod.closeIncrementIssues(SW_INC_ID, SW_SPEC_PATH, config);
  } else {
    result = await mod.syncACProgressToProviders(
      SW_INC_ID, affectedUSIds, SW_SPEC_PATH, config,
    );
  }

  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('AC sync dispatcher error:', err.message || err);
  process.exit(1);
}
" 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
  log "Sync failed (exit $EXIT_CODE): $OUTPUT"
  exit 0
fi

log "Sync completed: $OUTPUT"
exit 0
