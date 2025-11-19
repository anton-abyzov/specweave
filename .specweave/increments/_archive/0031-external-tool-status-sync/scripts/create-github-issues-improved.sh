#!/bin/bash

# Enhanced GitHub User Story Sync Script with proper content extraction
# Syncs user stories from SpecWeave Universal Hierarchy to GitHub issues

set -e

# Configuration
SPECS_DIR=".specweave/docs/internal/specs"
INCREMENTS_DIR=".specweave/increments"
GITHUB_REPO_URL="https://github.com/anton-abyzov/specweave"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to extract complete user story content
extract_user_story_content() {
    local file="$1"
    local content=""

    # Extract user story format (As a... I want... So that...)
    # Look for the pattern in the file
    local as_a=""
    local i_want=""
    local so_that=""

    # Try to find the user story description section
    local in_description=false
    while IFS= read -r line; do
        if [[ "$line" =~ ^\*\*As\ a\*\* ]]; then
            as_a=$(echo "$line" | sed 's/^\*\*As a\*\*//' | sed 's/^[[:space:]]*//')
            in_description=true
        elif [[ "$line" =~ ^\*\*I\ want\*\* ]]; then
            i_want=$(echo "$line" | sed 's/^\*\*I want\*\*//' | sed 's/^[[:space:]]*//')
        elif [[ "$line" =~ ^\*\*So\ that\*\* ]]; then
            so_that=$(echo "$line" | sed 's/^\*\*So that\*\*//' | sed 's/^[[:space:]]*//')
        elif [[ "$in_description" == true && "$line" =~ ^---$ ]]; then
            break
        fi
    done < "$file"

    if [[ -n "$as_a" && -n "$i_want" && -n "$so_that" ]]; then
        content="**As a** $as_a
**I want** $i_want
**So that** $so_that"
    fi

    echo "$content"
}

