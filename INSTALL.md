# SpecWeave Installation Guide

**Version**: v0.1.0-beta.1
**Last Updated**: 2025-10-27

Complete installation guide for SpecWeave - the spec-driven development framework.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Component Installation](#component-installation)
6. [Troubleshooting](#troubleshooting)
7. [Uninstallation](#uninstallation)
8. [Upgrading](#upgrading)

---

## Prerequisites

Before installing SpecWeave, ensure you have:

### Required

- **Node.js**: v18.0.0 or higher
  ```bash
  node --version  # Should be v18.0.0+
  ```

- **npm**: v9.0.0 or higher (comes with Node.js)
  ```bash
  npm --version  # Should be v9.0.0+
  ```

### Recommended

- **Git**: For version control
  ```bash
  git --version  # Any recent version works
  ```

- **Claude Code**: AI agent (Claude Sonnet 4.5 recommended)
  - SpecWeave is optimized for Claude Code
  - Other AI agents may work but are not officially supported in beta

### Optional

- **VS Code**: For development
- **Mermaid Preview Extension**: For viewing C4 diagrams

---

## Installation Methods

### Method 1: Global Installation (Recommended)

**Best for**: Regular SpecWeave users who create multiple projects

```bash
# Install globally via npm
npm install -g specweave
```

**Benefits**:
- ✅ `specweave` command available everywhere
- ✅ Fastest project creation
- ✅ Easy to upgrade

**Verify installation**:
```bash
specweave --version
# Output: 0.1.0-beta.1

specweave --help
# Shows all available commands
```

### Method 2: One-Time Usage (npx)

**Best for**: Trying SpecWeave or one-off project creation

```bash
# No installation required
npx specweave init my-project
```

**Benefits**:
- ✅ No global installation
- ✅ Always uses latest version
- ✅ Perfect for CI/CD

**Note**: Slower than global installation (downloads package each time)

### Method 3: Local Installation (Project-Specific)

**Best for**: Contributing to SpecWeave framework development

```bash
# Clone the repository
git clone https://github.com/specweave/specweave.git
cd specweave

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link locally (makes 'specweave' available globally)
npm link
```

**Benefits**:
- ✅ Latest development version
- ✅ Contribute to framework
- ✅ Test unreleased features

**Verify local installation**:
```bash
specweave --version
# Output: 0.1.0-beta.1

which specweave
# Output: /usr/local/bin/specweave (or similar)
```

---

## Quick Start

### 1. Install SpecWeave

**Global:**
```bash
npm install -g specweave
```

**One-time:**
```bash
npx specweave init my-saas
```

### 2. Create New Project

**Interactive (recommended for first time):**
```bash
specweave init
```

You'll be prompted for:
- Project name
- Template type (saas, api, fullstack)
- Overwrite confirmation (if directory exists)

**Non-interactive:**
```bash
specweave init my-saas
cd my-saas
```

### 3. Verify Project Structure

```bash
ls -la my-saas

# You should see:
# .specweave/        # Framework configuration
# src/skills/        # AI agent skills (17+ installed)
# .claude/           # Claude Code integration
# CLAUDE.md          # Development guide
# README.md          # Project documentation
```

### 4. Start Building

Open the project in Claude Code and describe what you want to build:

```
"Create an event booking SaaS with Next.js on Hetzner"
```

SpecWeave will:
- ✅ Ask clarifying questions
- ✅ Create strategic analysis (PM, Architect, DevOps, QA)
- ✅ Generate comprehensive documentation
- ✅ Create implementation tasks
- ✅ Build autonomously

---

## Detailed Setup

### Understanding SpecWeave Installation

When you install SpecWeave, you get:

1. **CLI Tool** (`specweave` command)
   - Project initialization
   - Component installation
   - Management commands

2. **Core Framework Files** (copied to your project)
   - `.specweave/` - Configuration and increments
   - `src/skills/` - AI agent skills
   - `.claude/` - Claude Code integration
   - `CLAUDE.md` - Development guide

3. **Templates** (used during initialization)
   - Project structure
   - Configuration files
   - Documentation templates

### Installation Locations

**Global installation:**
```
/usr/local/lib/node_modules/specweave/     # Framework files
/usr/local/bin/specweave                    # CLI executable
```

**Project installation:**
```
my-project/
├── .specweave/                             # Created by 'specweave init'
├── src/skills/                             # Installed skills
├── .claude/                                # Claude integration
└── CLAUDE.md                               # Development guide
```

### Project Templates

**Available templates** (v0.1.0-beta.1):

| Template | Description | Tech Stack |
|----------|-------------|------------|
| `saas` (default) | Full-stack SaaS application | Next.js, Prisma, Hetzner |
| `api` | API-only backend | FastAPI, PostgreSQL |
| `fullstack` | Frontend + Backend separation | React + Express |

**Specify template:**
```bash
specweave init my-api --template api
```

---

## Component Installation

SpecWeave uses a **selective installation** approach to avoid context bloat.

### Understanding Components

**Agents** (14 available):
- Strategic: pm, architect, security, qa-lead, devops, tech-lead, docs-writer
- Implementation: frontend, nextjs, nodejs-backend, python-backend, dotnet-backend, performance, sre

**Skills** (17+ available):
- Core: specweave-detector, increment-planner, skill-router, context-loader
- Integration: jira-sync, ado-sync, github-sync, diagrams-generator
- Infrastructure: hetzner-provisioner, cost-optimizer
- Brownfield: brownfield-analyzer, brownfield-onboarder
- Design: figma-mcp-connector, design-system-architect, figma-to-code
- Expert: spec-kit-expert, bmad-method-expert

### Installing Components

#### List Available Components

```bash
# Show all available agents and skills
specweave list

# Output:
# 🤖 Agents:
#    Available in SpecWeave: 14 agents
#    • pm - Product Manager for requirements and user stories
#    • architect - System Architect for design and ADRs
#    ...
#
# ✨ Skills:
#    Available in SpecWeave: 17 skills
#    • specweave-detector - Auto-detect SpecWeave projects
#    • increment-planner - Plan features with context awareness
#    ...
```

#### Show Installed Components

```bash
# Show what's currently installed
specweave list --installed

# Output:
# 📁 Local Installation (.claude/):
# 🤖 Agents:
#    ✓ pm
#    ✓ architect
#    ...
#
# ✨ Skills:
#    ✓ specweave-detector
#    ✓ increment-planner
#    ...
```

#### Install Specific Component

```bash
# Install locally (to current project)
specweave install pm --local

# Install globally (to ~/.claude/)
specweave install pm --global
```

#### Install All Components

```bash
# Interactive mode (choose what to install)
specweave install

# Output:
# ? What would you like to install?
#   > All components (agents + skills)
#     All agents only
#     All skills only
#     Specific component
```

#### Install by Category

**Install all agents:**
```bash
specweave install
# Choose: "All agents only"
```

**Install all skills:**
```bash
specweave install
# Choose: "All skills only"
```

### Installation Locations

**Local installation** (`.claude/`):
- ✅ Project-specific components
- ✅ Won't affect other projects
- ✅ Committed to git (if desired)

**Global installation** (`~/.claude/`):
- ✅ Available to all SpecWeave projects
- ✅ Shared across projects
- ✅ User-specific (not committed to git)

### Selective Installation Strategy

**Recommended approach:**

1. **Start minimal** (install only what you need)
   ```bash
   # Python API project
   specweave install pm --local
   specweave install architect --local
   specweave install python-backend --local
   ```

2. **Add as you go** (install when needed)
   ```bash
   # Later, when adding Figma designs
   specweave install figma-designer --local
   specweave install figma-to-code --local
   ```

3. **Token savings**: Installing only 7 components vs all 31 = **60% token reduction**

---

## Troubleshooting

### Common Issues

#### 1. `specweave: command not found`

**Problem**: Global installation didn't add to PATH

**Solutions:**

**macOS/Linux:**
```bash
# Check npm global bin directory
npm config get prefix
# Output: /usr/local (or similar)

# Add to PATH if missing
export PATH="$(npm config get prefix)/bin:$PATH"

# Make permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Windows:**
```cmd
# Check npm global bin directory
npm config get prefix

# Add to PATH via System Environment Variables
# Example: C:\Users\<username>\AppData\Roaming\npm
```

#### 2. `npm ERR! code EACCES` (Permission denied)

**Problem**: No permission to install globally

**Solutions:**

**Option A: Use npx (recommended)**
```bash
# No installation needed
npx specweave init my-project
```

**Option B: Fix npm permissions**
```bash
# macOS/Linux
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Verify
npm install -g specweave
```

**Option C: Use nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Install Node.js via nvm
nvm install 18
nvm use 18

# Now npm global installs work without sudo
npm install -g specweave
```

#### 3. `Error: Cannot find module '../dist/cli/commands/init'`

**Problem**: TypeScript not built

**Solution:**

**If installed globally:**
```bash
# Uninstall and reinstall
npm uninstall -g specweave
npm install -g specweave
```

**If cloned from GitHub:**
```bash
# Build TypeScript
npm run build

# Verify dist/ directory exists
ls dist/cli/commands/
# Should show: init.js, install.js, list.js
```

#### 4. Git initialization fails

**Problem**: Git not installed or not configured

**Solution:**

**Install Git:**
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Windows
# Download from https://git-scm.com/downloads
```

**Configure Git:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Skip Git initialization:**
```bash
# SpecWeave will skip git if not found (non-fatal)
specweave init my-project
```

#### 5. `ENOENT: no such file or directory` during init

**Problem**: Template files not found

**Solutions:**

**If installed globally:**
```bash
# Reinstall to fix missing templates
npm uninstall -g specweave
npm install -g specweave
```

**If cloned from GitHub:**
```bash
# Verify templates exist
ls src/templates/
# Should show: config.yaml, CLAUDE.md.template, README.md.template, etc.

# If missing, pull latest
git pull origin main
npm run build
```

#### 6. Skills/Agents not loading in Claude Code

**Problem**: Files copied but Claude doesn't see them

**Solutions:**

**1. Restart Claude Code**
```bash
# Changes to .claude/ require restart
# Close and reopen Claude Code
```

**2. Verify files exist**
```bash
# Check local installation
ls .claude/skills/
ls .claude/agents/

# Check global installation
ls ~/.claude/skills/
ls ~/.claude/agents/
```

**3. Verify SKILL.md/AGENT.md format**
```bash
# Must have YAML frontmatter
cat .claude/skills/increment-planner/SKILL.md

# Should start with:
# ---
# name: increment-planner
# description: ...
# ---
```

---

## Uninstallation

### Remove Global Installation

```bash
# Uninstall SpecWeave CLI
npm uninstall -g specweave

# Verify removal
which specweave
# Should output: (nothing)
```

### Remove Project Files

```bash
# Delete project directory
rm -rf my-project

# Or delete SpecWeave-specific files only
rm -rf .specweave
rm -rf src/skills
rm -rf .claude
rm CLAUDE.md
```

### Remove Global Components

```bash
# Remove globally installed skills/agents
rm -rf ~/.claude/skills/*
rm -rf ~/.claude/agents/*

# Or remove entire .claude directory
rm -rf ~/.claude
```

---

## Upgrading

### Upgrade Global Installation

```bash
# Update to latest version
npm update -g specweave

# Verify new version
specweave --version
```

### Upgrade Existing Project

**Approach 1: Reinstall components**
```bash
cd my-project

# Reinstall all components
specweave install
# Choose: "All components (agents + skills)"
```

**Approach 2: Selective upgrade**
```bash
# Update specific component
specweave install increment-planner --local
```

**Approach 3: Manual upgrade**
```bash
# Pull latest framework
cd /path/to/specweave-repo
git pull origin main
npm run build
npm link

# Components in your project will use updated framework
```

### Migration Between Versions

**v0.1.0-beta.1 → v0.1.0-beta.2 (upcoming):**
- ✅ No breaking changes expected
- ✅ Run `specweave install` to get new components
- ✅ CLAUDE.md may have updates (review changes)

**v0.1.x → v0.2.x (future):**
- ⚠️ May have breaking changes
- 📖 Read CHANGELOG.md for migration guide
- 🔄 Backup your project before upgrading

---

## Advanced Installation

### Install from GitHub (Latest Development)

```bash
# Clone repository
git clone https://github.com/specweave/specweave.git
cd specweave

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link globally
npm link

# Verify
specweave --version
```

### Install from Specific Branch

```bash
# Clone specific branch
git clone -b feature-branch https://github.com/specweave/specweave.git
cd specweave

# Install and build
npm install
npm run build
npm link
```

### Install from Tarball

```bash
# Download release tarball
curl -LO https://github.com/specweave/specweave/archive/v0.1.0-beta.1.tar.gz

# Extract
tar -xzf v0.1.0-beta.1.tar.gz
cd specweave-0.1.0-beta.1

# Install and build
npm install
npm run build
npm link
```

---

## Verification Checklist

After installation, verify everything works:

### ✅ CLI Installation

```bash
# Check command exists
which specweave || echo "Not found"

# Check version
specweave --version

# Check help
specweave --help
```

### ✅ Project Creation

```bash
# Create test project
specweave init test-project
cd test-project

# Verify structure
ls -la

# Expected:
# ✓ .specweave/ directory
# ✓ src/skills/ directory
# ✓ .claude/ directory
# ✓ CLAUDE.md file
# ✓ README.md file
```

### ✅ Components Installation

```bash
# List available components
specweave list

# Expected:
# ✓ Shows 14 agents
# ✓ Shows 17+ skills

# List installed components
specweave list --installed

# Expected:
# ✓ Shows local installation (.claude/)
# ✓ Lists installed agents/skills
```

### ✅ Skills Loading (Claude Code)

```bash
# Open project in Claude Code
code .

# In Claude Code, type:
/help

# Expected:
# ✓ Shows SpecWeave slash commands
# ✓ /create-project
# ✓ /create-increment
# ✓ /review-docs
# ✓ /sync-github
```

---

## System Requirements

### Minimum Requirements

- **OS**: macOS, Linux, Windows 10+
- **Node.js**: v18.0.0+
- **RAM**: 2 GB (for Node.js and npm)
- **Disk Space**: 500 MB (for SpecWeave + dependencies)

### Recommended Requirements

- **OS**: macOS 12+, Ubuntu 22.04+, Windows 11
- **Node.js**: v20.0.0+ (latest LTS)
- **RAM**: 4 GB+ (for running AI agents)
- **Disk Space**: 2 GB+ (for projects and components)

### Network Requirements

- **npm access**: Required for installation
- **GitHub access**: Optional (for cloning repository)
- **Outbound HTTPS**: Required for npm registry

---

## Getting Help

### Documentation

- **Complete guide**: `CLAUDE.md` in your project
- **Release notes**: `CHANGELOG.md`
- **Quick start**: `README.md`

### Community

- **Issues**: https://github.com/specweave/specweave/issues
- **Discussions**: https://github.com/specweave/specweave/discussions
- **Repository**: https://github.com/specweave/specweave

### Support

For installation issues:
1. ✅ Check this guide's [Troubleshooting](#troubleshooting) section
2. ✅ Search existing issues: https://github.com/specweave/specweave/issues
3. ✅ Create new issue with:
   - `specweave --version`
   - `node --version`
   - `npm --version`
   - Operating system
   - Error messages

---

## Next Steps

After successful installation:

1. **Read CLAUDE.md** - Complete development guide
2. **Create first project** - `specweave init my-saas`
3. **Explore skills** - `specweave list`
4. **Start building** - Describe what you want in Claude Code
5. **Join community** - https://github.com/specweave/specweave/discussions

---

**Happy Building with SpecWeave!** 🚀

For more information, visit: https://github.com/specweave/specweave
