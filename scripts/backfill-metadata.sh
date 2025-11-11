#!/bin/bash

# Backfill metadata.json for existing increments
# Creates metadata.json with GitHub issue links for increments that have issues

set -e

echo "🔍 Scanning for increments without metadata.json..."

INCREMENTS_DIR=".specweave/increments"
COUNT_CREATED=0
COUNT_SKIPPED=0
COUNT_NO_ISSUE=0

# Loop through all increment directories
for INCREMENT_DIR in "$INCREMENTS_DIR"/[0-9][0-9][0-9][0-9]-*; do
  if [ ! -d "$INCREMENT_DIR" ]; then
    continue
  fi

  INCREMENT_ID=$(basename "$INCREMENT_DIR")
  METADATA_FILE="$INCREMENT_DIR/metadata.json"

  # Skip if metadata.json already exists
  if [ -f "$METADATA_FILE" ]; then
    echo "  ✓ $INCREMENT_ID - metadata.json exists"
    ((COUNT_SKIPPED++))
    continue
  fi

  echo "  🔍 $INCREMENT_ID - searching for GitHub issue..."

  # Search for GitHub issue matching increment ID
  ISSUE_NUMBER=$(gh issue list --search "$INCREMENT_ID" --json number --jq '.[0].number' 2>/dev/null || echo "")

  if [ -z "$ISSUE_NUMBER" ] || [ "$ISSUE_NUMBER" = "null" ]; then
    echo "  ⚠️  $INCREMENT_ID - no GitHub issue found"
    ((COUNT_NO_ISSUE++))
    continue
  fi

  # Get repository info
  REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
  ISSUE_URL="https://github.com/$REPO/issues/$ISSUE_NUMBER"

  echo "  ✅ $INCREMENT_ID - found issue #$ISSUE_NUMBER"

  # Extract status and type from spec.md if available
  SPEC_FILE="$INCREMENT_DIR/spec.md"
  STATUS="active"
  TYPE="feature"

  if [ -f "$SPEC_FILE" ]; then
    STATUS=$(awk '/^status:/ {print $2; exit}' "$SPEC_FILE" | tr -d ' "' || echo "active")
    TYPE=$(awk '/^type:/ {print $2; exit}' "$SPEC_FILE" | tr -d ' "' || echo "feature")
  fi

  # Create metadata.json
  CURRENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  cat > "$METADATA_FILE" <<EOF
{
  "id": "$INCREMENT_ID",
  "status": "$STATUS",
  "type": "$TYPE",
  "created": "$CURRENT_TIMESTAMP",
  "lastActivity": "$CURRENT_TIMESTAMP",
  "github": {
    "issue": $ISSUE_NUMBER,
    "url": "$ISSUE_URL",
    "synced": "$CURRENT_TIMESTAMP"
  },
  "githubProfile": "specweave-dev"
}
EOF

  echo "  ✅ $INCREMENT_ID - metadata.json created (issue #$ISSUE_NUMBER)"
  ((COUNT_CREATED++))
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 Backfill Summary"
echo "═══════════════════════════════════════════════════════"
echo "  Created: $COUNT_CREATED metadata files"
echo "  Skipped: $COUNT_SKIPPED (already exist)"
echo "  No issue: $COUNT_NO_ISSUE (no GitHub issue found)"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "✅ Backfill complete!"
