# SpecWeave Installation

## Installation Methods

### Method 1: npx (Recommended)

No installation required - always uses latest version:

```bash
# New project
npx specweave init my-app
cd my-app

# Existing project
cd my-existing-project
npx specweave init .
```

**Pros:**
- ✅ No global installation needed
- ✅ Always latest version
- ✅ No permission issues
- ✅ Fastest way to start

### Method 2: Global Install

Install once, use everywhere:

```bash
# Install globally
npm install -g specweave

# Create projects
specweave init my-app
cd my-app
```

**Pros:**
- ✅ Command always available
- ✅ Faster subsequent runs

**Cons:**
- ❌ Requires root/admin on some systems
- ❌ Version conflicts across projects
- ❌ Manual updates needed

### Method 3: From GitHub (Development)

For contributors or testing latest unreleased features:

```bash
# Clone repository
git clone https://github.com/anton-abyzov/specweave.git
cd specweave

# Install dependencies and build
npm install
npm run build

# Link globally
npm link

# Create project
specweave init my-app
```

## What Gets Installed

### For Claude Code (Native)

```
your-project/
├── .claude/                  # Claude Code integration
│   ├── agents/               # 10 specialized agents
│   │   ├── pm/
│   │   ├── architect/
│   │   ├── devops/
│   │   ├── qa-lead/
│   │   └── ... (6 more)
│   ├── skills/               # 35+ development skills
│   │   ├── increment-planner/
│   │   ├── context-loader/
│   │   ├── nextjs/
│   │   └── ... (32+ more)
│   ├── commands/             # 10 slash commands
│   │   ├── specweave.inc.md
│   │   ├── specweave.do.md
│   │   ├── specweave.progress.md
│   │   └── ... (7 more)
│   └── hooks/                # Automation hooks
│       └── post-task-completion.sh
│
├── .specweave/               # SpecWeave framework
│   ├── increments/           # Auto-numbered features
│   │   ├── README.md
│   │   ├── roadmap.md
│   │   └── 0001-feature/     # Created by workflow
│   ├── docs/                 # Living documentation
│   │   ├── internal/         # Architecture, ADRs, RFCs
│   │   └── public/           # Published docs
│   ├── tests/                # Centralized test repository
│   ├── config.yaml           # Configuration
│   └── logs/                 # Execution logs
│
├── CLAUDE.md                 # Complete development guide
└── .gitignore                # Standard ignores
```

### For Other AI Tools (Cursor, Copilot, Gemini, ChatGPT, etc.)

```
your-project/
├── AGENTS.md                 # Universal adapter (works with ANY AI)
├── .specweave/               # Same framework structure
├── CLAUDE.md                 # Same development guide
├── .cursorrules              # For Cursor (if detected)
├── .github/copilot/          # For Copilot (if detected)
└── .gitignore
```

**Note:** Only Claude Code gets native agents/skills in `.claude/`. Other tools use the universal AGENTS.md adapter.

## Installation Details

### New Project (Greenfield)

```bash
npx specweave init my-app
```

**What happens:**
1. Creates `my-app/` directory
2. Detects your AI tool (Claude, Cursor, Copilot, etc.)
3. Installs appropriate components:
   - Claude Code → Native agents/skills in `.claude/`
   - Other tools → AGENTS.md adapter
4. Creates `.specweave/` structure
5. Generates `CLAUDE.md` guide
6. Sets up `.gitignore`

### Existing Project (Brownfield)

```bash
cd my-existing-project
npx specweave init .
```

**What happens:**
1. Detects existing files and prompts for confirmation
2. ✅ Preserves your existing code and git history
3. Adds SpecWeave structure without touching your code
4. Uses directory name as project name (or prompts if invalid)

**Safe Operations:**
- ✅ Never modifies existing source code
- ✅ Never overwrites existing files (asks first)
- ✅ Keeps your git history intact
- ✅ All SpecWeave work isolated in `.specweave/`

## Configuration

After installation, optionally edit `.specweave/config.yaml`:

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

## Verification

After installation, verify everything is set up:

```bash
cd your-project

# For Claude Code
ls -la .claude/agents/      # Should have 10 agents
ls -la .claude/skills/      # Should have 35+ skills
ls -la .claude/commands/    # Should have 10 commands
ls -la .claude/hooks/       # Should have hooks

# For other tools
cat AGENTS.md               # Should exist

# For all tools
ls -la .specweave/          # Should have increments/, docs/, config.yaml
cat CLAUDE.md               # Should exist
cat .gitignore              # Should exist
```

## Multiple Projects

Install SpecWeave to multiple projects:

```bash
# Install to several projects
npx specweave init project-a
npx specweave init project-b
npx specweave init project-c

# Or using a loop
for project in project-a project-b project-c; do
  npx specweave init ~/Projects/$project
done
```

Each project gets its own independent SpecWeave installation.

## Uninstallation

To remove SpecWeave from a project:

```bash
cd your-project

# Remove SpecWeave files
rm -rf .claude .specweave CLAUDE.md

# Your application code remains untouched!
```

**Note:** Your source code is never modified by SpecWeave, so uninstallation is safe and clean.

## Requirements

**Minimum:**
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Any AI coding tool:
  - Claude Code (recommended)
  - Cursor
  - GitHub Copilot
  - Gemini CLI
  - Codex
  - ChatGPT (web)
  - Claude (web)
  - Or ANY other AI tool

**Recommended:**
- Claude Code with Claude Sonnet 4.5 (best experience)
- Git for version control

## Troubleshooting

### npx not found

```bash
# Update npm
npm install -g npm@latest

# Verify
npx --version
```

### Permission denied (global install)

```bash
# Option 1: Use npx instead (recommended)
npx specweave init my-app

# Option 2: Fix npm permissions
# See: https://docs.npmjs.com/resolving-eacces-permissions-errors
```

### Skills not activating (Claude Code)

```bash
# Verify installation
ls -la .claude/skills/

# Should see 35+ skills with SKILL.md files
# If missing, reinstall:
npx specweave init . --force
```

### Commands not found (Claude Code)

```bash
# Verify commands
ls -la .claude/commands/

# Should see: specweave.inc.md, specweave.do.md, etc.
# If missing, reinstall:
npx specweave init . --force
```

### Hooks not running

```bash
# Make hooks executable
chmod +x .claude/hooks/*.sh

# Verify
ls -la .claude/hooks/
# Should show -rwxr-xr-x permissions
```

## Next Steps

After installation:

1. ✅ Read the [Quickstart Guide](quickstart.md)
2. ✅ Review `CLAUDE.md` in your project
3. ✅ Start your first increment: `/specweave.inc "feature"`
4. ✅ Execute tasks: `/specweave.do`

## Support

- **Issues:** [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- **Discussions:** [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)
- **Documentation:** [spec-weave.com](https://spec-weave.com)

---

**SpecWeave** - Spec-Driven Development Framework

🚀 **Install now:** `npx specweave init my-app`
