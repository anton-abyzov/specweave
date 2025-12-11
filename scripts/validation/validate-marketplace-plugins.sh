#!/bin/bash

# SpecWeave Marketplace Plugin Validation Script (ENHANCED)
# Ensures all plugins listed in marketplace.json are COMPLETE (not skeleton-only)
# Created: 2025-11-20
# Enhanced: 2025-11-22 (Added scoring system + content validation)
# Purpose: Prevent "Plugin not found in marketplace" errors from incomplete plugins

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MARKETPLACE_JSON="$PROJECT_ROOT/.claude-plugin/marketplace.json"
PLUGINS_DIR="$PROJECT_ROOT/plugins"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 SpecWeave Marketplace Plugin Validation (Enhanced)${NC}"
echo "=========================================================="
echo ""

if [ ! -f "$MARKETPLACE_JSON" ]; then
    echo -e "${RED}✗ marketplace.json not found at: $MARKETPLACE_JSON${NC}"
    exit 1
fi

if [ ! -d "$PLUGINS_DIR" ]; then
    echo -e "${RED}✗ plugins/ directory not found at: $PLUGINS_DIR${NC}"
    exit 1
fi

# ============================================================
# PHASE 1: Structure Validation (Existing)
# ============================================================
echo -e "${BLUE}📄 Reading marketplace.json...${NC}"

# Extract plugin names from marketplace.json (supports both sw-* and specweave-* patterns)
LISTED_PLUGINS=$(grep -o '"name": "sw[^"]*"' "$MARKETPLACE_JSON" | sed 's/"name": "//;s/"//g' | grep -v '^sw$' | sort -u)
TOTAL_LISTED=$(echo "$LISTED_PLUGINS" | grep -c . || echo "0")

echo -e "${GREEN}✓ Found $TOTAL_LISTED plugins listed in marketplace.json${NC}"
echo ""

# ============================================================
# PHASE 2: Content Depth Validation (NEW)
# ============================================================

validate_plugin_content() {
    local plugin_dir="$1"
    local plugin_name="$2"
    local score=0
    local details=""

    # Commands (40 points)
    if [ -d "$plugin_dir/commands" ]; then
        cmd_count=$(find "$plugin_dir/commands" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
        if [ "$cmd_count" -ge 1 ]; then
            score=$((score + 40))
            details="${details}  ${GREEN}Commands: +40${NC} ($cmd_count files)\n"
        fi
    fi

    # Lib (40 points)
    if [ -d "$plugin_dir/lib" ]; then
        lib_count=$(find "$plugin_dir/lib" -type f \( -name "*.js" -o -name "*.ts" \) 2>/dev/null | wc -l | tr -d ' ')
        if [ "$lib_count" -ge 10 ]; then
            score=$((score + 40))
            details="${details}  ${GREEN}Lib: +40${NC} ($lib_count files)\n"
        fi
    fi

    # Agents (30 points)
    if [ -d "$plugin_dir/agents" ]; then
        agent_dirs=$(find "$plugin_dir/agents" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
        for agent_dir in $agent_dirs; do
            if [ -f "$agent_dir/AGENT.md" ]; then
                support_files=$(find "$agent_dir" -type f ! -name "AGENT.md" 2>/dev/null | wc -l | tr -d ' ')
                if [ "$support_files" -ge 3 ]; then
                    score=$((score + 30))
                    details="${details}  ${GREEN}Agents: +30${NC} ($(basename "$agent_dir") with $support_files support files)\n"
                    break
                fi
            fi
        done
    fi

    # Hooks (20 points)
    if [ -d "$plugin_dir/hooks" ]; then
        hook_count=$(find "$plugin_dir/hooks" -type f \( -name "*.sh" -o -name "*.js" \) 2>/dev/null | wc -l | tr -d ' ')
        if [ "$hook_count" -ge 1 ]; then
            score=$((score + 20))
            details="${details}  ${GREEN}Hooks: +20${NC} ($hook_count files)\n"
        fi
    fi

    # Skills (10 points)
    if [ -d "$plugin_dir/skills" ]; then
        skill_count=$(find "$plugin_dir/skills" -name "SKILL.md" -type f 2>/dev/null | wc -l | tr -d ' ')
        if [ "$skill_count" -ge 3 ]; then
            score=$((score + 10))
            details="${details}  ${GREEN}Skills: +10${NC} ($skill_count files)\n"
        fi
    fi

    # Print details
    echo -e "$details"

    # Determine status
    if [ "$score" -ge 80 ]; then
        echo -e "  ${CYAN}TOTAL SCORE: $score (Production-Ready)${NC}"
        return 0
    elif [ "$score" -ge 40 ]; then
        echo -e "  ${GREEN}TOTAL SCORE: $score (Complete)${NC}"
        return 0
    else
        echo -e "  ${RED}TOTAL SCORE: $score (INCOMPLETE - FAILED)${NC}"
        return 1
    fi
}

# ============================================================
# Helper: Map marketplace name to directory name
# sw-* -> specweave-* mapping
# ============================================================
map_plugin_to_dir() {
    local plugin_name="$1"
    # Map short names to directory names
    case "$plugin_name" in
        sw) echo "specweave" ;;
        sw-github) echo "specweave-github" ;;
        sw-jira) echo "specweave-jira" ;;
        sw-ado) echo "specweave-ado" ;;
        sw-infra) echo "specweave-infrastructure" ;;
        sw-ml) echo "specweave-ml" ;;
        sw-release) echo "specweave-release" ;;
        sw-kafka) echo "specweave-kafka" ;;
        sw-kafka-streams) echo "specweave-kafka-streams" ;;
        sw-n8n) echo "specweave-n8n" ;;
        sw-backend) echo "specweave-backend" ;;
        sw-confluent) echo "specweave-confluent" ;;
        sw-k8s) echo "specweave-kubernetes" ;;
        sw-mobile) echo "specweave-mobile" ;;
        sw-payments) echo "specweave-payments" ;;
        sw-frontend) echo "specweave-frontend" ;;
        sw-testing) echo "specweave-testing" ;;
        sw-figma) echo "specweave-figma" ;;
        sw-tooling) echo "specweave-tooling" ;;
        sw-diagrams) echo "specweave-diagrams" ;;
        sw-ui) echo "specweave-ui" ;;
        sw-docs) echo "specweave-docs" ;;
        sw-alternatives) echo "specweave-alternatives" ;;
        sw-cost) echo "specweave-cost-optimizer" ;;
        sw-plugin-dev) echo "specweave-plugin-dev" ;;
        *) echo "$plugin_name" ;;  # Default: use as-is
    esac
}

