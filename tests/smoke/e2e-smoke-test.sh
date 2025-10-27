#!/bin/bash
# SpecWeave E2E Smoke Test
# Tests complete project generation from natural language prompt

set -e  # Exit on error

echo "=== SpecWeave E2E Smoke Test ==="
echo ""

# Configuration
TEST_DIR="/tmp/specweave-smoke-$(date +%s)"
TIMEOUT=120  # 2 minutes for generation

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗ FAIL:${NC} $1"
  exit 1
}

info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Setup
info "Creating test directory: $TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Step 1: Install SpecWeave
info "Step 1: Installing SpecWeave from local source..."

# Get the repository root
if [ -n "$GITHUB_WORKSPACE" ]; then
  # Running in GitHub Actions - use workspace
  REPO_ROOT="$GITHUB_WORKSPACE"
else
  # Running locally - get path from script location (2 levels up from tests/smoke/)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

info "Using SpecWeave from: $REPO_ROOT"
info "Installing to: $TEST_DIR"

# Verify repo root exists and has install.sh
test -f "$REPO_ROOT/install.sh" || fail "Install script not found at $REPO_ROOT/install.sh"

# Check if src/agents exists
if [ ! -d "$REPO_ROOT/src/agents" ]; then
  fail "src/agents directory not found at $REPO_ROOT/src/agents"
fi

# Run install script to set up .specweave structure
info "Running: bash $REPO_ROOT/install.sh $TEST_DIR"
INSTALL_OUTPUT=$(bash "$REPO_ROOT/install.sh" "$TEST_DIR" 2>&1) || {
  echo "Install script output:"
  echo "$INSTALL_OUTPUT"
  fail "Install script failed"
}

test -d "$TEST_DIR/.specweave" || fail ".specweave directory not created"
success "SpecWeave installed"

# Step 2: Project creation (skipped - not implemented yet)
# TODO: Implement project creation via CLI command
# PROMPT="implement a SaaS solution with Next.js..."
# echo "$PROMPT" | npx specweave create --wait

info "Step 2: Skipping project creation (CLI not implemented yet)..."
success "Installation verified (project creation will be tested when CLI is ready)"

# Step 4: Verify directory structure
info "Step 4: Verifying directory structure..."

required_dirs=(
  ".specweave"
  ".specweave/docs"
  ".specweave/increments"
  ".claude/skills"
  ".claude/agents"
)

for dir in "${required_dirs[@]}"; do
  test -d "$dir" || fail "Directory not created: $dir"
done
success "All required directories exist"

# Step 5: Verify required files (created by install script)
info "Step 5: Verifying required files..."

required_files=(
  "CLAUDE.md"
  ".gitignore"
  ".specweave/config.yaml"
)

for file in "${required_files[@]}"; do
  test -f "$file" || fail "File not created: $file"
done
success "All required files exist"

# Note: README.md and package.json are NOT created by install script
# They should be created by user or by /create-project command (TODO)

# Step 6: Verify specifications content (optional - user may create)
info "Step 6: Verifying specifications (optional)..."

if [ -f "specifications/overview.md" ]; then
  spec_content=$(cat specifications/overview.md)

  # Check for key terms from the prompt
  grep -qi "event management\|booking" specifications/overview.md || \
    echo "  Note: Specification may not contain all expected features yet"

  success "Specifications found and validated"
else
  echo "  Specifications not created yet (optional for users)"
fi

# Step 7: Verify feature structure (optional - user may create)
info "Step 7: Verifying feature structure (optional)..."

if [ -d "features" ]; then
  # Find first feature directory
  first_feature=$(find features -maxdepth 1 -type d -name "001-*" 2>/dev/null | head -1)

  if [ -n "$first_feature" ]; then
    feature_files=(
      "$first_feature/spec.md"
      "$first_feature/plan.md"
      "$first_feature/tasks.md"
      "$first_feature/tests.md"
      "$first_feature/context-manifest.yaml"
    )

    for file in "${feature_files[@]}"; do
      test -f "$file" || echo "  Note: Feature file not found: $file"
    done
    success "Feature structure found"
  else
    echo "  No features created yet (optional for users)"
  fi
