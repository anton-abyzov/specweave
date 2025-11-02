# Unified AGENTS.md Approach for Multi-Tool Support

**Date**: 2025-11-02
**Increment**: 0004-plugin-architecture
**Status**: Architecture Refined

---

## Key Insight: AGENTS.md is the Universal Standard

After reviewing https://agents.md/, it's clear that **AGENTS.md is the emerging standard** for AI coding assistants across the ecosystem:

- ✅ Used by 20,000+ open source projects
- ✅ Supported by Cursor, Copilot, Claude Code (reads CLAUDE.md), and others
- ✅ Simple Markdown format (no strict schema)
- ✅ "README for agents" - context and instructions

**Critical Decision**: All non-Claude tools (Cursor, Copilot, Generic) should use AGENTS.md compilation.

---

## Tool-Specific Behavior

### Claude Code (Native Plugin Loading)

**No AGENTS.md needed** - uses native plugin system:

```bash
# User adds marketplace
/plugin marketplace add anton-abyzov/specweave

# Claude fetches from GitHub (current snapshot)
# Loads plugins natively (skills/, agents/, commands/)

# User installs
/plugin install specweave-core@specweave
```

**Files created**:
- `.specweave/` structure only
- `CLAUDE.md` from template (optional, project-specific context)

**No compilation needed** - Claude loads directly from marketplace!

---

### Cursor (AGENTS.md + .cursorrules)

**AGENTS.md compilation required**:

```bash
# specweave init detects Cursor
✓ Detected: Cursor
✓ Creating .specweave/ structure
✓ Compiling plugins to AGENTS.md
✓ Creating .cursorrules with @specweave shortcuts
✓ Creating cursor-team-commands.json
```

**Files created**:
- `.specweave/` structure
- `AGENTS.md` (compiled from plugins)
- `.cursorrules` (project-specific rules + @specweave shortcuts)
- `.cursor/cursor-team-commands.json` (slash commands for UI)

**Source material**: NPM package installation (`/usr/local/lib/node_modules/specweave/`)

---

### Copilot (AGENTS.md + .github/copilot/instructions.md)

**AGENTS.md compilation required**:

```bash
# specweave init detects Copilot
✓ Detected: GitHub Copilot
✓ Creating .specweave/ structure
✓ Compiling plugins to AGENTS.md
✓ Creating .github/copilot/instructions.md
```

**Files created**:
- `.specweave/` structure
- `AGENTS.md` (compiled from plugins)
- `.github/copilot/instructions.md` (workspace instructions)

**Source material**: NPM package installation

---

### Generic (AGENTS.md only)

**AGENTS.md compilation required**:

```bash
# specweave init (no tool detected)
✓ Creating .specweave/ structure
✓ Compiling plugins to AGENTS.md
```

**Files created**:
- `.specweave/` structure
- `AGENTS.md` (compiled from plugins)

**User workflow**: Copy-paste relevant sections to ChatGPT/Gemini/etc.

---

## AGENTS.MD Structure for SpecWeave

```markdown
# SpecWeave Development Guide

**Version**: 0.5.0
**Plugin System**: Claude Code Native + Multi-Tool Support

This project uses SpecWeave for spec-driven development. SpecWeave provides specialized agents, skills, and commands to guide the development workflow.

---

## Quick Start

### For Claude Code Users

```bash
# Add SpecWeave marketplace
/plugin marketplace add anton-abyzov/specweave

# Install core framework
/plugin install specweave-core@specweave

