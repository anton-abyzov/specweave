#!/bin/bash
# bash-file-guard.sh - CRITICAL: Block Bash file creation patterns that cause infinite hangs
#
# ROOT CAUSE: When Claude uses heredoc (cat << EOF ... EOF) to create files and the
# content gets truncated due to token limits, the shell waits FOREVER for the EOF
# terminator that will never come. This causes Claude Code to hang indefinitely
# (2+ hours observed in production crashes).
#
# SOLUTION: Block ALL bash file creation patterns and force use of Write/Edit tools.
# Write/Edit tools are:
# - Atomic (no intermediate states)
# - Token-safe (handled by Claude Code, not shell)
# - Recoverable (no zombie processes)
#
# PreToolUse hook for Bash commands - exit 0 allows, exit 2 blocks
#
# v0.32.1 - Initial implementation based on crash analysis from 2025-12-06

set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Read stdin for tool input
INPUT=$(cat)

# Extract the command being executed
# The Bash tool has a "command" parameter
# Use jq for proper JSON parsing (handles escaped quotes correctly)
if command -v jq &> /dev/null; then
  COMMAND=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null)
else
  # Fallback: simple regex (may fail on complex JSON with escaped quotes)
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')
fi

# If no command found or empty, allow (safety)
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# === PATTERN DETECTION ===
# These patterns WILL cause infinite hangs or truncation issues

BLOCKED=0
PATTERN_NAME=""

# === HEREDOC PATTERNS (MOST DANGEROUS - infinite hang!) ===

# Pattern 1a: Standard heredoc with any delimiter
# Matches: cat << EOF, cat << 'EOF', cat << "EOF", cat <<EOF (no space)
if echo "$COMMAND" | grep -qE "(cat|tee).*<<-?[[:space:]]*['\"]?[A-Za-z]+" 2>/dev/null; then
  BLOCKED=1
  PATTERN_NAME="heredoc (cat << DELIMITER)"
fi

# Pattern 1b: Heredoc with escaped quotes in JSON (\"EOF\")
# JSON escapes double quotes, so << "EOF" becomes << \"EOF\"
if echo "$COMMAND" | grep -qE "(cat|tee).*<<-?[[:space:]]*\\\\\"[A-Za-z]+" 2>/dev/null; then
  BLOCKED=1
  PATTERN_NAME="heredoc with quoted delimiter"
fi

# === CAT STDIN REDIRECT (VERY DANGEROUS!) ===
# Pattern 2: Plain cat with output redirect but no input
# Matches: cat > file.txt (waits forever for stdin!)
# This is just as dangerous as heredoc - shell waits for input
if echo "$COMMAND" | grep -qE "^[[:space:]]*cat[[:space:]]+>[[:space:]]*[^>]" 2>/dev/null; then
  BLOCKED=1
  PATTERN_NAME="cat > file (stdin redirect - waits forever!)"
fi

# === DD COMMAND (EQUALLY DANGEROUS!) ===
# Pattern 2b: dd with stdin or output file
# Matches: dd if=/dev/stdin of=file, dd of=file bs=1024
# dd waits for input EXACTLY like cat > file
if echo "$COMMAND" | grep -qE "^[[:space:]]*dd[[:space:]]" 2>/dev/null; then
  if echo "$COMMAND" | grep -qE "of=" 2>/dev/null; then
    BLOCKED=1
    PATTERN_NAME="dd command (waits for stdin like cat)"
  fi
fi

# === READ COMMAND (WAITS FOR INPUT) ===
# Pattern 2c: read with redirect
# Matches: read VAR > file (waits for input from user/stdin)
if echo "$COMMAND" | grep -qE "^[[:space:]]*read[[:space:]].*>" 2>/dev/null; then
  BLOCKED=1
  PATTERN_NAME="read command with redirect (waits for input)"
fi

# === STREAM REDIRECT EXCEPTION ===
# Allow redirects to /dev/stdout, /dev/stderr, /dev/null (safe stream operations)
if echo "$COMMAND" | grep -qE ">[[:space:]]*/dev/(stdout|stderr|null)" 2>/dev/null; then
  exit 0  # Safe stream redirect, not file creation
fi

# === ECHO/PRINTF PATTERNS ===
# These can cause truncation issues and are bad practice
# NOTE: Match any echo/printf that writes to file (single > not >>)

