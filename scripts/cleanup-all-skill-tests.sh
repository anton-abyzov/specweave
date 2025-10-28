#!/bin/bash

# Comprehensive cleanup of ALL test folders from ALL skill directories
# Migrates test-cases to root tests/specs and removes test-results

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      Comprehensive Skill Test Cleanup                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Create test structure
mkdir -p tests/specs
mkdir -p tests/integration
mkdir -p test-results

migrated_count=0
cleaned_count=0

# Function to migrate tests from a skill directory
migrate_skill_tests() {
    local skill_dir=$1
    local skill_name=$(basename "$skill_dir")

    # Migrate test-cases (YAML specs)
    if [ -d "$skill_dir/test-cases" ]; then
        if [ "$(ls -A $skill_dir/test-cases 2>/dev/null)" ]; then
            echo "  ✅ Migrating $skill_name test-cases..."
            mkdir -p "tests/specs/$skill_name"
            cp -r "$skill_dir/test-cases/"* "tests/specs/$skill_name/" 2>/dev/null || true
            migrated_count=$((migrated_count + 1))
        fi
    fi

    # Migrate test-results (if any real results exist)
    if [ -d "$skill_dir/test-results" ]; then
        if [ "$(ls -A $skill_dir/test-results 2>/dev/null | grep -v README)" ]; then
            echo "  ✅ Migrating $skill_name test-results..."
            mkdir -p "test-results/$skill_name"
            cp -r "$skill_dir/test-results/"* "test-results/$skill_name/" 2>/dev/null || true
        fi
    fi
}

# Function to clean up test folders from skill directory
cleanup_skill_tests() {
    local skill_dir=$1
    local skill_name=$(basename "$skill_dir")

    if [ -d "$skill_dir/test-cases" ]; then
        echo "  🗑️  Removing $skill_name/test-cases..."
        rm -rf "$skill_dir/test-cases"
        cleaned_count=$((cleaned_count + 1))
    fi

    if [ -d "$skill_dir/test-results" ]; then
        echo "  🗑️  Removing $skill_name/test-results..."
        rm -rf "$skill_dir/test-results"
    fi
}

echo "📦 Migrating test specifications from .claude/skills..."
echo ""

# Process .claude/skills
if [ -d ".claude/skills" ]; then
    for skill_dir in .claude/skills/*/; do
        if [ -d "$skill_dir" ]; then
            migrate_skill_tests "$skill_dir"
        fi
    done
fi

echo ""
echo "📦 Migrating test specifications from src/skills..."
echo ""

# Process src/skills
if [ -d "src/skills" ]; then
    for skill_dir in src/skills/*/; do
        if [ -d "$skill_dir" ]; then
            migrate_skill_tests "$skill_dir"
        fi
    done
fi

echo ""
echo "✅ Migrated test specs from $migrated_count skills"
echo ""

echo "🧹 Cleaning up .claude/skills folders..."
echo ""

if [ -d ".claude/skills" ]; then
    for skill_dir in .claude/skills/*/; do
        if [ -d "$skill_dir" ]; then
            cleanup_skill_tests "$skill_dir"
        fi
    done
fi

echo ""
echo "🧹 Cleaning up src/skills folders..."
echo ""

if [ -d "src/skills" ]; then
    for skill_dir in src/skills/*/; do
        if [ -d "$skill_dir" ]; then
            cleanup_skill_tests "$skill_dir"
        fi
    done
fi

echo ""
echo "✅ Cleaned up $cleaned_count skills"
echo ""

# Verify cleanup
remaining=$(find .claude/skills src/skills -type d \( -name "test-results" -o -name "test-cases" \) 2>/dev/null | wc -l)

if [ "$remaining" -gt 0 ]; then
    echo "⚠️  Warning: $remaining test folders still remain:"
    find .claude/skills src/skills -type d \( -name "test-results" -o -name "test-cases" \) 2>/dev/null
else
    echo "✅ All test folders successfully removed from skills!"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      Cleanup Complete                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  ✅ Migrated test specs from $migrated_count skills"
echo "  ✅ Cleaned up $cleaned_count skills"
echo "  ✅ Remaining test folders: $remaining"
echo ""
echo "New structure:"
echo "  tests/specs/skill-name/         # All test specifications (YAML)"
echo "  tests/integration/skill-name/   # Executable integration tests"
echo "  test-results/                   # All test results (JSON)"
echo ""
