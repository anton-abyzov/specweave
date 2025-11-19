#!/bin/bash
# Mark remaining tasks as DEFERRED in tasks.md

TASKS_FILE="../tasks.md"
BACKUP_FILE="../tasks.md.backup-$(date +%Y%m%d-%H%M%S)"

# Backup first
cp "$TASKS_FILE" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# List of tasks to mark as DEFERRED (T-067 through T-085)
DEFERRED_TASKS=(
  "T-067" "T-068" "T-069" "T-070" "T-071" "T-072"
  "T-073" "T-074" "T-075" "T-076"
  "T-077" "T-078" "T-079"
  "T-080" "T-081" "T-082" "T-083"
  "T-084" "T-085"
)

# Mark each task as DEFERRED
for task_id in "${DEFERRED_TASKS[@]}"; do
  # Find the task header line and add DEFERRED marker
  sed -i.tmp "/^### ${task_id}:/ s/)$/) ⏭️ DEFERRED/" "$TASKS_FILE"

  # Add DEFERRED status block after the task header
  awk -v task="$task_id" '
    /^### '"$task_id"':/ {
      print
      getline
      print
      print ""
      print "**⏭️ DEFERRED TO IMPLEMENTATION**"
      print "- **Status**: DEFERRED - Will be completed during Phase 0/1-4 implementation increments"
      print "- **Reason**: Planning increment complete. Implementation tasks (tests, docs, release notes) should be done alongside actual code implementation (TDD approach)"
      print "- **Follow-up**: Create implementation increments for Phase 0 and Phase 1-4"
      print ""
      next
    }
    { print }
  ' "$TASKS_FILE.tmp" > "$TASKS_FILE.updated"

  mv "$TASKS_FILE.updated" "$TASKS_FILE.tmp"
done

# Move final result
if [ -f "$TASKS_FILE.tmp" ]; then
  mv "$TASKS_FILE.tmp" "$TASKS_FILE"
fi

# Remove any leftover temp files
rm -f "$TASKS_FILE.tmp"

echo "✅ Marked ${#DEFERRED_TASKS[@]} tasks as DEFERRED"
echo "📁 Backup saved: $BACKUP_FILE"
