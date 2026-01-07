#!/bin/bash
# reflect-check.sh - Reflection System Health Check
#
# Diagnostic tool to validate reflection system health and troubleshoot issues.
# Runs the same pre-flight checks as stop-reflect.sh hook.
#
# Usage: bash reflect-check.sh

set +e  # Don't exit on errors - we want to report all issues

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
REFLECT_CONFIG="$STATE_DIR/reflect-config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
MEMORY_DIR="$PROJECT_ROOT/.specweave/memory"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFLECT_SCRIPT="$SCRIPT_DIR/reflect.sh"
HOOK_SCRIPT="$SCRIPT_DIR/../hooks/stop-reflect.sh"

# Colors for output (fallback if tput unavailable or no TERM)
if command -v tput >/dev/null 2>&1 && [ -n "$TERM" ]; then
    GREEN=$(tput setaf 2 2>/dev/null || echo "")
    RED=$(tput setaf 1 2>/dev/null || echo "")
    YELLOW=$(tput setaf 3 2>/dev/null || echo "")
    BLUE=$(tput setaf 4 2>/dev/null || echo "")
    RESET=$(tput sgr0 2>/dev/null || echo "")
else
    GREEN="" RED="" YELLOW="" BLUE="" RESET=""
fi

# ============================================================================
# CHECK FUNCTIONS
# ============================================================================

check_passed=0
check_failed=0
recommendations=()

check_result() {
    local status="$1"
    local message="$2"
    local detail="${3:-}"

    if [ "$status" = "pass" ]; then
        echo "${GREEN}✅${RESET} $message"
        [ -n "$detail" ] && echo "   $detail"
        check_passed=$((check_passed + 1))
    elif [ "$status" = "fail" ]; then
        echo "${RED}❌${RESET} $message"
        [ -n "$detail" ] && echo "   $detail"
        check_failed=$((check_failed + 1))
    elif [ "$status" = "warn" ]; then
        echo "${YELLOW}⚠️${RESET}  $message"
        [ -n "$detail" ] && echo "   $detail"
    else
        echo "${BLUE}ℹ️${RESET}  $message"
        [ -n "$detail" ] && echo "   $detail"
    fi
}

add_recommendation() {
    recommendations+=("$1")
}

# ============================================================================
# MAIN CHECKS
# ============================================================================

