# SpecWeave Restructuring Plan

**Date**: 2025-01-25
**Reason**: User feedback on constitution, directory structure, and entry point

---

## Issues Identified

### 1. Constitution Too Rigid

**Problem**:
- Constitution feels like immutable law, conflicts with agent flexibility
- Might contradict agent instructions in `plan.md`
- Too prescriptive for a framework that should be adaptable

**Solution**:
- Move principles to `docs/principles.md` (living documentation)
- Make configurable in `.specweave/config.yaml`
- Remove "Article" language, use "Best Practices" or "Guidelines"

### 2. ADRs Outside docs/

**Problem**:
- ADRs ARE documentation, why separate folder?
- Harder to discover
- Inconsistent with "docs as source of truth"

**Solution**:
- Move `adrs/` → `docs/decisions/`
- Keep chronological numbering (001, 002, 003)
- Maintain `docs/decisions/index.md` for discoverability

### 3. No Clear Entry Point

**Problem**:
- User doesn't know SpecWeave is active
- No automatic skill activation when `.specweave` exists
- Need "factory of agents" to parse intent and route

**Solution**:
- Create `specweave-detector` skill
- Activates when `.specweave/config.yaml` exists
- Routes to skill-router for intent parsing
- Auto-activate without user knowing

### 4. Skills Location Confusion

**Problem**:
- Skills in `.claude/skills/` look like generated files
- Source of truth unclear
- Installation process not defined

**Solution**:
```
src/skills/              # SOURCE OF TRUTH (in repo)
  ├── feature-planner/
  ├── context-loader/
  └── skill-router/

Installation:
  npx specweave install --local   → .claude/skills/
  npx specweave install --global  → ~/.claude/skills/
```

### 5. No Project Tracking/Roadmap

**Problem**:
- Open source projects (SpecKit, BMAD) have unclear roadmaps
- Users don't know what's being worked on
- No traceability: changes → features

**Solution**:
- Create `roadmap.md` generated from `features/`
- Sync with JIRA/GitHub/Trello/ADO
- Track feature status (planned → in_progress → completed)
- Show what's in current release

### 6. Missing GitHub Best Practices

**Problem**:
- No CI/CD workflows
- No issue templates
- No branch protection
- No release process

**Solution**:
- Setup `.github/workflows/`
- Create issue templates
- Configure branch protection (develop, main)
- Semantic versioning (0.1.0 → 1.0.0)
- GitHub Actions for tests, releases

### 7. No Documentation Portal Plan

**Problem**:
- Markdown docs are good but need discoverability
- No navigation structure for users
- YouTube tutorials planned but not organized

**Solution**:
- MkDocs Material theme
- Auto-deploy to GitHub Pages
- YouTube playlist structure
- Search functionality

---

## New Directory Structure

### Before
```
specweave/
├── .claude/skills/          # Confusing - is this source?
├── specs/
│   └── constitution.md      # Too rigid
├── adrs/                    # Why separate from docs?
├── features/
├── docs/
└── src/                     # No skills here
```

### After
```
specweave/
├── src/
│   ├── skills/              # SOURCE OF TRUTH for skills
│   │   ├── feature-planner/
│   │   ├── context-loader/
│   │   ├── skill-router/
│   │   └── specweave-detector/  # NEW: Entry point
│   ├── cli/                 # CLI implementation
│   └── core/                # Core libraries
├── docs/
│   ├── principles.md        # MOVED: from specs/constitution.md
│   ├── decisions/           # MOVED: from adrs/
│   │   ├── index.md
│   │   ├── 001-tech-stack.md
│   │   └── ...
│   ├── getting-started/
│   ├── guides/
│   ├── reference/
│   └── architecture/
├── specs/
│   ├── overview.md
│   └── modules/
├── architecture/            # Keep separate (system design)
├── features/
│   ├── roadmap.md           # NEW: Generated roadmap
│   └── 001-context-loader/
├── .github/
│   ├── workflows/           # NEW: CI/CD
│   │   ├── test.yml
│   │   ├── release.yml
│   │   └── docs.yml
│   ├── ISSUE_TEMPLATE/      # NEW: Templates
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── skill_proposal.md
│   └── PULL_REQUEST_TEMPLATE.md
├── .specweave/
│   ├── config.yaml
│   └── cache/
└── mkdocs.yml               # NEW: Docs portal config
```

---

## Restructuring Tasks

### Phase 1: Directory Reorganization

1. **Move Constitution**
   - `specs/constitution.md` → `docs/principles.md`
   - Rewrite in "Best Practices" tone, not "Articles"
   - Make configurable via `.specweave/config.yaml`

2. **Move ADRs**
   - `adrs/` → `docs/decisions/`
   - Create `docs/decisions/index.md`
   - Update all references

