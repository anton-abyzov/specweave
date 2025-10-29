# SpecWeave Quick Start

Get started with SpecWeave in under 5 minutes.

## Installation

### New Project (Greenfield)

```bash
# Initialize new project (recommended)
npx specweave init my-app
cd my-app
```

### Existing Project (Brownfield) - The Hardest Problem Made Easy

**Why brownfield is the most complicated:**

- ❌ Existing codebase with zero or outdated documentation

- ❌ Tribal knowledge scattered across the team

- ❌ Risk of breaking production with every change

- ❌ Need to merge existing docs, wikis, Confluence pages

- ❌ Complex architecture never properly documented

**SpecWeave makes it safe and structured:**

```bash
# Add SpecWeave to existing project
cd my-existing-project
npx specweave init .

# Step 1: Merge existing documentation (if any)
"Read brownfield-onboarder skill and merge my docs/ and wiki/"
# Intelligently consolidates existing docs into SpecWeave structure

# Step 2: Analyze and document existing code
"Analyze my authentication module and create comprehensive documentation"
# Generates specs, HLDs, ADRs, C4 diagrams retroactively

# Step 3: Create baseline tests
"Create tests for current auth behavior"
# Regression prevention - capture current behavior before changes

# Step 4: Now safe to modify
"Add OAuth 2.0 to authentication"
# SpecWeave maintains living docs as you evolve the code
```

**Result:** Your undocumented legacy codebase now has:

- ✅ Complete specifications (WHAT/WHY)

- ✅ Architecture documentation (HLDs, ADRs, diagrams)

- ✅ Living documentation that auto-updates

- ✅ Regression prevention with baseline tests

- ✅ Compliance-ready audit trail

That's it! SpecWeave is installed and ready.

## What You Get

After `npx specweave init`, your project has:

**For Claude Code (Native):**
- ✅ 10 agents in `.claude/agents/` - PM, Architect, DevOps, QA, Security, etc.
- ✅ 35+ skills in `.claude/skills/` - Autonomous development capabilities
- ✅ 10 slash commands in `.claude/commands/` - `/specweave.inc`, `/specweave.do`, etc.
- ✅ Automation hooks - Auto-update docs, validate quality

**For Other AI Tools (Cursor, Copilot, Gemini, ChatGPT, etc.):**
- ✅ `AGENTS.md` - Universal adapter that works with ANY AI tool
- ✅ Tool-specific configs - `.cursorrules`, `.github/copilot/`, etc.

**For All Tools:**
- ✅ `.specweave/` - Framework structure (increments, docs, config)
- ✅ `CLAUDE.md` - Complete development guide

## Quick Example

**IMPORTANT:** Use **slash commands** to activate SpecWeave!

```bash
# Initialize project
npx specweave init my-app
cd my-app

# Open in Claude Code and use slash commands:

User: /specweave.inc "Next.js authentication with email and OAuth"
    ↓
SpecWeave: 🔷 SpecWeave Active
           🤖 PM agent creating requirements...
           🏗️ Architect agent designing system...
           📋 Auto-generating tasks from plan...

✅ Increment created: .specweave/increments/0001-user-authentication/
✅ Files: spec.md, plan.md, tasks.md, tests.md

User: /specweave.do
    ↓
SpecWeave: 🤖 Implementing based on specifications
           ✅ Auto-resumes from next incomplete task
           ✅ Validates at key milestones
           ✅ Updates docs continuously

✅ Implementation complete!

User: /specweave.progress
    ↓
SpecWeave: 📊 Progress: 12/12 tasks (100%)
           ✅ All PM gates passed
           💡 Ready to close or continue

User: /specweave.inc "payment processing"
    ↓
SpecWeave: ✅ Auto-closed 0001 (gates passed)
           🚀 Created 0002-payment-processing
```

## Core Workflow

SpecWeave uses a **smart append-only workflow**: 0001 → 0002 → 0003

### 1. Plan Feature (PM-Led)

```bash
/specweave.inc "feature description"
# or: /specweave.increment
```

**What happens:**
- PM agent asks clarifying questions
- Creates spec.md (WHAT/WHY)
- Creates plan.md (HOW)
- Auto-generates tasks.md
- Reviews with you before proceeding
- **Smart:** Auto-closes previous increment if gates pass

### 2. Execute Tasks

```bash
/specweave.do
# or: /specweave.do 0001
```