# Install GitHub plugin (optional)
/plugin install specweave-github@specweave
```

### For Other Tools (Cursor, Copilot, etc.)

This AGENTS.md file contains all necessary context. Your AI assistant will automatically read it.

---

## Available Agents

### 🎯 PM (Product Manager)

**Role**: Product strategy, increment planning, specification creation

**Activates for**:
- increment planning
- specs, PRDs, requirements
- user stories
- acceptance criteria

**Capabilities**:
- Create product specifications (spec.md)
- Define acceptance criteria
- Plan increments
- Break down features into tasks
- Validate completeness

**When to use**:
- Starting a new feature/increment
- Creating product requirements
- Defining what to build

---

### 🏗️ Architect

**Role**: System architecture, technical design, ADRs, RFCs

**Activates for**:
- architecture decisions
- technical design
- ADRs, RFCs
- HLDs (High-Level Design)
- system diagrams

**Capabilities**:
- Create Architecture Decision Records (ADRs)
- Write RFCs (Request for Comments)
- Design system components
- Define technical specifications
- Review technical feasibility
- Generate Mermaid diagrams

**When to use**:
- Making architectural decisions
- Designing system components
- Evaluating technical approaches

---

### 👨‍💻 Tech Lead

**Role**: Implementation guidance, code review, best practices

**Activates for**:
- implementation planning
- code review
- refactoring
- technical debt
- best practices

**Capabilities**:
- Guide implementation approach
- Review code quality
- Suggest refactoring strategies
- Identify technical debt
- Enforce coding standards

**When to use**:
- Implementing features
- Reviewing code
- Improving code quality

---

## Available Skills

### increment-planner

**Purpose**: Creates comprehensive implementation plans for SpecWeave increments (features).

**Activates for**: increment planning, feature planning, implementation plan, create increment, plan feature, new product, build project, MVP, SaaS

**What it does**:
- Analyzes feature requirements
- Creates spec.md (product specification)
- Creates plan.md (technical implementation)
- Creates tasks.md (actionable tasks)
- Creates tests.md (test strategy)

**When to use**: Planning any new increment/feature

---

### rfc-generator

**Purpose**: Generates Request for Comments (RFC) documents for complex features requiring detailed technical specifications.

**Activates for**: rfc, request for comments, detailed spec, complex feature, technical proposal

**What it does**:
- Creates structured RFC documents
- Defines problem statement
- Proposes solutions with trade-offs
- Specifies implementation details
- Includes decision criteria

**When to use**: Complex features needing detailed technical design before implementation

---

### context-loader

**Purpose**: Explains how SpecWeave achieves context efficiency through progressive disclosure and plugin architecture.

**Activates for**: context loading, progressive disclosure, token efficiency, context management, how SpecWeave scales

**What it does**:
- Explains SpecWeave's context optimization
- Shows plugin loading mechanism
- Demonstrates 60-80% token reduction
- Clarifies when components load

**When to use**: Understanding how SpecWeave manages context

---

### brownfield-analyzer

**Purpose**: Analyzes existing brownfield projects to map documentation to SpecWeave structure.

**Activates for**: brownfield, existing project, migrate, analyze structure, legacy documentation

**What it does**:
- Scans existing project folders
- Classifies documents (PRDs, HLDs, RFCs, Runbooks)
- Detects external tools (Jira, ADO, GitHub)
- Generates migration plan

**When to use**: Adding SpecWeave to existing projects

---

### brownfield-onboarder

**Purpose**: Intelligently onboards brownfield projects by merging existing documentation into SpecWeave structure.

**Activates for**: merge docs, onboard brownfield, import existing docs, migrate documentation

**What it does**:
- Extracts project-specific knowledge
- Distributes content to appropriate folders
- Merges team conventions
- Preserves domain context

**When to use**: Importing existing documentation into SpecWeave

---

### increment-quality-judge

**Purpose**: AI-powered quality assessment for specifications, plans, and tests beyond rule-based validation.

**Activates for**: validate quality, quality check, assess spec, evaluate increment, spec review

**What it does**:
- Evaluates clarity and completeness
- Checks testability
- Identifies missing edge cases
- Reviews architecture soundness
- Provides quality score

**When to use**: Validating increment specs/plans before implementation

---

### context-optimizer

**Purpose**: Second-pass context optimization that removes irrelevant specs/agents/skills from loaded context.

**Activates for**: optimize context, reduce tokens, clean context, smart context, precision loading

**What it does**:
- Analyzes user prompts
- Removes irrelevant components
- Achieves 80%+ token reduction
- Smart cleanup

**When to use**: Working on large projects with many increments

---

## Available Commands

### /specweave.inc

**Purpose**: Plan new Product Increment - PM-led process

**Usage**: `/specweave.inc "feature description"`

**What it does**:
- Auto-closes previous increment if ready
- Creates new increment folder with zero-padded number
- Generates spec.md (product specification)
- Generates plan.md (technical implementation)
- Generates tasks.md (actionable tasks)
- Generates tests.md (test strategy)

**Example**:
```bash
/specweave.inc "user authentication with OAuth"
```

---

### /specweave.do

**Purpose**: Execute increment implementation following spec and plan

**Usage**: `/specweave.do` (no arguments needed)

**What it does**:
- Smart resume (continues from last incomplete task)
- Executes tasks sequentially
- Fires hooks after EVERY task
- Updates living docs automatically
- Tracks progress

**Example**:
```bash
/specweave.do
```

---

### /specweave.next

**Purpose**: Smart increment transition - auto-close current if ready, suggest next work

**Usage**: `/specweave.next`

**What it does**:
- Validates current increment completion
- Closes increment if all tasks done
- Suggests next work from backlog
- Or prompts to create new increment

**Example**:
```bash
/specweave.next
```

---

### /specweave.done

**Purpose**: Close increment with PM validation - checks tasks, tests, and docs

**Usage**: `/specweave.done [increment-number]`

**What it does**:
- Validates all tasks completed
- Checks tests written
- Verifies documentation updated
- Closes increment
- Updates status

**Example**:
```bash
/specweave.done 0001
```

---

### /specweave.progress

**Purpose**: Show current increment progress, task completion %, PM gate status

**Usage**: `/specweave.progress`

**What it does**:
- Shows current increment
- Displays task completion percentage
- Shows PM gate status
- Suggests next action

**Example**:
```bash
/specweave.progress
```

---

### /specweave.validate

**Purpose**: Validate SpecWeave increment with rule-based checks and optional AI quality assessment

**Usage**: `/specweave.validate [increment-number]`

**What it does**:
- Rule-based validation (spec, plan, tasks, tests exist)
- Optional AI quality assessment
- Provides validation report
- Suggests fixes

**Example**:
```bash
/specweave.validate 0001
```

---

### /sync-docs

**Purpose**: Bidirectional documentation sync - review strategic docs before implementation OR update living docs from completed increments

**Usage**: `/sync-docs [review|update]`

**What it does**:
- **review**: Loads strategic docs before starting work
- **update**: Updates living docs after increment completion
- Syncs ADRs (Proposed → Accepted)
- Maintains documentation consistency

**Example**:
```bash
/sync-docs review   # Before starting work
/sync-docs update   # After completing increment
```

---

## Project Structure

```
.specweave/
├── increments/              # Feature development
│   ├── 0001-feature-name/
│   │   ├── spec.md          # Product specification
│   │   ├── plan.md          # Technical implementation
│   │   ├── tasks.md         # Actionable tasks
│   │   ├── tests.md         # Test strategy
│   │   ├── logs/            # Execution logs
│   │   ├── reports/         # Analysis files
│   │   └── scripts/         # Helper scripts
│   └── _backlog/            # Planned future work
│
├── docs/
│   ├── internal/            # Strategic docs (NEVER published)
│   │   ├── strategy/        # Business strategy, market analysis
│   │   ├── architecture/    # Technical architecture
│   │   │   ├── adr/         # Architecture Decision Records
│   │   │   ├── rfc/         # Request for Comments
│   │   │   ├── diagrams/    # Mermaid + SVG diagrams
│   │   │   └── hld-*.md     # High-Level Design
│   │   └── delivery/        # Implementation notes, runbooks
│   │
│   └── public/              # User-facing docs (can publish)
│       ├── guides/
│       └── api/
│
└── logs/                    # Framework logs (gitignored)
```

---

## Typical Workflow

### 1. Plan New Increment

```bash
/specweave.inc "user authentication with OAuth"
```

Creates:
- `.specweave/increments/0001-user-authentication/spec.md`
- `.specweave/increments/0001-user-authentication/plan.md`
- `.specweave/increments/0001-user-authentication/tasks.md`
- `.specweave/increments/0001-user-authentication/tests.md`

---

### 2. Review Strategic Docs (Optional)

```bash
/sync-docs review
```

Loads relevant ADRs, RFCs, architecture docs before starting work.

---

### 3. Execute Tasks

```bash
/specweave.do
```

- Executes tasks sequentially
- Hooks fire after EVERY task
- Living docs update automatically

---

### 4. Check Progress

```bash
/specweave.progress
```

Shows completion percentage and next action.

---

### 5. Validate Increment

```bash
/specweave.validate 0001
```

Validates completeness before closing.

---

### 6. Close Increment

```bash
/specweave.done 0001
```

PM validation, updates status.

---

### 7. Update Living Docs

```bash
/sync-docs update
```

Syncs implementation learnings back to strategic docs.

---

## Architecture Principles

### 1. Source of Truth
- `.specweave/` is the single source of truth for increments and documentation
- All work traces back to specs

### 2. Living Documentation
- Documentation updates automatically via hooks
- ADRs sync from Proposed → Accepted
- Implementation notes capture learnings

### 3. Progressive Disclosure
- Context loads incrementally
- 60-80% token reduction via plugin system
- Only relevant components activate

### 4. Spec-Driven Development
- Everything starts with a spec
- Plan before implementing
- Test before closing

---

## Hooks (Automated Workflows)

### post-task-completion

**Triggers**: After EVERY task completion in `/specweave.do`

**Actions**:
1. Updates living docs (`.specweave/docs/internal/delivery/implementation-notes/`)
2. Syncs ADRs (Proposed → Accepted)
3. Plays notification sound (when session ends)
4. Logs execution details

**Configuration**: `.specweave/hooks/hooks.json`

---

## Best Practices

### DO:
- ✅ Always start with `/specweave.inc` for new features
- ✅ Review specs before implementation
- ✅ Use `/sync-docs review` to load architecture context
- ✅ Execute tasks via `/specweave.do` (hooks fire automatically)
- ✅ Validate before closing: `/specweave.validate`
- ✅ Update living docs: `/sync-docs update`

### DON'T:
- ❌ Skip spec creation (no "cowboy coding")
- ❌ Create files in project root (use increment folders)
- ❌ Ignore PM gate validation
- ❌ Forget to sync docs after implementation

---

## Plugin System (Advanced)

### Available Plugins

**Core** (always included):
- increment-planner, rfc-generator, context-loader, brownfield-analyzer, brownfield-onboarder, increment-quality-judge, context-optimizer

**GitHub Plugin** (optional):
- github-sync: Bidirectional increment ↔ issue sync
- github-issue-tracker: Task-level progress tracking
- Commands: `/github-sync`, `/github-create-issue`, `/github-status`

**Future Plugins**:
- specweave-kubernetes: K8s deployment
- specweave-frontend-stack: React/Vue/Angular
- specweave-backend-stack: Node/Python/.NET

### For Claude Code Users

```bash
# Install GitHub plugin
/plugin install specweave-github@specweave

