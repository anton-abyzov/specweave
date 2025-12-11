#!/bin/bash
# cleanup-state.sh - Emergency state cleanup for stuck sessions
#
# Usage: bash cleanup-state.sh [--all]
#
# Cleans:
# - Lock files (.lock, .lock.d, .pid)
# - Dedup cache files
# - Stale event queue files (older than 5 minutes)
#
# With --all:
# - Also cleans circuit breaker state
# - Resets status line cache
#
# IMPORTANT: Run this if Claude Code is stuck or hangs

set -e

PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo "❌ No .specweave directory found. Are you in a SpecWeave project?"
  exit 1
fi

STATE_DIR="$PROJECT_ROOT/.specweave/state"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"

echo "🧹 SpecWeave State Cleanup"
echo "=========================="
echo "Project: $PROJECT_ROOT"
echo ""

# Kill any zombie processor processes
echo "→ Killing zombie processes..."
pkill -f "processor\.sh.*daemon" 2>/dev/null || true
pkill -f "processor\.js.*daemon" 2>/dev/null || true
echo "  ✓ Done"

# Kill heredoc zombie processes (CRITICAL - prevents infinite hangs)
echo "→ Killing heredoc zombies..."
pkill -f "cat.*EOF" 2>/dev/null || true
pkill -f "bash.*heredoc" 2>/dev/null || true
pkill -9 -f "bash.*specweave.*>" 2>/dev/null || true
echo "  ✓ Done"

# Clean lock files
echo "→ Cleaning lock files..."
rm -f "$STATE_DIR"/.processor.pid 2>/dev/null || true
rm -rf "$STATE_DIR"/.processor.lock.d 2>/dev/null || true
rm -rf "$STATE_DIR"/.processor.lock 2>/dev/null || true
echo "  ✓ Done"

# Clean dedup cache
echo "→ Cleaning dedup cache..."
rm -rf "$STATE_DIR"/.dedup-cache/*.lock 2>/dev/null || true
find "$STATE_DIR"/.dedup-cache -type f -mmin +5 -delete 2>/dev/null || true
echo "  ✓ Done"

# Clean stale event queue files
echo "→ Cleaning stale event queue..."
EVENT_QUEUE="$STATE_DIR/event-queue"
if [[ -d "$EVENT_QUEUE" ]]; then
  STALE_COUNT=$(find "$EVENT_QUEUE" -name "*.event" -mmin +5 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$STALE_COUNT" -gt 0 ]]; then
    find "$EVENT_QUEUE" -name "*.event" -mmin +5 -delete 2>/dev/null
    echo "  ✓ Removed $STALE_COUNT stale events"
  else
    echo "  ✓ No stale events"
  fi
else
  echo "  ✓ No event queue"
fi

# Full cleanup with --all flag
if [[ "$1" == "--all" ]]; then
  echo ""
  echo "→ Full cleanup (--all)..."

  # Reset circuit breakers
  echo "  → Resetting circuit breakers..."
  echo "0" > "$STATE_DIR/.hook-circuit-breaker" 2>/dev/null || true
  echo "0" > "$STATE_DIR/.hook-circuit-breaker-pre" 2>/dev/null || true
  echo "  ✓ Done"

  # Reset status line cache
  echo "  → Resetting status line cache..."
  rm -f "$STATE_DIR/status-line.json" 2>/dev/null || true
  echo "  ✓ Done"

  # Clean all US completion state
  echo "  → Cleaning US completion state..."
  rm -f "$STATE_DIR"/.us-completion-* 2>/dev/null || true
  rm -f "$STATE_DIR"/.prev-status-* 2>/dev/null || true
  echo "  ✓ Done"

  # Clean logs (keep last 10 lines for debugging)
  echo "  → Trimming logs..."
  for log in "$LOGS_DIR"/*.log; do
    if [[ -f "$log" ]]; then
      tail -10 "$log" > "$log.tmp" 2>/dev/null && mv "$log.tmp" "$log" || rm -f "$log.tmp"
    fi
  done
  echo "  ✓ Done"
fi

# Check MCP connection issues
echo "→ Checking MCP connection health..."
CLAUDE_DEBUG="$HOME/.claude/debug/latest"
if [[ -f "$CLAUDE_DEBUG" ]]; then
  MCP_DROPS=$(grep -c "WS-IDE connection dropped" "$CLAUDE_DEBUG" 2>/dev/null | head -1 || echo "0")
  MCP_DROPS="${MCP_DROPS//[^0-9]/}"  # Strip non-numeric chars
  MCP_DROPS="${MCP_DROPS:-0}"
  if [[ "$MCP_DROPS" -gt 0 ]]; then
    echo "  ⚠️  Found $MCP_DROPS MCP connection drops in latest session"
    echo ""
    echo "  MCP FIX OPTIONS:"
    echo "  1. In VS Code: Cmd+Shift+P → 'Developer: Restart Extension Host'"
    echo "  2. Close extra files/tabs (reduces diagnostics payload)"
    echo "  3. Run Claude Code in plain terminal instead"
    echo ""
  else
    echo "  ✓ No MCP drops detected"
  fi
else
  echo "  ✓ No debug log to check"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code"
echo "  2. Run /sw:progress to check status"
echo ""
echo "If MCP issues persist:"
echo "  • Update Claude Code VS Code extension"
echo "  • Use terminal mode: cd project && claude"
echo ""
