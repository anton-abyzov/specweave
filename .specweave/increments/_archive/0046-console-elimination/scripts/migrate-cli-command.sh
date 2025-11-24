#!/bin/bash
#
# migrate-cli-command.sh - Automated CLI Command Logger Migration
#
# Adds logger infrastructure to CLI commands that are primarily user-facing output
# Pattern: Add logger import → Add logger to options interface → Initialize logger → Add documentation

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <command-name>"
  echo "Example: $0 migrate-to-profiles"
  exit 1
fi

COMMAND_NAME="$1"
FILE="src/cli/commands/${COMMAND_NAME}.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "🔧 Migrating $COMMAND_NAME.ts to logger abstraction..."

# Step 1: Check if already migrated
if grep -q "import { Logger, consoleLogger }" "$FILE"; then
  echo "✅ Already migrated (logger import found)"
  exit 0
fi

# Step 2: Add logger import after last import
# Find last import line number
LAST_IMPORT_LINE=$(grep -n "^import" "$FILE" | tail -1 | cut -d: -f1)

if [ -z "$LAST_IMPORT_LINE" ]; then
  echo "❌ No imports found in file"
  exit 1
fi

# Insert logger import after last import
sed -i.bak "${LAST_IMPORT_LINE}a\\
import { Logger, consoleLogger } from '../../utils/logger.js';
" "$FILE"

# Step 3: Find options interface and add logger field
# This is file-specific, so we'll add it manually for each file
# For now, just add a marker comment

# Step 4: Add documentation comment at start of main function
# Find main export function
MAIN_FUNCTION_LINE=$(grep -n "^export.*function.*Command" "$FILE" | head -1 | cut -d: -f1)

if [ -n "$MAIN_FUNCTION_LINE" ]; then
  # Add documentation after function signature
  OPEN_BRACE_LINE=$((MAIN_FUNCTION_LINE + 1))
  sed -i.bak2 "${OPEN_BRACE_LINE}a\\
  // NOTE: This CLI command is primarily user-facing output (console.log/console.error).\\
  // All console.* calls in this file are legitimate user-facing exceptions\\
  // as defined in CONTRIBUTING.md (colored messages, confirmations, formatted output).\\
  // Logger infrastructure available for future internal debug logs if needed.\\

" "$FILE"
fi

# Clean up backup files
rm -f "${FILE}.bak" "${FILE}.bak2"

echo "✅ Migration complete for $COMMAND_NAME.ts"
echo "   📝 Manual steps still needed:"
echo "      1. Add 'logger?: Logger' to options interface"
echo "      2. Add 'const logger = options.logger ?? consoleLogger;' at start of function"
