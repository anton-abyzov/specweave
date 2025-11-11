#!/bin/bash

# SpecWeave Plugin Fix Verification Script
# Verifies that all plugin.json files have correct hooks configuration

set -e

echo "🔍 SpecWeave Plugin Configuration Verification"
echo "=============================================="
echo ""

ERRORS=0

echo "📋 Checking plugin.json files..."
echo ""

for plugin_json in plugins/*/.claude-plugin/plugin.json; do
  plugin_name=$(basename $(dirname $(dirname "$plugin_json")))
  echo "Checking: $plugin_name"

  # Check if hooks field exists
  if grep -q '"hooks"' "$plugin_json"; then
    hooks_value=$(grep '"hooks"' "$plugin_json" | sed 's/.*"hooks": *"\([^"]*\)".*/\1/')

    # Check if hooks value starts with ./
    if [[ "$hooks_value" == ./hooks/hooks.json ]]; then
      echo "  ✅ Hooks field correct: $hooks_value"
    else
      echo "  ❌ Hooks field incorrect: $hooks_value (should be ./hooks/hooks.json)"
      ((ERRORS++))
    fi

    # Check if hooks.json file exists
    plugin_dir=$(dirname $(dirname "$plugin_json"))
    if [ -f "$plugin_dir/hooks/hooks.json" ]; then
      echo "  ✅ hooks/hooks.json file exists"

      # Validate JSON
      if node -e "JSON.parse(require('fs').readFileSync('$plugin_dir/hooks/hooks.json', 'utf8'))" 2>/dev/null; then
        echo "  ✅ hooks/hooks.json is valid JSON"
      else
        echo "  ❌ hooks/hooks.json is invalid JSON"
        ((ERRORS++))
      fi
    else
      echo "  ⚠️  hooks/hooks.json not found (plugin may not use hooks)"
    fi
  else
    echo "  ⚠️  No hooks field (plugin may not use hooks)"
  fi

  echo ""
done

echo "=============================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All plugin configurations are correct!"
  echo ""
  echo "Next steps:"
  echo "1. Refresh Claude Code marketplace:"
  echo "   claude plugin marketplace remove specweave"
  echo "   claude plugin marketplace add anton-abyzov/specweave"
  echo ""
  echo "2. Restart Claude Code"
  echo ""
  echo "3. Verify plugins load without errors"
  exit 0
else
  echo "❌ Found $ERRORS error(s) in plugin configuration"
  echo ""
  echo "Please fix the errors above before proceeding."
  exit 1
fi
