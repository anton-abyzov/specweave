#!/bin/bash

# Sync User Stories to GitHub Issues
# This script creates GitHub issues for User Stories only (not Epics or Features)
# It includes parent Feature links, Tasks as checkboxes, and prevents duplicates

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SPECS_DIR=".specweave/docs/internal/specs"
GITHUB_OWNER="anton-abyzov"
GITHUB_REPO="specweave"
GITHUB_REPO_URL="https://github.com/$GITHUB_OWNER/$GITHUB_REPO"

echo -e "${BLUE}🚀 Starting User Story to GitHub sync...${NC}"
echo "========================================="

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ Error: GitHub CLI (gh) is not installed${NC}"
    exit 1
fi

# Get all existing GitHub issues to check for duplicates
echo -e "${BLUE}📋 Fetching existing GitHub issues...${NC}"
existing_issues=$(gh issue list --limit 1000 --state all --json number,title,body 2>/dev/null || echo "[]")

# Function to check if an issue already exists for a user story
issue_exists() {
    local us_id="$1"
    echo "$existing_issues" | jq -r --arg id "$us_id" '.[] | select(.title | contains($id)) | .number' | head -1
}

# Function to extract tasks from increment tasks.md file
get_tasks_for_story() {
    local us_id="$1"
    local tasks_file="$2"

    if [[ ! -f "$tasks_file" ]]; then
        echo ""
        return
    fi

    # Extract task IDs from the user story file's acceptance criteria
    local ac_ids=$(grep -E "^\*\*AC\*\*:" "$tasks_file" 2>/dev/null | sed 's/.*: //' | tr ',' ' ' || true)

    # Build task list
    local task_list=""
    for task_section in $(grep -n "^##\+ T-[0-9]\+:" "$tasks_file" 2>/dev/null | cut -d: -f1 || true); do
        local task_line=$(sed -n "${task_section}p" "$tasks_file")
        local task_id=$(echo "$task_line" | grep -oE "T-[0-9]+" || true)
        local task_title=$(echo "$task_line" | sed 's/^##\+ T-[0-9]\+: *//')

        if [[ -n "$task_id" ]]; then
            # Check if this task is related to the user story's ACs
            local task_acs=$(sed -n "${task_section},/^##\+ T-/p" "$tasks_file" | grep -E "^\*\*AC\*\*:" | sed 's/.*: //' || true)

            # Add task if it has matching ACs or if we couldn't determine ACs
            if [[ -z "$ac_ids" ]] || echo "$task_acs" | grep -qE "$(echo $ac_ids | tr ' ' '|')"; then
                task_list="${task_list}- [ ] ${task_id}: ${task_title}\n"
            fi
        fi
    done

    echo -e "$task_list"
}

# Counter for created/updated issues
created_count=0
updated_count=0
skipped_count=0
total_stories=0

# Find all user story files
echo -e "${BLUE}🔍 Scanning for User Stories...${NC}"

