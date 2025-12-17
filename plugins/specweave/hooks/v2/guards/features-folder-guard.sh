#!/bin/bash
# features-folder-guard.sh - Block writes to obsolete _features/ folder
#
# ROOT CAUSE: The _features/ folder is OBSOLETE since v5.0.0. Features should
# live in {project}/FS-XXX/ folders. LLM agents sometimes create files in
# _features/ due to outdated documentation references.
#
# SOLUTION: Block all Write/Edit operations targeting _features/ folder.
# This forces proper project-based feature folder structure.
#
# PreToolUse hook for Write/Edit commands - exit 0 allows, exit 2 blocks
#
# v0.33.0 - Initial implementation based on bug analysis from 2025-12-06

set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Read stdin for tool input
INPUT=$(cat)

# Extract the file_path being written/edited
# Claude Code passes tool input in .tool_input.file_path format
if command -v jq &> /dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')
fi

# If no file_path found, allow (safety)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# === PATTERN DETECTION ===
# Block any write to _features/ folder (obsolete since v5.0.0)

# Pattern: .specweave/docs/internal/specs/_features/
if [[ "$FILE_PATH" =~ \.specweave/docs/internal/specs/_features/ ]]; then
  cat << 'EOF'
{
  "decision": "block",
  "reason": "🚫 BLOCKED: Writing to _features/ folder (OBSOLETE since v5.0.0)\n\n⚠️ The _features/ folder has been deprecated.\nFeatures must now live in project folders: .specweave/docs/internal/specs/{project}/FS-XXX/\n\n📋 CORRECT structure:\n  .specweave/docs/internal/specs/specweave/FS-116/FEATURE.md ✅\n  .specweave/docs/internal/specs/backend/FS-117/us-001.md ✅\n\n❌ OBSOLETE structure:\n  .specweave/docs/internal/specs/_features/FS-116/FEATURE.md ❌\n\n🔧 To fix: Use spec.md `project:` field to determine target folder.\nSee: CLAUDE.md section '2c. spec.md MUST Have project:'"
}
EOF
  exit 2
fi

# Allow all other writes
printf '{"decision":"allow"}'
exit 0
