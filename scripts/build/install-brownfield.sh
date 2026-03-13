#!/bin/bash

# SpecWeave Brownfield Installation Script
# Safely installs SpecWeave in existing projects with backup/merge logic

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp for backups
TIMESTAMP=$(date +%s)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}SpecWeave Brownfield Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to backup directory
backup_directory() {
    local dir=$1
    local backup_dir="${dir}.backup-${TIMESTAMP}"

    if [ -d "$dir" ]; then
        echo -e "${YELLOW}⚠️  Existing directory found: $dir${NC}"
        echo -e "${YELLOW}   Creating backup: $backup_dir${NC}"
        cp -R "$dir" "$backup_dir"
        echo -e "${GREEN}   ✅ Backup created${NC}"
        return 0
    fi
    return 1
}

# Function to merge directories (preserves user files)
merge_directories() {
    local backup_dir=$1
    local target_dir=$2

    if [ -d "$backup_dir" ]; then
        echo -e "${BLUE}   Restoring user files (non-conflicting)...${NC}"

        # Copy user files back, but don't overwrite SpecWeave files
        find "$backup_dir" -type f | while read -r file; do
            relative_path="${file#$backup_dir/}"
            target_file="$target_dir/$relative_path"

            # Only copy if target doesn't exist OR doesn't have specweave prefix
            if [ ! -f "$target_file" ] || [[ ! "$relative_path" =~ specweave- ]]; then
                mkdir -p "$(dirname "$target_file")"
                cp "$file" "$target_file"
                echo -e "${GREEN}     ✓ Preserved: $relative_path${NC}"
            fi
        done
    fi
}

# Step 1: Check if project is greenfield or brownfield
echo -e "${BLUE}📊 Analyzing project...${NC}"
echo ""

if [ ! -d ".claude" ] && [ ! -d ".specweave" ]; then
    echo -e "${GREEN}✅ Greenfield project detected (no existing .claude/ or .specweave/)${NC}"
    echo -e "${GREEN}   Safe to install without conflicts${NC}"
    PROJECT_TYPE="greenfield"
else
    echo -e "${YELLOW}⚠️  Brownfield project detected (existing .claude/ or .specweave/)${NC}"
    echo -e "${YELLOW}   Will backup existing files before installation${NC}"
    PROJECT_TYPE="brownfield"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Step 2: Backup existing directories
if [ "$PROJECT_TYPE" = "brownfield" ]; then
    echo ""
    echo -e "${BLUE}📦 Backing up existing directories...${NC}"
    echo ""

    BACKUPS_CREATED=0

    # Backup .claude/commands/
    if backup_directory ".claude/commands"; then
        COMMANDS_BACKUP=".claude/commands.backup-${TIMESTAMP}"
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
    fi

    # Backup .claude/skills/
    if backup_directory ".claude/skills"; then
        SKILLS_BACKUP=".claude/skills.backup-${TIMESTAMP}"
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
    fi

    # Backup .claude/hooks/
    if backup_directory ".claude/hooks"; then
        HOOKS_BACKUP=".claude/hooks.backup-${TIMESTAMP}"
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
    fi

    # Backup existing .specweave/ (if exists)
    if backup_directory ".specweave"; then
        SPECWEAVE_BACKUP=".specweave.backup-${TIMESTAMP}"
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
    fi

    if [ $BACKUPS_CREATED -eq 0 ]; then
        echo -e "${GREEN}   No existing directories to backup${NC}"
    else
        echo ""
        echo -e "${GREEN}✅ Created $BACKUPS_CREATED backup(s) with timestamp: $TIMESTAMP${NC}"
    fi

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

# Step 3: Install SpecWeave structure
echo ""
echo -e "${BLUE}📥 Installing SpecWeave...${NC}"
echo ""

# Create directory structure
echo -e "${BLUE}   Creating directory structure...${NC}"
mkdir -p .claude/commands
mkdir -p .claude/skills
mkdir -p .claude/hooks
mkdir -p .specweave/increments/_backlog
mkdir -p .specweave/docs/internal/{strategy,architecture,operations,delivery,governance}
mkdir -p .specweave/docs/public/{guides,api,overview}

echo -e "${GREEN}   ✅ Directory structure created${NC}"

# Copy SpecWeave commands (with specweave- prefix)
echo ""
echo -e "${BLUE}   Installing SpecWeave commands...${NC}"

# Assuming this script is in scripts/ directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPECWEAVE_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -d "$SPECWEAVE_ROOT/.claude/commands" ]; then
    # Copy only specweave-* commands (avoid collision)
    cp "$SPECWEAVE_ROOT/.claude/commands"/specweave*.md .claude/commands/

    COMMANDS_COUNT=$(ls -1 .claude/commands/specweave*.md 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}   ✅ Installed $COMMANDS_COUNT SpecWeave commands${NC}"
else
    echo -e "${RED}   ❌ Error: Could not find SpecWeave commands to install${NC}"
    exit 1
fi

# Copy SpecWeave skills (with specweave- prefix in skill name)
echo ""
echo -e "${BLUE}   Installing SpecWeave skills...${NC}"