3. **Create src/skills/**
   - Move `.claude/skills/feature-planner/` → `src/skills/feature-planner/`
   - Update README to clarify source location
   - Create installation mechanism

4. **Update .gitignore**
   - Ignore `.claude/skills/` (generated)
   - Keep `src/skills/` (source)

### Phase 2: Entry Point Skill

Create `src/skills/specweave-detector/SKILL.md`:

```yaml
---
name: specweave-detector
description: Detects SpecWeave projects and activates the SpecWeave framework. This skill should activate automatically when a .specweave directory exists. It acts as the entry point for all SpecWeave operations, routing user intents to appropriate skills.
---
```

**Behavior**:
1. Check if `.specweave/config.yaml` exists
2. If yes, load SpecWeave configuration
3. Activate `skill-router` to parse user intent
4. Route to appropriate skills (feature-planner, context-loader, etc.)
5. Handle nested skill calls

### Phase 3: GitHub Best Practices

1. **Branch Strategy**
   - `main` - Production releases (protected)
   - `develop` - Integration branch (protected)
   - `feature/###-name` - Feature branches
   - Git Flow for releases

2. **CI/CD Workflows**
   - `.github/workflows/test.yml` - Run tests on PR
   - `.github/workflows/release.yml` - Semantic versioning
   - `.github/workflows/docs.yml` - Deploy MkDocs to GitHub Pages
   - `.github/workflows/skill-validation.yml` - Validate all skills have tests

3. **Issue Templates**
   - Bug report
   - Feature request
   - Skill proposal (for community skills)

4. **Branch Protection**
   - Require PR reviews
   - Require passing tests
   - No force push
   - Require linear history

### Phase 4: Roadmap & Tracking

Create `features/roadmap.md`:

```markdown
# SpecWeave Roadmap

**Current Version**: 0.1.0
**Next Release**: 0.2.0 (ETA: 2025-02-15)

## In Progress
- [001-context-loader](./001-context-loader/) - 30% complete

## Planned for v0.2.0
- 002-skill-router
- 003-docs-updater

## Planned for v0.3.0
- 004-spec-author
- 005-architect

## Backlog
- Integration skills (JIRA, GitHub, ADO)
- IaC skills (Terraform, Pulumi)

## Completed
(None yet)
```

**Auto-generate from**:
- `features/` directory
- Feature status in `spec.md` frontmatter
- Git commits linked to features

**Sync with**:
- JIRA via API (create issues from features)
- GitHub Issues (create from features)
- Trello (create cards)
- ADO (create work items)

### Phase 5: MkDocs Documentation Portal

**mkdocs.yml**:
```yaml
site_name: SpecWeave
site_url: https://yourusername.github.io/specweave
repo_url: https://github.com/yourusername/specweave
repo_name: specweave

theme:
  name: material
  palette:
    primary: indigo
    accent: indigo
  features:
    - navigation.tabs
    - navigation.sections
    - toc.integrate
    - search.suggest

nav:
  - Home: index.md
  - Getting Started:
    - Installation: getting-started/installation.md
    - Quick Start: getting-started/quickstart.md
  - Guides:
    - Writing Specs: guides/writing-specs.md
    - Creating Skills: guides/creating-skills.md
  - Reference:
    - CLI: reference/cli-commands.md
    - Skills API: reference/skills-api.md
  - Architecture: architecture/overview.md
  - Principles: principles.md
  - Decisions: decisions/index.md

plugins:
  - search
  - mermaid2

markdown_extensions:
  - pymdownx.highlight
  - pymdownx.superfences
  - pymdownx.tabbed
  - admonition
```

**Deploy**:
- GitHub Action builds on push to `main`
- Deploys to GitHub Pages
- Custom domain: docs.specweave.dev

### Phase 6: YouTube Tutorial Structure

**Playlist**: SpecWeave Tutorials

1. **Introduction** (5 min)
   - What is SpecWeave?
   - Intent-Driven Development
   - Comparison to BMAD/SpecKit

2. **Quick Start** (10 min)
   - Installation
   - First feature
   - Basic workflow

3. **Core Concepts** (15 min)
   - Specs vs Architecture vs Decisions
   - Context manifests
   - Auto-role routing

4. **Skills Deep Dive** (20 min)
   - Creating custom skills
   - Testing skills
   - Publishing to marketplace

5. **Brownfield Projects** (15 min)
   - Onboarding existing code
   - Regression prevention
   - Documentation generation

6. **Enterprise Features** (20 min)
   - Multi-team support
   - Integration with JIRA/ADO
   - Compliance tracking

---

## Configuration Changes

### .specweave/config.yaml (Enhanced)

```yaml
# SpecWeave Configuration
project:
  name: "specweave"
  version: "0.1.0"
  type: "greenfield"  # or brownfield

# Principles (formerly constitution)
principles:
  enforce_specs_as_truth: true
  require_regression_tests: true
  test_first_development: true
  context_precision: true
  auto_role_routing: true

  # Customizable per project
  custom_principles:
    - "All APIs must have OpenAPI specs"
    - "No direct database queries in controllers"

# Skills
skills:
  source_dir: "src/skills/"           # Source of truth
  install_location: "local"           # local (.claude/skills/) or global (~/.claude/skills/)
  auto_install: true                  # Install on project init
  marketplace_sync: true              # Sync with skills marketplace

# Integrations
integrations:
  github:
    enabled: true
    repo: "yourusername/specweave"
    sync_issues: true                 # Sync features ↔ issues

  jira:
    enabled: false
    url: ""
    project_key: ""
    sync_epics: true                  # Sync features ↔ epics

# Roadmap
roadmap:
  auto_generate: true                 # Generate from features/
  include_in_readme: true             # Add to README.md
  publish_to_github: true             # Publish as GitHub project board

# Documentation Portal
docs:
  portal_enabled: true
  framework: "mkdocs"                 # mkdocs or docusaurus
  theme: "material"
  auto_deploy: true                   # Deploy on push to main
  deploy_target: "github_pages"       # or vercel, netlify

# Versioning
versioning:
  scheme: "semver"                    # semantic versioning
  auto_increment: true                # Increment on feature completion
  changelog_auto_generate: true
```

---

## Extensibility Examples (Your Use Cases)

### 1. New Relic Monitoring Skill

**Create**: `src/skills/newrelic-monitor/SKILL.md`

```yaml
---
name: newrelic-monitor
description: Integrates New Relic monitoring into SpecWeave projects. Generates New Relic instrumentation code, dashboards, and alerts based on specs. Activates for: new relic, monitoring, observability, APM.
references:
  - https://docs.newrelic.com/docs/apm/
scripts:
  - scripts/generate-instrumentation.js
  - scripts/create-dashboard.js
---
```

**Benefits**:
- Reads your specs
- Generates New Relic config
- Creates dashboards automatically
- Sets up alerts based on SLAs in specs

### 2. CQRS Pattern Skill

**Create**: `src/skills/cqrs-implementer/SKILL.md`

```yaml
---
name: cqrs-implementer
description: Implements CQRS (Command Query Responsibility Segregation) patterns based on project-specific rules. Supports single-database CQRS (1 DB for read/write with separate models) or dual-database. Configurable via specs. Activates for: CQRS, command query, event sourcing.
references:
  - docs/architecture/cqrs-approach.md  # Your specific rules
  - https://martinfowler.com/bliki/CQRS.html
---
```

**Customization**:
- You define in `docs/architecture/cqrs-approach.md`: "Use 1 database, separate read/write models"
- Skill reads your docs
- Generates code following YOUR rules, not generic CQRS

### 3. Event-Driven Architecture Skill

**Create**: `src/skills/eda-architect/SKILL.md`

```yaml
---
name: eda-architect
description: Designs and implements Event-Driven Architecture based on specs. Supports Kafka, RabbitMQ, AWS EventBridge, Azure Event Grid. Generates event schemas, producers, consumers, and choreography. Activates for: event driven, EDA, events, messaging, Kafka.
references:
  - docs/architecture/event-driven-design.md
  - specs/modules/events/
scripts:
  - scripts/generate-event-schema.js
  - scripts/create-kafka-topics.js
---
```

**Power**:
- Reads your event specs
- Generates Avro/Protobuf schemas
- Creates Kafka topics
- Implements producers/consumers
- All aligned with YOUR architecture decisions

---

## Entry Point: specweave-detector Skill

**Key Innovation**: Auto-activates when `.specweave` exists

### Skill Design

**File**: `src/skills/specweave-detector/SKILL.md`

```yaml
---
name: specweave-detector
description: |
  Entry point for SpecWeave framework. Automatically activates when .specweave directory
  is detected in the project. Acts as a factory of agents, parsing user intents and
  routing to appropriate skills. Supports nested skill calls and context management.

  This skill should ALWAYS be loaded first in SpecWeave projects and handles:
  - Intent parsing
  - Skill routing
  - Context loading
  - Nested skill orchestration

  Activates for: ANY user request in a SpecWeave project (auto-detects .specweave/)
proactive: true  # Claude Code feature: load proactively
---

# SpecWeave Detector & Router

## Purpose

This skill is the **entry point** for all SpecWeave operations. When Claude Code detects
a `.specweave/config.yaml` file, this skill activates automatically and orchestrates
all other SpecWeave skills.

## Detection Logic

1. Check current directory and parents for `.specweave/config.yaml`
2. If found, load SpecWeave configuration
3. Activate SpecWeave mode
4. Parse user intent
5. Route to appropriate skills

## Intent Parsing

When user says:
- "Plan a feature for..." → Route to `feature-planner`
- "Load context for..." → Route to `context-loader`
- "Document this code..." → Route to `docs-updater`
- "Create a spec for..." → Route to `spec-author`
- "Design architecture for..." → Route to `architect`
- Ambiguous → Route to `skill-router` for disambiguation

## Nested Skill Calls

Some intents require multiple skills:

Example: "Create and implement a new payment feature"
1. `feature-planner` - Plan feature
2. `context-loader` - Load relevant specs
3. `developer` - Implement code
4. `qa-engineer` - Generate tests
5. `docs-updater` - Update documentation

## Context Management

Load context based on:
- User intent
- Feature being worked on (check `work/issues/` for active work)
- Configuration in `.specweave/config.yaml`

## Workflow

```
User Request
    ↓
SpecWeave Detector (this skill)
    ↓
Parse Intent
    ↓
┌─────────────────────────────────┐
│ Route to Appropriate Skill(s)  │
├─────────────────────────────────┤
│ • feature-planner               │
│ • context-loader                │
│ • skill-router                  │
│ • spec-author                   │
│ • architect                     │
│ • developer                     │
│ • qa-engineer                   │
│ • docs-updater                  │
│ • Custom skills (New Relic,    │
│   CQRS, EDA, etc.)              │
└─────────────────────────────────┘
    ↓
Execute Skill(s)
    ↓
Return Result
```

## Auto-Activation

This skill is loaded automatically when:
- `.specweave/config.yaml` exists in project
- User is in Claude Code
- No manual invocation needed

Claude Code's proactive skill loading ensures this skill is ready before user asks.
```

---

## Installation Mechanism

### npx specweave install

```bash
# Install SpecWeave skills locally (project-specific)
npx specweave install --local
# Copies src/skills/ → .claude/skills/

# Install globally (all projects)
npx specweave install --global
# Copies src/skills/ → ~/.claude/skills/

# Install specific skill
npx specweave install feature-planner --local

# Uninstall
npx specweave uninstall feature-planner
```

### Implementation

**File**: `src/cli/install.js`

```javascript
async function install(options) {
  const { local, global, skillName } = options;

  const sourceDir = path.join(__dirname, '../skills');
  const targetDir = local
    ? path.join(process.cwd(), '.claude/skills')
    : path.join(os.homedir(), '.claude/skills');

  if (skillName) {
    // Install specific skill
    await copySkill(
      path.join(sourceDir, skillName),
      path.join(targetDir, skillName)
    );
  } else {
    // Install all skills
    const skills = await fs.readdir(sourceDir);
    for (const skill of skills) {
      await copySkill(
        path.join(sourceDir, skill),
        path.join(targetDir, skill)
      );
    }
  }

  console.log(`✅ Skills installed to ${targetDir}`);
  console.log('Restart Claude Code for changes to take effect.');
}
```

---

## Summary of Changes

### What Changes
1. ✅ Constitution → `docs/principles.md` (flexible guidelines)
2. ✅ ADRs → `docs/decisions/` (part of documentation)
3. ✅ Skills → `src/skills/` (source of truth)
4. ✅ Add `specweave-detector` (entry point, factory of agents)
5. ✅ Add `features/roadmap.md` (project visibility)
6. ✅ Add `.github/workflows/` (CI/CD, best practices)
7. ✅ Add `mkdocs.yml` (documentation portal)
8. ✅ Enhanced `.specweave/config.yaml` (principles, integrations)

### What Stays
- `specs/` - Specifications (source of truth)
- `architecture/` - System design (separate from specs)
- `features/` - Implementation plans
- `docs/` - Living documentation

### New Capabilities
1. **Auto-Activation**: `.specweave` exists → SpecWeave mode
2. **Project Tracking**: Roadmap + sync with JIRA/GitHub/Trello/ADO
3. **Extensibility**: Custom skills (New Relic, CQRS, EDA)
4. **Best Practices**: Git flow, CI/CD, issue templates
5. **Docs Portal**: MkDocs with search, navigation
6. **Installation**: `npx specweave install --local|--global`

---

## Next Steps

1. Implement restructuring (move files)
2. Create `specweave-detector` skill
3. Setup GitHub workflows
4. Create roadmap feature
5. Setup MkDocs
6. Test installation mechanism

This addresses all your concerns and makes SpecWeave truly extensible, trackable, and production-ready!
