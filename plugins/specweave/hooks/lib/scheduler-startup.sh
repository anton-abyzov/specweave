#!/bin/bash
# scheduler-startup.sh - Execute due sync jobs on session start
# Called from session-start hook to run overdue scheduled jobs
#
# This implements the "pragmatic hybrid" approach:
# - No background daemon required
# - Sync runs at Claude Code session boundaries
# - Respects permission gates (canUpdateExternalItems, etc.)
set -e

# Skip if hooks disabled
[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

# Exit if no .specweave directory
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# Paths
SCHEDULED_JOBS_FILE="$PROJECT_ROOT/.specweave/state/scheduled-jobs.json"
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
LOG_FILE="$PROJECT_ROOT/.specweave/logs/scheduler.log"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/.specweave/logs" 2>/dev/null || true

# Check if scheduler is enabled
if [[ -f "$CONFIG_FILE" ]]; then
  # Check if sync.orchestration.scheduler.enabled is true
  SCHEDULER_ENABLED=$(node -e "
    try {
      const config = require('$CONFIG_FILE');
      const enabled = config?.sync?.orchestration?.scheduler?.enabled ?? false;
      console.log(enabled ? 'true' : 'false');
    } catch(e) {
      console.log('false');
    }
  " 2>/dev/null || echo "false")

  if [[ "$SCHEDULER_ENABLED" != "true" ]]; then
    exit 0
  fi

  # Check autoSyncOnSessionStart (defaults to true)
  AUTO_SYNC=$(node -e "
    try {
      const config = require('$CONFIG_FILE');
      const auto = config?.sync?.orchestration?.scheduler?.autoSyncOnSessionStart ?? true;
      console.log(auto ? 'true' : 'false');
    } catch(e) {
      console.log('true');
    }
  " 2>/dev/null || echo "true")

  if [[ "$AUTO_SYNC" != "true" ]]; then
    exit 0
  fi
fi

# Check if scheduled jobs file exists
if [[ ! -f "$SCHEDULED_JOBS_FILE" ]]; then
  exit 0
fi

# Use node to check for due jobs (robust JSON parsing)
DUE_JOBS=$(node -e "
  const fs = require('fs');
  try {
    const data = JSON.parse(fs.readFileSync('$SCHEDULED_JOBS_FILE', 'utf-8'));
    const now = Date.now();
    const dueJobs = (data.jobs || []).filter(job => {
      if (!job.schedule.enabled || job.status !== 'idle') return false;
      if (!job.schedule.nextRun) return true;
      return new Date(job.schedule.nextRun).getTime() <= now;
    });
    console.log(JSON.stringify(dueJobs.map(j => j.id)));
  } catch(e) {
    console.log('[]');
  }
" 2>/dev/null || echo "[]")

# Exit if no due jobs
if [[ "$DUE_JOBS" == "[]" ]]; then
  exit 0
fi

# Log due jobs
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "[$TIMESTAMP] Session start - due jobs: $DUE_JOBS" >> "$LOG_FILE" 2>/dev/null || true

# Execute due sync jobs using the TypeScript executor
# Run in background to avoid blocking session start
RESULT=$(node -e "
  const { executeSessionSync } = require('$PROJECT_ROOT/node_modules/specweave/dist/core/scheduler/session-sync-executor.js');
  executeSessionSync('$PROJECT_ROOT', { silent: false })
    .then(r => console.log(r))
    .catch(e => console.log(JSON.stringify({ error: e.message })));
" 2>&1) || RESULT='{"error":"Executor not found"}'

# Log result
echo "[$TIMESTAMP] Execution result: $RESULT" >> "$LOG_FILE" 2>/dev/null || true

# Parse result for system message
EXECUTED_COUNT=$(echo "$RESULT" | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf-8'));
  console.log(data.executedCount || 0);
" 2>/dev/null || echo "0")

SUCCESS_COUNT=$(echo "$RESULT" | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf-8'));
  console.log(data.successCount || 0);
" 2>/dev/null || echo "0")

# Output status message if jobs were executed
if [[ "$EXECUTED_COUNT" != "0" ]]; then
  echo "{\"continue\": true, \"systemMessage\": \"📅 Session sync: $SUCCESS_COUNT/$EXECUTED_COUNT sync jobs executed successfully.\"}"
fi