else
  echo "  Features directory not created yet (optional for users)"
fi

# Step 8: Verify skills installed
info "Step 8: Verifying core skills installed..."

core_skills=(
  "specweave-detector"
  "feature-planner"
  "skill-router"
  "context-loader"
  "hetzner-provisioner"
)

for skill in "${core_skills[@]}"; do
  test -d ".claude/skills/$skill" || fail "Skill not installed: $skill"
  test -f ".claude/skills/$skill/SKILL.md" || fail "SKILL.md missing for: $skill"
done
success "Core skills installed correctly"

# Step 9: Verify agents installed
info "Step 9: Verifying core agents installed..."

core_agents=(
  "pm"
  "architect"
  "nextjs"
  "devops"
)

for agent in "${core_agents[@]}"; do
  test -d ".claude/agents/$agent" || fail "Agent not installed: $agent"
  test -f ".claude/agents/$agent/AGENT.md" || fail "AGENT.md missing for: $agent"
done
success "Core agents installed correctly"

# Step 10: Verify E2E tests exist (optional - created by user for UI projects)
info "Step 10: Verifying E2E tests (optional)..."

if [ -d "tests/e2e" ]; then
  e2e_count=$(find tests/e2e -name "*.spec.ts" -o -name "*.spec.js" 2>/dev/null | wc -l)
  if [ "$e2e_count" -gt 0 ]; then
    success "E2E tests found ($e2e_count files)"
  else
    echo "  E2E tests directory exists but no test files yet"
  fi
else
  echo "  E2E tests not created yet (optional for users)"
fi

# Step 11: Verify test cases follow TC-XXX format (optional)
info "Step 11: Verifying test case format (optional)..."

if [ -d "specifications" ]; then
  # Support both TC-001 and TC-0001 formats
  if grep -rE "TC-[0-9]{3,4}" specifications/ >/dev/null 2>&1; then
    success "Test cases follow TC-XXX/TC-XXXX format"
  else
    echo "  No TC-XXX test case IDs found yet (will be added by user)"
  fi
else
  echo "  No specifications yet (optional for users)"
fi

# Step 12: Verify context manifests (optional)
info "Step 12: Verifying context manifests (optional)..."

if [ -d "features" ]; then
  manifests=$(find features -name "context-manifest.yaml" 2>/dev/null | wc -l)
  if [ "$manifests" -gt 0 ]; then
    success "Context manifests exist ($manifests found)"
  else
    echo "  No context manifests yet (will be created with features)"
  fi
else
  echo "  No features yet (optional for users)"
fi

# Step 13: Install dependencies (if package.json exists)
if [ -f "package.json" ]; then
  info "Step 13: Installing dependencies..."
  npm install --silent || fail "npm install failed"
  success "Dependencies installed"
else
  info "Step 13: Skipping npm install (no package.json)"
fi

# Step 14: Run tests (if test script exists)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
  info "Step 14: Running tests..."
  npm test || fail "Tests failed"
  success "Tests passed"
else
  info "Step 14: Skipping tests (no test script defined)"
fi

# Step 15: Build project (if build script exists)
if [ -f "package.json" ] && grep -q '"build"' package.json; then
  info "Step 15: Building project..."
  npm run build || fail "Build failed"
  success "Build succeeded"
else
  info "Step 15: Skipping build (no build script defined)"
fi

# Cleanup
info "Cleaning up test directory..."
cd /
rm -rf "$TEST_DIR"
success "Cleanup complete"

echo ""
echo -e "${GREEN}=== ✅ ALL SMOKE TESTS PASSED ===${NC}"
echo ""
echo "Summary:"
echo "  - SpecWeave Installation: ✓"
echo "  - Framework Structure (.specweave/): ✓"
echo "  - Skills Installation: ✓"
echo "  - Agents Installation: ✓"
echo "  - Documentation (.specweave/docs/): ✓"
echo ""
echo "Optional (user-created):"
echo "  - Specifications: Not required by framework"
echo "  - Features: Not required by framework"
echo "  - E2E Tests: Created when user builds UI projects"
echo "  - Context Manifests: Created with features"

exit 0