**What happens:**
- **Smart:** Auto-resumes from next incomplete task
- Implements based on specifications
- Runs hooks after EVERY task
- Updates CLAUDE.md, README.md, CHANGELOG.md automatically
- Asks for validation at key milestones

### 3. Check Progress

```bash
/specweave.progress
```

**Shows:**
- Task completion % (e.g., 5/12 tasks = 42%)
- PM gates status
- Next action to take
- Auto-finds active increment

### 4. Start Next Feature

```bash
/specweave.inc "next feature"
```

**Smart workflow:**
- Auto-closes previous if gates pass
- Creates next increment
- No manual `/specweave.done` needed!

## Available Commands

**Core Commands:**
```bash
/specweave.inc "feature"      # Plan increment (PM-led)
/specweave.do                 # Execute tasks (smart resume)
/specweave.progress           # Check status
/specweave.validate 0001      # Optional quality check
/specweave.done 0001          # Manual close (rarely needed)
```

**Integration Commands:**
```bash
/specweave.sync-github        # Sync to GitHub issues
/specweave.sync-jira          # Sync to JIRA (via /sync-jira)
/sync-docs                    # Sync documentation
```

**Aliases (shorter syntax):**
```bash
/specweave inc = /specweave.inc
/specweave do = /specweave.do
/do = /specweave.do
```

## Key Features

### 1. Autonomous Development
- Minimal interaction required
- Agents ask clarifying questions
- Review output before proceeding
- Auto-resume, auto-close, auto-update

### 2. Multi-Tool Support
- **Claude Code:** Native (best experience)
- **Cursor, Copilot, Gemini CLI, Codex:** Semi-automation via AGENTS.md
- **ChatGPT, Claude web, Gemini web:** Manual workflow via AGENTS.md
- **100% market coverage**

### 3. Living Documentation
- Specs auto-update after every operation
- Always in sync with code
- No drift, no surprises

### 4. Complete Test Coverage
- 4-level testing strategy
- E2E tests MANDATORY for UI (Playwright)
- Minimum 3 tests per component

### 5. Brownfield Excellence (Most Complicated Solved)

- 🏢 **The hardest problem in software**: Undocumented legacy codebases

- 📄 **Intelligent doc merging**: Consolidate wikis, Confluence, existing docs

- 🏗️ **Retroactive architecture**: Generate HLDs, ADRs, C4 diagrams for existing code

- 📚 **Living documentation**: Auto-updates as code evolves (never gets stale)

- 🌱 **Structure evolution**: Documentation grows with your codebase

- 🛡️ **Regression prevention**: Baseline tests before any modifications

- ✅ **Compliance-ready**: Complete audit trail for HIPAA, SOC 2, FDA

## Requirements

**Minimum:**
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Any AI coding tool (Claude, Cursor, Copilot, Gemini, ChatGPT, etc.)

**Recommended:**
- Claude Code (Claude Sonnet 4.5) - Full automation
- Git - Version control

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
  github:
    enabled: false
```

## Next Steps

1. ✅ Install SpecWeave: `npx specweave init my-app`
2. ✅ Read `CLAUDE.md` in your project
3. ✅ Use `/specweave.inc "feature"` to plan first increment
4. ✅ Use `/specweave.do` to execute
5. ✅ Deploy! 🚀

## Troubleshooting

### Skills not activating?

**For Claude Code:**
```bash
ls -la .claude/skills/
# Should see 35+ SpecWeave skills with SKILL.md
```

**For other tools:**
```bash
cat AGENTS.md
# Should see universal adapter instructions
```

### Commands not found?

**For Claude Code:**
```bash
ls -la .claude/commands/
# Should see: specweave.inc.md, specweave.do.md, etc.
```

**For other tools:**
- Read AGENTS.md for manual workflow
- Use natural language: "Create increment for authentication"

### Hooks not running?

```bash
chmod +x .claude/hooks/*.sh
```

## Documentation

- **Website:** [spec-weave.com](https://spec-weave.com)
- **npm Package:** [npmjs.com/package/specweave](https://www.npmjs.com/package/specweave)
- **GitHub:** [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
- **CLAUDE.md:** Complete guide (installed in your project)

## Support

- **Issues:** [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)
- **Discussions:** [GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)

---

**SpecWeave** - Replace vibe coding with spec-driven development.

🚀 **Get started:** `npx specweave init my-app`
