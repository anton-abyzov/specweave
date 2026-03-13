#!/bin/sh
#
# Pre-commit check: Prevent process.cwd() + .specweave/ path regression
#
# Root cause: In umbrella repos, process.cwd() may resolve to a child repo
# directory, causing .specweave/ reads/writes to go to the wrong location.
#
# Fix: Use resolveEffectiveRoot() from src/utils/find-project-root.ts
#
# Only checks ADDED lines in staged TypeScript files (not existing violations).
# Run: bash scripts/pre-commit-umbrella-path-check.sh
#

# Look only at added lines in the staged diff for .ts files
added_violations=$(git diff --cached -U0 -- 'src/**/*.ts' '*.ts' \
  | grep '^+' \
  | grep -v '^+++' \
  | grep 'process\.cwd()' \
  | grep '\.specweave' \
  || true)

if [ -n "$added_violations" ]; then
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo "🚨  ERROR: Unsafe process.cwd() + .specweave/ path detected!"
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  echo "  New line(s) constructing .specweave/ paths via process.cwd():"
  echo ""
  echo "$added_violations" | sed 's/^/    /'
  echo ""
  echo "  Use resolveEffectiveRoot() instead:"
  echo ""
  echo "    import { resolveEffectiveRoot } from '../utils/find-project-root.js';"
  echo "    path.join(resolveEffectiveRoot(), '.specweave', ...)"
  echo ""
  echo "  Reason: In umbrella repos, process.cwd() may point to a child repo,"
  echo "  causing data to be written to the wrong .specweave/ directory."
  echo "  See: ADR for umbrella path resolution."
  echo ""
  echo "  To bypass: git commit --no-verify"
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

exit 0
