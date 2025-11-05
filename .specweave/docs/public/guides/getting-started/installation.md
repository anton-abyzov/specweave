# SpecWeave Installation

Comprehensive installation guide for all scenarios.

## Prerequisites

Before installing SpecWeave, ensure you have:

**Required:**
- Node.js 18+ - Check with `node --version`
- npm 9+ - Check with `npm --version`

**Recommended:**
- Claude Code (best experience)
- Git for version control

## Installation Methods

### Method 1: Global Install (Recommended)

Install once, use everywhere:

```bash
# Install globally
npm install -g specweave

# Verify installation
specweave --version

# Create new project
specweave init my-project
cd my-project
```

**Pros:**
- ✅ Command always available (`specweave` command)
- ✅ Faster subsequent runs (no download)
- ✅ Works offline after first install
- ✅ Consistent version across projects

**Cons:**
- ❌ Requires admin/root on some systems
- ❌ Manual updates needed: `npm update -g specweave`

**Best for:** Regular SpecWeave users, developers working on multiple projects

### Method 2: npx (No Install)

Run without installing:

```bash
# New project (always uses latest version)
npx specweave init my-project
cd my-project

# Existing project
cd my-existing-project
npx specweave init .
```

**Pros:**
- ✅ No global installation needed
- ✅ Always uses latest version
- ✅ No permission issues
- ✅ Perfect for CI/CD

**Cons:**
- ❌ Slower (downloads each time)
- ❌ Requires internet connection

**Best for:** First-time users, CI/CD pipelines, testing latest version

### Method 3: From Source (Contributors)

For contributors or testing unreleased features:

```bash
# Clone repository
git clone https://github.com/anton-abyzov/specweave.git
cd specweave

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link globally
npm link

# Verify
specweave --version

# Create project
specweave init my-project
```

**Best for:** Contributors, debugging, custom modifications

## What Gets Installed

### Directory Structure

After running `specweave init`, you get:

```
your-project/
├── .claude/                  # Claude Code integration (if detected)
│   ├── agents/               # 10 specialized agents
│   │   ├── pm/               # Product Manager
│   │   ├── architect/        # System Architect
│   │   ├── devops/           # DevOps Engineer
│   │   ├── qa-lead/          # QA Lead
│   │   ├── security/         # Security Engineer
│   │   ├── tech-lead/        # Tech Lead
│   │   ├── sre/              # Site Reliability Engineer
│   │   ├── docs-writer/      # Technical Writer
│   │   ├── performance/      # Performance Engineer
│   │   └── diagrams-architect/  # Diagram Specialist
│   ├── skills/               # 35+ development skills
│   │   ├── increment-planner/
│   │   ├── context-loader/
│   │   ├── nodejs-backend/
│   │   ├── nextjs/
│   │   ├── python-backend/
│   │   ├── frontend/
│   │   ├── e2e-playwright/
│   │   ├── jira-sync/
│   │   ├── github-sync/
│   │   ├── hetzner-provisioner/
│   │   └── ... (27+ more)
│   ├── commands/             # 10 slash commands
│   │   ├── inc.md
│   │   ├── do.md
│   │   ├── progress.md
│   │   ├── done.md
│   │   ├── validate.md
│   │   ├── specweave.sync-github.md
│   │   ├── specweave.sync-jira.md
│   │   ├── specweave.sync-docs.md
│   │   └── ... (more)
│   └── hooks/                # Automation hooks
│       ├── post-task-completion.sh
│       ├── docs-changed.sh
│       ├── pre-implementation.sh
│       └── human-input-required.sh
│
├── .specweave/               # SpecWeave framework
│   ├── increments/           # Auto-numbered features
│   │   ├── README.md
│   │   ├── roadmap.md
│   │   └── 0001-feature/     # Created by workflow
│   ├── docs/                 # Living documentation
│   │   ├── internal/
│   │   │   ├── strategy/     # PRDs, market research
│   │   │   ├── architecture/ # HLDs, ADRs, C4 diagrams
│   │   │   ├── delivery/     # Roadmap, CI/CD
│   │   │   ├── operations/   # Runbooks, SLOs
│   │   │   └── governance/   # Security, compliance
│   │   └── public/           # Published docs
│   ├── tests/                # Centralized test repository
│   ├── config.yaml           # Configuration
│   └── logs/                 # Execution logs
│
├── CLAUDE.md                 # Complete development guide
├── AGENTS.md                 # Universal adapter (for non-Claude tools)
└── .gitignore                # Standard ignores
```

### For Claude Code (Native)

Gets **full native integration**:
- ✅ 10 agents in `.claude/agents/`
- ✅ 35+ skills in `.claude/skills/`
- ✅ 10 slash commands in `.claude/commands/`
- ✅ Automation hooks in `.claude/hooks/`

