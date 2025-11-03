#!/bin/bash

#
# Post-Increment Plugin Detection Hook (T-021)
#
# Runs AFTER increment completion to suggest plugins based on git diff
# This is Phase 4 of the 4-phase plugin detection system
#
# Trigger: After `/specweave.done` completes an increment
# Output: Plugin suggestions for NEXT increment
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
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Check if SpecWeave is installed
if ! command -v specweave &> /dev/null; then
    # Silent exit if SpecWeave not installed (development mode)
    exit 0
fi

# Check if git repository exists
if [ ! -d ".git" ]; then
    # Not a git repo, skip detection
    exit 0
fi

# Get completed increment number (passed as argument)
INCREMENT_NUM="$1"

if [ -z "$INCREMENT_NUM" ]; then
    # No increment number provided, skip
    exit 0
fi

# Get git diff since last increment tag (or HEAD if no tags)
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")
GIT_DIFF=$(git diff --name-only "$LAST_TAG"..HEAD 2>/dev/null || echo "")

if [ -z "$GIT_DIFF" ]; then
    # No changes detected, skip
    exit 0
fi

# Also check package.json changes for new dependencies
PACKAGE_JSON_CHANGED=false
if echo "$GIT_DIFF" | grep -q "package.json"; then
    PACKAGE_JSON_CHANGED=true
fi

# Keyword-based plugin detection from file changes
declare -A PLUGIN_PATTERNS=(
    ["specweave-github"]=".github/|github-"
    ["specweave-kubernetes"]="kubernetes/|k8s/|helm/|\.yaml$"
    ["specweave-frontend-stack"]="components/|pages/|app/|\.tsx$|\.jsx$"
    ["specweave-backend-stack"]="api/|server/|routes/|controllers/"
    ["specweave-ml-ops"]="models/|training/|\.ipynb$|\.h5$|\.pkl$"
    ["specweave-payment-processing"]="payments/|billing/|stripe"
    ["specweave-figma"]="\.figma|design/|mockups/"
    ["specweave-observability"]="prometheus/|grafana/|monitoring/"
    ["specweave-diagrams"]="diagrams/|\.mmd$|architecture/"
)

# Dependency-based detection (if package.json changed)
declare -A DEPENDENCY_PLUGINS=(
    ["specweave-frontend-stack"]="react|vue|angular|next"
    ["specweave-backend-stack"]="express|fastapi|django|nestjs"
    ["specweave-payment-processing"]="stripe|paypal"
    ["specweave-ml-ops"]="tensorflow|pytorch|scikit-learn"
    ["specweave-observability"]="prometheus-client|@opentelemetry"
)

# Detect plugins based on file patterns
SUGGESTED_PLUGINS=()

# Check file patterns
for plugin in "${!PLUGIN_PATTERNS[@]}"; do
    pattern="${PLUGIN_PATTERNS[$plugin]}"

    if echo "$GIT_DIFF" | grep -qi -E "$pattern"; then
        # Check if plugin is already enabled
        if ! specweave plugin list --enabled 2>/dev/null | grep -q "$plugin"; then
            if [[ ! " ${SUGGESTED_PLUGINS[@]} " =~ " ${plugin} " ]]; then
                SUGGESTED_PLUGINS+=("$plugin")
            fi
        fi
    fi
done

# Check package.json dependencies if it changed
if [ "$PACKAGE_JSON_CHANGED" = true ] && [ -f "package.json" ]; then
    DEPENDENCIES=$(cat package.json | grep -A 100 '"dependencies"' | grep -A 100 '"devDependencies"' || echo "")

    for plugin in "${!DEPENDENCY_PLUGINS[@]}"; do
        keywords="${DEPENDENCY_PLUGINS[$plugin]}"

        if echo "$DEPENDENCIES" | grep -qi -E "$keywords"; then
            if ! specweave plugin list --enabled 2>/dev/null | grep -q "$plugin"; then
                if [[ ! " ${SUGGESTED_PLUGINS[@]} " =~ " ${plugin} " ]]; then
                    SUGGESTED_PLUGINS+=("$plugin")
                fi
            fi
        fi
    done
fi

# Output suggestions if any found
if [ ${#SUGGESTED_PLUGINS[@]} -gt 0 ]; then
    echo ""
    echo -e "${MAGENTA}══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}💡 Plugin Suggestions for Next Increment${NC}"
    echo -e "${MAGENTA}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GRAY}Increment ${INCREMENT_NUM} introduced changes that suggest:${NC}"
    echo ""

    for plugin in "${SUGGESTED_PLUGINS[@]}"; do
        echo -e "   ✨ ${GREEN}${plugin}${NC}"
    done

    echo ""
    echo -e "${YELLOW}Consider enabling these plugins for your next increment:${NC}"
    echo -e "${CYAN}   specweave plugin enable <name>${NC}"
    echo ""
    echo -e "${GRAY}Plugins will auto-activate skills and agents for better support${NC}"
    echo -e "${MAGENTA}══════════════════════════════════════════════════════${NC}"
    echo ""
fi

# Always exit successfully (non-blocking)
exit 0