# Install Kubernetes plugin (when available)
/plugin install specweave-kubernetes@specweave
```

### For Other Tools

Plugins are pre-compiled into this AGENTS.md file. Enable/disable via SpecWeave CLI:

```bash
specweave plugin enable github
specweave plugin disable github
```

---

## Troubleshooting

### Increment not creating?
- Check `.specweave/increments/` exists
- Verify previous increment is closed or closable

### Hooks not firing?
- Check `.specweave/hooks/hooks.json` exists
- Verify post-task-completion.sh is executable

### Commands not working?
- **Claude Code**: Verify plugin installed via `/plugin list`
- **Cursor/Copilot**: Check AGENTS.md is in project root

---

## Resources

- **Website**: https://spec-weave.com
- **Repository**: https://github.com/anton-abyzov/specweave
- **Documentation**: https://docs.spec-weave.com

---

**Last Updated**: 2025-11-02 (v0.5.0)
```

---

## Adapter Implementation Strategy

### Source Material Options

**Option 1: NPM Package Location** (Preferred for init)
```typescript
// When specweave is installed globally: npm install -g specweave
const specweaveRoot = '/usr/local/lib/node_modules/specweave';
const skills = await readDir(path.join(specweaveRoot, 'skills'));
const agents = await readDir(path.join(specweaveRoot, 'agents'));
const commands = await readDir(path.join(specweaveRoot, 'commands'));
```

