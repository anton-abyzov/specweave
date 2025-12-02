#!/bin/bash
# scheduler-startup.sh - Check for due jobs on session start
# Called from session-start hook to initialize scheduler
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

# Check if scheduler is enabled
if [[ -f "$CONFIG_FILE" ]]; then
  # Check if sync.orchestration.scheduler.enabled is true
  # Use node for reliable JSON parsing
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

# Log due jobs (for debugging)
echo "📅 Due sync jobs: $DUE_JOBS" >> "$PROJECT_ROOT/.specweave/logs/scheduler.log" 2>/dev/null || true

# Output status (will be captured by hook system)
echo "{\"continue\": true, \"systemMessage\": \"📅 Scheduled sync jobs ready to run. Use /specweave:sync-now to execute.\"}"
