---
name: create-project
description: Bootstrap a new SpecWeave project with all skills, hooks, and structure
---

# Create New SpecWeave Project

You are helping the user bootstrap a new project with SpecWeave.

## Steps:

1. **Ask for project details**:
   - "What's your project name?" (e.g., "my-saas")
   - "Where to create it?" (default: current directory)

2. **Create project directory structure**:

```
my-saas/
├── .specweave/
│   ├── config.yaml           ← Project configuration
│   ├── increments/            ← Product increments
│   ├── docs/                  ← Documentation
│   │   ├── api/
│   │   ├── architecture/
│   │   ├── decisions/
│   │   ├── guides/
│   │   └── features/ OR modules/  (adapts to project)
│   ├── tests/                 ← SpecWeave-generated tests
│   │   ├── baseline/
│   │   ├── regression/
│   │   └── features/
│   ├── work/                  ← Active work (temporary)
│   └── cache/                 ← Context cache
├── src/
│   ├── skills/                ← Copied from SpecWeave
│   │   ├── role-orchestrator/
│   │   ├── pm-agent/
│   │   ├── architect-agent/
│   │   └── ... (all 17+ skills)
│   └── hooks/                 ← Copied from SpecWeave
│       ├── post-task-completion.sh
│       ├── human-input-required.sh
│       ├── docs-changed.sh
│       └── pre-implementation.sh
├── .claude/
│   ├── hooks/                 ← Copied from src/hooks/
│   ├── commands/              ← Copied from SpecWeave
│   └── skills/                ← Installed skills
├── .git/                      ← Git repository
├── .gitignore
├── README.md
├── package.json               ← If Node.js project
└── CLAUDE.md                  ← Project instructions
```

3. **Copy SpecWeave template files**:

From SpecWeave repository to new project:
- `src/skills/**/*` → `my-saas/src/skills/`
- `src/hooks/**/*` → `my-saas/src/hooks/`
- `.claude/commands/**/*` → `my-saas/.claude/commands/`
- `.specweave/config.yaml.template` → `my-saas/.specweave/config.yaml`

4. **Install hooks** (copy, not symlink - Windows compatibility):
```bash
# Copy hooks from src/hooks/ to .claude/hooks/
cp src/hooks/post-task-completion.sh .claude/hooks/post-task-completion.sh
cp src/hooks/human-input-required.sh .claude/hooks/human-input-required.sh
cp src/hooks/docs-changed.sh .claude/hooks/docs-changed.sh
cp src/hooks/pre-implementation.sh .claude/hooks/pre-implementation.sh

# Make executable
chmod +x .claude/hooks/*.sh
```

5. **Create `.specweave/config.yaml`**:

```yaml
---
# SpecWeave Configuration
project:
  name: my-saas
  version: 0.1.0
  created: 2025-10-26

# Hooks configuration
hooks:
  enabled: true
  sounds:
    enabled: true
    completion: /System/Library/Sounds/Glass.aiff
    input_required: /System/Library/Sounds/Ping.aiff

# Documentation structure
docs:
  structure: features  # or "modules" - adapts to your project
  auto_update: true

# Role-based agents
agents:
  models:
    # All agents use Claude Sonnet 4.5 (best for coding and complex agents)
    pm: claude-sonnet-4-5-20250929
    architect: claude-sonnet-4-5-20250929
    security: claude-sonnet-4-5-20250929
    qa_lead: claude-sonnet-4-5-20250929
    devops: claude-sonnet-4-5-20250929
    tech_lead: claude-sonnet-4-5-20250929
    backend: claude-sonnet-4-5-20250929
    frontend: claude-sonnet-4-5-20250929

# Cost optimization
cost:
  max_monthly_budget: 100  # USD
  preferred_platform: hetzner  # hetzner, vercel, aws
  alerts_enabled: true

# Testing
testing:
  e2e_required: true  # Mandatory E2E tests when UI exists
  coverage_target: 80
  baseline_required: false  # For brownfield projects

# Integrations
integrations:
  github:
    enabled: false
    sync_issues: false
  jira:
    enabled: false
  ado:
    enabled: false
---
```

6. **Create `.gitignore`**:

```gitignore
# SpecWeave
.specweave/cache/
.specweave/logs/
.specweave/work/
.specweave/tests/*/test-results/

# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

7. **Initialize Git repository**:
```bash
cd my-saas
git init
git add .
git commit -m "Initial commit with SpecWeave

✨ Bootstrapped with SpecWeave

- 17+ skills installed
- 4 hooks configured
- Project structure ready

Next: Describe what you want to build!"
```

8. **Create README.md**:

```markdown
# My SaaS

