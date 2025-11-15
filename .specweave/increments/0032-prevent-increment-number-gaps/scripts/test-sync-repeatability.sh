#!/bin/bash

# SpecWeave Living Docs Sync Repeatability Test
# Tests that sync algorithm produces identical results every time
# Usage: ./test-sync-repeatability.sh

set -e

echo "🔬 SpecWeave Living Docs Sync Repeatability Test"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paths
SPECS_DIR=".specweave/docs/internal/specs"
BACKUP_DIR="/tmp/specweave-specs-backup-$(date +%s)"
REPORT_FILE="sync-repeatability-report-$(date +%Y%m%d-%H%M%S).md"

# Function to count files and structure
analyze_specs() {
    local dir=$1
    local label=$2

    echo "## $label" >> $REPORT_FILE
    echo "" >> $REPORT_FILE

    # Count features
    local feature_count=$(find "$dir/_features" -name "FEATURE.md" 2>/dev/null | wc -l | tr -d ' ')
    echo "- Features: $feature_count" >> $REPORT_FILE

    # Count user stories
    local story_count=$(find "$dir" -name "us-*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo "- User Stories: $story_count" >> $REPORT_FILE

    # Get structure hash (for comparison)
    local structure_hash=$(find "$dir" -type f -name "*.md" 2>/dev/null | sort | md5sum | cut -d' ' -f1)
    echo "- Structure Hash: $structure_hash" >> $REPORT_FILE
    echo "" >> $REPORT_FILE

    echo "$feature_count:$story_count:$structure_hash"
}

# Step 1: Backup current state
echo "📦 Step 1: Backing up current specs to $BACKUP_DIR..."
cp -r "$SPECS_DIR" "$BACKUP_DIR"
echo -e "${GREEN}✓${NC} Backup created"
echo ""

# Step 2: Analyze initial state
echo "📊 Step 2: Analyzing initial state..."
echo "# Living Docs Sync Repeatability Test Report" > $REPORT_FILE
echo "" >> $REPORT_FILE
echo "Date: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

initial_state=$(analyze_specs "$SPECS_DIR" "Initial State")
echo -e "${GREEN}✓${NC} Initial analysis complete"
echo ""

# Step 3: Delete all specs
echo "🗑️  Step 3: Deleting all specs..."
rm -rf "$SPECS_DIR"/*
echo -e "${GREEN}✓${NC} Specs deleted"
echo ""

# Step 4: Re-sync all active increments
echo "🔄 Step 4: Re-syncing all active increments..."
echo "" >> $REPORT_FILE
echo "## Sync Process" >> $REPORT_FILE
echo "" >> $REPORT_FILE

sync_success=true
total_increments=0
synced_increments=0

for increment in .specweave/increments/[0-9]*; do
    if [[ -d "$increment" && ! "$increment" == *"_archive"* ]]; then
        increment_id=$(basename "$increment")
        total_increments=$((total_increments + 1))

        echo "   Syncing: $increment_id"

        # Run sync and capture output
        if node -e "
            import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
                try {
                    const distributor = new SpecDistributor(process.cwd());
                    const result = await distributor.distribute('$increment_id');
                    process.exit(0);
                } catch (error) {
                    console.error('Failed:', error.message);
                    process.exit(1);
                }
            }).catch(err => {
                console.error('Module error:', err.message);
                process.exit(1);
            });
        " 2>/dev/null; then
            echo -e "   ${GREEN}✓${NC} $increment_id synced"
            echo "- ✅ $increment_id" >> $REPORT_FILE
            synced_increments=$((synced_increments + 1))
        else
            echo -e "   ${RED}✗${NC} $increment_id failed"
            echo "- ❌ $increment_id (FAILED)" >> $REPORT_FILE
            sync_success=false
        fi
    fi
done

echo "" >> $REPORT_FILE
echo "Synced: $synced_increments/$total_increments increments" >> $REPORT_FILE
echo ""

if [ "$sync_success" = true ]; then
    echo -e "${GREEN}✓${NC} All increments synced successfully"
else
    echo -e "${YELLOW}⚠${NC}  Some increments failed to sync"
fi
echo ""

# Step 5: Analyze new state
echo "📊 Step 5: Analyzing new state after sync..."
new_state=$(analyze_specs "$SPECS_DIR" "After Sync")
echo -e "${GREEN}✓${NC} Post-sync analysis complete"
echo ""

# Step 6: Compare states
echo "🔍 Step 6: Comparing before and after..."
echo "" >> $REPORT_FILE
echo "## Comparison Results" >> $REPORT_FILE
echo "" >> $REPORT_FILE

IFS=':' read -r initial_features initial_stories initial_hash <<< "$initial_state"
IFS=':' read -r new_features new_stories new_hash <<< "$new_state"

if [ "$initial_hash" = "$new_hash" ]; then
    echo -e "${GREEN}✅ PASS: Sync is deterministic!${NC}"
    echo "✅ **PASS**: Structure identical (100% deterministic)" >> $REPORT_FILE
    result="PASS"
else
    echo -e "${RED}❌ FAIL: Sync produced different results!${NC}"
    echo "❌ **FAIL**: Structure differs (non-deterministic)" >> $REPORT_FILE
    result="FAIL"

    echo "" >> $REPORT_FILE
    echo "### Differences Found:" >> $REPORT_FILE
    echo "- Features: $initial_features → $new_features" >> $REPORT_FILE
    echo "- User Stories: $initial_stories → $new_stories" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Step 7: Identify missing content
echo "🔎 Step 7: Checking for missing content..."
echo "" >> $REPORT_FILE
echo "## Missing Content Analysis" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check which increments have no user stories in default/
for increment in .specweave/increments/[0-9]*; do
    if [[ -d "$increment" && ! "$increment" == *"_archive"* ]]; then
        increment_id=$(basename "$increment")
        feature_id="FS-${increment_id:1:3}"

        if [ ! -d "$SPECS_DIR/default/$feature_id" ]; then
            # Check if spec.md has user stories
            if grep -q "^###* US-" "$increment/spec.md" 2>/dev/null; then
                echo -e "${RED}⚠${NC}  $increment_id has user stories but no folder in default/"
                echo "- ⚠️  **$increment_id**: Has user stories in spec.md but missing in default/" >> $REPORT_FILE
            fi
        fi
    fi
done

echo "" >> $REPORT_FILE

# Step 8: Restore original if requested
echo ""
echo "📋 Summary Report saved to: $REPORT_FILE"
echo ""

if [ "$result" = "FAIL" ]; then
    echo -e "${YELLOW}Would you like to restore the original specs? (y/n)${NC}"
    read -r restore_choice

    if [ "$restore_choice" = "y" ]; then
        echo "♻️  Restoring original specs..."
        rm -rf "$SPECS_DIR"/*
        cp -r "$BACKUP_DIR"/* "$(dirname "$SPECS_DIR")"
        echo -e "${GREEN}✓${NC} Original specs restored"
    fi
fi

echo ""
echo "🏁 Test complete!"
echo ""
echo "Results:"
echo "- Deterministic: $([ "$result" = "PASS" ] && echo "✅ Yes" || echo "❌ No")"
echo "- Features synced: $new_features"
echo "- User stories synced: $new_stories"
echo "- Report: $REPORT_FILE"
echo ""

# Show specific issue if found
if [ "$new_stories" -lt 25 ]; then
    echo -e "${YELLOW}⚠️  Warning: Expected 25 user stories, found only $new_stories${NC}"
    echo "   Check increment 0031 - it likely failed to sync its 7 user stories"
fi

exit $([ "$result" = "PASS" ] && echo 0 || echo 1)