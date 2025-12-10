#!/bin/bash
# increment-root-guard.sh - Block files at increment root (except allowed)
#
# ROOT CAUSE: Agents sometimes create files like COMPLETION_REPORT.md,
# COMPLETION_SUMMARY.md, or other .md files at increment root instead of
# placing them in appropriate subfolders (reports/, scripts/, logs/, etc.)
#
# SOLUTION: Block Write operations to increment root for non-standard files.
# Only allow: metadata.json, spec.md, plan.md, tasks.md
# Everything else MUST go in subfolders: reports/, scripts/, logs/, backups/, docs/
#
# PreToolUse hook for Write command - exit 0 allows, exit 2 blocks
#
# v0.33.0 - Initial implementation based on bug analysis from 2025-12-09

set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Read stdin for tool input
INPUT=$(cat)

# Extract the file_path being written
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')
fi

# If no file_path found, allow (safety)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# === PATTERN DETECTION ===
# Block files at increment root that should be in subfolders

# Pattern: .specweave/increments/####-name/FILE.md (at root, not in subfolder)
# Allowed at root: metadata.json, spec.md, plan.md, tasks.md
if [[ "$FILE_PATH" =~ \.specweave/increments/[0-9]{3,4}E?-[^/]+/([^/]+)$ ]]; then
  FILENAME="${BASH_REMATCH[1]}"

  # Allow standard increment files at root
  if [[ "$FILENAME" =~ ^(metadata\.json|spec\.md|plan\.md|tasks\.md)$ ]]; then
    printf '{"decision":"allow"}'
    exit 0
  fi

  # Block everything else at increment root
  cat << EOF
{
  "decision": "block",
  "reason": "🚫 BLOCKED: File '$FILENAME' should be in a subfolder, not at increment root\n\n⚠️ CLAUDE.md Folder Structure Rule:\n  Inside increment folders - ONLY at root: spec.md, plan.md, tasks.md, metadata.json\n  Everything else → subfolders: reports/, scripts/, logs/, backups/, docs/\n\n📋 CORRECT structure:\n  .specweave/increments/####-name/reports/COMPLETION_REPORT.md ✅\n  .specweave/increments/####-name/reports/COMPLETION_SUMMARY.md ✅\n  .specweave/increments/####-name/scripts/analyze.sh ✅\n\n❌ WRONG structure:\n  .specweave/increments/####-name/COMPLETION_REPORT.md ❌\n  .specweave/increments/####-name/COMPLETION_SUMMARY.md ❌\n\n🔧 To fix: Create file in reports/ subfolder instead.\nUse: Write({ file_path: \".specweave/increments/####-name/reports/$FILENAME\", ... })\n\nSee: CLAUDE.md section 'Folder Structure'"
}
EOF
  exit 2
fi

# Allow all other writes (files in subfolders, or outside increments)
printf '{"decision":"allow"}'
exit 0
