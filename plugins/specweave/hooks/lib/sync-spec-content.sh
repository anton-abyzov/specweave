#!/bin/bash
#
# Sync Spec Content to External Tools
#
# This script automatically syncs spec CONTENT (title, description, user stories)
# to external tools (GitHub Issues, JIRA Epics, Azure DevOps Features).
#
# CRITICAL: This does NOT sync STATUS - that's managed by external tools.
#
# Sync Direction:
# - Title/Description/User Stories: SpecWeave → External Tool (we update)
# - Status/State: External Tool → SpecWeave (we read)
#
# Usage:
#   sync-spec-content.sh <spec-path>
#

set +e  # EMERGENCY FIX: Changed from set -euo pipefail to prevent Claude Code crashes

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Input validation
if [ $# -lt 1 ]; then
  echo "Usage: $0 <spec-path>" >&2
  exit 1
fi

SPEC_PATH="$1"

# Validate spec file exists
if [ ! -f "$SPEC_PATH" ]; then
  echo "❌ Spec file not found: $SPEC_PATH" >&2
  exit 1
fi

# Check if sync is enabled
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "ℹ️  No config file found, skipping spec content sync" >&2
  exit 0
fi

# Check if sync is enabled in config
SYNC_ENABLED=$(node -p "
  try {
    const config = require('$CONFIG_FILE');
    config.sync?.enabled ?? false;
  } catch {
    false;
  }
" 2>/dev/null || echo "false")

if [ "$SYNC_ENABLED" != "true" ]; then
  echo "ℹ️  Sync disabled in config, skipping spec content sync" >&2
  exit 0
fi

# Check if spec content sync is enabled
SPEC_SYNC_ENABLED=$(node -p "
  try {
    const config = require('$CONFIG_FILE');
    config.sync?.settings?.syncSpecContent ?? true;
  } catch {
    true;
  }
" 2>/dev/null || echo "true")

if [ "$SPEC_SYNC_ENABLED" != "true" ]; then
  echo "ℹ️  Spec content sync disabled in config" >&2
  exit 0
fi

# Get active provider
ACTIVE_PROFILE=$(node -p "
  try {
    const config = require('$CONFIG_FILE');
    config.sync?.activeProfile ?? null;
  } catch {
    null;
  }
" 2>/dev/null || echo "null")

if [ "$ACTIVE_PROFILE" = "null" ]; then
  echo "ℹ️  No active sync profile, skipping spec content sync" >&2
  exit 0
fi

# Get provider from active profile
PROVIDER=$(node -p "
  try {
    const config = require('$CONFIG_FILE');
    config.sync?.profiles?.['"$ACTIVE_PROFILE"']?.provider ?? null;
  } catch {
    null;
  }
" 2>/dev/null || echo "null")

if [ "$PROVIDER" = "null" ]; then
  echo "ℹ️  No provider configured for profile '$ACTIVE_PROFILE'" >&2
  exit 0
fi

# Validate provider
if [[ ! "$PROVIDER" =~ ^(github|jira|ado)$ ]]; then
  echo "❌ Invalid provider: $PROVIDER (must be github, jira, or ado)" >&2
  exit 1
fi

# Check if sync CLI command exists
SYNC_CLI="$PROJECT_ROOT/dist/src/cli/commands/sync-spec-content.js"
if [ ! -f "$SYNC_CLI" ]; then
  echo "ℹ️  Sync CLI not built, skipping spec content sync" >&2
  echo "   Run: npm run build" >&2
  exit 0
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found, cannot sync spec content" >&2
  exit 1
fi

echo ""
echo "🔄 Syncing spec content to $PROVIDER..."
echo "   Spec: $(basename "$SPEC_PATH")"
echo ""

# Run sync
set +e
node "$SYNC_CLI" --spec "$SPEC_PATH" --provider "$PROVIDER"
SYNC_EXIT_CODE=$?
set +e  # EMERGENCY FIX: Changed from set -e to prevent Claude Code crashes

if [ $SYNC_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Spec content synced successfully"
  echo ""
else
  echo ""
  echo "⚠️  Spec content sync failed (exit code: $SYNC_EXIT_CODE)" >&2
  echo "   This is non-blocking. You can sync manually later:" >&2
  echo "   node dist/src/cli/commands/sync-spec-content.js --spec \"$SPEC_PATH\" --provider $PROVIDER" >&2
  echo ""
  # Non-blocking: continue execution even if sync fails
fi

exit 0