### For Other AI Tools (Cursor, Copilot, Gemini, ChatGPT)

Gets **universal adapter**:
- ✅ `AGENTS.md` - Works with ANY AI tool
- ✅ `.cursorrules` - For Cursor (if detected)
- ✅ `.github/copilot/` - For Copilot (if detected)
- ✅ Same `.specweave/` structure
- ✅ Same `CLAUDE.md` guide

**Note:** Only Claude Code gets native agents/skills. Other tools use the universal AGENTS.md adapter with manual workflow.

## Scenario-Specific Installation

### New Project (Greenfield)

```bash
# Method 1: Create new directory
npx specweave init my-project
cd my-project

# Method 2: Create directory first
mkdir my-project && cd my-project
npx specweave init .
```

**What happens:**
1. Creates project directory (if needed)
2. Detects your AI tool (Claude, Cursor, Copilot, etc.)
3. Installs appropriate components
4. Creates `.specweave/` structure
5. Generates `CLAUDE.md` and `AGENTS.md`
6. Sets up `.gitignore`
7. Initializes git repository (if git is available)

### Existing Project (Brownfield)

```bash
cd my-existing-project
npx specweave init .
```

**What happens:**
1. Detects existing files
2. Prompts for confirmation if directory is not empty
3. ✅ Preserves your existing code and git history
4. Adds SpecWeave structure without touching your code
5. Uses directory name as project name (or prompts if invalid)

**Safe Operations:**
- ✅ Never modifies existing source code
- ✅ Never overwrites existing files (asks first)
- ✅ Keeps your git history intact
- ✅ All SpecWeave work isolated in `.specweave/`

### Multiple Projects

Install SpecWeave to multiple projects:

```bash
# Install to several projects
npx specweave init project-a
npx specweave init project-b
npx specweave init project-c

# Or using a loop
for project in project-a project-b project-c; do
  npx specweave init $project
done
```

Each project gets its own independent SpecWeave installation.

## Verification

After installation, verify everything is set up correctly:

```bash
cd your-project

# Verify SpecWeave structure
ls -la .specweave/          # Should have increments/, docs/, config.yaml
cat .specweave/config.yaml  # Should show configuration
cat CLAUDE.md               # Should exist
cat .gitignore              # Should exist

# For Claude Code users
ls -la .claude/agents/      # Should have 10 agents
ls -la .claude/skills/      # Should have 35+ skills
ls -la .claude/commands/    # Should have 10 commands
ls -la .claude/hooks/       # Should have hooks

# For other AI tool users
cat AGENTS.md               # Should exist

# Test a command (Claude Code only)
# Open Claude Code and type: /specweave:progress
```

### Verification Checklist

- [ ] `.specweave/` directory exists
- [ ] `.specweave/config.yaml` is present
- [ ] `CLAUDE.md` exists
- [ ] `.gitignore` includes SpecWeave ignores
- [ ] Git repository initialized (if git available)
- [ ] For Claude Code: `.claude/agents/` has 10 folders
- [ ] For Claude Code: `.claude/skills/` has 35+ folders
- [ ] For Claude Code: `.claude/commands/` has command files
- [ ] For other tools: `AGENTS.md` exists

### Test the Interactive Flow

**Try the quick build workflow:**

```bash
# Open Claude Code in your project and type:
"build a very simple web calculator app"

# SpecWeave will guide you through:
# 1. Approach selection (Quick build vs plan first)
# 2. Feature selection (multi-select checkboxes)
# 3. Tech stack choice (Vanilla, React, etc.)
# 4. Review and submit

# Your app will be built in ~2 minutes!
```

**Or use slash commands for full control:**

```bash
# In Claude Code:
/specweave:inc "my first feature"

# This creates:
# ✅ .specweave/increments/0001-my-first-feature/
#    ├── spec.md (requirements)
#    ├── plan.md (architecture)
#    ├── tasks.md (implementation steps)
#    └── tests.md (test strategy)
```

## Configuration

After installation, optionally customize `.specweave/config.yaml`:

```yaml
project:
  name: "your-project"
  type: "greenfield"  # or "brownfield"

hooks:
  enabled: true
  post_task_completion:
    enabled: true
    notification_sound: true  # macOS notification

testing:
  e2e_playwright_mandatory_for_ui: true
  min_coverage: 80

integrations:
  jira:
    enabled: false
    url: ""
    project_key: ""
  github:
    enabled: false
    repository: ""
  azure_devops:
    enabled: false
    organization: ""
    project: ""
```

**Configuration options:**

