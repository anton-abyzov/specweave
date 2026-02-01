#!/usr/bin/env bash
#
# LSP Warm-up Script (Background Worker)
#
# Spawned by session-start.sh in background to pre-index the workspace
# This prevents the first LSP query from timing out
#
# v1.0.197 - Initial version
#
# How it works:
# 1. Checks if LSP server binary is available
# 2. Starts the language server in background
# 3. Sends initialize + workspace/symbol to trigger indexing
# 4. Writes status to .specweave/state/lsp-warmup.json
# 5. Keeps server running for subsequent queries (daemon mode)
#
# This script is POSIX-compatible (works on bash 3.2+, Linux, macOS, Git Bash)

set +e  # CRITICAL: Never use set -e in background workers

PROJECT_ROOT="$1"
MODE="${2:-background}"  # "background" (daemon) or "foreground" (one-shot)

# Validate project root
if [ -z "$PROJECT_ROOT" ] || [ ! -d "$PROJECT_ROOT/.specweave" ]; then
  exit 0  # Not a SpecWeave project
fi

STATE_DIR="${PROJECT_ROOT}/.specweave/state"
STATE_FILE="${STATE_DIR}/lsp-warmup.json"
LOG_FILE="${PROJECT_ROOT}/.specweave/logs/lsp-warmup.log"
PID_FILE="${STATE_DIR}/lsp-warmup.pid"

mkdir -p "$STATE_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $1" >> "$LOG_FILE"
}

# Write status to JSON
write_status() {
  local status="$1"
  local message="$2"
  local elapsed="$3"
  cat > "$STATE_FILE" <<EOF
{
  "status": "$status",
  "message": "$message",
  "elapsedMs": $elapsed,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "projectRoot": "$PROJECT_ROOT"
}
EOF
}

log "=== LSP Warm-up started (mode: $MODE) ==="

# Check if already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    log "Warm-up already running (PID: $OLD_PID), skipping"
    write_status "skipped" "Already running" 0
    exit 0
  fi
fi

# Save our PID
echo $$ > "$PID_FILE"

START_TIME=$(date +%s%3N 2>/dev/null || date +%s)

# Detect TypeScript project
detect_typescript() {
  [ -f "$PROJECT_ROOT/tsconfig.json" ] || [ -f "$PROJECT_ROOT/package.json" ]
}

# Check if typescript-language-server is available
has_ts_server() {
  command -v typescript-language-server >/dev/null 2>&1
}

# Find entry files (src/index.ts, src/main.ts, etc.)
find_entry_files() {
  local files=""
  for entry in "src/index.ts" "src/main.ts" "src/app.ts" "index.ts" "main.ts"; do
    if [ -f "$PROJECT_ROOT/$entry" ]; then
      files="$files $entry"
    fi
  done
  echo "$files"
}

# Main warm-up logic
if detect_typescript && has_ts_server; then
  log "TypeScript project detected, starting warm-up..."

  # Use Node.js to call the warmup API if available
  # This is more reliable than trying to speak LSP protocol from bash
  WARMUP_SCRIPT="$PROJECT_ROOT/node_modules/.bin/specweave"

  if [ -x "$WARMUP_SCRIPT" ] || command -v specweave >/dev/null 2>&1; then
    # Use specweave CLI to trigger warmup
    log "Using specweave CLI for warm-up..."

    # Call the warmup command (we'll add this to the CLI)
    cd "$PROJECT_ROOT" || exit 1

    # Run warmup with timeout
    ENTRY_FILES=$(find_entry_files)

    # For now, just trigger a simple workspace symbol query via the CLI
    # This will be enhanced when we add the `specweave lsp warmup` command
    if timeout 60 specweave lsp search "" >/dev/null 2>&1; then
      END_TIME=$(date +%s%3N 2>/dev/null || date +%s)
      ELAPSED=$((END_TIME - START_TIME))
      log "Warm-up completed successfully in ${ELAPSED}ms"
      write_status "ready" "Workspace indexed" "$ELAPSED"
    else
      log "Warm-up via CLI failed or timed out, will index on first query"
      write_status "deferred" "Will index on first query" 0
    fi
  else
    log "specweave CLI not found, warm-up deferred to first query"
    write_status "deferred" "CLI not available" 0
  fi
else
  if ! detect_typescript; then
    log "No TypeScript project detected"
  elif ! has_ts_server; then
    log "typescript-language-server not installed"
  fi
  write_status "skipped" "No TypeScript project or server not installed" 0
fi

# Cleanup PID file if running in foreground mode
if [ "$MODE" = "foreground" ]; then
  rm -f "$PID_FILE"
fi

log "=== LSP Warm-up finished ==="
exit 0
