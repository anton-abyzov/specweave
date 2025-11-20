#!/usr/bin/env bash

# Validate Agent Invocation Instructions in Code and Documentation
#
# Prevents future "Agent type not found" errors by catching incorrect
# agent invocation patterns in comments, documentation, and code.
#
# CRITICAL PATTERNS TO DETECT:
# 1. "invoke skill" when referencing agents (should be "invoke agent")
# 2. Incorrect subagent_type format (missing plugin prefix or duplication)
# 3. Agent names without full {plugin}:{directory}:{name} format
#
# Run: bash scripts/validate-agent-invocation-instructions.sh
# Auto-fix: bash scripts/validate-agent-invocation-instructions.sh --fix

set -euo pipefail

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Validating Agent Invocation Instructions${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Pattern 1: Detect "invoke skill" when agent exists
echo -e "${BLUE}Checking for 'invoke skill' references to agents...${NC}"
echo ""

# Get all agent names
AGENT_NAMES=$(find plugins -type d -path "*/agents/*" -depth 2 | sed 's|.*/||' | sort -u)

for agent_name in $AGENT_NAMES; do
  # Check if this agent is incorrectly referred to as a "skill"

  # Search in TypeScript/JavaScript comments
  if git grep -n "invoke.*${agent_name}.*skill" -- '*.ts' '*.js' '*.md' 2>/dev/null | grep -v "INCIDENT-AGENT-TYPE" | grep -v "CLAUDE.md.*❌"; then
    echo -e "${RED}✗ ERROR: Agent '${agent_name}' incorrectly referenced as 'skill'${NC}"
    echo "  Context: See above matches"
    echo "  Fix: Change 'invoke skill' to 'invoke agent'"
    echo ""
    ((ERRORS++))
  fi
done

# Pattern 2: Detect incorrect subagent_type format in comments/docs
echo -e "${BLUE}Checking for incorrect subagent_type formats...${NC}"
echo ""

# Search for subagent_type patterns that are missing components
# Correct format: {plugin}:{directory}:{name}
# Common errors:
# - Missing plugin prefix: "increment-quality-judge-v2" instead of "specweave:..."
# - Missing duplication: "specweave:qa-lead" instead of "specweave:qa-lead:qa-lead"

if git grep -n 'subagent_type.*:.*"[^:]*"' -- '*.ts' '*.js' '*.md' 2>/dev/null | \
   grep -v 'specweave:.*:.*:' | \
   grep -v 'general-purpose' | \
   grep -v 'statusline-setup' | \
   grep -v 'claude-code-guide' | \
   grep -v 'code-reviewer' | \
   grep -v 'INCIDENT-AGENT-TYPE' | \
   grep -v 'CLAUDE.md.*❌' | \
   grep -v '# ERROR'; then
  echo -e "${RED}✗ ERROR: Found subagent_type with incorrect format (missing components)${NC}"
  echo "  Correct format: {plugin}:{directory}:{name}"
  echo "  Example: specweave:qa-lead:qa-lead"
  echo "  Fix: Add missing plugin prefix and/or directory/name"
  echo ""
  ((ERRORS++))
fi

# Pattern 3: Check TODO comments with agent invocations
echo -e "${BLUE}Checking TODO comments with agent references...${NC}"
echo ""

# Search for TODO comments that mention Task tool but use wrong format
if git grep -n 'TODO.*Task tool.*subagent_type.*"[^:]*"' -- '*.ts' '*.js' 2>/dev/null | \
   grep -v 'specweave:.*:.*:' | \
   grep -v 'INCIDENT-AGENT-TYPE'; then
  echo -e "${RED}✗ ERROR: TODO comment has incorrect subagent_type format${NC}"
  echo "  Fix: Use full format: {plugin}:{directory}:{name}"
  echo ""
  ((ERRORS++))
fi

# Pattern 4: Check command documentation for vague invocation instructions
echo -e "${BLUE}Checking command documentation for clear invocation instructions...${NC}"
echo ""

# Search for command docs that say "invoke" but don't specify HOW
if git grep -n 'Invoke.*quality.*judge' -- 'plugins/specweave/commands/*.md' 2>/dev/null | \
   grep -v 'Task tool' | \
   grep -v 'subagent_type' | \
   grep -v '```typescript'; then
  echo -e "${YELLOW}⚠ WARNING: Command documentation mentions invocation without showing HOW${NC}"
  echo "  Recommendation: Add explicit Task tool example with correct subagent_type"
  echo ""
  ((WARNINGS++))
fi

# Pattern 5: Verify AGENTS-INDEX.md has correct formats
echo -e "${BLUE}Checking AGENTS-INDEX.md for consistency...${NC}"
echo ""

if [[ -f "plugins/specweave/agents/AGENTS-INDEX.md" ]]; then
  # Check all subagent_type references follow the pattern
  INCORRECT_COUNT=$(grep 'subagent_type.*:.*"[^:]*"' plugins/specweave/agents/AGENTS-INDEX.md 2>/dev/null | \
    grep -v 'specweave:.*:.*:' | \
    grep -v 'code-reviewer' | \
    wc -l | tr -d ' ')

  if [[ $INCORRECT_COUNT -gt 0 ]]; then
    echo -e "${RED}✗ ERROR: AGENTS-INDEX.md has $INCORRECT_COUNT incorrect subagent_type formats${NC}"
    grep -n 'subagent_type.*:.*"[^:]*"' plugins/specweave/agents/AGENTS-INDEX.md | \
      grep -v 'specweave:.*:.*:' | \
      grep -v 'code-reviewer' # file-based agent exception
    echo ""
    ((ERRORS++))
  else
    echo -e "${GREEN}✓ AGENTS-INDEX.md uses correct formats${NC}"
    echo ""
  fi
else
  echo -e "${YELLOW}⚠ WARNING: AGENTS-INDEX.md not found${NC}"
  echo ""
  ((WARNINGS++))
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ERRORS -eq 0 ]] && [[ $WARNINGS -eq 0 ]]; then
  echo -e "${GREEN}✅ VALIDATION PASSED!${NC}"
  echo "   No incorrect agent invocation instructions found."
  echo ""
  exit 0
elif [[ $ERRORS -eq 0 ]]; then
  echo -e "${YELLOW}⚠ WARNINGS ONLY (${WARNINGS} found)${NC}"
  echo "   Consider addressing warnings for clarity."
  echo ""
  exit 0
else
  echo -e "${RED}✗ VALIDATION FAILED!${NC}"
  echo "   Errors: $ERRORS"
  echo "   Warnings: $WARNINGS"
  echo ""
  echo "Common fixes:"
  echo "  1. Change 'invoke skill' to 'invoke agent' for agent references"
  echo "  2. Use full subagent_type: specweave:{directory}:{name}"
  echo "  3. Add explicit Task tool examples in documentation"
  echo ""
  exit 1
fi
