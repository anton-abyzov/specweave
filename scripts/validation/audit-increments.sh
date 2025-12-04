#!/bin/bash

# Audit all increments for feature_id compliance

echo "=== INCREMENT AUDIT ==="
echo ""

for metadata in .specweave/increments/*/metadata.json; do
  inc_dir=$(dirname "$metadata")
  inc_id=$(basename "$inc_dir")

  # Skip special folders
  if [[ "$inc_id" == "_archive" || "$inc_id" == "_backlog" || "$inc_id" == "_working" ]]; then
    continue
  fi

  # Extract feature_id
  if [ -f "$metadata" ]; then
    feature_id=$(jq -r '.feature_id // "NONE"' "$metadata" 2>/dev/null)
    echo "$inc_id | feature_id: $feature_id"
  else
    echo "$inc_id | ERROR: No metadata.json"
  fi
done | sort

echo ""
echo "=== USER STORY VIOLATIONS CHECK ==="
echo ""

# Check for forbidden increment references in user stories
violations=0

for us_file in .specweave/docs/internal/specs/*/*/us-*.md; do
  if [ ! -f "$us_file" ]; then
    continue
  fi

  # Check for 'increments:' field in frontmatter
  if grep -q "^increments:" "$us_file"; then
    echo "❌ VIOLATION: $us_file contains 'increments:' field"
    violations=$((violations + 1))
  fi

  # Check for increment ID patterns (0XXX-)
  if grep -E "0[0-9]{3}-[a-z0-9-]+" "$us_file" | grep -v "# " | grep -v "^---" > /dev/null; then
    echo "⚠️  WARNING: $us_file may contain increment references"
  fi
done

if [ $violations -eq 0 ]; then
  echo "✅ No user story violations found"
else
  echo ""
  echo "❌ Found $violations violation(s) - MUST FIX!"
  exit 1
fi
