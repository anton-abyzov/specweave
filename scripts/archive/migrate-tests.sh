#!/bin/bash

# Migrate test-cases and test-results from skills to root tests folder
# This script moves test specifications and results to centralized locations

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      SpecWeave Test Migration                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Create test structure
mkdir -p tests/specs
mkdir -p tests/integration
mkdir -p test-results

migrated_count=0
cleaned_count=0

# Find all skills with test-cases
echo "📦 Migrating test specifications from skills..."
echo ""

for skill_dir in .claude/skills/*/; do
    skill_name=$(basename "$skill_dir")

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
done

echo ""
echo "✅ Migrated test specs from $migrated_count skills"
echo ""

# Reorganize existing integration tests into skill folders
echo "📦 Reorganizing integration tests..."
echo ""

# Create skill-specific directories in integration tests
mkdir -p tests/integration/jira-sync
mkdir -p tests/integration/ado-sync

# Move existing tests to skill folders
if [ -f "tests/integration/jira-sync.test.ts" ]; then
    echo "  ✅ Moving jira-sync.test.ts..."
    mv tests/integration/jira-sync.test.ts tests/integration/jira-sync/
fi

if [ -f "tests/integration/jira-bidirectional-sync.test.ts" ]; then
    echo "  ✅ Moving jira-bidirectional-sync.test.ts..."
    mv tests/integration/jira-bidirectional-sync.test.ts tests/integration/jira-sync/
fi

if [ -f "tests/integration/jira-incremental-sync.test.ts" ]; then
    echo "  ✅ Moving jira-incremental-sync.test.ts..."
    mv tests/integration/jira-incremental-sync.test.ts tests/integration/jira-sync/
fi

if [ -f "tests/integration/ado-sync.test.ts" ]; then
    echo "  ✅ Moving ado-sync.test.ts..."
    mv tests/integration/ado-sync.test.ts tests/integration/ado-sync/
fi

echo ""
echo "✅ Integration tests reorganized"
echo ""

# Clean up skills - remove test-cases and test-results folders
echo "🧹 Cleaning up skills folders..."
echo ""

for skill_dir in .claude/skills/*/; do
    skill_name=$(basename "$skill_dir")

    if [ -d "$skill_dir/test-cases" ]; then
        echo "  🗑️  Removing $skill_name/test-cases..."
        rm -rf "$skill_dir/test-cases"
        cleaned_count=$((cleaned_count + 1))
    fi

    if [ -d "$skill_dir/test-results" ]; then
        echo "  🗑️  Removing $skill_name/test-results..."
        rm -rf "$skill_dir/test-results"
    fi
done

echo ""
echo "✅ Cleaned up $cleaned_count skills"
echo ""

# Create README for test structure
cat > tests/specs/README.md << 'EOF'
# Test Specifications

This directory contains test specifications (test plans) for SpecWeave skills.

## Structure

```
tests/specs/
├── jira-sync/
│   ├── test-1.yaml
│   ├── test-2.yaml
│   └── test-3.yaml
├── ado-sync/
│   └── ...
└── skill-name/
    └── test-*.yaml
```

## Test Specification Format

Each YAML file describes a test case:

```yaml
---
name: "Test Name"
description: "What this test validates"
input:
  prompt: "User input or command"
expected_output:
  skill_activated: true
  agent_invoked: "agent-name"
  result: "expected result"
---
```

## Executable Tests

Executable integration tests are in `tests/integration/skill-name/`.
EOF

echo "📄 Created tests/specs/README.md"
echo ""

# Summary
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      Migration Complete                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  ✅ Migrated test specs from $migrated_count skills to tests/specs/"
echo "  ✅ Reorganized integration tests into tests/integration/skill-name/"
echo "  ✅ Cleaned up $cleaned_count skills (removed test-cases/test-results)"
echo ""
echo "New structure:"
echo "  tests/"
echo "    ├── specs/skill-name/         # Test specifications (YAML)"
echo "    ├── integration/skill-name/   # Executable integration tests"
echo "    ├── unit/                     # Unit tests"
echo "    ├── e2e/                      # End-to-end tests"
echo "    └── smoke/                    # Smoke tests"
echo ""
echo "  test-results/                   # All test results (JSON)"
echo "    └── skill-name/               # Organized by skill"
echo ""