**Option 2: GitHub Repository** (For updates)
```typescript
// Fetch latest from GitHub
const baseUrl = 'https://raw.githubusercontent.com/anton-abyzov/specweave/main';
const skillContent = await fetch(`${baseUrl}/skills/increment-planner/SKILL.md`);
```

**Option 3: Bundled Templates** (Fallback)
```typescript
// Read from compiled dist/templates
const templatesDir = path.join(__dirname, '../templates/agents-md');
```

---

## Adapter Logic

### Claude Adapter (Native)

```typescript
async install(targetDir: string) {
  // 1. Create .specweave/ structure
  await this.createSpecweaveStructure(targetDir);

  // 2. Provision marketplace instructions (NOT file copying!)
  console.log('✅ Claude Code detected!');
  console.log('');
  console.log('Add SpecWeave marketplace:');
  console.log('  /plugin marketplace add anton-abyzov/specweave');
  console.log('');
  console.log('Install SpecWeave core:');
  console.log('  /plugin install specweave-core@specweave');
  console.log('');
  console.log('(Optional) Install GitHub plugin:');
  console.log('  /plugin install specweave-github@specweave');

  // 3. Create CLAUDE.md from template (project-specific context)
  await this.createClaudeMd(targetDir);

  // NO AGENTS.MD CREATION! Claude uses native plugins
}
```

