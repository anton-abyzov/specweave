#!/bin/bash
# ============================================================================
# Internal Docs Audit & Fix Script
# ============================================================================
# Purpose: Analyze and fix naming conventions, duplicates, and structure issues
# Usage: ./docs-audit-and-fix.sh [audit|fix|fix-adr|fix-names|report]
# ============================================================================

set -euo pipefail

DOCS_ROOT="/Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal"
ADR_DIR="$DOCS_ROOT/architecture/adr"
REPORT_FILE="$DOCS_ROOT/scripts/audit-report.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# AUDIT FUNCTIONS
# ============================================================================

audit_adr_title_mismatches() {
    echo -e "${BLUE}=== ADR Title/Number Mismatches ===${NC}"
    local count=0

    for file in "$ADR_DIR"/[0-9]*.md; do
        [[ -f "$file" ]] || continue
        filename=$(basename "$file" .md)
        file_number=$(echo "$filename" | grep -oE '^[0-9]+')

        # Extract ADR number from first heading
        title_number=$(head -20 "$file" | grep -oE 'ADR-[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "")

        if [[ -n "$title_number" && "$title_number" != "$file_number" ]]; then
            echo -e "${RED}MISMATCH:${NC} $filename"
            echo "  File number: $file_number"
            echo "  Title says:  ADR-$title_number"
            ((count++))
        fi
    done

    echo -e "\n${YELLOW}Total mismatches: $count${NC}"
}

audit_duplicate_adr_topics() {
    echo -e "\n${BLUE}=== Duplicate/Overlapping ADR Topics ===${NC}"

    echo -e "\n${YELLOW}Smart Pagination (should be 1 ADR):${NC}"
    ls -la "$ADR_DIR"/*pagination* "$ADR_DIR"/*smart-pagination* 2>/dev/null | awk '{print $NF}' || true

    echo -e "\n${YELLOW}CLI-First Defaults (should be 1 ADR):${NC}"
    ls -la "$ADR_DIR"/*cli-first* 2>/dev/null | awk '{print $NF}' || true

    echo -e "\n${YELLOW}Progress Tracking (should be 1-2 ADRs):${NC}"
    ls -la "$ADR_DIR"/*progress* 2>/dev/null | awk '{print $NF}' || true

    echo -e "\n${YELLOW}Phase Detection (should be 1 ADR):${NC}"
    ls -la "$ADR_DIR"/*phase-detection* 2>/dev/null | awk '{print $NF}' || true

    echo -e "\n${YELLOW}Cost Tracking (should be 1 ADR):${NC}"
    ls -la "$ADR_DIR"/*cost* 2>/dev/null | awk '{print $NF}' || true

    echo -e "\n${YELLOW}Model Selection (should be 1 ADR):${NC}"
    ls -la "$ADR_DIR"/*model-selection* 2>/dev/null | awk '{print $NF}' || true
}

audit_naming_conventions() {
    echo -e "\n${BLUE}=== Naming Convention Issues ===${NC}"

    echo -e "\n${YELLOW}Files with underscores (should use hyphens):${NC}"
    find "$DOCS_ROOT" -name "*_*" -type f | grep -v "_archive" | grep -v "_epics" || echo "  None found"

    echo -e "\n${YELLOW}Redundant prefixes (hld- in hld/ folder):${NC}"
    ls "$DOCS_ROOT/architecture/hld/"hld-* 2>/dev/null || echo "  None found"

    echo -e "\n${YELLOW}UPPERCASE files (review needed):${NC}"
    find "$DOCS_ROOT" -name "*.md" -exec basename {} \; | grep -E "^[A-Z].*[A-Z]" | grep -v README | grep -v FEATURE | sort -u
}

audit_adr_gaps() {
    echo -e "\n${BLUE}=== ADR Number Gaps ===${NC}"

    local prev=0
    local gaps=""

    for file in "$ADR_DIR"/[0-9]*.md; do
        [[ -f "$file" ]] || continue
        num=$(basename "$file" .md | grep -oE '^[0-9]+' | sed 's/^0*//')

        if [[ $((num - prev)) -gt 1 && $prev -gt 0 ]]; then
            gap_start=$((prev + 1))
            gap_end=$((num - 1))
            if [[ $gap_start -eq $gap_end ]]; then
                gaps="$gaps $gap_start"
            else
                gaps="$gaps $gap_start-$gap_end"
            fi
        fi
        prev=$num
    done

    echo "Missing ADR numbers:$gaps"
}

# ============================================================================
# FIX FUNCTIONS
# ============================================================================

fix_adr_titles() {
    echo -e "${BLUE}=== Fixing ADR Title Mismatches ===${NC}"

    for file in "$ADR_DIR"/[0-9]*.md; do
        [[ -f "$file" ]] || continue
        filename=$(basename "$file" .md)
        file_number=$(echo "$filename" | grep -oE '^[0-9]+')

        # Get the actual title from first H1
        first_line=$(head -1 "$file")

        if [[ "$first_line" =~ ^#[[:space:]]ADR-([0-9]+) ]]; then
            title_number="${BASH_REMATCH[1]}"

            if [[ "$title_number" != "$file_number" ]]; then
                echo -e "${YELLOW}Fixing:${NC} $filename (ADR-$title_number → ADR-$file_number)"

                # Create backup
                cp "$file" "$file.bak"

                # Fix the title - replace ADR-XXXX with correct number
                sed -i '' "1s/ADR-$title_number/ADR-$file_number/" "$file"

                echo -e "${GREEN}  Fixed!${NC}"
            fi
        fi
    done
}

fix_underscore_names() {
    echo -e "\n${BLUE}=== Fixing Underscore Filenames ===${NC}"

    find "$DOCS_ROOT" -name "*_*" -type f | grep -v "_archive" | grep -v "_epics" | while read -r file; do
        dir=$(dirname "$file")
        oldname=$(basename "$file")
        newname=$(echo "$oldname" | tr '_' '-')

        if [[ "$oldname" != "$newname" ]]; then
            echo -e "${YELLOW}Renaming:${NC} $oldname → $newname"
            mv "$file" "$dir/$newname"
            echo -e "${GREEN}  Done!${NC}"
        fi
    done
}

fix_hld_prefixes() {
    echo -e "\n${BLUE}=== Fixing Redundant hld- Prefixes ===${NC}"

    local hld_dir="$DOCS_ROOT/architecture/hld"

    for file in "$hld_dir"/hld-*.md; do
        [[ -f "$file" ]] || continue
        oldname=$(basename "$file")
        newname="${oldname#hld-}"

        echo -e "${YELLOW}Renaming:${NC} $oldname → $newname"
        mv "$file" "$hld_dir/$newname"
        echo -e "${GREEN}  Done!${NC}"
    done
}

fix_uppercase_to_lowercase() {
    echo -e "\n${BLUE}=== Converting Non-Critical UPPERCASE to lowercase ===${NC}"

    # Files that should remain UPPERCASE:
    # - README.md (standard)
    # - FEATURE.md (living docs standard)
    # - *-RECOVERY.md (emergency runbooks)
    # - *-TEMPLATE.md (templates)

    local files_to_convert=(
        "architecture/ARCHITECTURE-OVERVIEW.md:architecture-overview.md"
        "architecture/DESIGN-GIT-PROVIDER-ABSTRACTION.md:design-git-provider-abstraction.md"
        "architecture/diagrams/COMPREHENSIVE-DIAGRAMS.md:comprehensive-diagrams.md"
        "governance/CRITICAL-BUGS-PREVENTION.md:critical-bugs-prevention.md"
        "operations/MARKETPLACE-SOURCE-DISCIPLINE.md:marketplace-source-discipline.md"
        "operations/CONTEXT-EXPLOSION-PREVENTION.md:context-explosion-prevention.md"
        "operations/CIRCUIT-BREAKER-MONITORING.md:circuit-breaker-monitoring.md"
    )

    for entry in "${files_to_convert[@]}"; do
        oldpath="${entry%:*}"
        newname="${entry#*:}"

        oldfile="$DOCS_ROOT/$oldpath"
        newfile="$DOCS_ROOT/$(dirname "$oldpath")/$newname"

        if [[ -f "$oldfile" ]]; then
            echo -e "${YELLOW}Renaming:${NC} $(basename "$oldpath") → $newname"
            mv "$oldfile" "$newfile"
            echo -e "${GREEN}  Done!${NC}"
        fi
    done
}

# ============================================================================
# REPORT GENERATION
# ============================================================================

generate_report() {
    echo -e "${BLUE}=== Generating Audit Report ===${NC}"

    cat > "$REPORT_FILE" << 'REPORT_HEADER'
# Internal Docs Audit Report

**Generated**: $(date +%Y-%m-%d)
**Total Files**: $(find "$DOCS_ROOT" -name "*.md" -type f | wc -l | tr -d ' ')

---

## Executive Summary

### Critical Issues Found

REPORT_HEADER

    {
        echo "# Internal Docs Audit Report"
        echo ""
        echo "**Generated**: $(date +%Y-%m-%d)"
        echo "**Total Files**: $(find "$DOCS_ROOT" -name "*.md" -type f | wc -l | tr -d ' ')"
        echo ""
        echo "---"
        echo ""
        echo "## 1. ADR Title/Number Mismatches"
        echo ""
        echo "These ADRs have filename numbers that don't match the title inside:"
        echo ""
        echo "| Filename | Title Says | Status |"
        echo "|----------|------------|--------|"

        for file in "$ADR_DIR"/[0-9]*.md; do
            [[ -f "$file" ]] || continue
            filename=$(basename "$file" .md)
            file_number=$(echo "$filename" | grep -oE '^[0-9]+')
            title_number=$(head -20 "$file" | grep -oE 'ADR-[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "")

            if [[ -n "$title_number" && "$title_number" != "$file_number" ]]; then
                echo "| $filename | ADR-$title_number | ❌ MISMATCH |"
            fi
        done

        echo ""
        echo "## 2. Duplicate ADR Topics"
        echo ""
        echo "### Smart Pagination"
        ls "$ADR_DIR"/*pagination* "$ADR_DIR"/*smart-pagination* 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /' || echo "- None"

        echo ""
        echo "### CLI-First Defaults"
        ls "$ADR_DIR"/*cli-first* 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /' || echo "- None"

        echo ""
        echo "### Progress Tracking"
        ls "$ADR_DIR"/*progress* 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /' || echo "- None"

        echo ""
        echo "## 3. Naming Convention Issues"
        echo ""
        echo "### Underscore Files"
        find "$DOCS_ROOT" -name "*_*" -type f | grep -v "_archive" | grep -v "_epics" | xargs -I{} basename {} | sed 's/^/- /' || echo "- None"

        echo ""
        echo "### UPPERCASE Policy Violations"
        echo ""
        echo "Files that should be lowercase (not emergency/template):"
        echo ""
        echo "- ARCHITECTURE-OVERVIEW.md → architecture-overview.md"
        echo "- DESIGN-GIT-PROVIDER-ABSTRACTION.md → design-git-provider-abstraction.md"
        echo "- COMPREHENSIVE-DIAGRAMS.md → comprehensive-diagrams.md"
        echo ""
        echo "## 4. Recommended UPPERCASE Policy"
        echo ""
        echo "**KEEP UPPERCASE:**"
        echo "- README.md (standard)"
        echo "- FEATURE.md (living docs)"
        echo "- *-RECOVERY.md (emergency runbooks)"
        echo "- *-TEMPLATE.md (templates)"
        echo ""
        echo "**CONVERT TO lowercase:**"
        echo "- Overview docs"
        echo "- Design docs"
        echo "- Monitoring docs (non-emergency)"
        echo ""
        echo "## 5. Structure Recommendations for Wiki"
        echo ""
        echo "### Current Issues"
        echo "- Too many nested levels"
        echo "- ADRs overwhelming (134 files)"
        echo "- Guides scattered across folders"
        echo "- No clear entry point"
        echo ""
        echo "### Proposed Structure"
        echo "\`\`\`"
        echo "internal/"
        echo "├── README.md                    # Getting started index"
        echo "├── architecture/"
        echo "│   ├── decisions/               # ADRs (renamed from adr/)"
        echo "│   ├── concepts/"
        echo "│   ├── diagrams/"
        echo "│   └── hld/"
        echo "├── guides/                      # Consolidated guides"
        echo "├── runbooks/                    # Emergency & operational docs"
        echo "├── governance/"
        echo "├── delivery/"
        echo "└── specs/                       # Living docs"
        echo "\`\`\`"

    } > "$REPORT_FILE"

    echo -e "${GREEN}Report generated: $REPORT_FILE${NC}"
}

# ============================================================================
# MAIN
# ============================================================================

case "${1:-audit}" in
    audit)
        audit_adr_title_mismatches
        audit_duplicate_adr_topics
        audit_naming_conventions
        audit_adr_gaps
        ;;
    fix)
        fix_adr_titles
        fix_underscore_names
        fix_hld_prefixes
        ;;
    fix-adr)
        fix_adr_titles
        ;;
    fix-names)
        fix_underscore_names
        fix_hld_prefixes
        ;;
    fix-uppercase)
        fix_uppercase_to_lowercase
        ;;
    report)
        generate_report
        ;;
    all)
        audit_adr_title_mismatches
        audit_duplicate_adr_topics
        audit_naming_conventions
        audit_adr_gaps
        echo ""
        echo "Run './docs-audit-and-fix.sh fix' to apply fixes"
        ;;
    *)
        echo "Usage: $0 [audit|fix|fix-adr|fix-names|fix-uppercase|report|all]"
        echo ""
        echo "Commands:"
        echo "  audit       - Run all audits (default)"
        echo "  fix         - Apply safe fixes (ADR titles, underscores, hld prefixes)"
        echo "  fix-adr     - Fix only ADR title mismatches"
        echo "  fix-names   - Fix only filename issues"
        echo "  fix-uppercase - Convert non-critical UPPERCASE to lowercase"
        echo "  report      - Generate markdown audit report"
        echo "  all         - Run audit and show fix command"
        exit 1
        ;;
esac
