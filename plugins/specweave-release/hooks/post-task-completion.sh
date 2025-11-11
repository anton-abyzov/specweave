#!/bin/bash
# Post-Increment-Completion Hook - DORA Metrics Tracking
#
# Fires after: /specweave:done completes
# Purpose: Automatically track DORA metrics and update living docs dashboard
#
# Integration: plugins/specweave-release/hooks/hooks.json

set -euo pipefail

# Constants
SPECWEAVE_ROOT="${SPECWEAVE_ROOT:-$(pwd)}"
METRICS_DIR="${SPECWEAVE_ROOT}/.specweave/metrics"
HISTORY_FILE="${METRICS_DIR}/dora-history.jsonl"
DASHBOARD_FILE="${SPECWEAVE_ROOT}/.specweave/docs/internal/delivery/dora-dashboard.md"
DORA_CALCULATOR="${SPECWEAVE_ROOT}/dist/metrics/dora-calculator.js"
LATEST_FILE="${METRICS_DIR}/dora-latest.json"

# Logging
LOG_FILE="${SPECWEAVE_ROOT}/.specweave/logs/dora-tracking.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "🎯 Post-Increment-Completion Hook Triggered"

# Check if DORA calculator exists
if [[ ! -f "$DORA_CALCULATOR" ]]; then
  log "⚠️  DORA calculator not found at $DORA_CALCULATOR"
  log "   Run: npm run build"
  exit 0  # Non-blocking
fi

# Check if GitHub token is available
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  log "⚠️  GITHUB_TOKEN not set. DORA metrics require GitHub API access."
  log "   Set GITHUB_TOKEN in environment or .env file"
  exit 0  # Non-blocking
fi

# Step 1: Calculate DORA metrics
log "📊 Calculating DORA metrics..."
if ! node "$DORA_CALCULATOR"; then
  log "❌ Failed to calculate DORA metrics"
  exit 0  # Non-blocking
fi

# Step 2: Append to history (JSONL format)
log "💾 Appending metrics to history..."
mkdir -p "$METRICS_DIR"

if [[ -f "$LATEST_FILE" ]]; then
  cat "$LATEST_FILE" >> "$HISTORY_FILE"
  log "   ✓ Appended to $HISTORY_FILE"
else
  log "⚠️  Latest metrics file not found: $LATEST_FILE"
fi

# Step 3: Update living docs dashboard
log "📝 Updating DORA dashboard..."
DASHBOARD_GENERATOR="${SPECWEAVE_ROOT}/dist/metrics/dashboard-generator.js"

if [[ -f "$DASHBOARD_GENERATOR" ]]; then
  if node "$DASHBOARD_GENERATOR"; then
    log "   ✓ Dashboard updated: $DASHBOARD_FILE"
  else
    log "⚠️  Failed to update dashboard"
  fi
else
  log "⚠️  Dashboard generator not found: $DASHBOARD_GENERATOR"
  log "   Manual dashboard update required"
fi

# Step 4: Check for degradation (optional)
log "🔍 Checking for metric degradation..."

# Calculate 30-day average and compare with current
# (This would be implemented in a TypeScript utility)
# For now, we'll just log a reminder
log "   ℹ️  Degradation detection: Manual review recommended"
log "   See: $DASHBOARD_FILE for trends"

# Step 5: Update main DORA metrics doc
DORA_METRICS_DOC="${SPECWEAVE_ROOT}/.specweave/docs/internal/delivery/dora-metrics.md"
if [[ -f "$DORA_METRICS_DOC" && -f "$LATEST_FILE" ]]; then
  log "📄 Updating dora-metrics.md with latest values..."

  # Extract current values from latest metrics
  # (This is a simplified version - production would use jq for proper parsing)
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M UTC')

  # Update "Last Calculated" timestamp
  if command -v sed &> /dev/null; then
    sed -i.bak "s/Last Calculated: .*/Last Calculated: $TIMESTAMP/" "$DORA_METRICS_DOC" 2>/dev/null || true
    rm -f "${DORA_METRICS_DOC}.bak" 2>/dev/null || true
    log "   ✓ Updated timestamp in dora-metrics.md"
  fi
fi

log "✅ DORA metrics tracking complete!"
log ""
log "📊 Next steps:"
log "   1. Review dashboard: $DASHBOARD_FILE"
log "   2. Check trends: Are metrics improving?"
log "   3. Take action: Address any degradation"
log ""

exit 0