# Function to extract acceptance criteria
extract_acceptance_criteria() {
    local file="$1"
    local criteria=""
    local in_ac_section=false

    while IFS= read -r line; do
        if [[ "$line" =~ ^##\ Acceptance\ Criteria ]]; then
            in_ac_section=true
        elif [[ "$in_ac_section" == true ]]; then
            if [[ "$line" =~ ^## ]] || [[ "$line" =~ ^---$ ]]; then
                break
            elif [[ "$line" =~ ^-\ \[.\]\ \*\* ]]; then
                criteria="$criteria
$line"
            fi
        fi
    done < "$file"

    echo "$criteria"
}

# Function to extract tasks for a user story from tasks.md
get_tasks_for_story() {
    local us_id="$1"
    local increment_id="$2"
    local tasks_file="$INCREMENTS_DIR/$increment_id/tasks.md"

    if [[ ! -f "$tasks_file" ]]; then
        echo ""
        return
    fi

    # Extract tasks that reference this user story
    local tasks=""
    local in_task=false
    local task_title=""
    local task_status=""

    while IFS= read -r line; do
        # Check for task heading
        if [[ "$line" =~ ^###?[[:space:]]+T-[0-9]+: ]]; then
            # Extract task ID and title
            task_title=$(echo "$line" | sed 's/^###*[[:space:]]*//' | sed 's/[[:space:]]*$//')
            # Check if next line has a checkbox status
            in_task=true
            task_status="[ ]" # Default to incomplete
        elif [[ "$in_task" == true && "$line" =~ ^\-[[:space:]]\[.\] ]]; then
            # Extract checkbox status
            task_status=$(echo "$line" | grep -o '\[.\]')
        elif [[ "$in_task" == true && "$line" =~ \*\*AC\*\*:.*AC-${us_id#US-} ]]; then
            # This task implements our user story
            if [[ -n "$tasks" ]]; then
                tasks="$tasks
"
            fi
            tasks="$tasks- $task_status $task_title"
            in_task=false
        elif [[ "$line" =~ ^###?[[:space:]] ]] || [[ -z "$line" ]]; then
            in_task=false
        fi
    done < "$tasks_file"

    echo "$tasks"
}

# Function to get increment ID from feature metadata
get_increment_for_feature() {
    local feature_id="$1"
    local increment_id=""

    # Look in the feature file for sourceIncrement
    local feature_file="$SPECS_DIR/_features/$feature_id/FEATURE.md"
    if [[ -f "$feature_file" ]]; then
        increment_id=$(grep "^sourceIncrement:" "$feature_file" | sed 's/sourceIncrement:[[:space:]]*//' || echo "")
    fi

    # If not found, try to match by feature ID pattern
    if [[ -z "$increment_id" ]]; then
        # Extract the numeric part from FS-031 -> 031 -> 0031
        local num=$(echo "$feature_id" | sed 's/FS-0*//')
        # Pad with zeros to 4 digits
        num=$(printf "%04d" "$num")
        # Find increment with this number
        for inc_dir in "$INCREMENTS_DIR"/"$num"-*; do
            if [[ -d "$inc_dir" ]]; then
                increment_id=$(basename "$inc_dir")
                break
            fi
        done
    fi

    echo "$increment_id"
}

# Main sync function
sync_user_stories() {
    echo -e "${BLUE}🔄 Syncing User Stories to GitHub Issues${NC}\n"

    local created_count=0
    local updated_count=0
    local skipped_count=0

    # Iterate through feature folders in _features
    for feature_dir in "$SPECS_DIR"/_features/FS-*; do
        if [[ ! -d "$feature_dir" ]]; then
            continue
        fi

        local feature_name=$(basename "$feature_dir")
        local feature_id="${feature_name%%-*}"  # Extract FS-XXX part

        # Get the increment ID for this feature
        local increment_id=$(get_increment_for_feature "$feature_id")

        echo -e "${BLUE}📁 Processing feature: $feature_name${NC}"
        if [[ -n "$increment_id" ]]; then
            echo -e "  ${GREEN}🔗 Linked to increment: $increment_id${NC}"
        fi

        # Process user story files in project folders
        for project_dir in "$SPECS_DIR"/*/; do
            if [[ "$project_dir" == *"_features"* ]] || [[ "$project_dir" == *"_epics"* ]]; then
                continue
            fi

            local project_name=$(basename "$project_dir")
            local feature_stories_dir="$project_dir/$feature_name"

            if [[ ! -d "$feature_stories_dir" ]]; then
                continue
            fi

            echo -e "  ${YELLOW}📂 Project: $project_name${NC}"

            # Process user story files
            for us_file in "$feature_stories_dir"/us-*.md; do
                if [[ ! -f "$us_file" ]]; then
                    continue
                fi

                local us_filename=$(basename "$us_file")
                local us_id=$(echo "$us_filename" | grep -oE "us-[0-9]+" | tr 'a-z' 'A-Z' | sed 's/-0*/-/')

                # Extract frontmatter
                local us_title=$(grep "^title:" "$us_file" | sed 's/title:[[:space:]]*//;s/"//g' || echo "$us_filename")
                local us_status=$(grep "^status:" "$us_file" | sed 's/status:[[:space:]]*//' || echo "planning")

                echo -e "    📝 Processing: $us_id - $us_title"

                # Check if issue already exists
                local existing_issue=$(gh issue list --search "[$feature_id $us_id]" --json number,title --jq '.[0].number' 2>/dev/null || echo "")

                if [[ -n "$existing_issue" ]]; then
                    echo -e "    ${YELLOW}⚠️  Issue #$existing_issue already exists${NC}"
                    ((skipped_count++))

                    # Update status if needed
                    if [[ "$us_status" == "complete" ]] || [[ "$us_status" == "completed" ]]; then
                        gh issue close "$existing_issue" 2>/dev/null || true
                        echo -e "    ${GREEN}✔️  Closed issue #$existing_issue (status: complete)${NC}"
                    fi
                    continue
                fi

                # Extract user story content
                us_description=$(extract_user_story_content "$us_file")
                if [[ -z "$us_description" ]]; then
                    us_description="*User story description not found in file*"
                fi

                # Extract acceptance criteria
                ac_section=$(extract_acceptance_criteria "$us_file")
                if [[ -z "$ac_section" ]]; then
                    ac_section="*See full story file for acceptance criteria*"
                fi

                # Get tasks for this story
                task_list=""
                if [[ -n "$increment_id" ]]; then
                    task_list=$(get_tasks_for_story "$us_id" "$increment_id")
                fi
                if [[ -z "$task_list" ]]; then
                    task_list="- [ ] No tasks defined yet"
                fi

                # Create issue body (WITHOUT Project line for GitHub)
                issue_body="**Feature**: [$feature_id]($GITHUB_REPO_URL/tree/develop/$SPECS_DIR/_features/$feature_id)
**Status**: $us_status

## User Story

$us_description

## Acceptance Criteria

$ac_section

## Tasks

$task_list

## Implementation

View full story: [\`$feature_name/$us_filename\`]($GITHUB_REPO_URL/tree/develop/$SPECS_DIR/$project_name/$feature_name/$us_filename)
${increment_id:+Increment: [\`$increment_id\`]($GITHUB_REPO_URL/tree/develop/$INCREMENTS_DIR/$increment_id)}

---

🤖 Auto-synced by SpecWeave"

                # Create the GitHub issue
                echo -e "    ${GREEN}✨ Creating GitHub issue...${NC}"

                issue_output=$(gh issue create \
                    --title "[$feature_id $us_id] $us_title" \
                    --body "$issue_body" \
                    --label "user-story" \
                    --label "specweave" \
                    --label "$feature_id" 2>&1 || echo "ERROR")

                if [[ "$issue_output" == "ERROR" ]]; then
                    echo -e "    ${RED}❌ Failed to create issue${NC}"
                else
                    issue_number=$(echo "$issue_output" | grep -oE "#[0-9]+" | sed 's/#//' | head -1)
                    if [[ -n "$issue_number" ]]; then
                        echo -e "    ${GREEN}✅ Created issue #$issue_number${NC}"
                        ((created_count++))

                        # Close if complete
                        if [[ "$us_status" == "complete" ]] || [[ "$us_status" == "completed" ]]; then
                            gh issue close "$issue_number" 2>/dev/null || true
                            echo -e "    ${GREEN}✔️  Closed issue #$issue_number (status: complete)${NC}"
                        fi
                    else
                        echo -e "    ${YELLOW}⚠️  Created issue but couldn't extract number${NC}"
                        ((created_count++))
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