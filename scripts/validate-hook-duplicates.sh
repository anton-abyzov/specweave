#!/bin/bash

# Validate Hook Duplicates
# Checks for duplicate hook registrations across plugin.json and hooks.json files
#
# Exit codes:
#   0 - No duplicates found
#   1 - Duplicates detected

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Hook Duplicate Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DUPLICATES_FOUND=0
PLUGINS_CHECKED=0

# Check each plugin directory
for plugin_dir in plugins/*/; do
  plugin_name=$(basename "$plugin_dir")
  PLUGINS_CHECKED=$((PLUGINS_CHECKED + 1))

  plugin_json="$plugin_dir.claude-plugin/plugin.json"
  hooks_json="$plugin_dir/hooks/hooks.json"

  # Skip if neither file exists
  if [[ ! -f "$plugin_json" ]] && [[ ! -f "$hooks_json" ]]; then
    continue
  fi

  # Skip if only one file exists (no possibility of duplicates)
  if [[ ! -f "$plugin_json" ]] || [[ ! -f "$hooks_json" ]]; then
    continue
  fi

  echo "🔍 Checking plugin: $plugin_name"

  # Extract hook event types and matchers from both files
  if command -v jq >/dev/null 2>&1; then
    # Get all hook registrations from plugin.json (include matcher_content for uniqueness)
    plugin_hooks=$(jq -r '.hooks // {} | to_entries[] | .key as $event | .value[] | "\($event):\(.matcher // "no-matcher"):\(.matcher_content // "no-content")"' "$plugin_json" 2>/dev/null || true)

    # Get all hook registrations from hooks.json (include matcher_content for uniqueness)
    hooks_hooks=$(jq -r '.hooks // {} | to_entries[] | .key as $event | .value[] | "\($event):\(.matcher // "no-matcher"):\(.matcher_content // "no-content")"' "$hooks_json" 2>/dev/null || true)

    # Find duplicates
    if [[ -n "$plugin_hooks" ]] && [[ -n "$hooks_hooks" ]]; then
      duplicates=$(comm -12 <(echo "$plugin_hooks" | sort) <(echo "$hooks_hooks" | sort))

      if [[ -n "$duplicates" ]]; then
        echo "  ❌ DUPLICATE REGISTRATIONS FOUND:"
        while IFS= read -r dup; do
          event=$(echo "$dup" | cut -d: -f1)
          matcher=$(echo "$dup" | cut -d: -f2)
          matcher_content=$(echo "$dup" | cut -d: -f3)
          if [[ "$matcher" == "no-matcher" ]]; then
            echo "     - Event: $event"
          elif [[ "$matcher_content" == "no-content" ]]; then
            echo "     - Event: $event, Matcher: $matcher"
          else
            echo "     - Event: $event, Matcher: $matcher, Content: $matcher_content"
          fi
        done <<< "$duplicates"
        echo "     Location 1: $plugin_json"
        echo "     Location 2: $hooks_json"
        echo ""
        DUPLICATES_FOUND=$((DUPLICATES_FOUND + 1))
      else
        echo "  ✅ No duplicates"
      fi
    fi
  else
    # Fallback: Simple pattern matching without jq
    echo "  ⚠️  jq not found, using fallback validation (less accurate)"

    # Extract PostToolUse matchers from both files
    plugin_matchers=$(grep -o '"matcher":\s*"[^"]*"' "$plugin_json" 2>/dev/null | cut -d'"' -f4 | sort || true)
    hooks_matchers=$(grep -o '"matcher":\s*"[^"]*"' "$hooks_json" 2>/dev/null | cut -d'"' -f4 | sort || true)

    if [[ -n "$plugin_matchers" ]] && [[ -n "$hooks_matchers" ]]; then
      duplicates=$(comm -12 <(echo "$plugin_matchers") <(echo "$hooks_matchers"))
      if [[ -n "$duplicates" ]]; then
        echo "  ❌ POTENTIAL DUPLICATES (matchers found in both files):"
        echo "$duplicates" | sed 's/^/     - /'
        echo "     Location 1: $plugin_json"
        echo "     Location 2: $hooks_json"
        echo ""
        DUPLICATES_FOUND=$((DUPLICATES_FOUND + 1))
      else
        echo "  ✅ No obvious duplicates"
      fi
    fi
  fi

  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Plugins checked: $PLUGINS_CHECKED"
echo "  Duplicates found: $DUPLICATES_FOUND"
echo ""

if [[ $DUPLICATES_FOUND -gt 0 ]]; then
  echo "❌ VALIDATION FAILED: Duplicate hook registrations detected!"
  echo ""
  echo "Fix: Remove duplicate registrations from one of the locations."
  echo "     Prefer keeping hooks in plugin.json for consistency."
  exit 1
else
  echo "✅ VALIDATION PASSED: No duplicate hook registrations found!"
  exit 0
fi
