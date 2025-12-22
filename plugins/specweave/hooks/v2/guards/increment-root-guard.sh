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

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"decision":"allow"}' && exit 0

# Read stdin for tool input
INPUT=$(cat 2>/dev/null || echo '{}')

# Extract the file_path being written
# Claude Code passes tool input in .tool_input.file_path format
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
else
  # Fallback: try both patterns
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')
fi

# If no file_path found, allow (safety)
if [[ -z "$FILE_PATH" ]]; then
  echo '{"decision":"allow"}'
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

  # Determine the correct subfolder based on file type
  SUGGESTED_SUBFOLDER="reports"
  case "$FILENAME" in
    *.sh|*.bash|*.py|*.js|*.ts)
      SUGGESTED_SUBFOLDER="scripts"
      ;;
    *.log|*.txt)
      SUGGESTED_SUBFOLDER="logs"
      ;;
    *.bak|*.backup|*-backup*)
      SUGGESTED_SUBFOLDER="backups"
      ;;
    COMPLETION*|*REPORT*|*SUMMARY*|*VALIDATION*|*ANALYSIS*)
      SUGGESTED_SUBFOLDER="reports"
      ;;
    README*|CHANGELOG*|NOTES*|*.md)
      SUGGESTED_SUBFOLDER="docs"
      ;;
  esac

  # Extract the increment folder path to build the correct path
  INCREMENT_PATH=$(echo "$FILE_PATH" | grep -oE '\.specweave/increments/[0-9]{3,4}E?-[^/]+')
  CORRECT_PATH="${INCREMENT_PATH}/${SUGGESTED_SUBFOLDER}/${FILENAME}"

  # Block and provide the EXACT correct path to use
  cat << EOF
{
  "decision": "block",
  "reason": "🚫 WRONG PATH - Use this instead:\\n\\n✅ CORRECT: ${CORRECT_PATH}\\n❌ ATTEMPTED: ${FILE_PATH}\\n\\n🔧 IMMEDIATE FIX: Replace your file_path with:\\n   ${CORRECT_PATH}\\n\\nRule: Only spec.md, plan.md, tasks.md, metadata.json allowed at increment root.\\nEverything else → subfolders: reports/, scripts/, logs/, docs/"
}
EOF
  exit 2
fi

# Allow all other writes (files in subfolders, or outside increments)
printf '{"decision":"allow"}'
exit 0
