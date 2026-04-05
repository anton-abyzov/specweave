#!/bin/sh
# skill-memories.sh — Load skill-specific learnings for DCI blocks
#
# Usage: .specweave/scripts/skill-memories.sh <skill-name>
# Output: Learnings bullet points from the skill's memory file
# Cascade: .specweave/ → .claude/ → ~/.claude/ (first match wins)
# Exit: Always 0 (graceful degradation)
#
# Performance: <10ms. Single awk call on first matching file.

s="${1:?Usage: skill-memories.sh <skill-name>}"
for d in .specweave/skill-memories .claude/skill-memories "$HOME/.claude/skill-memories"; do
  p="$d/$s.md"
  [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break
done 2>/dev/null
exit 0
