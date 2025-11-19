#!/bin/bash
#
# Pre-commit Console.* Checker
# Prevents committing console.log/error/warn/info/debug in src/ files
#
# Part of: 0046-console-elimination
# Related: CLAUDE.md Rule #7 - "NEVER Use console.* in Production Code"
#

# Get staged TypeScript files in src/
staged_src_files=$(git diff --cached --name-only --diff-filter=ACM | grep '^src/.*\.ts$' || true)

if [ -z "$staged_src_files" ]; then
  # No staged src/ files, nothing to check
  exit 0
fi

# Check for console.* violations in staged files
violations=""
for file in $staged_src_files; do
  # Skip logger.ts itself (it needs console.* for consoleLogger implementation)
  if [[ "$file" == "src/utils/logger.ts" ]]; then
    continue
  fi

  # Check for console.log/error/warn/info/debug
  matches=$(git diff --cached "$file" | grep "^+" | grep -E "console\.(log|error|warn|info|debug)" | grep -v "^+++" || true)

  if [ -n "$matches" ]; then
    if [ -z "$violations" ]; then
      violations="$file"
    else
      violations="$violations
$file"
    fi
  fi
done

if [ -n "$violations" ]; then
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo "🚨  COMMIT BLOCKED: console.* Violation in src/ Files"
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  The following files contain console.* calls:"
  echo ""
  for file in $violations; do
    echo "    ❌ $file"
    # Show the actual violations
    git diff --cached "$file" | grep "^+" | grep -E "console\.(log|error|warn|info|debug)" | grep -v "^+++" | sed 's/^/       /'
  done
  echo ""
  echo "  📋 Use logger abstraction instead:"
  echo "     import { Logger, consoleLogger } from '../../utils/logger.js';"
  echo ""
  echo "  🔧 Example (instance method):"
  echo "     export class MyClass {"
  echo "       private logger: Logger;"
  echo "       constructor(options: { logger?: Logger } = {}) {"
  echo "         this.logger = options.logger ?? consoleLogger;"
  echo "       }"
  echo "       doSomething() {"
  echo "         this.logger.log('Info message');"
  echo "         this.logger.error('Error message', error);"
  echo "       }"
  echo "     }"
  echo ""
  echo "  🔧 Example (static method):"
  echo "     export class MetadataManager {"
  echo "       private static logger: Logger = consoleLogger;"
  echo "       static setLogger(logger: Logger): void { this.logger = logger; }"
  echo "       static someMethod() {"
  echo "         this.logger.warn('Warning message');"
  echo "       }"
  echo "     }"
  echo ""
  echo "  🧪 In tests, use silentLogger:"
  echo "     import { silentLogger } from '../../src/utils/logger.js';"
  echo "     MyClass.setLogger(silentLogger); // Prevents test output pollution"
  echo ""
  echo "  📖 See: CLAUDE.md → Rule #7 'NEVER Use console.* in Production Code'"
  echo "  📖 Migration Guide: .specweave/increments/0046-console-elimination/analysis-report.md"
  echo ""
  echo "  ⚠️  To bypass this check: git commit --no-verify"
  echo "     (NOT recommended - causes test pollution!)"
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

exit 0