# ============================================================
# Main Validation Loop
# ============================================================

INCOMPLETE_PLUGINS=()
COMPLETE_PLUGINS=()
PRODUCTION_READY_PLUGINS=()

echo -e "${BLUE}🔎 Validating plugin completeness with scoring...${NC}"
echo ""

for plugin in $LISTED_PLUGINS; do
    DIR_NAME=$(map_plugin_to_dir "$plugin")
    PLUGIN_DIR="$PLUGINS_DIR/$DIR_NAME"

    echo -e "${CYAN}▶ $plugin${NC} (dir: $DIR_NAME)"

    if [ ! -d "$PLUGIN_DIR" ]; then
        echo -e "  ${YELLOW}⚠  Directory not found: $PLUGIN_DIR${NC}"
        INCOMPLETE_PLUGINS+=("$plugin")
        echo ""
        continue
    fi

    # Check if plugin has agents/, commands/, or lib/ (basic structure)
    HAS_AGENTS=false
    HAS_COMMANDS=false
    HAS_LIB=false

    [ -d "$PLUGIN_DIR/agents" ] && HAS_AGENTS=true
    [ -d "$PLUGIN_DIR/commands" ] && HAS_COMMANDS=true
    [ -d "$PLUGIN_DIR/lib" ] && HAS_LIB=true

    if [ "$HAS_AGENTS" = false ] && [ "$HAS_COMMANDS" = false ] && [ "$HAS_LIB" = false ]; then
        echo -e "  ${RED}✗ INCOMPLETE (only has skills/)${NC}"
        INCOMPLETE_PLUGINS+=("$plugin")
        echo ""
        continue
    fi

    # Phase 2: Content depth validation
    if validate_plugin_content "$PLUGIN_DIR" "$plugin"; then
        COMPLETE_PLUGINS+=("$plugin")
    else
        INCOMPLETE_PLUGINS+=("$plugin")
    fi

    echo ""
done

# ============================================================
# Final Report
# ============================================================

echo "=========================================================="
echo -e "${BLUE}📊 Validation Results:${NC}"
echo ""
echo "  Total plugins:      ${TOTAL_LISTED}"
echo "  Complete plugins:   ${#COMPLETE_PLUGINS[@]}"
echo "  Incomplete plugins: ${#INCOMPLETE_PLUGINS[@]}"
echo ""

if [ ${#INCOMPLETE_PLUGINS[@]} -gt 0 ]; then
    echo -e "${RED}⚠️  VALIDATION FAILED!${NC}"
    echo ""
    echo -e "${YELLOW}Incomplete plugins found in marketplace.json:${NC}"
    for plugin in "${INCOMPLETE_PLUGINS[@]}"; do
        echo "  - $plugin"
    done
    echo ""
    echo -e "${YELLOW}These plugins MUST be removed from marketplace.json to prevent loading errors!${NC}"
    echo ""
    echo "To fix:"
    echo "  1. Remove these plugins from .claude-plugin/marketplace.json"
    echo "  2. Update bin/fix-marketplace-errors.sh to exclude them"
    echo "  3. Re-run this validation script"
    echo ""
    echo "Scoring Criteria:"
    echo "  - Commands: 40 points (≥1 .md file)"
    echo "  - Lib: 40 points (≥10 .js/.ts files)"
    echo "  - Agents: 30 points (≥1 AGENT.md + 3+ support files)"
    echo "  - Hooks: 20 points (≥1 .sh/.js file)"
    echo "  - Skills: 10 points (≥3 SKILL.md files)"
    echo "  - PASS: ≥40 points | PRODUCTION: ≥80 points"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ VALIDATION PASSED!${NC}"
    echo ""
    echo "All plugins in marketplace.json are complete and ready for distribution."
    echo ""
    echo -e "${CYAN}Health Score: 100%${NC}"
    echo ""
    exit 0
fi