### Cursor Adapter (AGENTS.MD + .cursorrules)

```typescript
async install(targetDir: string) {
  // 1. Create .specweave/ structure
  await this.createSpecweaveStructure(targetDir);

  // 2. Read plugins from NPM package
  const specweaveRoot = this.getSpecweaveInstallPath();
  const plugins = await this.readPlugins(specweaveRoot);

  // 3. Compile to AGENTS.md
  await this.compileToAgentsMd(targetDir, plugins);

  // 4. Create .cursorrules with @specweave shortcuts
  await this.createCursorRules(targetDir);

  // 5. Create cursor-team-commands.json
  await this.createTeamCommands(targetDir, plugins.commands);

  console.log('✅ Cursor detected!');
  console.log('✅ Created AGENTS.md with all SpecWeave context');
  console.log('✅ Created .cursorrules with @specweave shortcuts');
  console.log('✅ Created cursor-team-commands.json for UI');
}
```

### Copilot Adapter (AGENTS.MD + instructions.md)

```typescript
async install(targetDir: string) {
  // 1. Create .specweave/ structure
  await this.createSpecweaveStructure(targetDir);

  // 2. Read plugins from NPM package
  const specweaveRoot = this.getSpecweaveInstallPath();
  const plugins = await this.readPlugins(specweaveRoot);

  // 3. Compile to AGENTS.md
  await this.compileToAgentsMd(targetDir, plugins);

  // 4. Create .github/copilot/instructions.md
  await this.createCopilotInstructions(targetDir);

  console.log('✅ GitHub Copilot detected!');
  console.log('✅ Created AGENTS.md with all SpecWeave context');
  console.log('✅ Created .github/copilot/instructions.md');
}
```

### Generic Adapter (AGENTS.MD only)

