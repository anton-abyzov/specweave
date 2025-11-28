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

PROCESSOR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../queue" && pwd)/processor.sh"
[[ ! -f "$PROCESSOR" ]] && exit 0

# Launch processor in background (daemon mode)
nohup bash "$PROCESSOR" --daemon > /dev/null 2>&1 &
disown 2>/dev/null
exit 0
