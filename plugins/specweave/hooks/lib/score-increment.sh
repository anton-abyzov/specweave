#!/bin/bash
# score-increment.sh — Score an increment against a text query using keyword overlap.
#
# Usage: score-increment.sh <increment_dir> <query>
# Output: integer 0-100 (higher = better match)
#
# Corpus: increment directory name + metadata title + spec.md overview + task titles

set -e

INCREMENT_DIR="$1"
QUERY="$2"

if [ -z "$INCREMENT_DIR" ] || [ -z "$QUERY" ]; then
    echo "0"
    exit 0
fi

if [ ! -d "$INCREMENT_DIR" ]; then
    echo "0"
    exit 0
fi

# Build corpus from multiple sources
CORPUS=""

# 1. Directory name (e.g. "0257-auto-context-aware-selection" → words)
DIR_NAME=$(basename "$INCREMENT_DIR")
CORPUS="$CORPUS ${DIR_NAME//-/ }"

# 2. Title from metadata.json
META_FILE="$INCREMENT_DIR/metadata.json"
if [ -f "$META_FILE" ]; then
    TITLE=$(jq -r '.title // .name // ""' "$META_FILE" 2>/dev/null || echo "")
    CORPUS="$CORPUS $TITLE"
fi

# 3. First 500 chars of spec.md (overview/problem statement)
SPEC_FILE="$INCREMENT_DIR/spec.md"
if [ -f "$SPEC_FILE" ]; then
    OVERVIEW=$(head -c 500 "$SPEC_FILE" 2>/dev/null || echo "")
    CORPUS="$CORPUS $OVERVIEW"
fi

# 4. Task titles from tasks.md (lines starting with ### T-)
TASKS_FILE="$INCREMENT_DIR/tasks.md"
if [ -f "$TASKS_FILE" ]; then
    TASK_TITLES=$(grep '^### T-' "$TASKS_FILE" 2>/dev/null | sed 's/^### T-[0-9]*: //' || echo "")
    CORPUS="$CORPUS $TASK_TITLES"
fi

# Normalize corpus: lowercase, non-alphanumeric → space
CORPUS_LC=$(echo "$CORPUS" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' ' ')

# Extract unique query keywords: lowercase, length > 2, skip common stopwords
STOPWORDS="the and for with from that this are was were has have been will not"
KEYWORDS=$(echo "$QUERY" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '\n' | \
    awk 'length > 2' | \
    grep -vxF -e "the" -e "and" -e "for" -e "with" -e "from" -e "that" -e "this" \
              -e "are" -e "was" -e "were" -e "has" -e "have" -e "been" -e "will" \
              -e "not" -e "into" -e "use" -e "its" | \
    sort -u)

if [ -z "$KEYWORDS" ]; then
    echo "0"
    exit 0
fi

# Count matches
TOTAL=0
MATCHED=0
while IFS= read -r keyword; do
    [ -z "$keyword" ] && continue
    TOTAL=$((TOTAL + 1))
    if echo "$CORPUS_LC" | grep -qw "$keyword" 2>/dev/null; then
        MATCHED=$((MATCHED + 1))
    fi
done <<< "$KEYWORDS"

if [ "$TOTAL" -eq 0 ]; then
    echo "0"
    exit 0
fi

# Score = matched_keywords / total_keywords * 100
SCORE=$(( MATCHED * 100 / TOTAL ))
echo "$SCORE"
