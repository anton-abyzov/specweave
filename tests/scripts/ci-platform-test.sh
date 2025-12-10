#!/usr/bin/env bash
#
# CI Platform Test Helper
#
# Validates platform-specific utilities work correctly
# Called by GitHub Actions CI matrix
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Platform Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Detect platform
PLATFORM="$(uname -s)"
echo "🖥️  Platform: $PLATFORM"

# Test 1: Platform detection
echo ""
echo "Test 1: Platform Detection"
node -e "
  const { PlatformUtils } = require('./dist/src/utils/platform-utils.js');
  const platform = PlatformUtils.detectPlatform();
  console.log('  ✅ Detected platform:', platform);
  if (!platform) {
    console.error('  ❌ Platform detection failed');
    process.exit(1);
  }
"

# Test 2: Process existence check
echo ""
echo "Test 2: Process Existence Check"
node -e "
  const { PlatformUtils } = require('./dist/src/utils/platform-utils.js');
  const exists = PlatformUtils.checkProcessExists(process.pid);
  console.log('  ✅ Current process exists:', exists);
  if (!exists) {
    console.error('  ❌ Failed to detect current process');
    process.exit(1);
  }
"

# Test 3: File timestamp extraction (Unix only)
if [[ "$PLATFORM" != "MINGW"* && "$PLATFORM" != "MSYS"* ]]; then
  echo ""
  echo "Test 3: File Timestamp Extraction"
  TEST_FILE="/tmp/platform-test-$$.txt"
  echo "test" > "$TEST_FILE"

  node -e "
    const { PlatformUtils } = require('./dist/src/utils/platform-utils.js');
    const mtime = PlatformUtils.getFileMtime('$TEST_FILE');
    console.log('  ✅ File mtime:', mtime);
    if (!mtime || mtime <= 0) {
      console.error('  ❌ Failed to extract file timestamp');
      process.exit(1);
    }
  "

  rm -f "$TEST_FILE"
else
  echo ""
  echo "Test 3: Skipped (Windows platform)"
fi

# Test 4: Platform-specific commands
echo ""
echo "Test 4: Platform-Specific Commands"

case "$PLATFORM" in
  Darwin)
    echo "  Testing macOS commands..."
    # Test stat command
    stat -f %m "$PROJECT_ROOT/package.json" > /dev/null
    echo "  ✅ stat -f %m works"

    # Test kill command
    kill -0 $$ 2>/dev/null
    echo "  ✅ kill -0 works"
    ;;

  Linux)
    echo "  Testing Linux commands..."
    # Test stat command
    stat -c %Y "$PROJECT_ROOT/package.json" > /dev/null
    echo "  ✅ stat -c %Y works"

    # Test kill command
    kill -0 $$ 2>/dev/null
    echo "  ✅ kill -0 works"
    ;;

  MINGW*|MSYS*)
    echo "  Testing Windows commands..."
    # Test tasklist command
    tasklist /FI "PID eq $$" > /dev/null 2>&1 || true
    echo "  ✅ tasklist works"
    ;;

  *)
    echo "  ⚠️  Unknown platform: $PLATFORM"
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All platform tests passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
