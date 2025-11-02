#!/bin/bash

#
# Pre-Task Plugin Detection Hook (T-020)
#
# Runs BEFORE task execution to suggest plugins based on task description
# This is Phase 3 of the 4-phase plugin detection system
#
# Trigger: Before executing any task via `/specweave.do`
# Output: Non-blocking plugin suggestions
#

# Exit on error
set -e

# Get project root (assumes hook runs from project directory)
PROJECT_ROOT=$(pwd)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Check if SpecWeave is installed
if ! command -v specweave &> /dev/null; then
    # Silent exit if SpecWeave not installed (development mode)
    exit 0
fi

# Get current task being executed (passed as argument)
TASK_FILE="$1"

if [ -z "$TASK_FILE" ] || [ ! -f "$TASK_FILE" ]; then
    # No task file provided, skip detection
    exit 0
fi

# Extract task description
TASK_DESCRIPTION=$(grep -A 5 "^### T-[0-9]" "$TASK_FILE" | head -1 || echo "")

if [ -z "$TASK_DESCRIPTION" ]; then
    # No description found, skip
    exit 0
fi

# Keyword-based plugin detection
declare -A PLUGIN_KEYWORDS=(
    ["specweave-github"]="github|gh|issue|pull request|pr"
    ["specweave-kubernetes"]="kubernetes|k8s|kubectl|helm|pod|deployment"
    ["specweave-frontend-stack"]="react|vue|angular|nextjs|frontend|ui|component"
    ["specweave-backend-stack"]="express|fastapi|django|flask|nestjs|backend|api|server"
    ["specweave-ml-ops"]="tensorflow|pytorch|sklearn|ml|machine learning|model|training"
    ["specweave-payment-processing"]="stripe|paypal|payment|billing|subscription"
    ["specweave-figma"]="figma|design|mockup|prototype"
    ["specweave-jira"]="jira|atlassian|ticket"
    ["specweave-observability"]="prometheus|grafana|datadog|monitoring|metrics|tracing"
)

# Detect plugins based on keywords
SUGGESTED_PLUGINS=()

for plugin in "${!PLUGIN_KEYWORDS[@]}"; do
    keywords="${PLUGIN_KEYWORDS[$plugin]}"

    # Check if any keyword matches (case-insensitive)
    if echo "$TASK_DESCRIPTION" | grep -qi -E "$keywords"; then
        # Check if plugin is already enabled
        if ! specweave plugin list --enabled 2>/dev/null | grep -q "$plugin"; then
            SUGGESTED_PLUGINS+=("$plugin")
        fi
    fi
done

# Output suggestions if any found
if [ ${#SUGGESTED_PLUGINS[@]} -gt 0 ]; then
    echo ""
    echo -e "${CYAN}💡 Plugin Detection${NC}"
    echo ""
    echo -e "${GRAY}Task mentions: ${TASK_DESCRIPTION}${NC}"
    echo ""
    echo -e "${YELLOW}Suggested plugins:${NC}"

    for plugin in "${SUGGESTED_PLUGINS[@]}"; do
        echo -e "   • ${GREEN}${plugin}${NC}"
    done

    echo ""
    echo -e "${GRAY}This task might benefit from these plugins.${NC}"
    echo -e "${GRAY}Run: ${CYAN}specweave plugin enable <name>${GRAY} to install${NC}"
    echo ""
fi

# Always exit successfully (non-blocking)
exit 0
