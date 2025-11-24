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

# 4. Check for duplicate increments (CRITICAL - prevents data corruption)
if [ -f "scripts/pre-commit-duplicate-check.sh" ]; then
  if ! bash scripts/pre-commit-duplicate-check.sh; then
    echo ""
    echo "❌ Duplicate increment check failed"
    echo "   See error output above for resolution steps"
    exit 1
  fi
fi

# 5. Check for status desyncs (CRITICAL - prevents source-of-truth violations)
# Incident Reference: 2025-11-20 - Silent failure caused increment 0047 desync
if [ -f "scripts/pre-commit-desync-check.sh" ]; then
  if ! bash scripts/pre-commit-desync-check.sh; then
    echo ""
    echo "❌ Status desync check failed"
    echo "   See error output above for resolution steps"
    exit 1
  fi
fi

# 6. Validate plugin directory structure (prevents empty agent/skill directories)
# Incident Reference: 2025-11-20 - Empty agent directory caused "Agent type not found" error
if [ -f "scripts/validate-plugin-directories.sh" ]; then
  if ! bash scripts/validate-plugin-directories.sh; then
    echo ""
    echo "❌ Plugin directory validation failed"
    echo "   Empty or invalid agent/skill directories detected"
    echo "   See: CLAUDE.md → 'Skills vs Agents: Understanding the Distinction'"
    exit 1
  fi
fi

# 7. Check for fs-extra imports (enforce native fs migration)
# Incident Reference: 2025-11-20 - fs-extra dependency caused hook failures
if [ -f "scripts/pre-commit-fs-extra-check.sh" ]; then
  if ! bash scripts/pre-commit-fs-extra-check.sh; then
    exit 1
  fi
fi

# 8. Validate YAML frontmatter in spec.md files (prevent malformed YAML)
# Incident Reference: Test case in tests/integration/commands/plan-command.integration.test.ts:626
if [ -f "scripts/pre-commit-yaml-validation.sh" ]; then
  if ! bash scripts/pre-commit-yaml-validation.sh; then
    exit 1
  fi
fi

# 9. Enforce ADR-0061: No increment-to-increment references (prevent circular dependencies)
# Incident Reference: 2025-11-22 - Spec-detector returned 0 specs, GitHub hooks failed
if [ -f "scripts/pre-commit-no-increment-refs.sh" ]; then
  if ! bash scripts/pre-commit-no-increment-refs.sh; then
    echo ""
    echo "❌ Increment reference check failed"
    echo "   See: ADR-0061, CLAUDE.md Section 10a"
    exit 1
  fi
fi

# 10. Validate GitHub issue title format (prevent deprecated SP- prefix)
# Incident Reference: 2025-11-22 - 8 issues created with [SP-US-XXX] format (deprecated)
if [ -f "scripts/pre-commit-hooks/validate-github-issue-format.sh" ]; then
  if ! bash scripts/pre-commit-hooks/validate-github-issue-format.sh; then
    echo ""
    echo "❌ GitHub issue format check failed"
    echo "   See: CLAUDE.md Section 10, ADR-0032"
    exit 1
  fi
fi

# 11. Validate hook variable initialization order (CRITICAL - prevents recursion guard bypass)
# Incident Reference: 2025-11-24 - PROJECT_ROOT order bug caused 3x hook fires and crashes
# See: .specweave/increments/0051-*/reports/PROJECT-ROOT-ORDER-BUG-2025-11-24.md
# See: ADR-0073, CLAUDE.md Section 9a (Hook Variable Initialization Order v0.26.1)
if [ -f "scripts/validate-hook-variable-order.sh" ]; then
  if ! bash scripts/validate-hook-variable-order.sh > /dev/null 2>&1; then
    echo ""
    echo "❌ Hook variable order validation failed"
    echo "   Run: bash scripts/validate-hook-variable-order.sh"
    echo "   See: CLAUDE.md Section 9a (Hook Variable Initialization Order)"
    exit 1
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
echo "  - pre-commit: Duplicate increment detection (CRITICAL)"
echo "  - pre-commit: Status line desync detection (CRITICAL)"
echo "  - pre-commit: Plugin directory validation (prevents empty agent/skill dirs)"
echo "  - pre-commit: fs-extra import detection (enforces native fs migration)"
echo "  - pre-commit: YAML frontmatter validation (prevents malformed spec.md)"
echo "  - pre-commit: No increment references (prevents circular dependencies - ADR-0061)"
echo "  - pre-commit: GitHub issue format validation (blocks deprecated SP- prefix - ADR-0032)"
echo "  - pre-commit: Hook variable initialization order (CRITICAL - prevents recursion guard bypass)"
echo ""
echo "To skip hook temporarily: git commit --no-verify"
echo ""
echo "💡 Tip: Run the dev setup verification manually:"
echo "   bash .specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh"
