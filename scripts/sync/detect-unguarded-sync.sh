#!/bin/bash
# SpecWeave - Unguarded Sync Pattern Detector
#
# Detects dangerous patterns that could lead to infinite hook recursion:
# - External tool sync without SKIP flag checks
# - Living docs sync without guard rails
# - Missing recursion guards in hooks
#
# Usage: bash scripts/detect-unguarded-sync.sh
# Exit code: 0 = safe, 1 = dangerous patterns found

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 SpecWeave Unguarded Sync Pattern Detector"
echo "=============================================="
echo ""

ISSUES_FOUND=0

# Pattern 1: syncToExternalTools() calls without SKIP_EXTERNAL_SYNC check
echo "📋 Checking Pattern 1: Unguarded syncToExternalTools() calls..."
echo ""

EXTERNAL_SYNC_CALLS=$(grep -rn "syncToExternalTools" src/ plugins/ --include="*.ts" --include="*.js" 2>/dev/null || true)

if [ -n "$EXTERNAL_SYNC_CALLS" ]; then
  echo "$EXTERNAL_SYNC_CALLS" | while IFS= read -r line; do
    FILE=$(echo "$line" | cut -d: -f1)
    LINE_NUM=$(echo "$line" | cut -d: -f2)

    # Check if file has SKIP_EXTERNAL_SYNC check before the call
    CONTEXT=$(sed -n "$((LINE_NUM-10)),$((LINE_NUM+2))p" "$FILE" 2>/dev/null || true)

    if ! echo "$CONTEXT" | grep -q "SKIP_EXTERNAL_SYNC"; then
      echo "⚠️  WARNING: Unguarded syncToExternalTools() call"
      echo "   File: $FILE:$LINE_NUM"
      echo "   Context:"
      echo "$CONTEXT" | sed 's/^/      /'
      echo ""
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  done
fi

# Pattern 2: livingDocsSync.syncIncrement() calls without SKIP flag check
echo "📋 Checking Pattern 2: Unguarded livingDocsSync.syncIncrement() calls..."
echo ""

LIVING_DOCS_CALLS=$(grep -rn "livingDocsSync\.syncIncrement\|LivingDocsSync.*syncIncrement" src/ plugins/ --include="*.ts" --include="*.js" 2>/dev/null || true)

if [ -n "$LIVING_DOCS_CALLS" ]; then
  echo "$LIVING_DOCS_CALLS" | while IFS= read -r line; do
    FILE=$(echo "$line" | cut -d: -f1)
    LINE_NUM=$(echo "$line" | cut -d: -f2)

    # Check if file has SKIP_US_SYNC or SKIP_EXTERNAL_SYNC check before the call
    CONTEXT=$(sed -n "$((LINE_NUM-10)),$((LINE_NUM+2))p" "$FILE" 2>/dev/null || true)

    if ! echo "$CONTEXT" | grep -qE "SKIP_US_SYNC|SKIP_EXTERNAL_SYNC"; then
      echo "⚠️  WARNING: Unguarded livingDocsSync.syncIncrement() call"
      echo "   File: $FILE:$LINE_NUM"
      echo "   Context:"
      echo "$CONTEXT" | sed 's/^/      /'
      echo ""
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  done
fi

# Pattern 3: Hooks that don't check recursion guard
echo "📋 Checking Pattern 3: Hooks missing recursion guard check..."
echo ""

for hook in plugins/*/hooks/*.sh; do
  if [ -f "$hook" ]; then
    # Check if hook checks for recursion guard file
    if ! grep -q "RECURSION_GUARD_FILE" "$hook"; then
      echo "⚠️  WARNING: Hook missing recursion guard check"
      echo "   File: $hook"
      echo ""
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  fi
done

# Pattern 4: Hooks that use 'set -e' (dangerous!)
echo "📋 Checking Pattern 4: Hooks using dangerous 'set -e'..."
echo ""

for hook in plugins/*/hooks/*.sh; do
  if [ -f "$hook" ]; then
    # Check if hook uses 'set -e' without 'set +e'
    if grep -q "^set -e" "$hook" && ! grep -q "set +e" "$hook"; then
      echo "⚠️  WARNING: Hook uses 'set -e' without 'set +e'"
      echo "   File: $hook"
      echo "   This can cause Claude Code crashes!"
      echo ""
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  fi
done

# Pattern 5: Missing SKIP flag exports in critical hooks
echo "📋 Checking Pattern 5: Missing SKIP flag exports..."
echo ""

CRITICAL_HOOKS=(
  "plugins/specweave/hooks/post-task-completion.sh"
  "plugins/specweave/hooks/post-increment-completion.sh"
)

for hook in "${CRITICAL_HOOKS[@]}"; do
  if [ -f "$hook" ]; then
    if ! grep -q "SKIP_US_SYNC=true" "$hook"; then
      echo "⚠️  WARNING: Missing SKIP_US_SYNC export"
      echo "   File: $hook"
      echo "   This could lead to unguarded US sync!"
      echo ""
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  fi
done

# Pattern 6: External tool sync in wrong hooks
echo "📋 Checking Pattern 6: External tool sync in wrong hooks..."
echo ""

# post-task-completion should NEVER directly call GitHub/JIRA/ADO sync
if grep -qE "syncToGitHub|syncToJira|syncToADO|gh issue create|gh issue edit" plugins/specweave/hooks/post-task-completion.sh 2>/dev/null; then
  echo "⚠️  WARNING: post-task-completion.sh contains direct external tool sync calls"
  echo "   This should use SKIP_EXTERNAL_SYNC instead!"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Summary
echo "=============================================="
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
  echo "✅ NO DANGEROUS PATTERNS FOUND"
  echo ""
  echo "All sync operations appear to be properly guarded."
  exit 0
else
  echo "❌ FOUND $ISSUES_FOUND DANGEROUS PATTERN(S)"
  echo ""
  echo "⚠️  These patterns could lead to infinite hook recursion!"
  echo ""
  echo "Recommended actions:"
  echo "1. Add SKIP_EXTERNAL_SYNC checks before syncToExternalTools()"
  echo "2. Add SKIP_US_SYNC checks before livingDocsSync.syncIncrement()"
  echo "3. Add recursion guard checks to all hooks"
  echo "4. Replace 'set -e' with 'set +e' in hooks"
  echo "5. Ensure SKIP flags are exported in critical hooks"
  echo ""
  echo "See: .specweave/docs/internal/emergency-procedures/TODOWRITE-CRASH-RECOVERY.md"
  exit 1
fi