if [ -d "$SPECWEAVE_ROOT/.claude/skills" ]; then
    # Copy skills to .claude/skills/ with specweave- prefix
    # Note: Skills should already have namespaced names in their SKILL.md

    for skill_dir in "$SPECWEAVE_ROOT/.claude/skills"/*; do
        if [ -d "$skill_dir" ]; then
            skill_name=$(basename "$skill_dir")
            # Copy skill directory
            cp -R "$skill_dir" .claude/skills/
        fi
    done

    SKILLS_COUNT=$(find .claude/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}   ✅ Installed $SKILLS_COUNT SpecWeave skills${NC}"
else
    echo -e "${YELLOW}   ⚠️  No SpecWeave skills to install${NC}"
fi

# Copy SpecWeave hooks (with specweave- prefix)
echo ""
echo -e "${BLUE}   Installing SpecWeave hooks...${NC}"

if [ -d "$SPECWEAVE_ROOT/.claude/hooks" ]; then
    cp "$SPECWEAVE_ROOT/.claude/hooks"/specweave-*.sh .claude/hooks/ 2>/dev/null || true

    HOOKS_COUNT=$(ls -1 .claude/hooks/specweave-*.sh 2>/dev/null | wc -l | tr -d ' ')
    if [ "$HOOKS_COUNT" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Installed $HOOKS_COUNT SpecWeave hooks${NC}"
    else
        echo -e "${YELLOW}   ⚠️  No SpecWeave hooks to install${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  No SpecWeave hooks directory found${NC}"
fi

# Create .specweave/config.yaml
echo ""
echo -e "${BLUE}   Creating SpecWeave configuration...${NC}"

cat > .specweave/config.yaml <<EOF
# SpecWeave Configuration
version: 0.2.0

project:
  name: $(basename "$(pwd)")
  description: "Project managed with SpecWeave"
  created: $(date +%Y-%m-%d)

workflow:
  wip_limit: 2
  auto_close:
    enabled: true
    strict_mode: true

increment_structure:
  default_priorities: [P1, P2, P3]
  require_tests: true
  require_documentation: true

commands:
  # SpecWeave commands are namespaced to avoid collisions
  prefix: "specweave-"

  # Optional: Create aliases (uncomment to enable)
  # aliases:
  #   /inc: /specweave inc
  #   /do: /specweave build
  #   /next: /specweave next

installation:
  type: $PROJECT_TYPE
  installed_at: $(date +%Y-%m-%d\ %H:%M:%S)
  backup_timestamp: $TIMESTAMP
EOF

echo -e "${GREEN}   ✅ Configuration created${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Step 4: Restore user files (merge, don't overwrite)
if [ "$PROJECT_TYPE" = "brownfield" ]; then
    echo ""
    echo -e "${BLUE}🔄 Restoring user files...${NC}"
    echo ""

    # Merge commands
    if [ -n "$COMMANDS_BACKUP" ] && [ -d "$COMMANDS_BACKUP" ]; then
        echo -e "${BLUE}   Merging user commands...${NC}"
        merge_directories "$COMMANDS_BACKUP" ".claude/commands"
    fi

    # Merge skills
    if [ -n "$SKILLS_BACKUP" ] && [ -d "$SKILLS_BACKUP" ]; then
        echo -e "${BLUE}   Merging user skills...${NC}"
        merge_directories "$SKILLS_BACKUP" ".claude/skills"
    fi

    # Merge hooks
    if [ -n "$HOOKS_BACKUP" ] && [ -d "$HOOKS_BACKUP" ]; then
        echo -e "${BLUE}   Merging user hooks...${NC}"
        merge_directories "$HOOKS_BACKUP" ".claude/hooks"
    fi

    echo ""
    echo -e "${GREEN}✅ User files restored (SpecWeave files not overwritten)${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

# Step 5: Report installation summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SpecWeave Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📂 Installed Structure:${NC}"
echo ""
echo "   .claude/commands/"
echo "   ├── specweave.md                 (master router)"
echo "   ├── specweave.inc.md             (create increment)"
echo "   ├── specweave-build.md           (execute tasks)"
echo "   ├── specweave.next.md            (smart transition)"
echo "   ├── specweave.done.md            (manual closure)"
echo "   ├── specweave.progress.md        (check status)"
echo "   └── ... (other specweave-* commands)"
echo ""
echo "   .specweave/"
echo "   ├── config.yaml                  (configuration)"
echo "   ├── increments/                  (your increments)"
echo "   │   └── _backlog/                (backlog items)"
echo "   └── docs/                        (documentation)"
echo ""

if [ "$PROJECT_TYPE" = "brownfield" ]; then
    echo -e "${BLUE}📦 Backups Created:${NC}"
    echo ""
    [ -n "$COMMANDS_BACKUP" ] && echo "   $COMMANDS_BACKUP"
    [ -n "$SKILLS_BACKUP" ] && echo "   $SKILLS_BACKUP"
    [ -n "$HOOKS_BACKUP" ] && echo "   $HOOKS_BACKUP"
    [ -n "$SPECWEAVE_BACKUP" ] && echo "   $SPECWEAVE_BACKUP"
    echo ""
    echo -e "${GREEN}✅ Your original files are preserved!${NC}"
    echo ""
fi

echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "   1. Verify installation:"
echo "      ls -la .claude/commands/specweave*.md"
echo ""
echo "   2. Create your first increment:"
echo "      /specweave inc \"User authentication\""
echo ""
echo "   3. Check status:"
echo "      /specweave progress"
echo ""
echo "   4. Start building:"
echo "      /specweave build"
echo ""

if [ "$PROJECT_TYPE" = "brownfield" ]; then
    echo -e "${YELLOW}💡 Brownfield Project Tips:${NC}"
    echo ""
    echo "   • Your original commands still work (no collision)"
    echo "   • Use /specweave prefix for SpecWeave commands"
    echo "   • Backups are timestamped for easy rollback"
    echo "   • To restore: mv .claude/commands.backup-${TIMESTAMP} .claude/commands"
    echo ""
fi

echo -e "${BLUE}📚 Documentation:${NC}"
echo ""
echo "   • Getting Started: .specweave/docs/public/guides/getting-started/"
echo "   • Commands: .claude/commands/README.md"
echo "   • Website: https://verified-skill.com"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Happy building with SpecWeave! 🎉${NC}"
echo ""
