#!/bin/bash

# SpecWeave Installation Script
# Installs SpecWeave framework to any project directory
#
# Usage: ./install.sh [OPTIONS] /path/to/target/project
#
# Options:
#   --enable-github-actions    Enable GitHub Actions workflows
#   --tier <starter|standard|enterprise>  Choose workflow tier (default: starter)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located (SpecWeave root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SPECWEAVE_ROOT="$SCRIPT_DIR"

# Parse command-line arguments
ENABLE_GITHUB_ACTIONS=false
WORKFLOW_TIER="starter"
SKIP_CLAUDE_MD=false
TARGET_DIR=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --enable-github-actions)
      ENABLE_GITHUB_ACTIONS=true
      shift
      ;;
    --tier)
      WORKFLOW_TIER="$2"
      shift 2
      ;;
    --skip-claude-md)
      SKIP_CLAUDE_MD=true
      shift
      ;;
    *)
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

# Check if target directory is provided
if [ -z "$TARGET_DIR" ]; then
  echo -e "${RED}❌ Error: Target directory not provided${NC}"
  echo ""
  echo "Usage: $0 [OPTIONS] <target-directory>"
  echo ""
  echo "Options:"
  echo "  --enable-github-actions              Enable GitHub Actions workflows"
  echo "  --tier <starter|standard|enterprise> Choose workflow tier (default: starter)"
  echo "  --skip-claude-md                     Don't replace existing CLAUDE.md (preserve it)"
  echo ""
  echo "Example:"
  echo "  $0 /Users/antonabyzov/Projects/TestLab/specweave-event-mgmt"
  echo "  $0 --enable-github-actions --tier standard /path/to/project"
  echo "  $0 --skip-claude-md /path/to/specweave-project  # For dogfooding/reinstall"
  echo ""
  echo "What gets installed:"
  echo "  ✅ SpecWeave agents from src/agents/ → .claude/agents/"
  echo "  ✅ SpecWeave skills from src/skills/ → .claude/skills/"
  echo "  ✅ Slash commands from src/commands/ → .claude/commands/"
  echo "  ✅ Automation hooks from src/hooks/ → .claude/hooks/"
  echo "  ✅ SpecWeave directory structure (.specweave/)"
  echo "  ✅ Development guide (CLAUDE.md)"
  echo "  ✅ GitHub Actions workflows (if --enable-github-actions)"
  echo ""
  echo "What does NOT get copied:"
  echo "  ❌ Development .claude/ (may have non-SpecWeave agents/skills)"
  echo "  ❌ ai-logs/ (SpecWeave internal only - not used)"
  echo "  ❌ src/ (SpecWeave source code)"
  echo ""
  echo "Note: All work happens in .specweave/, your app code in root"
  echo ""
  exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SpecWeave Installation${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Source:      ${YELLOW}$SPECWEAVE_ROOT${NC}"
echo -e "Destination: ${YELLOW}$TARGET_DIR${NC}"
echo ""

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${YELLOW}⚠️  Target directory doesn't exist. Creating...${NC}"
  mkdir -p "$TARGET_DIR"
fi

# Change to target directory
cd "$TARGET_DIR"

echo -e "${GREEN}✅ Target directory ready${NC}"
echo ""

# ============================================================
# 1. Install .claude/ directory (agents, skills, commands, hooks)
# ============================================================

echo -e "${BLUE}📦 Installing .claude/ framework files...${NC}"

# Create .claude directory
mkdir -p .claude

# ============================================================
# 1.1 Copy Agents from src/agents/ (SOURCE OF TRUTH)
# ============================================================

if [ -d "$SPECWEAVE_ROOT/src/agents" ]; then
  echo -e "   ${GREEN}→${NC} Copying SpecWeave agents from src/agents/..."

  mkdir -p .claude/agents

  # Copy each agent directory from src/agents/ to .claude/agents/
  agent_count=0
  for agent_dir in "$SPECWEAVE_ROOT/src/agents"/*; do
    if [ -d "$agent_dir" ]; then
      agent_name=$(basename "$agent_dir")

      # Check if agent has AGENT.md (valid SpecWeave agent)
      if [ -f "$agent_dir/AGENT.md" ]; then
        echo -e "      Copying $agent_name..."

        # Temporarily disable set -e to capture cp errors
        set +e
        cp_output=$(cp -r "$agent_dir" .claude/agents/ 2>&1)
        cp_exit_code=$?
        set -e

        if [ $cp_exit_code -ne 0 ]; then
          echo -e "   ${RED}❌ Failed to copy agent: $agent_name${NC}"
          echo -e "   ${RED}   Source: $agent_dir${NC}"
          echo -e "   ${RED}   Destination: .claude/agents/${NC}"
          echo -e "   ${RED}   Exit code: $cp_exit_code${NC}"
          echo -e "   ${RED}   Error output: $cp_output${NC}"
          exit 1
        fi
        agent_count=$((agent_count + 1))
      fi
    fi
  done

  echo -e "   ${GREEN}✅${NC} Installed $agent_count SpecWeave agents"
else
  echo -e "   ${YELLOW}⚠️  No agents found in src/agents/${NC}"
fi

# ============================================================
# 1.2 Copy Skills from src/skills/ (SOURCE OF TRUTH)
# ============================================================

if [ -d "$SPECWEAVE_ROOT/src/skills" ]; then
  echo -e "   ${GREEN}→${NC} Copying SpecWeave skills from src/skills/..."

  mkdir -p .claude/skills

  # Copy each skill directory from src/skills/ to .claude/skills/
  skill_count=0
  for skill_dir in "$SPECWEAVE_ROOT/src/skills"/*; do
    if [ -d "$skill_dir" ]; then
      skill_name=$(basename "$skill_dir")

      # Check if skill has SKILL.md (valid SpecWeave skill)
      if [ -f "$skill_dir/SKILL.md" ]; then
        cp -r "$skill_dir" .claude/skills/
        skill_count=$((skill_count + 1))
      fi
    fi
  done

  echo -e "   ${GREEN}✅${NC} Installed $skill_count SpecWeave skills"
else
  echo -e "   ${YELLOW}⚠️  No skills found in src/skills/${NC}"
fi

# ============================================================
# 1.3 Copy Commands from src/commands/ (SOURCE OF TRUTH)
# ============================================================

if [ -d "$SPECWEAVE_ROOT/src/commands" ]; then
  echo -e "   ${GREEN}→${NC} Copying slash commands from src/commands/..."

  mkdir -p .claude/commands

  # Copy all .md command files directly from src/commands/
  cmd_count=0
  for cmd_file in "$SPECWEAVE_ROOT/src/commands"/*.md; do
    if [ -f "$cmd_file" ]; then
      cmd_name=$(basename "$cmd_file")
      cp "$cmd_file" ".claude/commands/${cmd_name}"
      cmd_count=$((cmd_count + 1))
    fi
  done

  echo -e "   ${GREEN}✅${NC} Installed $cmd_count slash commands"
else
  echo -e "   ${YELLOW}⚠️  No commands found in src/commands/${NC}"
fi

# ============================================================
# 1.4 Copy Hooks from src/hooks/ (SOURCE OF TRUTH)
# ============================================================

if [ -d "$SPECWEAVE_ROOT/src/hooks" ]; then
  echo -e "   ${GREEN}→${NC} Copying automation hooks from src/hooks/..."

  mkdir -p .claude/hooks

  # Copy all .sh files from src/hooks/
  hook_count=0
  for hook_file in "$SPECWEAVE_ROOT/src/hooks"/*.sh; do
    if [ -f "$hook_file" ]; then
      cp "$hook_file" .claude/hooks/
      hook_count=$((hook_count + 1))
    fi
  done

  # Make hooks executable
  chmod +x .claude/hooks/*.sh 2>/dev/null || true

  echo -e "   ${GREEN}✅${NC} Installed $hook_count hooks (made executable)"
else
  echo -e "   ${YELLOW}⚠️  No hooks found in src/hooks/${NC}"
fi

echo ""

# ============================================================
# 1.5 Copy GitHub Actions Workflows (Optional)
# ============================================================

if [ "$ENABLE_GITHUB_ACTIONS" = true ]; then
  echo -e "${BLUE}🤖 Installing GitHub Actions workflows...${NC}"

  mkdir -p .github/workflows

  # Determine which workflow file to copy based on tier
  case "$WORKFLOW_TIER" in
    starter)
      WORKFLOW_FILE="specweave-starter.yml"
      ;;
    standard)
      WORKFLOW_FILE="specweave-standard.yml"
      ;;
    enterprise)
      WORKFLOW_FILE="specweave-enterprise.yml"
      ;;
    *)
      echo -e "   ${RED}❌${NC} Invalid tier: $WORKFLOW_TIER (must be starter, standard, or enterprise)"
      exit 1
      ;;
  esac

  if [ -f "$SPECWEAVE_ROOT/.github/workflows/$WORKFLOW_FILE" ]; then
    cp "$SPECWEAVE_ROOT/.github/workflows/$WORKFLOW_FILE" .github/workflows/
    echo -e "   ${GREEN}✅${NC} Installed $WORKFLOW_FILE ($WORKFLOW_TIER tier)"
    echo ""
    echo -e "   ${BLUE}ℹ️  GitHub Actions Setup Required:${NC}"
    echo -e "      1. Add ANTHROPIC_API_KEY to repository secrets"
    echo -e "      2. See: .specweave/docs/public/guides/github-action-setup.md"
  else
    echo -e "   ${YELLOW}⚠️  Workflow file not found: $WORKFLOW_FILE${NC}"
  fi

  echo ""
else
  echo -e "${BLUE}ℹ️  GitHub Actions not enabled${NC}"
  echo -e "   To enable: Use --enable-github-actions flag"
  echo -e "   Example: ./install.sh --enable-github-actions --tier standard $TARGET_DIR"
  echo ""
fi

# ============================================================
# 2. Install .specweave/ configuration
# ============================================================

echo -e "${BLUE}⚙️  Installing .specweave/ configuration...${NC}"

# Create .specweave directory structure (Enterprise 6-Pillar Architecture)
# NOTE: logs, scripts, reports live INSIDE each increment folder
mkdir -p .specweave/{cache,increments,tests}

# Internal Documentation (6 Pillars - NOT published)
mkdir -p .specweave/docs/internal/{strategy,specs,architecture/{adr,diagrams},delivery,operations,governance}

# Public Documentation (Customer-facing - PUBLISHED)
mkdir -p .specweave/docs/public/{overview,api,guides,faq,changelog}

echo -e "   ${GREEN}✅${NC} Directory structure created"

# Copy documentation template READMEs (5-Pillar Structure)
if [ -d "$SPECWEAVE_ROOT/.specweave/docs" ]; then
  echo -e "   ${GREEN}→${NC} Copying documentation templates..."

  # Copy main docs README
  [ -f "$SPECWEAVE_ROOT/.specweave/docs/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/README.md" .specweave/docs/

  # Copy internal pillar READMEs
  [ -f "$SPECWEAVE_ROOT/.specweave/docs/internal/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/internal/README.md" .specweave/docs/internal/

  [ -f "$SPECWEAVE_ROOT/.specweave/docs/internal/strategy/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/internal/strategy/README.md" .specweave/docs/internal/strategy/

  [ -f "$SPECWEAVE_ROOT/.specweave/docs/internal/architecture/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/internal/architecture/README.md" .specweave/docs/internal/architecture/

  [ -f "$SPECWEAVE_ROOT/.specweave/docs/internal/delivery/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/internal/delivery/README.md" .specweave/docs/internal/delivery/

  [ -f "$SPECWEAVE_ROOT/.specweave/docs/internal/operations/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/internal/operations/README.md" .specweave/docs/internal/operations/

  [ -f "$SPECWEAVE_ROOT/.specweave/docs/internal/governance/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/internal/governance/README.md" .specweave/docs/internal/governance/

  # Copy public docs README
  [ -f "$SPECWEAVE_ROOT/.specweave/docs/public/README.md" ] && \
    cp "$SPECWEAVE_ROOT/.specweave/docs/public/README.md" .specweave/docs/public/

  echo -e "   ${GREEN}✅${NC} Documentation templates installed"
fi

# Copy increments README (with filtering - NO DEPRECATED.md, NO README-old-features.md)
if [ -f "$SPECWEAVE_ROOT/.specweave/increments/README.md" ]; then
  echo -e "   ${GREEN}→${NC} Copying increments README..."
  cp "$SPECWEAVE_ROOT/.specweave/increments/README.md" .specweave/increments/
  echo -e "   ${GREEN}✅${NC} Increments README installed"
fi

echo ""

# ============================================================
# 3. Copy CLAUDE.md template (with backup of existing)
# ============================================================

if [ "$SKIP_CLAUDE_MD" = true ]; then
  echo -e "${BLUE}📄 Skipping CLAUDE.md...${NC}"
  echo -e "   ${GREEN}✅${NC} CLAUDE.md preserved (--skip-claude-md flag used)"
  echo ""
else
  echo -e "${BLUE}📄 Installing CLAUDE.md...${NC}"

  # Check if CLAUDE.md already exists (brownfield project)
  if [ -f "CLAUDE.md" ]; then
    TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    mkdir -p .claude/backups

    echo -e "   ${YELLOW}⚠️  Existing CLAUDE.md detected${NC}"
    cp CLAUDE.md ".claude/backups/CLAUDE-backup-${TIMESTAMP}.md"
    echo -e "   ${GREEN}✅${NC} Backup created: .claude/backups/CLAUDE-backup-${TIMESTAMP}.md"
    echo -e "   ${BLUE}ℹ️  Run 'specweave merge-docs' after installation to intelligently merge${NC}"
  fi

  if [ -f "$SPECWEAVE_ROOT/CLAUDE.md" ]; then
    cp "$SPECWEAVE_ROOT/CLAUDE.md" ./
    echo -e "   ${GREEN}✅${NC} CLAUDE.md installed (SpecWeave development guide)"
  else
    echo -e "   ${YELLOW}⚠️  No CLAUDE.md found in source${NC}"
  fi

  echo ""
fi

# ============================================================
# 4. Installation complete - minimal structure ready
# ============================================================

echo -e "${BLUE}📁 Installation structure ready${NC}"
echo ""
echo -e "   ${BLUE}ℹ️${NC}  Increment-centric organization:"
echo -e "       • All work in .specweave/increments/{increment-id}/"
echo -e "       • Each increment has logs/, scripts/, reports/ folders"
echo -e "       • Documentation in .specweave/docs/"
echo -e "       • No global logs or work folders - everything in increments"

echo ""

# ============================================================
# 5. Create .gitignore
# ============================================================

echo -e "${BLUE}🚫 Creating .gitignore...${NC}"

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.log

# Production
build/
dist/
.next/
out/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Cache
.specweave/cache/

# Increment Logs (inside each increment folder)
.specweave/increments/*/logs/
.specweave/increments/*/scripts/*.tmp
.specweave/increments/*/reports/*.tmp

# Test Results
tests/skills/**/test-results/
src/skills/**/test-results/
**/test-results/

# AI Execution Files (optional - uncomment if you want to keep these private)
# ai-execution-files/prototypes/
# ai-execution-files/reports/*.tmp

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
EOF

echo -e "   ${GREEN}✅${NC} .gitignore created"

echo ""

# ============================================================
# Summary
# ============================================================

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Installation Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Installed Components:${NC}"
echo ""
echo -e "  ${GREEN}✅${NC} AI Agents             (.claude/agents/) - 14 specialized agents"
echo -e "  ${GREEN}✅${NC} Claude Code Skills    (.claude/skills/) - 15+ capabilities"
echo -e "  ${GREEN}✅${NC} Slash Commands        (.claude/commands/)"
echo -e "  ${GREEN}✅${NC} Automation Hooks      (.claude/hooks/)"
echo -e "  ${GREEN}✅${NC} Directory Structure   (.specweave/)"
if [ "$SKIP_CLAUDE_MD" = true ]; then
  echo -e "  ${YELLOW}⏭️${NC}  Development Guide     (CLAUDE.md) - Preserved (not replaced)"
else
  echo -e "  ${GREEN}✅${NC} Development Guide     (CLAUDE.md)"
fi
if [ "$ENABLE_GITHUB_ACTIONS" = true ]; then
  echo -e "  ${GREEN}✅${NC} GitHub Actions        (.github/workflows/$WORKFLOW_FILE)"
fi
echo ""
echo -e "${BLUE}What was NOT copied:${NC}"
echo ""
echo -e "  ${YELLOW}❌${NC} src/                  (SpecWeave source code - not needed in projects)"
echo -e "  ${YELLOW}❌${NC} ai-logs/              (SpecWeave development only - deprecated)"
echo -e "  ${YELLOW}❌${NC} Framework internals   (only runtime files copied)"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "  1. ${YELLOW}cd $TARGET_DIR${NC}"
echo -e "  2. ${YELLOW}# Initialize your project (npm init, etc.)${NC}"

# Check if CLAUDE.md backup was created
if [ -f ".claude/backups/CLAUDE-backup-"*.md 2>/dev/null ]; then
  echo -e "  3. ${YELLOW}# Merge your old CLAUDE.md content:${NC}"
  echo -e "     ${YELLOW}Ask Claude: 'merge docs' or 'specweave merge-docs'${NC}"
  echo -e "     ${GREEN}(Intelligently extracts project-specific content to SpecWeave folders)${NC}"
  echo -e "  4. ${YELLOW}# Initialize your project (npm init, etc.)${NC}"
  echo -e "  5. ${YELLOW}# Open in Claude Code and start building!${NC}"
else
  echo -e "  3. ${YELLOW}# Initialize your project (npm init, etc.)${NC}"
  echo -e "  4. ${YELLOW}# Open in Claude Code and start building!${NC}"
fi
echo ""
echo -e "${BLUE}Example Usage in Claude Code:${NC}"
echo ""
echo -e "  ${GREEN}# Use slash commands:${NC}"
echo -e "  /specweave inc \"event management SaaS\""
echo ""
echo -e "  ${GREEN}# Or give high-level request:${NC}"
echo -e "  \"Create a SaaS for event management with calendar booking.\""
echo -e "  \"Tech stack: Next.js 14 + PostgreSQL\""
echo -e "  \"Work autonomously using SpecWeave skills.\""
echo ""
echo -e "${BLUE}Project Structure:${NC}"
echo ""
echo -e "  ${TARGET_DIR}"
echo -e "  ├── .claude/              ${GREEN}← Claude Code integration${NC}"
echo -e "  │   ├── skills/           ${GREEN}← SpecWeave autonomous AI agents${NC}"
echo -e "  │   ├── commands/         ${GREEN}← Slash commands${NC}"
echo -e "  │   └── hooks/            ${GREEN}← Automation hooks${NC}"
echo -e "  ├── .specweave/           ${GREEN}← SpecWeave framework (all work lives here)${NC}"
echo -e "  │   ├── increments/       ${GREEN}← Development increments${NC}"
echo -e "  │   └── docs/             ${GREEN}← Living documentation (auto-updated)${NC}"
echo -e "  └── CLAUDE.md             ${GREEN}← Complete development guide${NC}"
echo -e ""
echo -e "  ${BLUE}Your application code:${NC}"
echo -e "  ├── app/                  ${YELLOW}← Next.js app (or your framework)${NC}"
echo -e "  ├── components/           ${YELLOW}← React components${NC}"
echo -e "  ├── lib/                  ${YELLOW}← Utilities${NC}"
echo -e "  ├── prisma/               ${YELLOW}← Database schema${NC}"
echo -e "  └── ... (framework-specific folders)${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "  - CLAUDE.md is your complete development guide"
echo -e "  - All SpecWeave skills are now available via Claude Code"
echo -e "  - ALL work happens in .specweave/increments/"
echo -e "  - ALL documentation lives in .specweave/docs/"
echo -e "  - Hooks will auto-update documentation as you work"
echo -e "  - Your application code lives in root (app/, components/, lib/, etc.)"
echo ""
echo -e "${GREEN}Happy coding with SpecWeave! 🚀${NC}"
echo ""

exit 0
