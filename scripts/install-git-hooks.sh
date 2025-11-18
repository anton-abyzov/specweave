#!/bin/bash
#
# Install Git Hooks for SpecWeave Development
#
# Usage: bash scripts/install-git-hooks.sh
#
# This script installs the pre-commit hook that verifies:
# - No mass .specweave/ deletion (test cleanup protection)
# - Build succeeds
# - No TypeScript source files in dist/ (TS5055 prevention)
# - Missing .js extensions warning
#

set -e

HOOKS_DIR=".git/hooks"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "📦 Installing SpecWeave Git hooks..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "❌ ERROR: Not in a git repository"
  echo "   Run this script from the project root"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/sh
#
# Pre-commit hook for SpecWeave
# Verifies build health before allowing commit
#
# Related: .specweave/increments/0039/reports/HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md
#

echo "🔍 Running pre-commit checks..."

# 0. Verify local development setup (contributors only)
if [ -f ".specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh" ]; then
  # Only run if this is a contributor setup (not a user project)
  if [ -d "plugins/specweave" ]; then
    echo "📋 Verifying local development setup..."
    if ! bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh > /dev/null 2>&1; then
      echo ""
      echo "⚠️  WARNING: Local development setup verification failed"
      echo "   Run: bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh"
      echo "   See: CLAUDE.md → 'Local Development Setup'"
      echo ""
      echo "   Hooks may not work correctly until setup is fixed."
      echo "   To bypass: git commit --no-verify"
      echo ""
      # Don't fail the commit, just warn (setup might be intentionally different)
      # exit 1
    else
      echo "   ✅ Development setup OK"
    fi
  fi
fi

# 0A. Check for dangerous test patterns
if [ -f "scripts/pre-commit-test-pattern-check.sh" ]; then
  bash scripts/pre-commit-test-pattern-check.sh || exit 1
fi

# 0B. Prevent accidental .specweave/ mass deletion
DELETED_COUNT=$(git status --short | grep "^ D .specweave/" | wc -l | tr -d ' ')
THRESHOLD=50

if [ "$DELETED_COUNT" -gt "$THRESHOLD" ]; then
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo "🚨  ERROR: Mass .specweave/ Deletion Detected!"
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  Attempting to delete $DELETED_COUNT files in .specweave/"
  echo "  Threshold: $THRESHOLD files"
  echo ""
  echo "  This likely indicates:"
  echo "    1. Test cleanup deleted real .specweave/ folder"
  echo "    2. Accidental 'rm -rf .specweave/'"
  echo ""
  echo "  📋 To restore: git restore .specweave/"
  echo "  ⚠️  To bypass: git commit --no-verify"
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

# 1. Check for TypeScript source files in dist/ (TS5055 indicator)
if [ -d "dist/src" ]; then
  ts_files=$(find dist/src -name "*.ts" -not -name "*.d.ts" 2>/dev/null | wc -l)
  if [ "$ts_files" -gt 0 ]; then
    echo "❌ ERROR: TypeScript source files found in dist/"
    echo "   This indicates a polluted dist/ folder (TS5055 error)"
    echo "   Run: npm run clean && npm run build"
    find dist/src -name "*.ts" -not -name "*.d.ts" | head -10
    exit 1
  fi
fi

# 2. Verify build succeeds (if dist/ exists, rebuild should work)
if [ -d "dist" ]; then
  echo "📦 Verifying build..."
  if ! npm run build > /dev/null 2>&1; then
    echo "❌ ERROR: Build failed"
    echo "   Run: npm run rebuild"
    echo "   Then fix any TypeScript errors"
    exit 1
  fi
fi

# 3. Check for missing .js extensions in staged TypeScript files
staged_ts_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^src/.*\.ts$' || true)

if [ -n "$staged_ts_files" ]; then
  missing_ext=0

  for file in $staged_ts_files; do
    # Check for imports without .js extension
    if grep -qE "from ['\"]\.\.?/[^'\"]+['\"]" "$file" | grep -qvE "from ['\"]\.\.?/[^'\"]+\.(js|json)['\"]"; then
      if [ $missing_ext -eq 0 ]; then
        echo "⚠️  Warning: Staged files may have missing .js extensions"
        missing_ext=1
      fi
      echo "   $file"
    fi
  done

  if [ $missing_ext -eq 1 ]; then
    echo ""
    echo "   Run: node scripts/fix-js-extensions.js"
    echo "   Then stage the changes: git add ."
    # Don't fail, just warn (too strict otherwise)
  fi
fi

echo "✅ Pre-commit checks passed"
exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "Installed hooks:"
echo "  - pre-commit: Local development setup verification (symlink check)"
echo "  - pre-commit: Dangerous test pattern detection"
echo "  - pre-commit: Mass .specweave/ deletion protection"
echo "  - pre-commit: Build verification and .js extension check"
echo ""
echo "To skip hook temporarily: git commit --no-verify"
echo ""
echo "💡 Tip: Run the dev setup verification manually:"
echo "   bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh"
