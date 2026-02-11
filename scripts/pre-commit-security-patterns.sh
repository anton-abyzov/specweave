#!/bin/bash
#
# Pre-commit check: Scan staged files for common security anti-patterns
#
# Detects:
#   1. Hardcoded secrets (API keys, tokens, passwords in code)
#   2. eval() usage in JavaScript/TypeScript
#   3. innerHTML assignment without sanitization
#   4. SQL string concatenation (potential injection)
#   5. console.log with sensitive data
#
# Only scans staged .ts, .js, .tsx, .jsx files.
# Grep-based for speed (no AST analysis).
#

# Get staged JS/TS files (Added, Copied, Modified only)
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|tsx|jsx)$' || true)

if [ -z "$staged_files" ]; then
  exit 0
fi

found_issues=0

check_pattern() {
  local label="$1"
  local pattern="$2"
  local hint="$3"
  local matches=""

  for file in $staged_files; do
    # Use staged content (from index), not working tree
    file_matches=$(git show ":$file" 2>/dev/null | grep -nE "$pattern" || true)
    if [ -n "$file_matches" ]; then
      while IFS= read -r line; do
        matches="$matches\n     $file:$line"
      done <<< "$file_matches"
    fi
  done

  if [ -n "$matches" ]; then
    if [ $found_issues -eq 0 ]; then
      echo ""
      echo "🔒 ═══════════════════════════════════════════════════════════════"
      echo "🔒  WARNING: Security Anti-Patterns Detected"
      echo "🔒 ═══════════════════════════════════════════════════════════════"
    fi
    echo ""
    echo "  [$label]"
    echo "  $hint"
    echo -e "$matches"
    found_issues=$((found_issues + 1))
  fi
}

# 1. Hardcoded secrets (API keys, tokens, passwords assigned to string literals)
check_pattern \
  "Hardcoded Secrets" \
  "(api[_-]?key|api[_-]?secret|password|token|secret)\s*[:=]\s*['\"][^'\"]{8,}" \
  "Move secrets to environment variables or .env (never commit credentials)."

# 2. eval() usage
check_pattern \
  "eval() Usage" \
  "\beval\s*\(" \
  "eval() executes arbitrary code. Use safer alternatives (JSON.parse, Function constructor, etc.)."

# 3. innerHTML assignment
check_pattern \
  "innerHTML Assignment" \
  "\.innerHTML\s*=" \
  "innerHTML can lead to XSS. Use textContent, DOM APIs, or a sanitization library."

# 4. SQL string concatenation (potential injection)
check_pattern \
  "SQL String Concatenation" \
  "(SELECT|INSERT|UPDATE|DELETE).*\+.*\\$\{|.*\+.*(SELECT|INSERT|UPDATE|DELETE)" \
  "Use parameterized queries instead of string concatenation to prevent SQL injection."

# 5. console.log with sensitive data
check_pattern \
  "Sensitive Data in Console" \
  "console\.(log|debug|info)\(.*password|console\.(log|debug|info)\(.*token|console\.(log|debug|info)\(.*secret" \
  "Remove console statements that may leak secrets, tokens, or passwords."

if [ $found_issues -gt 0 ]; then
  echo ""
  echo "  ─────────────────────────────────────────────────────────────────"
  echo "  Found $found_issues category(s) of security warnings."
  echo "  Review each finding and fix before committing."
  echo ""
  echo "  If a finding is a false positive, you can bypass with:"
  echo "     git commit --no-verify"
  echo ""
  echo "🔒 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

exit 0
