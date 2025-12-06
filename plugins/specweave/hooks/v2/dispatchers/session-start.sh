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

# === CRITICAL: Guard Verification ===
# Check that essential guards are available to prevent session hangs
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARDS_DIR="$HOOK_DIR/../guards"
BASH_FILE_GUARD="$GUARDS_DIR/bash-file-guard.sh"

if [[ ! -f "$BASH_FILE_GUARD" ]] || [[ ! -x "$BASH_FILE_GUARD" ]]; then
  # Output warning as system message
  echo '{"continue":true,"systemMessage":"⚠️ CRITICAL: bash-file-guard.sh not found or not executable! Session hang protection DISABLED. Run: bash scripts/refresh-marketplace.sh"}'
  # Continue session but warn about missing protection
fi

# Background processor paths (HOOK_DIR already defined above)
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