> Created with [SpecWeave](https://github.com/specweave/specweave)

## What is this?

This project uses SpecWeave for autonomous development:
- **Intent-driven**: Describe what you want, SpecWeave builds it
- **Documentation-first**: Comprehensive docs generated before code
- **Role-based agents**: PM, Architect, QA, DevOps agents work together
- **Autonomous implementation**: Full features built with minimal intervention

## Getting Started

1. Describe what you want to build (framework-agnostic):
   ```
   "Create an event booking SaaS"
   "Build a task management API"
   "Create an e-commerce platform"
   ```

2. SpecWeave will:
   - **Detect or ask for your tech stack** (TypeScript, Python, Go, Java, etc.)
   - Ask clarifying questions (scale, budget, platform, etc.)
   - Create strategic analysis (PM, Architecture, DevOps, Security, QA)
   - Generate comprehensive documentation
   - Create implementation tasks (using YOUR detected tech stack)
   - Build the complete application (framework-specific code)

3. Review and approve strategic docs:
   ```
   /review-docs
   ```

4. Start implementation or let SpecWeave run autonomously

## Project Structure

- `.specweave/increments/` - Product increments (user stories, tasks)
- `.specweave/docs/` - Generated documentation
- `src/skills/` - SpecWeave skills (AI agents)
- `src/hooks/` - Automation hooks

## Commands

- `/create-increment` - Create new feature/increment
- `/review-docs` - Review strategic documentation
- `/sync-github` - Sync to GitHub issues
- `/create-project` - Bootstrap new SpecWeave project

## Learn More

- [SpecWeave Docs](https://specweave.dev)
- [GitHub](https://github.com/specweave/specweave)
```

9. **Create CLAUDE.md** (Project Instructions):

```markdown
# SpecWeave Project

This is a SpecWeave-enabled project. Follow these guidelines:

## Structure

- `.specweave/increments/` - Source of truth for all product increments
- `.specweave/docs/` - Product documentation (WHAT + WHY + HOW)
- `src/skills/` - SpecWeave skills (DO NOT modify unless extending)
- `src/hooks/` - Automation hooks

## Workflow

1. User describes what they want
2. role-orchestrator detects needed agents
3. Strategic agents create docs (PM, Architect, DevOps, etc.)
4. User reviews and approves
5. task-builder creates tasks.md
6. Implementation agents build autonomously
7. Testing and deployment

## Key Principles

- **Documentation first**: Create docs before code
- **No plan.md**: Technical details go in tasks.md
- **Strategic agents**: Use PM/Architect for depth
- **Cost optimization**: Choose cheapest resources
- **Autonomous**: Minimize user interruption
- **Approval gates**: Get user approval for docs and major changes

## Skills Available

- role-orchestrator, pm-agent, architect-agent, qa-lead-agent
- devops-agent, security-agent, tech-lead-agent, performance-agent
- nodejs-backend, python-backend, dotnet-backend, frontend-agent
- task-builder, docs-updater, jira-sync, ado-sync
- ... and more

See `src/skills/` for complete list.

## Commands

Use `/command-name` for manual operations:
- `/create-increment` - Create new increment
- `/review-docs` - Review strategic docs
- `/sync-github` - Sync to GitHub

## Hooks

Hooks automate workflows:
- post-task-completion: Sound + docs update
- human-input-required: Sound + log question
- docs-changed: Alert if docs modified during implementation
- pre-implementation: Check regression risk

---

**For more information**, see `.specweave/docs/` (generated during first increment)
```

10. **Output to user**:

```
✅ Created new SpecWeave project: my-saas

   Location: ./my-saas/

   📋 What was created:
   ✅ Project structure (.specweave/, src/, .claude/)
   ✅ Copied 17+ skills from SpecWeave
   ✅ Installed 4 hooks (with sound notifications)
   ✅ Created .specweave/config.yaml
   ✅ Initialized git repository
   ✅ Created README.md and CLAUDE.md

   🎯 Next steps:

   1. Navigate to project:
      cd my-saas

   2. Describe what you want to build (examples for ANY tech stack):
      - "Create an event booking SaaS for barbers and sports facilities"
      - "Build a task management API with real-time collaboration"
      - "Create an e-commerce platform with payment processing"

   3. SpecWeave will:
      - **Detect or ask for your preferred tech stack** (Python, TypeScript, Go, Java, Rust, etc.)
      - Ask clarifying questions (scale, budget, platform, features)
      - Create strategic analysis using YOUR tech stack (PM, Architect, DevOps, Security, QA)
      - Generate comprehensive documentation (framework-specific)
      - Create implementation tasks (with YOUR language/framework code)
      - Build autonomously using YOUR chosen stack

   4. Review strategic docs before implementation:
      /review-docs

   5. Sync to GitHub (optional):
      /sync-github

───────────────────────────────────────────────────────

🚀 Ready to build! Describe what you want to create.
```

---

**Important**: This is the entry point for ALL new SpecWeave projects.
After running this command, the user has a complete SpecWeave environment ready to build anything.
