#!/bin/bash
#
# Scan tasks.md to find incomplete tasks
#

TASKS_FILE=".specweave/increments/0039-ultra-smart-next-command/tasks.md"

echo "📊 Scanning increment 0039 tasks..."
echo ""

# Count total tasks
TOTAL=$(grep -c "^#### T-" "$TASKS_FILE")
echo "Total tasks: $TOTAL"

# Count completed tasks
COMPLETED=$(grep -c "^#### T-.*✅ \[COMPLETED\]" "$TASKS_FILE")
echo "Completed: $COMPLETED"

# Calculate remaining
REMAINING=$((TOTAL - COMPLETED))
echo "Remaining: $REMAINING"
echo ""

# Show completion percentage
PERCENT=$((COMPLETED * 100 / TOTAL))
echo "Progress: $PERCENT%"
echo ""

# List next 5 incomplete tasks
echo "Next incomplete tasks:"
grep "^#### T-" "$TASKS_FILE" | grep -v "✅ \[COMPLETED\]" | head -5
