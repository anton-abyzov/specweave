# SpecWeave Installation Guide

Complete installation instructions for SpecWeave framework development and user projects.

---

## Table of Contents

1. [Installation Scenarios](#installation-scenarios)
2. [Framework Development Setup](#framework-development-setup)
3. [Using SpecWeave in Your Project](#using-specweave-in-your-project)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Installation Scenarios

### Scenario 1: Framework Development

**You want to**: Contribute to SpecWeave framework itself

**Prerequisites**:
- Node.js 18+ (`node --version`)
- npm 8+ (`npm --version`)
- Git (`git --version`)
- Claude Code CLI (`claude --version`)

**Installation**:
```bash
# 1. Clone repository
git clone https://github.com/specweave/specweave.git
cd specweave

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build

# 4. Install agents, skills, and commands to .claude/
npm run install:all

# 5. Restart Claude Code
# Restart Claude Code to load new agents/skills
```

**Verification**:
```bash
# Check installation
ls -la .claude/agents/  # Should see 19 agents
ls -la .claude/skills/  # Should see 24 skills
ls -la .claude/commands/  # Should see slash commands
ls -la .claude/hooks/  # Should see hooks

# Verify CLI works
./bin/specweave.js --version
```

---

### Scenario 2: Using SpecWeave in Your Project (Greenfield)

**You want to**: Use SpecWeave to build a new project

**Option A: Clone as Template** (Current, recommended)

```bash
# 1. Clone SpecWeave as template
git clone https://github.com/specweave/specweave.git my-project
cd my-project

# 2. Remove SpecWeave git history, start fresh
rm -rf .git
git init
git add .
git commit -m "Initial commit from SpecWeave template"

# 3. Install dependencies
npm install

# 4. Install components
npm run install:all

# 5. Customize for your project
# Edit .specweave/config.yaml
# Update package.json (name, description, etc.)
# Update CLAUDE.md with project-specific info

# 6. Restart Claude Code
# SpecWeave will auto-detect .specweave/ and activate
```

**Option B: NPM Package** (Future, not yet available)

```bash
# NOT YET AVAILABLE
npm install -g specweave
specweave init my-project
cd my-project
```

**Option C: Slash Command** (In Claude Code)

```bash
# In Claude Code, run:
specweave init

# Follow prompts to create project structure
```

---

### Scenario 3: Using SpecWeave in Existing Project (Brownfield)

**You want to**: Add SpecWeave to an existing codebase

**Prerequisites**:
- Existing project with git
- Backup CLAUDE.md if it exists (will be preserved)
- Node.js 18+

**Installation**:

```bash
cd your-existing-project

# 1. Copy SpecWeave structure
# Option A: Manual copy
git clone https://github.com/specweave/specweave.git /tmp/specweave
cp -r /tmp/specweave/.specweave .
cp -r /tmp/specweave/.claude .
cp -r /tmp/specweave/src ./specweave-src  # Rename to avoid conflicts
cp /tmp/specweave/CLAUDE.md ./CLAUDE-specweave.md  # Don't overwrite

# Option B: Use brownfield-onboarder skill (future)
# /onboard-brownfield

# 2. Install SpecWeave dependencies
npm install --save-dev @types/node typescript jest @playwright/test
# Add other dependencies from SpecWeave package.json as needed

# 3. Merge CLAUDE.md
# If you have existing CLAUDE.md, use brownfield-onboarder skill:
# "Merge my old CLAUDE.md with SpecWeave structure"

# 4. Analyze existing code
# "Analyze my existing codebase and create specifications"
# Uses brownfield-analyzer skill

# 5. Generate baseline tests
# "Create tests for current behavior"

# 6. Restart Claude Code
```

**Migration Steps**:
1. ✅ Install .specweave/ structure
2. ✅ Merge existing CLAUDE.md (if any)
3. ✅ Analyze existing code → generate specs
4. ✅ Create baseline tests (regression safety)
5. ✅ Verify tests pass
6. ✅ Now safe to modify with SpecWeave

---

## Framework Development Setup

### Prerequisites

**Required**:
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git 2.30 or higher
- Claude Code CLI (latest)

**Verify**:
```bash
node --version  # v18.0.0+
npm --version   # 8.0.0+
git --version   # 2.30.0+
claude --version  # latest
```

### Installation Steps

#### 1. Clone Repository

```bash
git clone https://github.com/specweave/specweave.git
cd specweave
```

#### 2. Install Dependencies

```bash
npm install
```

**What this installs**:
- TypeScript compiler
- Commander (CLI framework)
- Inquirer (interactive prompts)
- Chalk (terminal colors)
- Jest (testing)
- Playwright (E2E testing)
- fs-extra, yaml (utilities)

#### 3. Build Project

```bash
npm run build
```

**What this does**:
- Compiles TypeScript (`src/cli/`) to JavaScript (`dist/`)
- Validates type definitions
- Creates executable CLI

#### 4. Install Components

```bash
# Install all (agents + skills + commands)
npm run install:all

# Or install selectively
npm run install:agents   # Agents only
npm run install:skills   # Skills only
```

**What this does**:
- Copies `src/agents/` → `.claude/agents/`
- Copies `src/skills/` → `.claude/skills/`
- Copies `src/commands/` → `.claude/commands/`
- Creates symlinks for hooks (`.claude/hooks/` → `src/hooks/`)
- Verifies AGENT.md / SKILL.md frontmatter
- **Does NOT overwrite CLAUDE.md**

#### 5. Verify Installation

```bash
# Check agents installed
ls -la .claude/agents/
# Should show 19 agents

# Check skills installed
ls -la .claude/skills/
# Should show 24 skills

# Check commands installed
ls -la .claude/commands/
# Should show slash commands

# Check hooks
ls -la .claude/hooks/
# Should show symlinks to src/hooks/

# Test CLI
./bin/specweave.js --version
# Should show: 0.1.0
```

#### 6. Restart Claude Code

**macOS/Linux**:
```bash
# Close Claude Code, then:
claude-code
```

**Windows**:
```powershell
# Close Claude Code, then restart from Start Menu
```

**Verification**:
Ask Claude Code: "What SpecWeave skills are available?"

Should list all 24 skills.

---

## Using SpecWeave in Your Project

### Quick Start (Greenfield)

#### 1. Create Project from Template

```bash
# Clone as template
git clone https://github.com/specweave/specweave.git my-saas-app
cd my-saas-app

# Remove SpecWeave git history
rm -rf .git
git init

# Install
npm install
npm run install:all
```

#### 2. Configure Project

**Edit `.specweave/config.yaml`**:
```yaml
project:
  name: "my-saas-app"  # Your project name
  version: "0.1.0"
  description: "Your project description"
  type: "greenfield"  # or "brownfield"
```

**Edit `package.json`**:
```json
{
  "name": "my-saas-app",
  "version": "0.1.0",
  "description": "Your project description",
  "author": "Your Name"
}
```

**Update `CLAUDE.md`** (optional):
```markdown
# My SaaS App

**Project**: My SaaS Application
**Tech Stack**: Next.js 14, TypeScript, Prisma, PostgreSQL

[... rest of CLAUDE.md from template ...]
```

#### 3. Create First Increment

**In Claude Code**:
```
User: "Create increment for user authentication with email/password and OAuth"

SpecWeave will:
1. Auto-detect .specweave/ and activate
2. Create .specweave/increments/0001-user-authentication/
3. Generate spec.md, plan.md, tasks.md, tests.md
4. Set up increment structure
```

**Or use slash command**:
```bash
/create-increment "user authentication with email and OAuth"
```

#### 4. Implement Feature

```
User: "Implement user authentication"

SpecWeave will:
1. Load context via context-loader (70%+ token reduction)
2. Orchestrate agents (PM → Architect → DevOps → QA → Backend → Frontend)
3. Generate code following specifications
4. Create tests
5. Update documentation
```

#### 5. Verify & Commit

```bash
# Run tests
npm test

# Commit
git add .
git commit -m "feat: user authentication with OAuth"
git push
```

---

## Installation Scripts Reference

### Available Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `npm run install:all` | Install agents + skills + commands | `.claude/` |
| `npm run install:all:global` | Install globally | `~/.claude/` |
| `npm run install:agents` | Install agents only | `.claude/agents/` |
| `npm run install:skills` | Install skills only | `.claude/skills/` |
| `npm run install:agents:global` | Install agents globally | `~/.claude/agents/` |
| `npm run install:skills:global` | Install skills globally | `~/.claude/skills/` |

### Script Behavior

**What install scripts do**:
- ✅ Copy components from `src/` to `.claude/` (or `~/.claude/`)
- ✅ Verify AGENT.md / SKILL.md have valid YAML frontmatter
- ✅ Create symlinks for hooks (`.claude/hooks/` → `src/hooks/`)
- ✅ **Skip CLAUDE.md** (never replaced)
- ✅ Preserve user customizations
- ✅ Show installation summary

**What install scripts DON'T do**:
- ❌ Overwrite CLAUDE.md
- ❌ Modify user's project files
- ❌ Install npm packages
- ❌ Build TypeScript (run `npm run build` separately)

### Installation Locations

| Install Type | Agents | Skills | Commands | Use Case |
|--------------|--------|--------|----------|----------|
| **Project-local** | `.claude/agents/` | `.claude/skills/` | `.claude/commands/` | Specific project |
| **Global** | `~/.claude/agents/` | `~/.claude/skills/` | N/A | All projects |

**When to use global**:
- You want skills available in ALL projects
- You're a SpecWeave framework developer
- You want to test skills across multiple projects

**When to use project-local** (default):
- You want project-specific agents/skills
- You're building a product with SpecWeave
- You want version control for components

---

## Verification

### Verify Framework Installation

```bash
# 1. Check directory structure
ls -la .specweave/
# Should see: config.yaml, cache/, docs/, increments/

# 2. Check agents installed
ls -la .claude/agents/ | wc -l
# Should show: 19 agents

# 3. Check skills installed
ls -la .claude/skills/ | wc -l
# Should show: 24 skills

# 4. Check commands installed
ls -la .claude/commands/
# Should see: create-project.md, create-increment.md, etc.

# 5. Check hooks
ls -la .claude/hooks/
# Should see symlinks to src/hooks/

# 6. Test CLI
./bin/specweave.js --version
# Should output: 0.1.0

# 7. Verify build
ls -la dist/
# Should see compiled JavaScript
```

### Verify Components Loaded

**In Claude Code**:
```
User: "What SpecWeave agents are available?"

Expected response:
- Lists all 19 agents (PM, Architect, DevOps, etc.)
- Confirms SpecWeave is active

User: "What SpecWeave skills are available?"

Expected response:
- Lists all 24 skills (specweave-detector, increment-planner, etc.)
```

### Verify Auto-Activation

```
User: "What is this project?"

Expected:
- SpecWeave detects .specweave/ automatically
- Shows: "🔷 SpecWeave Active"
- Provides project overview
```

---

## Troubleshooting

### Problem: Skills Not Activating

**Symptom**: SpecWeave skills don't activate automatically

**Solutions**:
1. **Restart Claude Code**
   ```bash
   # Close and restart Claude Code
   ```

2. **Verify .specweave/ exists**
   ```bash
   ls -la .specweave/config.yaml
   # Should exist
   ```

3. **Check skills installed**
   ```bash
   ls -la .claude/skills/specweave-detector/
   # Should exist with SKILL.md
   ```

4. **Verify SKILL.md frontmatter**
   ```bash
   head -10 .claude/skills/specweave-detector/SKILL.md
   # Should show valid YAML frontmatter
   ```

---

### Problem: Agents Not Found

**Symptom**: "Agent X not found" error

**Solutions**:
1. **Check agent exists**
   ```bash
   ls -la .claude/agents/{agent-name}/
   ```

2. **Reinstall agents**
   ```bash
   npm run install:agents
   # Restart Claude Code
   ```

3. **Check AGENT.md**
   ```bash
   cat .claude/agents/{agent-name}/AGENT.md | head -10
   # Should have valid YAML frontmatter
   ```

---

### Problem: CLAUDE.md Overwritten

**Symptom**: Your CLAUDE.md was replaced

**Solution**:
```bash
# Check backup
ls -la .claude/backups/
# Should see CLAUDE-backup-{timestamp}.md

# Restore if needed
cp .claude/backups/CLAUDE-backup-*.md CLAUDE.md

# Or merge intelligently
# "Merge my old CLAUDE.md"
# (Uses brownfield-onboarder skill)
```

**Prevention**: Install scripts never overwrite CLAUDE.md. If it was overwritten, you may have run a different installation method.

---

### Problem: CLI Not Working

**Symptom**: `./bin/specweave.js` command not found or errors

**Solutions**:
1. **Make executable**
   ```bash
   chmod +x ./bin/specweave.js
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build TypeScript**
   ```bash
   npm run build
   ```

4. **Check Node version**
   ```bash
   node --version
   # Must be 18.0.0+
   ```

---

### Problem: Hooks Not Working

**Symptom**: Documentation not auto-updating after tasks

**Solutions**:
1. **Check hooks installed**
   ```bash
   ls -la .claude/hooks/
   # Should see symlinks to src/hooks/
   ```

2. **Verify config**
   ```yaml
   # .specweave/config.yaml
   hooks:
     enabled: true
     post_task_completion:
       enabled: true
   ```

3. **Check hook permissions**
   ```bash
   ls -la src/hooks/*.sh
   # Should be executable (chmod +x)
   ```

---

## Next Steps

After installation:

1. **Read CLAUDE.md** - Complete development guide
2. **Create first increment** - `/create-increment "feature name"`
3. **Generate diagrams** - "Create C4 context diagram"
4. **Explore skills** - "What skills are available?"
5. **Join community** - GitHub Discussions

---

## Support

- **Documentation**: [CLAUDE.md](CLAUDE.md) - Complete development guide
- **GitHub**: [github.com/specweave/specweave](https://github.com/specweave/specweave)
- **Issues**: [github.com/specweave/specweave/issues](https://github.com/specweave/specweave/issues)
- **Discussions**: [github.com/specweave/specweave/discussions](https://github.com/specweave/specweave/discussions)

---

**Installation complete!** 🎉

Start building with: `/create-increment "your first feature"`
