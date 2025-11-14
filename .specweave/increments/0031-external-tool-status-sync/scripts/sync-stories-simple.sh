#!/bin/bash

# Simple User Story to GitHub sync
# Creates one GitHub issue per User Story

set -euo pipefail

SPECS_DIR=".specweave/docs/internal/specs"
GITHUB_REPO_URL="https://github.com/anton-abyzov/specweave"

echo "🚀 Starting User Story to GitHub sync..."
echo "========================================="

created=0
total=0

# Process each project
for project_dir in "$SPECS_DIR"/*; do
    [[ ! -d "$project_dir" ]] && continue
    project=$(basename "$project_dir")

    # Skip special folders
    [[ "$project" == "_epics" ]] && continue
    [[ "$project" == "_features" ]] && continue

    echo "📁 Project: $project"

    # Process each feature
    for feature_dir in "$project_dir"/FS-*; do
        [[ ! -d "$feature_dir" ]] && continue
        feature=$(basename "$feature_dir")

        # Process each user story
        for story_file in "$feature_dir"/us-*.md; do
            [[ ! -f "$story_file" ]] && continue
            ((total++))

            # Extract metadata
            filename=$(basename "$story_file")
            story_id=$(echo "$filename" | grep -oE "us-[0-9]+" | tr '[:lower:]' '[:upper:]')
            title=$(grep "^title:" "$story_file" 2>/dev/null | sed 's/title: *//' | sed 's/"//g' || echo "$story_id")
            status=$(grep "^status:" "$story_file" 2>/dev/null | sed 's/status: *//' || echo "pending")

            echo "  📝 $story_id: $title"

            # Extract short feature name (FS-YY-MM-DD) from feature folder
            short_feature=$(echo "$feature" | grep -oE "^FS-[0-9]{2}-[0-9]{2}-[0-9]{2}" || echo "$feature")

            # Check if issue already exists (must match both story ID and feature)
            issue_title="[$short_feature $story_id] $title"
            existing=$(gh issue list --state all --json title | jq -r --arg title "$issue_title" '.[] | select(.title == $title) | .title' | head -1)

            if [[ -n "$existing" ]]; then
                # Issue exists - check if we need to update status
                issue_num=$(gh issue list --state all --json number,title,state | jq -r --arg title "$issue_title" '.[] | select(.title == $title) | .number' | head -1)
                issue_state=$(gh issue list --state all --json number,state | jq -r --arg num "$issue_num" '.[] | select(.number == ($num | tonumber)) | .state' | head -1)

                echo "    ⚠️  Issue #$issue_num already exists (state: $issue_state)"

                # Update status if changed
                if [[ "$status" == "complete" || "$status" == "completed" ]] && [[ "$issue_state" == "OPEN" ]]; then
                    echo "    ✅ Closing completed issue #$issue_num"
                    gh issue close "$issue_num" 2>/dev/null || true
                elif [[ "$status" == "in-progress" || "$status" == "pending" ]] && [[ "$issue_state" == "CLOSED" ]]; then
                    echo "    🔄 Reopening in-progress issue #$issue_num"
                    gh issue reopen "$issue_num" 2>/dev/null || true
                fi
                continue
            fi

            # Extract tasks from implementation section
            tasks=""
            if grep -q "## Implementation" "$story_file"; then
                # Extract task lines that start with "- ["
                task_lines=$(sed -n '/## Implementation/,/^##[^#]/p' "$story_file" | grep "^- \[" || true)
                if [[ -n "$task_lines" ]]; then
                    # Determine checkbox state based on story status
                    checkbox="[ ]"
                    if [[ "$status" == "complete" ]] || [[ "$status" == "completed" ]]; then
                        checkbox="[x]"
                    fi
                    # Extract task ID and title properly
                    tasks=""
                    while IFS= read -r line; do
                        # Extract task ID (T-XXX) and title from the line
                        task_id=$(echo "$line" | grep -oE "T-[0-9]+" | head -1 || echo "")
                        # Extract title - everything between ": " and "]("
                        task_title=$(echo "$line" | sed 's/.*: //' | sed 's/\](.*//')
                        if [[ -n "$task_id" ]] && [[ -n "$task_title" ]]; then
                            tasks="${tasks}- $checkbox $task_id: $task_title\n"
                        fi
                    done <<< "$task_lines"
                fi
            fi

            # Create simple issue body
            cat > /tmp/issue-body.md << EOF
**Feature**: [$short_feature]($GITHUB_REPO_URL/tree/develop/.specweave/docs/internal/specs/_features/$feature/FEATURE.md)
**Project**: $project
**Status**: $status

## User Story

View full story: [\`$project/$short_feature/$filename\`]($GITHUB_REPO_URL/blob/develop/$SPECS_DIR/$project/$short_feature/$filename)

## Tasks

$(echo -e "${tasks:-No tasks defined}")

---

🤖 Auto-synced by SpecWeave
EOF

            # Create the issue (without labels since they may not exist)
            echo "    ✨ Creating issue..."
            issue_url=$(gh issue create \
                --title "[$short_feature $story_id] $title" \
                --body-file /tmp/issue-body.md 2>&1 | grep "https://" || echo "")

            if [[ -n "$issue_url" ]]; then
                issue_num=$(echo "$issue_url" | grep -oE "[0-9]+$")
                echo "    ✅ Created issue #$issue_num"
                ((created++))

                # Close if complete
                if [[ "$status" == "complete" ]] || [[ "$status" == "completed" ]]; then
                    gh issue close "$issue_num" 2>/dev/null || true
                    echo "    ✅ Closed completed issue"
                fi
            else
                echo "    ❌ Failed to create issue"
            fi
        done
    done
done

echo ""
echo "========================================="
echo "✅ Sync Complete!"
echo ""
echo "📊 Summary:"
echo "  - Total User Stories: $total"
echo "  - Created: $created"
echo ""

# Verify
issue_count=$(gh issue list --state all --json number | jq '. | length')
echo "🔍 Verification:"
echo "  - GitHub issues: $issue_count"