- `project.type` - "greenfield" or "brownfield"
- `hooks.enabled` - Enable automation hooks
- `testing.e2e_playwright_mandatory_for_ui` - Enforce E2E tests
- `testing.min_coverage` - Minimum test coverage (default: 80%)
- `integrations.*` - Enable JIRA, GitHub, Azure DevOps sync

## Upgrading

### Global Installation

```bash
# Check current version
specweave --version

# Upgrade to latest
npm update -g specweave

# Or reinstall
npm install -g specweave@latest

# Verify new version
specweave --version
```

### npx (Always Latest)

npx automatically uses the latest version, no upgrade needed.

### Reinstall Project

If you need to reinstall SpecWeave in a project:

```bash
cd your-project

# Backup your .specweave/ if needed
cp -r .specweave .specweave.backup

# Reinstall (will prompt for confirmation)
specweave init . --force

# Or with npm
npx specweave init . --force
```

## Uninstallation

### Remove from Project

```bash
cd your-project

# Remove SpecWeave files
rm -rf .claude .specweave CLAUDE.md AGENTS.md

# Your application code remains untouched!
```

**Note:** Your source code is never modified by SpecWeave, so uninstallation is safe and clean.

### Uninstall Global Package

```bash
npm uninstall -g specweave
```

## Troubleshooting

### npx not found

```bash
# Update npm
npm install -g npm@latest

# Verify npx
npx --version
```

### Permission denied (global install)

**Option 1: Use npx instead (recommended)**
```bash
npx specweave init my-app
```

**Option 2: Fix npm permissions**
```bash
# See: https://docs.npmjs.com/resolving-eacces-permissions-errors

# Quick fix (macOS/Linux):
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Skills not activating (Claude Code)

```bash
# Verify installation
ls -la .claude/skills/
# Should see 35+ skills with SKILL.md files

# Check a specific skill
cat .claude/skills/increment-planner/SKILL.md

# If missing, reinstall
npx specweave init . --force
```

### Commands not found (Claude Code)

```bash
# Verify commands
ls -la .claude/commands/
# Should see: inc.md, do.md, etc.

# Check a specific command
cat .claude/commands/specweave:inc.md

# If missing, reinstall
npx specweave init . --force
```

### Hooks not running

```bash
# Make hooks executable
chmod +x .claude/hooks/*.sh

# Verify permissions
ls -la .claude/hooks/
# Should show -rwxr-xr-x permissions

# Test hook manually
./.claude/hooks/post-task-completion.sh
```

### Node.js version too old

```bash
# Check version
node --version

# If < 18, upgrade using nvm (recommended)
# Install nvm: https://github.com/nvm-sh/nvm
nvm install 18
nvm use 18

# Or upgrade Node.js directly
# See: https://nodejs.org/
```

### npm version too old

```bash
# Check version
npm --version

# Upgrade npm
npm install -g npm@latest

# Verify
npm --version
```

### Installation hangs or times out

```bash
# Clear npm cache
npm cache clean --force

# Try again with verbose logging
npm install -g specweave --verbose

# Or use npx instead
npx specweave init my-project
```

### .gitignore not created

```bash
# Manually create .gitignore
cat > .gitignore << 'EOF'
# Node
node_modules/
npm-debug.log
yarn-error.log
.pnpm-debug.log

# SpecWeave logs
.specweave/logs/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF
```

## Platform-Specific Notes

### macOS

- ✅ Full support, all features work
- ✅ Hooks include notification sounds (Glass.aiff)
- ✅ Recommended platform for development

### Linux

- ✅ Full support, all features work
- ⚠️ Notification sounds may not work (requires audio system)
- ✅ Perfect for CI/CD and servers

### Windows

- ✅ Full support with v0.3.3+
- ✅ UNC paths supported (e.g., `\\Mac\Home\...`)
- ✅ Network drives supported
- ⚠️ Hooks may require WSL or Git Bash
- ⚠️ Notification sounds not supported

### WSL (Windows Subsystem for Linux)

- ✅ Full support, recommended for Windows users
- ✅ All Linux features available
- ✅ Better compatibility than native Windows

## Next Steps

After successful installation:

1. ✅ Read the [Quick Start Guide](quickstart)
2. ✅ Review `CLAUDE.md` in your project
3. ✅ Explore [Core Concepts](../../overview/introduction)
4. ✅ Start your first increment

## Support

Need help? We've got you covered:

- **Quick Start:** [Quickstart Guide](quickstart)
- **Issues:** [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- **Discussions:** [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)
- **Documentation:** [spec-weave.com](https://spec-weave.com)
- **npm Package:** [npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)

---

**SpecWeave** - Spec-Driven Development Framework

🚀 **Install now:** `npm install -g specweave`
