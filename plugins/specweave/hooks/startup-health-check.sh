#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SpecWeave Startup Health Check                                           ║
# ║  Runs on Claude Code startup to detect and auto-fix plugin issues         ║
# ║  This hook runs BEFORE plugin loading, catching issues early              ║
# ╚══════════════════════════════════════════════════════════════════════════╝

# Exit early if not in a SpecWeave project
if [ ! -f ".specweave/config.json" ]; then
    exit 0
fi

HEALTH_LOG="$HOME/.claude/plugins/.health-check.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$HEALTH_LOG"
}

# Rotate log if too large (>100KB)
if [ -f "$HEALTH_LOG" ] && [ $(stat -f%z "$HEALTH_LOG" 2>/dev/null || stat -c%s "$HEALTH_LOG" 2>/dev/null) -gt 102400 ]; then
    mv "$HEALTH_LOG" "${HEALTH_LOG}.old"
fi

log "=== Health check started ==="

# ============================================================================
# SESSION CLEANUP: ALWAYS clear auto-mode.json (CRITICAL for session-scoped auto)
# Auto mode MUST be session-scoped - each new Claude Code session starts FRESH.
# The file is per-project but MUST only affect the session that created it.
# ============================================================================

AUTO_MODE_FILE=".specweave/state/auto-mode.json"
STATE_DIR=".specweave/state"

# ALWAYS clear auto-mode.json on session start
# This ensures auto mode is truly session-scoped:
# - Session A runs /sw:auto → creates auto-mode.json
# - Session A closes → file remains but is now orphaned
# - Session B starts → SessionStart hook clears the file
# - Session B is NOT in auto mode (correct behavior)
if [ -f "$AUTO_MODE_FILE" ]; then
    log "SESSION START: Clearing previous auto-mode.json (session-scoped cleanup)"
    rm -f "$AUTO_MODE_FILE" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-dedup" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-dedup-prev" 2>/dev/null
    rm -f "$STATE_DIR/.stop-auto-turns" 2>/dev/null
    log "Cleared all auto-mode session files - new session starts fresh"
fi

# v1.0.344 (0394): Removed marketplace directory checks (Checks 1-4).
# Plugins are now installed on-demand via `npx vskill install --repo` in user-prompt-submit.sh.
# No local marketplace directory at ~/.claude/plugins/marketplaces/specweave is required.

log "OK: Health check passed (session cleanup complete)"
exit 0