# Pattern 3: Echo with redirect to file
# Matches: echo anything > file (but not >>)
# Use negative lookahead simulation: check for > but then verify not >>
if echo "$COMMAND" | grep -qE '^[[:space:]]*(echo)[[:space:]]' 2>/dev/null; then
  if echo "$COMMAND" | grep -qE '>[[:space:]]*[^>]' 2>/dev/null; then
    # Check it's not append (>>)
    if ! echo "$COMMAND" | grep -qE '>>' 2>/dev/null; then
      BLOCKED=1
      PATTERN_NAME="echo > file"
    fi
  fi
fi

# Pattern 4: Printf with redirect to file
if echo "$COMMAND" | grep -qE '^[[:space:]]*(printf)[[:space:]]' 2>/dev/null; then
  if echo "$COMMAND" | grep -qE '>[[:space:]]*[^>]' 2>/dev/null; then
    # Check it's not append (>>)
    if ! echo "$COMMAND" | grep -qE '>>' 2>/dev/null; then
      BLOCKED=1
      PATTERN_NAME="printf > file"
    fi
  fi
fi

# Pattern 5: Multi-line string with cat
# Matches: cat > file -e "multi\nline", etc.
if echo "$COMMAND" | grep -qE "cat[[:space:]]+-[a-z]*[[:space:]]+['\"].*\\\\n" 2>/dev/null; then
  BLOCKED=1
  PATTERN_NAME="cat with multi-line string"
fi

# === SAFE EXCEPTIONS ===
# Append operations (>>) are safe - echo/printf complete immediately
if echo "$COMMAND" | grep -qE "(echo|printf)[[:space:]].*>>[[:space:]]*" 2>/dev/null; then
  BLOCKED=0
  PATTERN_NAME=""
fi

# === EXCEPTION: Allow safe bash operations ===
# These are safe because they don't involve file content creation

# Exception 1: Simple redirects from commands (not content creation)
# Safe: curl ... > file, wget ... > file (command output, not content creation)
# These won't hang because the content comes from the command, not heredoc
if echo "$COMMAND" | grep -qE "^(curl|wget|git|npm|node|python|pip)[[:space:]].*>" 2>/dev/null; then
  # These are downloading/generating content from commands, not creating from heredoc
  # Only block if also contains heredoc/echo patterns
  if [[ "$PATTERN_NAME" != "heredoc"* ]] && [[ "$PATTERN_NAME" != "echo"* ]] && [[ "$PATTERN_NAME" != "printf"* ]]; then
    exit 0  # Allow
  fi
fi

# === BLOCK DANGEROUS PATTERNS ===
if [[ $BLOCKED -eq 1 ]]; then
  echo ""
  echo "=============================================================================="
  echo "  🛑 BLOCKED: Bash file creation detected (Infinite Hang Prevention)"
  echo "=============================================================================="
  echo ""
  echo "Pattern detected: $PATTERN_NAME"
  echo ""
  echo "WHY THIS IS BLOCKED:"
  echo "  When using heredoc (cat << EOF) or echo/printf redirects, if the content"
  echo "  is truncated due to token limits, the shell waits FOREVER for input that"
  echo "  will never come. This causes Claude Code to hang for hours with no recovery."
  echo ""
  echo "  Observed crash: 2+ hour session hang from truncated heredoc (2025-12-06)"
  echo ""
  echo "SAFE ALTERNATIVES:"
  echo "  ┌─────────────────────────────────────────────────────────────────────┐"
  echo "  │ Instead of:          Use:                                           │"
  echo "  ├─────────────────────────────────────────────────────────────────────┤"
  echo "  │ cat > file << EOF    Write tool: Write(file_path, content)          │"
  echo "  │ echo \"...\" > file    Write tool: Write(file_path, content)          │"
  echo "  │ printf ... > file    Write tool: Write(file_path, content)          │"
  echo "  │ Modify existing      Edit tool: Edit(file_path, old, new)           │"
  echo "  │ Append to file       Read + Write tools                             │"
  echo "  └─────────────────────────────────────────────────────────────────────┘"
  echo ""
  echo "WHAT IS ALLOWED:"
  echo "  - mkdir -p /path/to/dir    (directory creation)"
  echo "  - git commit, git push     (version control)"
  echo "  - npm install, npm run     (package management)"
  echo "  - curl URL > file          (downloading, not content creation)"
  echo "  - rm, mv, cp               (file operations)"
  echo ""
  echo "=============================================================================="

  exit 2  # Block the tool call
fi

# All other bash commands are allowed
exit 0