for project_dir in "$SPECS_DIR"/*; do
    # Skip non-directories and special folders
    [[ ! -d "$project_dir" ]] && continue
    project_name=$(basename "$project_dir")
    [[ "$project_name" == "_epics" ]] && continue
    [[ "$project_name" == "_features" ]] && continue

    echo -e "${YELLOW}📁 Project: $project_name${NC}"

    # Find all feature folders in this project
    for feature_dir in "$project_dir"/FS-*; do
        [[ ! -d "$feature_dir" ]] && continue
        feature_name=$(basename "$feature_dir")

        # Find all user story files in this feature
        for us_file in "$feature_dir"/us-*.md; do
            [[ ! -f "$us_file" ]] && continue

            ((total_stories++))

            # Extract user story metadata
            us_filename=$(basename "$us_file")
            us_id=$(echo "$us_filename" | grep -oE "us-[0-9]+" | tr '[:lower:]' '[:upper:]')

            # Read frontmatter and content
            us_title=$(grep "^title:" "$us_file" | sed 's/title: *//' | sed 's/"//g' || echo "User Story")
            us_status=$(grep "^status:" "$us_file" | sed 's/status: *//' || echo "pending")

            # Get the feature ID from the frontmatter
            feature_id=$(grep "^epic:" "$us_file" | sed 's/epic: *//' || echo "$feature_name")

            echo -e "  ${BLUE}📝 Processing: $us_id - $us_title${NC}"

            # Check if issue already exists
            existing_issue=$(issue_exists "$us_id")

            if [[ -n "$existing_issue" ]]; then
                echo -e "    ${YELLOW}⚠️  Issue #$existing_issue already exists${NC}"
                ((skipped_count++))

                # Update status if changed
                if [[ "$us_status" == "complete" ]] || [[ "$us_status" == "completed" ]]; then
                    echo -e "    ${GREEN}✅ Closing completed issue #$existing_issue${NC}"
                    gh issue close "$existing_issue" 2>/dev/null || true
                    ((updated_count++))
                fi
                continue
            fi

            # Extract user story content
            us_content=$(sed -n '/^# /,/^---$/p' "$us_file" | sed '$d' || echo "No description")

            # Extract acceptance criteria
            ac_section=$(sed -n '/^## Acceptance Criteria/,/^##[^#]/p' "$us_file" | sed '$d' || echo "")

            # Extract implementation section
            impl_section=$(sed -n '/^## Implementation/,/^##[^#]/p' "$us_file" | sed '$d' || echo "")

            # Find the increment tasks.md file if referenced
            increment_path=$(echo "$impl_section" | grep -oE "increments/[^/]+/" | head -1 || echo "")
            tasks_file=""
            if [[ -n "$increment_path" ]]; then
                tasks_file=".specweave/${increment_path}tasks.md"
            fi

            # Get tasks for this user story
            task_list=$(get_tasks_for_story "$us_id" "$tasks_file")

            # Create issue body
            issue_body="# [$us_id] $us_title

**Feature**: [$feature_id]($GITHUB_REPO_URL/tree/develop/.specweave/docs/internal/specs/_features/$feature_id)
**Project**: $project_name
**Status**: $us_status

## Description

$us_content

## Acceptance Criteria

$ac_section

## Tasks

${task_list:-No tasks defined}

## Implementation

$impl_section

---

🤖 Auto-synced by SpecWeave
📁 Source: [\`$project_name/$feature_name/$us_filename\`]($GITHUB_REPO_URL/tree/develop/$SPECS_DIR/$project_name/$feature_name/$us_filename)"

            # Create the GitHub issue
            echo -e "    ${GREEN}✨ Creating GitHub issue...${NC}"

            # Create issue and capture the output
            issue_output=$(gh issue create \
                --title "[$us_id] $us_title" \
                --body "$issue_body" \
                --label "user-story" \
                --label "specweave" \
                --label "project:$project_name" 2>&1 || echo "ERROR")

            if [[ "$issue_output" == "ERROR" ]]; then
                echo -e "    ${RED}❌ Failed to create issue${NC}"
            else
                issue_number=$(echo "$issue_output" | grep -oE "#[0-9]+" | sed 's/#//')
                echo -e "    ${GREEN}✅ Created issue #$issue_number${NC}"
                ((created_count++))

                # Close the issue if the story is complete
                if [[ "$us_status" == "complete" ]] || [[ "$us_status" == "completed" ]]; then
                    echo -e "    ${GREEN}✅ Closing completed issue #$issue_number${NC}"
                    gh issue close "$issue_number" 2>/dev/null || true
                fi
            fi
        done
    done
done

echo ""
echo "========================================="
echo -e "${GREEN}✅ Sync Complete!${NC}"
echo ""
echo "📊 Summary:"
echo "  - Total User Stories: $total_stories"
echo "  - Created: $created_count"
echo "  - Updated: $updated_count"
echo "  - Skipped (duplicates): $skipped_count"
echo ""

# Verify the count
echo -e "${BLUE}🔍 Verifying GitHub issues...${NC}"
issue_count=$(gh issue list --state all --json number | jq '. | length')
echo "  - Total GitHub issues: $issue_count"

if [[ $issue_count -eq $total_stories ]]; then
    echo -e "  ${GREEN}✅ Count matches!${NC}"
else
    echo -e "  ${YELLOW}⚠️  Count mismatch (expected: $total_stories, actual: $issue_count)${NC}"
    echo "  This may be due to deleted or manually created issues."
fi