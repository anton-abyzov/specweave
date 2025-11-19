#!/bin/bash

echo "=== ACTUAL STATE VERIFICATION ==="
echo ""

for dir in .specweave/increments/*/; do
  if [[ ! "$dir" =~ _archive ]] && [[ -f "${dir}spec.md" ]]; then
    increment=$(basename "$dir")
    total_acs=$(grep -E "^- \[[x ]\] AC-" "${dir}spec.md" 2>/dev/null | wc -l | tr -d ' ')
    checked_acs=$(grep -E "^- \[x\] AC-" "${dir}spec.md" 2>/dev/null | wc -l | tr -d ' ')
    unchecked=$((total_acs - checked_acs))

    echo "$increment:"
    echo "  Total ACs: $total_acs"
    echo "  Checked: $checked_acs"
    echo "  Unchecked: $unchecked"

    # Show sample unchecked ACs
    if [ "$unchecked" -gt 0 ]; then
      echo "  Sample unchecked:"
      grep -E "^- \[ \] AC-" "${dir}spec.md" 2>/dev/null | head -3 | sed 's/^/    /'
    fi
    echo ""
  fi
done
