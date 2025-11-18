#!/usr/bin/env bash

# Post-Increment-Completion Hook
# Runs after an increment is marked as complete
#
# This hook closes GitHub issues automatically when increments complete

set -e

HOOK_NAME="post-increment-completion"
INCREMENT_ID="${1:-}"

# Check if increment ID provided
if [ -z "$INCREMENT_ID" ]; then
  echo "⚠️  $HOOK_NAME: No increment ID provided" >&2
  exit 0
fi

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
INCREMENT_DIR="$PROJECT_ROOT/.specweave/increments/$INCREMENT_ID"

# Check if increment exists
if [ ! -d "$INCREMENT_DIR" ]; then
  echo "⚠️  $HOOK_NAME: Increment $INCREMENT_ID not found" >&2
  exit 0
fi

# Read metadata.json
METADATA_FILE="$INCREMENT_DIR/metadata.json"
if [ ! -f "$METADATA_FILE" ]; then
  echo "⚠️  $HOOK_NAME: No metadata.json found for $INCREMENT_ID" >&2
  exit 0
fi

# Extract GitHub issue number
ISSUE_NUMBER=$(jq -r '.github.issue // empty' "$METADATA_FILE" 2>/dev/null)

if [ -z "$ISSUE_NUMBER" ] || [ "$ISSUE_NUMBER" = "null" ]; then
  # No GitHub issue linked - skip GitHub closure but still update status line
  HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true
  exit 0
fi

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
  echo "⚠️  $HOOK_NAME: GitHub CLI (gh) not found - skipping issue closure" >&2
  exit 0
fi

# Check if issue is already closed
ISSUE_STATE=$(gh issue view "$ISSUE_NUMBER" --json state --jq '.state' 2>/dev/null || echo "")

if [ "$ISSUE_STATE" = "CLOSED" ]; then
  echo "✓ GitHub issue #$ISSUE_NUMBER already closed"
  exit 0
fi

# Close the GitHub issue with completion message
echo "🔗 Closing GitHub issue #$ISSUE_NUMBER for increment $INCREMENT_ID..."

# Create completion comment
COMPLETION_COMMENT="## ✅ Increment Complete

Increment \`$INCREMENT_ID\` has been marked as complete.

**Completion Details:**
- Completed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- All tasks completed
- Tests passed
- Documentation updated

---
🤖 Auto-closed by SpecWeave post-increment-completion hook"

# Close issue with comment
gh issue close "$ISSUE_NUMBER" --comment "$COMPLETION_COMMENT" 2>/dev/null || {
  echo "⚠️  Failed to close issue #$ISSUE_NUMBER" >&2
  exit 0
}

echo "✅ GitHub issue #$ISSUE_NUMBER closed successfully"

# Update status line cache (increment no longer open)
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

exit 0