main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "${BLUE}🔍 REFLECT HEALTH CHECK${RESET}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # ========================================
    # CHECK 1: Configuration
    # ========================================

    echo "${BLUE}📋 Configuration${RESET}"

    if [ -f "$REFLECT_CONFIG" ]; then
        if jq empty "$REFLECT_CONFIG" 2>/dev/null; then
            check_result "pass" "Config file found and valid"

            local auto=$(jq -r '.autoReflect // false' "$REFLECT_CONFIG" 2>/dev/null)
            local enabled=$(jq -r '.enabled // true' "$REFLECT_CONFIG" 2>/dev/null)
            local max=$(jq -r '.maxLearningsPerSession // 10' "$REFLECT_CONFIG" 2>/dev/null)
            local conf=$(jq -r '.confidenceThreshold // "medium"' "$REFLECT_CONFIG" 2>/dev/null)

            check_result "info" "Auto-reflect: $auto"
            check_result "info" "Enabled: $enabled"
            check_result "info" "Max learnings/session: $max"
            check_result "info" "Confidence threshold: $conf"

            if [ "$auto" = "false" ]; then
                add_recommendation "Auto-reflect is OFF. Run '/sw:reflect-on' to enable automatic learning."
            fi
        else
            check_result "fail" "Config file exists but has invalid JSON"
            add_recommendation "Fix config file: $REFLECT_CONFIG"
        fi
    else
        check_result "fail" "Config file not found"
        add_recommendation "Run '/sw:reflect-on' to initialize reflection system"
    fi

    echo ""

    # ========================================
    # CHECK 2: Script Syntax
    # ========================================

    echo "${BLUE}📝 Script Validation${RESET}"

    if [ -f "$REFLECT_SCRIPT" ]; then
        if bash -n "$REFLECT_SCRIPT" 2>/dev/null; then
            check_result "pass" "reflect.sh syntax valid"
        else
            check_result "fail" "reflect.sh has syntax errors"
            local errors=$(bash -n "$REFLECT_SCRIPT" 2>&1)
            echo "   ${RED}Errors:${RESET}"
            echo "$errors" | head -5 | sed 's/^/   /'
            add_recommendation "Fix syntax errors in $REFLECT_SCRIPT"
            add_recommendation "Check for unresolved merge conflicts (<<<<<, =====, >>>>>)"
        fi
    else
        check_result "fail" "reflect.sh not found"
        add_recommendation "Script missing at: $REFLECT_SCRIPT"
    fi

    if [ -f "$HOOK_SCRIPT" ]; then
        if bash -n "$HOOK_SCRIPT" 2>/dev/null; then
            check_result "pass" "stop-reflect.sh syntax valid"
        else
            check_result "fail" "stop-reflect.sh has syntax errors"
            add_recommendation "Fix syntax errors in $HOOK_SCRIPT"
        fi
    else
        check_result "warn" "stop-reflect.sh hook not found"
    fi

    echo ""

    # ========================================
    # CHECK 3: Dependencies
    # ========================================

    echo "${BLUE}🔧 Dependencies${RESET}"

    if command -v jq >/dev/null 2>&1; then
        local jq_version=$(jq --version 2>/dev/null || echo "unknown")
        check_result "pass" "jq found" "$jq_version"
    else
        check_result "fail" "jq not found"
        add_recommendation "Install jq: brew install jq (macOS) or apt install jq (Linux)"
    fi

    if command -v bash >/dev/null 2>&1; then
        local bash_version=$(bash --version 2>/dev/null | head -1)
        check_result "pass" "bash found" "$bash_version"
    else
        check_result "fail" "bash not found"
    fi

    echo ""

    # ========================================
    # CHECK 4: Recent Activity
    # ========================================

    echo "${BLUE}📊 Recent Activity${RESET}"

    if [ -f "$LOGS_DIR/reflect.log" ]; then
        local recent=$(tail -10 "$LOGS_DIR/reflect.log" 2>/dev/null)
        if [ -n "$recent" ]; then
            check_result "pass" "Found recent reflection activity"
            echo ""
            echo "   ${BLUE}Last 10 log entries:${RESET}"
            echo "$recent" | while IFS= read -r line; do
                local level=$(echo "$line" | jq -r '.lvl // "info"' 2>/dev/null || echo "info")
                local msg=$(echo "$line" | jq -r '.msg // ""' 2>/dev/null || echo "$line")
                local ts=$(echo "$line" | jq -r '.ts // ""' 2>/dev/null || echo "")

                case "$level" in
                    error) echo "   ${RED}[$ts] ERROR: $msg${RESET}" ;;
                    warn)  echo "   ${YELLOW}[$ts] WARN: $msg${RESET}" ;;
                    *)     echo "   [$ts] $msg" ;;
                esac
            done
        else
            check_result "warn" "Log file exists but is empty"
        fi
    else
        check_result "warn" "No reflection log found"
        add_recommendation "Reflection may not have run yet. Trigger it with '/sw:reflect'."
    fi

    if [ -f "$LOGS_DIR/auto-reflect.log" ]; then
        local errors=$(grep -i "error\|syntax" "$LOGS_DIR/auto-reflect.log" 2>/dev/null | tail -3)
        if [ -n "$errors" ]; then
            echo ""
            echo "   ${RED}Recent errors in auto-reflect.log:${RESET}"
            echo "$errors" | sed 's/^/   /'
            add_recommendation "Check full log: $LOGS_DIR/auto-reflect.log"
        fi
    fi

    echo ""

    # ========================================
    # CHECK 5: Memory Status
    # ========================================

    echo "${BLUE}📚 Memory Status${RESET}"

    if [ -d "$MEMORY_DIR" ]; then
        local total_rules=0
        local file_count=0

        for f in "$MEMORY_DIR"/*.md; do
            if [ -f "$f" ]; then
                local name=$(basename "$f" .md)
                local count=$(grep -c "^- " "$f" 2>/dev/null || echo 0)
                count=$(echo "$count" | tr -d '\n' | tr -d ' ')  # Remove whitespace

                if [ "$count" -gt 0 ] 2>/dev/null; then
                    check_result "info" "$name.md: $count learnings"
                else
                    check_result "info" "$name.md: 0 learnings (empty)"
                fi

                total_rules=$((total_rules + count))
                file_count=$((file_count + 1))
            fi
        done

        echo ""
        check_result "info" "Total: $total_rules learnings across $file_count files"

        if [ "$total_rules" -eq 0 ]; then
            add_recommendation "No learnings captured yet. Create a learning with user corrections."
        fi
    else
        check_result "warn" "Memory directory not found"
        add_recommendation "Memory directory will be created on first reflection"
    fi

    echo ""

    # ========================================
    # SUMMARY
    # ========================================

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "${BLUE}📊 SUMMARY${RESET}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Checks passed: ${GREEN}$check_passed${RESET}"
    echo "Checks failed: ${RED}$check_failed${RESET}"
    echo ""

    if [ ${#recommendations[@]} -gt 0 ]; then
        echo "${YELLOW}💡 RECOMMENDATIONS${RESET}"
        for rec in "${recommendations[@]}"; do
            echo "   • $rec"
        done
        echo ""
    else
        echo "${GREEN}✅ System is healthy - no issues found${RESET}"
        echo ""
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Exit with error if critical checks failed
    if [ "$check_failed" -gt 0 ]; then
        return 1
    fi

    return 0
}

main "$@"
