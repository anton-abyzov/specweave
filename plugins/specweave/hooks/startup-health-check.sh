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

PLUGINS_DIR="$HOME/.claude/plugins"
SPECWEAVE_DIR="$PLUGINS_DIR/marketplaces/specweave"
PLUGINS_SUBDIR="$SPECWEAVE_DIR/plugins"
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
# SESSION CLEANUP: Clear stale auto-mode.json (CRITICAL for session-scoped auto)
# Auto mode MUST be session-scoped - if Claude Code closed, auto mode ends.
# ============================================================================

AUTO_MODE_FILE=".specweave/state/auto-mode.json"
if [ -f "$AUTO_MODE_FILE" ]; then
    # Get file modification time (seconds since epoch)
    FILE_MTIME=$(stat -f%m "$AUTO_MODE_FILE" 2>/dev/null || stat -c%Y "$AUTO_MODE_FILE" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    AGE_SECONDS=$((NOW - FILE_MTIME))

    # If auto-mode.json is older than 30 minutes, it's definitely stale
    # (Claude Code session wouldn't have a 30-minute gap without activity)
    MAX_AGE_SECONDS=1800

    if [ "$AGE_SECONDS" -gt "$MAX_AGE_SECONDS" ]; then
        log "STALE SESSION: Removing auto-mode.json (age: ${AGE_SECONDS}s > ${MAX_AGE_SECONDS}s)"
        rm -f "$AUTO_MODE_FILE" 2>/dev/null
        rm -f ".specweave/state/.stop-auto-dedup" 2>/dev/null
        rm -f ".specweave/state/.stop-auto-retry" 2>/dev/null
        log "Cleaned up stale auto-mode session files"
    else
        log "Auto-mode session exists (age: ${AGE_SECONDS}s) - may be valid continuation"
    fi
fi

# Check 1: Is marketplace installed?
if [ ! -d "$SPECWEAVE_DIR" ]; then
    log "WARN: SpecWeave marketplace not found"
    exit 0  # Not an error, just not installed
fi

# Check 2: Is plugins folder present and populated?
if [ ! -d "$PLUGINS_SUBDIR" ]; then
    log "ERROR: plugins/ folder MISSING - triggering auto-repair"

    # Attempt auto-repair
    if command -v claude &> /dev/null; then
        log "Attempting marketplace re-clone..."
        claude plugin marketplace remove specweave 2>/dev/null
        rm -rf "$PLUGINS_DIR/cache/specweave" 2>/dev/null

        if claude plugin marketplace add anton-abyzov/specweave 2>&1 | tee -a "$HEALTH_LOG"; then
            log "SUCCESS: Marketplace re-cloned"

            # Reinstall core plugins silently
            for plugin in sw sw-github sw-testing; do
                claude plugin install "$plugin" 2>/dev/null && log "Installed: $plugin"
            done
        else
            log "FAILED: Could not re-clone marketplace"
        fi
    fi
    exit 0
fi

# Check 3: Is specweave plugin present?
if [ ! -d "$PLUGINS_SUBDIR/specweave" ]; then
    log "ERROR: Core specweave plugin MISSING - incomplete clone detected"

    # Check if this is an iCloud offload issue
    if find "$PLUGINS_DIR" -name "*.icloud" 2>/dev/null | grep -q .; then
        log "WARN: iCloud offloaded files detected - user needs to download from iCloud"
    else
        log "Attempting git re-fetch..."
        cd "$SPECWEAVE_DIR" 2>/dev/null && git fetch --depth 1 origin develop && git reset --hard origin/develop
    fi
    exit 0
fi

# Check 4: Count plugins (should be ~25)
PLUGIN_COUNT=$(ls -d "$PLUGINS_SUBDIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$PLUGIN_COUNT" -lt 10 ]; then
    log "WARN: Only $PLUGIN_COUNT plugins found (expected ~25) - possible incomplete clone"
fi

log "OK: Health check passed ($PLUGIN_COUNT plugins)"
exit 0