```typescript
async install(targetDir: string) {
  // 1. Create .specweave/ structure
  await this.createSpecweaveStructure(targetDir);

  // 2. Read plugins from NPM package
  const specweaveRoot = this.getSpecweaveInstallPath();
  const plugins = await this.readPlugins(specweaveRoot);

  // 3. Compile to AGENTS.md
  await this.compileToAgentsMd(targetDir, plugins);

  console.log('✅ Created AGENTS.md with all SpecWeave context');
  console.log('');
  console.log('Copy relevant sections to your AI assistant (ChatGPT, Gemini, etc.)');
}
```

---

## Marketplace Provisioning (Claude Code)

### GitHub Reference in marketplace.json

```json
{
  "name": "specweave",
  "owner": {
    "name": "Anton Abyzov",
    "email": "anton@spec-weave.com"
  },
  "metadata": {
    "description": "SpecWeave - Spec-Driven Development Framework",
    "version": "0.5.0",
    "repository": "https://github.com/anton-abyzov/specweave"
  },
  "plugins": [
    {
      "name": "specweave-core",
      "description": "SpecWeave core framework",
      "source": {
        "source": "github",
        "repo": "anton-abyzov/specweave"
      },
      "version": "0.5.0"
    },
    {
      "name": "specweave-github",
      "description": "GitHub integration",
      "source": {
        "source": "github",
        "repo": "anton-abyzov/specweave",
        "path": "plugins/specweave-github"
      },
      "version": "1.0.0"
    }
  ]
}
```

**How it works**:
1. User runs: `/plugin marketplace add anton-abyzov/specweave`
2. Claude fetches `marketplace.json` from GitHub
3. User installs: `/plugin install specweave-core@specweave`
4. Claude fetches **current snapshot** from GitHub `main` branch
5. Plugins cached locally in `~/.claude-code/marketplaces/specweave/`

**Updates**:
- `/plugin marketplace update specweave` → refreshes marketplace.json
- Reinstall plugins to get latest: `/plugin uninstall` + `/plugin install`

---

## Version Syncing

Keep plugin versions in sync with package.json:

**package.json**:
```json
{
  "name": "specweave",
  "version": "0.5.0"
}
```

**.claude-plugin/plugin.json**:
```json
{
  "name": "specweave-core",
  "version": "0.5.0"
}
```

**.claude-plugin/marketplace.json**:
```json
{
  "metadata": {
    "version": "0.5.0"
  },
  "plugins": [
    {
      "name": "specweave-core",
      "version": "0.5.0"
    }
  ]
}
```

**Automated sync** (build script):
```bash
#!/bin/bash
VERSION=$(node -p "require('./package.json').version")
jq ".version = \"$VERSION\"" .claude-plugin/plugin.json > tmp && mv tmp .claude-plugin/plugin.json
jq ".metadata.version = \"$VERSION\"" .claude-plugin/marketplace.json > tmp && mv tmp .claude-plugin/marketplace.json
```

---

## Summary

### Key Decisions

1. ✅ **Claude Code**: Native plugin loading (no AGENTS.md, no copying)
2. ✅ **Cursor/Copilot/Generic**: Compile to AGENTS.md (universal standard)
3. ✅ **Source Material**: Read from NPM package location
4. ✅ **Marketplace**: GitHub reference for Claude, local compilation for others
5. ✅ **Version Sync**: Keep plugin.json, marketplace.json, package.json in sync

### Files Created by Each Tool

**Claude Code**:
- `.specweave/` structure
- `CLAUDE.md` (project-specific context, optional)

**Cursor**:
- `.specweave/` structure
- `AGENTS.md` (compiled plugins)
- `.cursorrules` (@specweave shortcuts)
- `.cursor/cursor-team-commands.json`

**Copilot**:
- `.specweave/` structure
- `AGENTS.md` (compiled plugins)
- `.github/copilot/instructions.md`

**Generic**:
- `.specweave/` structure
- `AGENTS.md` (compiled plugins)

---

**Status**: Architecture finalized, ready for implementation!
