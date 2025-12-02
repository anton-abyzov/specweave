#!/bin/bash
# session-start.sh - Launch background processor on session start
# Ultra-fast, non-blocking
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

# Consume stdin
cat > /dev/null

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROCESSOR="$HOOK_DIR/../queue/processor.sh"
SCHEDULER_STARTUP="$HOOK_DIR/../../lib/scheduler-startup.sh"

# Launch queue processor in background (daemon mode)
if [[ -f "$PROCESSOR" ]]; then
  nohup bash "$PROCESSOR" --daemon > /dev/null 2>&1 &
  disown 2>/dev/null
fi

# Check for due scheduled jobs (non-blocking)
if [[ -f "$SCHEDULER_STARTUP" ]]; then
  bash "$SCHEDULER_STARTUP" 2>/dev/null || true
fi

exit 0
