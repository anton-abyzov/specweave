#!/bin/bash

# Enhanced GitHub User Story Sync Script
# Syncs user stories from SpecWeave Universal Hierarchy to GitHub issues
# Fixed version: No Project line for GitHub, includes user story description

set -e

# Configuration
SPECS_DIR=".specweave/docs/internal/specs"
GITHUB_REPO_URL="https://github.com/anton-abyzov/specweave"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to extract user story description (As a... I want... So that...)
extract_user_description() {
    local file="$1"
    local description=""

    # Try to extract the user story format
    local as_a=$(grep -A1 "^\*\*As a\*\*" "$file" | tail -1 | sed 's/^\*\*As a\*\* *//' || echo "")
    local i_want=$(grep -A1 "^\*\*I want\*\*" "$file" | tail -1 | sed 's/^\*\*I want\*\* *//' || echo "")
    local so_that=$(grep -A1 "^\*\*So that\*\*" "$file" | tail -1 | sed 's/^\*\*So that\*\* *//' || echo "")

    if [[ -n "$as_a" && -n "$i_want" && -n "$so_that" ]]; then
        description="**As a** $as_a
**I want** $i_want
**So that** $so_that"
    fi

    echo "$description"
}

# Function to extract tasks for a user story
get_tasks_for_story() {
    local us_id="$1"
    local tasks_file="$2"

    if [[ ! -f "$tasks_file" ]]; then
        return
    fi

    # Extract tasks that reference this user story's AC
    local tasks=""
    local in_task=false
    local task_title=""

    while IFS= read -r line; do
        if [[ "$line" =~ ^###?[[:space:]]+T-[0-9]+: ]]; then
            in_task=true
            task_title=$(echo "$line" | sed 's/^###*[[:space:]]*//;s/[[:space:]]*$//')
        elif [[ "$in_task" == true && "$line" =~ \*\*AC\*\*:.*AC-${us_id#US-} ]]; then
            if [[ -n "$tasks" ]]; then
                tasks="$tasks
"
            fi
            tasks="$tasks- [ ] $task_title"
        elif [[ "$line" =~ ^###?[[:space:]] ]]; then
            in_task=false
        fi
    done < "$tasks_file"

    echo "$tasks"
}

# Main sync function
sync_user_stories() {
    echo -e "${BLUE}🔄 Syncing User Stories to GitHub Issues${NC}\n"

    local created_count=0
    local updated_count=0
    local skipped_count=0

    # Iterate through project folders
    for project_dir in "$SPECS_DIR"/*; do
        if [[ ! -d "$project_dir" ]] || [[ "$project_dir" == *"_features" ]] || [[ "$project_dir" == *"_epics" ]]; then
            continue
        fi

        local project_name=$(basename "$project_dir")
        echo -e "${BLUE}📁 Processing project: $project_name${NC}"

        # Iterate through feature folders
        for feature_dir in "$project_dir"/FS-*; do
            if [[ ! -d "$feature_dir" ]]; then
                continue
            fi

            local feature_name=$(basename "$feature_dir")
            local feature_id="${feature_name%%-*}"  # Extract FS-XXX part
            echo -e "  ${YELLOW}📂 Feature: $feature_name${NC}"

            # Process user story files
            for us_file in "$feature_dir"/us-*.md; do
                if [[ ! -f "$us_file" ]]; then
                    continue
                fi

                local us_filename=$(basename "$us_file")
                local us_id=$(echo "$us_filename" | grep -oE "us-[0-9]+" | tr 'a-z' 'A-Z' | sed 's/-0*/-/')

                # Extract frontmatter
                local us_title=$(grep "^title:" "$us_file" | sed 's/title:[[:space:]]*//;s/"//g' || echo "$us_filename")
                local us_status=$(grep "^status:" "$us_file" | sed 's/status:[[:space:]]*//' || echo "planning")

                echo -e "    📝 User Story: $us_id - $us_title"

                # Check if issue already exists (using new title format)
                local existing_issue=$(gh issue list --search "[$feature_id $us_id]" --json number,title --jq '.[0].number' 2>/dev/null || echo "")

                if [[ -n "$existing_issue" ]]; then
                    echo -e "    ${YELLOW}⚠️  Issue #$existing_issue already exists${NC}"
                    ((skipped_count++))

                    # Update status if needed
                    if [[ "$us_status" == "complete" ]] || [[ "$us_status" == "completed" ]]; then
                        gh issue close "$existing_issue" 2>/dev/null || true
                    fi
                    continue
                fi

                # Extract user story description
                us_description=$(extract_user_description "$us_file")

                # Extract acceptance criteria
                ac_section=$(sed -n '/^## Acceptance Criteria/,/^##[^#]/p' "$us_file" | sed '$d' || echo "")
                if [[ -z "$ac_section" || "$ac_section" == "## Acceptance Criteria" ]]; then
                    ac_section="*Acceptance criteria to be extracted from increment specification*"
                fi

                # Extract implementation section
                impl_section=$(sed -n '/^## Implementation/,/^##[^#]/p' "$us_file" | sed '$d' || echo "")

                # Find the increment tasks.md file if referenced
                increment_path=$(echo "$impl_section" | grep -oE "increments/[^/]+/" | head -1 || echo "")
                tasks_file=""
                if [[ -n "$increment_path" ]]; then
                    tasks_file=".specweave/$increment_path/tasks.md"
                fi

                # Get tasks for this story
                task_list=$(get_tasks_for_story "$us_id" "$tasks_file")

                # Create issue body (WITHOUT Project line for GitHub)
                issue_body="**Feature**: [$feature_id]($GITHUB_REPO_URL/tree/develop/.specweave/docs/internal/specs/_features/$feature_id)
**Status**: $us_status

## User Story

${us_description:-*User story description not found*}

View full story: [\`$feature_name/$us_filename\`]($GITHUB_REPO_URL/tree/develop/$SPECS_DIR/$project_name/$feature_name/$us_filename)

## Tasks

${task_list:-No tasks defined}

---

🤖 Auto-synced by SpecWeave"

                # Create the GitHub issue with new title format
                echo -e "    ${GREEN}✨ Creating GitHub issue...${NC}"

                # Create issue and capture the output
                issue_output=$(gh issue create \
                    --title "[$feature_id $us_id] $us_title" \
                    --body "$issue_body" \
                    --label "user-story" \
                    --label "specweave" 2>&1 || echo "ERROR")

                if [[ "$issue_output" == "ERROR" ]]; then
                    echo -e "    ${RED}❌ Failed to create issue${NC}"
                else
                    issue_number=$(echo "$issue_output" | grep -oE "#[0-9]+" | sed 's/#//')
                    echo -e "    ${GREEN}✅ Created issue #$issue_number${NC}"
                    ((created_count++))

                    # Close the issue if the story is complete
                    if [[ "$us_status" == "complete" ]] || [[ "$us_status" == "completed" ]]; then
                        gh issue close "$issue_number" 2>/dev/null || true
                        echo -e "    ${GREEN}✔️  Closed issue #$issue_number (status: complete)${NC}"
                    fi
                fi
            done
        done
    done

    echo -e "\n${GREEN}✨ Sync Complete!${NC}"
    echo -e "  Created: $created_count issues"
    echo -e "  Skipped: $skipped_count issues (already exist)"
}

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Please install it: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

# Run the sync
sync_user_stories