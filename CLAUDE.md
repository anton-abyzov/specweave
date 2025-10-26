# SpecWeave - Spec-Driven Development Framework

**THIS FILE (CLAUDE.md) IS YOUR COMPLETE DEVELOPMENT GUIDE**

This file contains everything you need to develop with SpecWeave:
- Project structure and conventions
- Development workflow
- How skills work
- References to documentation (built gradually as needed)

**There is NO separate "constitution" or "principles" file.** This guide IS the source of truth for development.

---

## Project Philosophy

**SpecWeave** is a specification-first AI development framework where **specifications and documentation are the SOURCE OF TRUTH**. Code is the expression of these specifications in a particular language.

### Core Principles

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Regression Prevention** - Document existing code before modification
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Scalable from Solo to Enterprise** - Modular structure that grows with project size
6. **Context Precision** - Load only relevant specs (70%+ token reduction)
7. **Auto-Role Routing** - Skills detect and route to appropriate expertise automatically
8. **Closed-Loop Validation** - E2E tests must tell the truth (no false positives)

---

## Documentation Philosophy & Approaches

**CRITICAL**: Documentation is **CRUCIAL for production readiness**. SpecWeave supports TWO valid documentation approaches:

### Approach 1: Comprehensive Upfront (Enterprise/Production)

**When to use**:
- Enterprise systems with complex requirements
- Regulated industries (healthcare, finance, government)
- Large teams (10+ developers)
- Production systems requiring complete spec before implementation
- Systems where requirements are well-understood upfront

**Characteristics**:
- **500-600+ page specifications** created before development
- Complete architecture documentation upfront
- All ADRs (Architecture Decision Records) documented in advance
- Comprehensive API contracts
- Detailed data models
- Full security/compliance documentation

**Benefits**:
- Complete clarity before code is written
- Easier team coordination (everyone reads the same spec)
- Better for regulated environments
- Reduces surprises during implementation
- Facilitates compliance/audit requirements

**Example Structure**:
```
.specweave/docs/internal/strategy/
├── overview.md (50 pages)
├── payments/ (100 pages)
│   ├── stripe/
│   ├── paypal/
│   └── shared/
├── authentication/ (80 pages)
│   ├── oauth/
│   └── jwt/
├── reporting/ (120 pages)
└── integrations/ (150 pages)

Total: ~600 pages of specifications
```

### Approach 2: Incremental/Evolutionary (Startup/Iterative)

**When to use**:
- Startups with evolving requirements
- Exploratory projects
- Small teams (1-5 developers)
- MVPs and prototypes
- Projects where requirements emerge over time
- When rapid iteration is critical

**Characteristics**:
- Start with high-level overview (10-20 pages)
- Build documentation **as you go** (like Microsoft documentation)
- Add modules/specs as features are planned
- Architecture evolves with implementation
- ADRs created when decisions are made (not all upfront)

**Benefits**:
- Faster time-to-first-code
- Reduces upfront investment
- Adapts to changing requirements
- Less documentation maintenance (only for implemented features)
- More suitable for agile/iterative workflows

**Example Evolution**:
```
Week 1: Overview + core spec (20 pages)
Week 4: Added auth module (30 pages total)
Week 8: Added payments module (60 pages total)
Week 12: Added integrations (100 pages total)
```

### SpecWeave Supports Both Approaches

**The framework is designed to scale from 10 pages to 1000+ pages**:

| Feature | Upfront | Incremental |
|---------|---------|-------------|
| Context Loading | ✅ Load only relevant sections | ✅ Load what exists |
| Modular Specs | ✅ Organize 500+ pages | ✅ Add modules incrementally |
| Context Manifests | ✅ Precise loading (70%+ reduction) | ✅ Load growing context |
| Skills | ✅ Work with complete specs | ✅ Work with partial specs |
| Auto-role Routing | ✅ Navigate large specs | ✅ Navigate small specs |
| Living Documentation | ✅ Keep 600 pages in sync | ✅ Grow docs over time |

### Choosing Your Approach

**Ask yourself**:
1. **Are requirements well-understood?** → Upfront comprehensive
2. **Is this a regulated industry?** → Upfront comprehensive
3. **Large team coordination needed?** → Upfront comprehensive
4. **Rapid iteration required?** → Incremental evolutionary
5. **Startup with changing needs?** → Incremental evolutionary
6. **MVP/prototype?** → Incremental evolutionary

**Important**: You can START incremental and GROW to comprehensive as project matures!

---

## Installation & Requirements

### Required AI Model

**CRITICAL**: SpecWeave requires **Claude Sonnet 4.5** (best for coding and complex agents).

**Model Identifier**: `claude-sonnet-4-5-20250929` (dated snapshot from September 29, 2025)

This model is used for all agents in SpecWeave:
- PM, Architect, Security, QA Lead
- DevOps, Tech Lead
- Backend, Frontend developers

**Configuration**: See `.specweave/config.yaml`:
```yaml
ai:
  model: "claude-sonnet-4-5-20250929"
```

### Installation Commands

**Initialize New Project**:
```bash
# Option 1: Using /create-project slash command
/create-project

# Option 2: Using specweave CLI (future)
npx specweave init
```

**Install SpecWeave Skills**:
```bash
# Install all core skills
npx specweave install --all

# Install specific skill
npx specweave install feature-planner --local
```

**Note**: Hooks are installed automatically (copied for Windows compatibility) by `/create-project` or `specweave init`.

---

## Claude Hooks (Auto-Update Mechanism)

**CRITICAL**: SpecWeave uses Claude Code hooks to automate documentation updates and validations.

### Post-Task-Completion Hook

**Purpose**: Auto-update CLAUDE.md and other documentation after every task completion

**Configuration**: `.specweave/config.yaml`
```yaml
hooks:
  post_task_completion:
    enabled: true
    actions:
      - update_documentation
      - update_claude_md
      - update_changelog
```

**When this hook fires**:
1. Task is marked complete
2. `docs-updater` skill activates
3. Scans for changes to:
   - Specifications (.specweave/docs/internal/strategy/)
   - Architecture (.specweave/docs/internal/architecture/)
   - Increments (.specweave/increments/)
   - Source code (src/)
4. Updates relevant documentation:
   - **CLAUDE.md** - Structure, conventions, workflow
   - **.specweave/docs/public/api/** - API/CLI reference
   - **.specweave/docs/public/changelog/** - Changelog entries
5. Commits changes with message: "docs: auto-update after task completion"

**Important**:
- Manual content (guides, tutorials) is NEVER auto-modified
- Only auto-generated sections are updated
- This file (CLAUDE.md) MUST be updated when project structure changes

### Pre-Implementation Hook

**Purpose**: Check regression risk before modifying existing code

**Trigger**: Before implementing any feature

**Actions**:
- Detect if modification affects existing code
- Verify documentation exists for current behavior
- If missing, activate `brownfield-analyzer` skill
- Require user approval before proceeding

### Human-Input-Required Hook

**Purpose**: Log and notify when AI needs clarification

**Trigger**: When agent needs user input

**Actions**:
- Create notification
- Log to `.specweave/increments/{increment-id}/logs/human-input.log`
- Pause execution until user responds

---

## Slash Commands (Framework-Agnostic)

**CRITICAL**: All SpecWeave slash commands are **framework-agnostic** and adapt to ANY tech stack (TypeScript, Python, Go, Rust, Java, etc.).

### Core Principles

1. **Tech Stack Detection**: Commands NEVER assume framework - they detect from `.specweave/config.yaml` or project files
2. **$ARGUMENTS Support**: All commands support optional command-line arguments
3. **Interactive Clarification**: Use `AskUserQuestion` when critical info is missing
4. **Generic Output**: Templates use placeholders like `{detected-language}`, not hardcoded "Next.js"
5. **Adaptive Behavior**: Structure and examples adapt to detected tech stack

### Available Commands

#### `/create-project` - Bootstrap New Project

**Purpose**: Initialize a new SpecWeave project (works with ANY language/framework)

**Usage**:
```bash
/create-project                                      # Interactive (asks questions)
/create-project --name=my-api                        # With project name
/create-project --type=python --framework=fastapi    # Fully specified
/create-project --docs=comprehensive                 # Enterprise docs approach
```

**Arguments**:
- `--name=project-name` (optional, will ask if missing)
- `--type=typescript|python|go|rust|java|csharp` (optional, will ask)
- `--framework=nextjs|django|fastapi|express|spring|dotnet` (optional)
- `--docs=comprehensive|incremental` (optional, will ask)
- `--location=path/to/create` (optional, default: current directory)

**What it does**: Gathers project details, detects/asks for tech stack, creates language-specific structure (TypeScript/Python/Go/Rust/Java), installs SpecWeave (skills + hooks), creates config/gitignore, initializes git.

---

#### `/create-increment` - Create New Feature

**Purpose**: Create a new product increment/feature (adapts to detected tech stack)

**Usage**:
```bash
/create-increment "user authentication"              # Feature description
/create-increment "payments" --priority=P1           # With priority
/create-increment "dashboard" --brownfield           # Modify existing code
/create-increment "reporting" --autonomous           # Fully autonomous mode
```

**Arguments**:
- Feature description (required, can be in quotes)
- `--priority=P1|P2|P3` (optional, default P1)
- `--brownfield` (optional, indicates modifying existing code - triggers regression prevention)
- `--autonomous` (optional, run fully autonomously with minimal interruption)

**What it does**: Auto-increments number, detects tech stack, asks clarifying questions, runs strategic agents (PM, Architect, DevOps, Security, QA) adapted to detected stack, creates spec/tasks/logs/scripts/reports.

**Note**: If `--brownfield`, activates regression prevention (analyzer + baseline tests)

---

#### `/review-docs` - Review Strategic Documentation

**Purpose**: Review strategic docs against actual implementation (supports any tech stack, any repo)

**Usage**:
```bash
/review-docs                                         # Review most recent increment
/review-docs --increment=003                         # Review specific increment
/review-docs --repo=github:user/repo                 # Compare against GitHub repo
/review-docs --repo-url=https://gitlab.com/...       # Compare against any Git URL
/review-docs --folder=path/to/compare                # Compare against specific folder
```

**Arguments**:
- `--increment=003` (optional, defaults to most recent)
- `--repo=github:user/repo` (optional, compare against external GitHub repo)
- `--repo-url=https://...` (optional, compare against any Git URL - GitLab, Bitbucket, etc.)
- `--folder=path` (optional, compare against specific folder)

**What it does**: Detects tech stack (never assumes), reads strategic docs, compares against code (or external repo if `--repo`/`--repo-url`), identifies gaps (undocumented features, outdated docs, tech debt, missing tests).

---

#### `/sync-github` - Sync to GitHub

**Purpose**: Sync SpecWeave increment to GitHub issues (framework-agnostic)

**Usage**:
```bash
/sync-github                                         # Sync most recent increment
```

**What it does**: Detects/asks which increment, reads spec/tasks, creates/updates GitHub issue with user stories + tasks as checklists, adds labels, stores issue number for bidirectional sync.

---

### Tech Stack Detection Logic

Commands use this priority for detecting tech stack:

1. **`.specweave/config.yaml`** - Explicit configuration (highest priority)
2. **`package.json`** → TypeScript/JavaScript
3. **`requirements.txt`** or **`pyproject.toml`** → Python
4. **`go.mod`** → Go
5. **`Cargo.toml`** → Rust
6. **`pom.xml`** or **`build.gradle`** → Java
7. **`*.csproj`** → C#/.NET

**Framework Detection**:
- TypeScript + `next.config.js` → Next.js
- TypeScript + `nest-cli.json` → NestJS
- Python + `manage.py` → Django
- Python + `fastapi` in requirements → FastAPI
- Go + `gin` in go.mod → Gin
- etc.

---

### Error Handling

**If tech stack cannot be detected**:
```
⚠️  Unable to detect tech stack.

   Please specify:
   - Language: typescript, python, go, rust, java, etc.
   - Framework (if any): nextjs, django, fastapi, express, spring, etc.
```

**If `.specweave/` not found**:
```
❌ Error: Not a SpecWeave project.

   Run /create-project first to initialize SpecWeave.
```

**If description too vague**:
```
ℹ️  Need more details. Please clarify:
   - What is the main goal of this feature?
   - Who are the target users?
   - What problem does it solve?
```

---

### Related Documentation

- [.claude/commands/create-project.md](.claude/commands/create-project.md) - Full command spec
- [.claude/commands/create-increment.md](.claude/commands/create-increment.md) - Full command spec
- [.claude/commands/review-docs.md](.claude/commands/review-docs.md) - Full command spec
- [.claude/commands/sync-github.md](.claude/commands/sync-github.md) - Full command spec
- [COMMANDS-GENERIC-REFACTOR.md](.specweave/increments/001-skills-framework/reports/COMMANDS-GENERIC-REFACTOR.md) - Refactor report

---

## Increment Lifecycle Management

**CRITICAL**: SpecWeave enforces structured increment lifecycle with WIP limits to prevent context-switching overhead and ensure high-quality delivery.

### Status Progression (5 Stages)

```
backlog → planned → in-progress → completed → closed
   ↓         ↓          ↓             ↓          ↓
 Idea    Ready to   Work      All done    Archived
         start      ongoing   & tested    & reviewed
```

**Status Definitions**:

| Status | Definition | Location | Criteria |
|--------|------------|----------|----------|
| **backlog** | Idea identified, not yet planned | `.specweave/increments/_backlog/####-name.md` | Basic idea documented |
| **planned** | Spec created, ready to start | `.specweave/increments/####-name/` | spec.md + tasks.md created, dependencies identified |
| **in-progress** | Active development | Same location | ≥1 task started, WIP limit not exceeded |
| **completed** | All P1 tasks done, tests passing | Same location | All P1 tasks complete, tests pass, docs updated |
| **closed** | Reviewed, archived, WIP freed | Same location | Closure report generated, leftovers transferred |

### WIP (Work In Progress) Limits

**Purpose**: Prevent context-switching (20-40% productivity loss), ensure focus, improve quality

| Project Type | WIP Limit | Rationale |
|--------------|-----------|-----------|
| **Framework development** (SpecWeave repo) | 2-3 in progress | Allows core + 1-2 independent features |
| **User projects** (solo/small team 1-5) | 1-2 in progress | Better focus, higher quality |
| **User projects** (large team 10+) | 3-5 in progress | Multiple sub-teams, still limited |

**Enforcement**:
- ✅ `/create-increment` checks WIP limit before creating
- ✅ `/start-increment` checks WIP limit before starting
- ✅ Must close increment to free WIP slot

**Override**:
```bash
/create-increment "..." --force  # Override WIP limit (use sparingly)
```

**When to override** ✅:
- Truly independent work (no dependencies)
- Critical bug fix (production down)
- Blocked on external dependency

**When NOT to override** ❌:
- Impatient to start new work
- Avoiding difficult tasks
- Poor planning

### Task vs Increment Decision Tree

**When new work arises, decide**: Add as TASK or create new INCREMENT?

```
New work request
      ↓
How long will this take?
      ↓
  Hours-Days  →  How many components?
                       ↓
                    1 component  →  TASK (add to current increment)
                    2+ components  →  INCREMENT (if WIP allows)
      ↓
  Weeks+  →  Check WIP limit
                ↓
            WIP < limit  →  NEW INCREMENT
            WIP at limit  →  Close existing or add to backlog
```

**Examples**:

| Request | Duration | Components | Decision |
|---------|----------|------------|----------|
| "Fix error in context-loader" | 2 hours | 1 skill | **TASK** - Add to current increment |
| "Add caching to context-loader" | 1 day | 1 skill | **TASK** - Add to current increment |
| "Add complete JIRA integration" | 2 weeks | 2 agents + 1 skill | **INCREMENT** - New folder (if WIP allows) |
| "Optimize performance" | 3 days | Multiple files | **TASK** or **INCREMENT** - Depends on scope |

**Rule of thumb**:
- **< 1 day + 1 component** = TASK
- **Weeks + multiple components** = INCREMENT

### Adding Tasks to Current Increment

**When to add** ✅:
- Bugs discovered during implementation
- Small enhancements (< 1 day)
- Error handling improvements
- Documentation updates
- Test additions
- Edge case handling

**How to add**:

1. **Using slash command**:
   ```bash
   /add-tasks 001 "Fix error handling in context-loader"
   /add-tasks 001 --priority P2 "Add caching to skill-router"
   ```

2. **Manual addition** (tasks.md):
   ```markdown
   ## Additional Tasks (Added During Implementation)

   ### T051: Fix error handling in context-loader
   **Added**: 2025-10-26
   **Discovered**: During integration testing
   **Priority**: P1
   **Estimated**: 2 hours
   **Status**: [ ] Pending

   **Implementation**:
   - Check if manifest file exists
   - Return helpful error message
   - Log warning to logs/errors.log
   ```

3. **Update frontmatter** (spec.md):
   ```yaml
   ---
   updated: 2025-10-26  # ← Update this
   total_tasks: 51      # ← Increment
   ---
   ```

### Closing Increments with Leftover Transfer

**When to close** ✅:
- ✅ All P1 (critical) tasks completed
- ✅ All tests passing
- ✅ Documentation updated
- ❌ P2/P3 tasks MAY remain (can transfer)

**Valid reasons to transfer leftovers**:
1. Time-boxed completion (2 weeks up, 80% done is enough)
2. Lower priority work remains (P2/P3 can wait)
3. Scope clarification (some tasks no longer relevant)
4. Blocked tasks (waiting on external dependencies)
5. Business pivot (priorities changed)

**Closure workflow**:

```bash
/close-increment 001

# System validates:
→ All P1 tasks completed? ✅
→ All tests passing? ✅
→ Documentation updated? ✅

# Identifies leftovers:
→ Leftovers: 6 tasks (3 P2, 3 P3)

# Presents options:
Transfer options:
A) Create new increment "002-enhancements" with leftovers
B) Add to existing increment (select: 002, 003, 004)
C) Cancel leftovers (document why)

Your choice? [A]

# Generates closure report:
→ Creating .specweave/increments/001-core-framework/reports/closure-report.md
→ Completion: 88% (44/50 tasks)
→ Transferred to 002-enhancements: 6 tasks
→ Status: closed
→ WIP slot freed (2/2 → 1/2)

✅ Increment 001-core-framework closed successfully
```

**Closure report** (auto-generated):
```markdown
# Increment Closure Report

**Increment**: 001-core-framework
**Closed Date**: 2025-10-26
**Completion**: 88% (44/50 tasks)

## Transferred Tasks (to 002-enhancements)

| Task | Description | Priority | Reason |
|------|-------------|----------|--------|
| T045 | Add caching to context-loader | P2 | Performance optimization |
| T046 | Add retry logic to skill-router | P2 | Error handling enhancement |
| T047 | Create skill usage analytics | P3 | Nice-to-have monitoring |

## Retrospective

**What went well**: Clear spec reduced scope creep
**What to improve**: Better task estimation
```

**Task status markers**:
- `[x]` - Completed
- `[ ]` - Not started
- `[-]` - In progress (optional)
- `[T]` - Transferred to another increment
- `[C]` - Canceled (no longer relevant)

**Transferred task tracking** (in target increment):
```markdown
# 002-enhancements/tasks.md

## Transferred Tasks (from 001-core-framework)

### T001: Add caching to context-loader
**Transferred from**: 001-core-framework (T045)
**Transfer date**: 2025-10-26
**Original priority**: P2
**Current priority**: P1 (promoted - now critical)
```

### Increment Lifecycle Commands

**Available slash commands**:

| Command | Purpose | Example |
|---------|---------|---------|
| `/create-increment` | Create new increment (checks WIP) | `/create-increment "JIRA Integration"` |
| `/start-increment` | Start planned increment (checks WIP) | `/start-increment 002` |
| `/add-tasks` | Add tasks to existing increment | `/add-tasks 001 "Fix bug in context-loader"` |
| `/close-increment` | Close with leftover transfer | `/close-increment 001` |
| `/list-increments` | View all increments and WIP status | `/list-increments --status in-progress` |

### Frontmatter Schema (Complete)

**increment spec.md frontmatter** with lifecycle tracking:

```yaml
---
increment: 001-core-framework
title: "SpecWeave Core Framework"
priority: P1
status: in-progress  # backlog | planned | in-progress | completed | closed
created: 2025-01-25
updated: 2025-10-26
started: 2025-02-01      # When status → in-progress
completed: null           # When all P1 tasks done
closed: null              # When closure report generated
structure: user-stories

# Completion tracking
total_tasks: 50
completed_tasks: 44
completion_rate: 88

# Leftover tracking (when closed)
transferred_to: null      # e.g., "002-enhancements"
transferred_tasks: 0
canceled_tasks: 0
transfer_reason: null

# Dependencies
dependencies:
  - none

# WIP tracking
wip_slot: 1               # Which WIP slot (1, 2, or 3)
---
```

### Example Workflow: Real Project

```bash
# Week 1: Create and start core framework
/create-increment "Core Framework"     # Creates 001
/start-increment 001                   # Status: planned → in-progress
# WIP: 1/2

# Week 2-12: Add tasks as discovered
/add-tasks 001 "Fix error in context-loader"
/add-tasks 001 "Add retry logic"

# Week 12: 88% done, ready to move on
/close-increment 001

# System prompts:
→ Completion: 88% (44/50 tasks)
→ Leftovers: 6 P2/P3 tasks
→ Transfer to 002-enhancements? [Yes]
→ Closure report generated
→ Status: closed
→ WIP freed: 1/2 → 0/2

# Week 13: Start new work
/create-increment "JIRA Integration"   # Creates 003
/start-increment 003
# WIP: 1/2

# Week 14: Can start another (independent work)
/create-increment "Figma Integration"  # Creates 004
/start-increment 004
# WIP: 2/2 (at limit)

# Week 15: Try to start third
/create-increment "GitHub Sync"        # Creates 005
/start-increment 005
# ⚠️ WIP limit reached (2/2)
# Options:
# A) Close 003 or 004 first
# B) Wait until one completes
# C) Override with --force (not recommended)
```

### Related Documentation

- [INCREMENT-LIFECYCLE-DESIGN.md](.specweave/increments/001-core-framework/reports/INCREMENT-LIFECYCLE-DESIGN.md) - Complete lifecycle design
- [.specweave/increments/README.md](.specweave/increments/README.md) - Increments overview

---

## Source of Truth: src/ Folder

**CRITICAL RULE**: All SpecWeave framework components (agents, skills, commands, hooks) MUST be created in `src/` folder first, then installed to `.claude/` via install script.

### The src/ Folder is Source of Truth

**Why this matters**:
- **Version control**: src/ is tracked in git, .claude/ is gitignored
- **Distribution**: Users install from src/, not from .claude/
- **Updates**: Changes in src/ → run install → updates .claude/
- **Clarity**: One source of truth, no confusion

### Mandatory Structure

```
src/
├── agents/                    # ✅ Source of truth for ALL agents
│   ├── pm/
│   ├── architect/
│   ├── qa-lead/
│   └── ...
├── skills/                    # ✅ Source of truth for ALL skills
│   ├── specweave-detector/
│   ├── feature-planner/
│   ├── skill-router/
│   └── ...
├── commands/                  # ✅ Source of truth for ALL slash commands
│   ├── create-project.md
│   ├── create-increment.md
│   ├── generate-docs.md
│   └── ...
├── hooks/                     # ✅ Source of truth for ALL hooks
│   ├── post-task-completion.sh
│   ├── pre-implementation.sh
│   ├── docs-changed.sh
│   └── human-input-required.sh
├── cli/                       # ✅ CLI implementation (if applicable)
└── templates/                 # ✅ ONLY files for user's project root
    ├── CLAUDE.md.template     # Template for user's project
    ├── README.md.template     # Template for user's project
    ├── .gitignore             # Template for user's project
    ├── config.yaml            # Template for .specweave/config.yaml
    └── docs/                  # Document templates (ADR, PRD, RFC, etc.)
        ├── adr-template.md
        ├── prd-template.md
        ├── rfc-template.md
        ├── hld-template.md
        └── lld-template.md
```

**WRONG** ❌:
```
src/templates/skills/         # NO! Skills belong in src/skills/
src/templates/commands/        # NO! Commands belong in src/commands/
src/templates/hooks/           # NO! Hooks belong in src/hooks/
.claude/skills/new-skill/      # NO! Create in src/skills/ first, then install
```

**CORRECT** ✅:
```
src/skills/new-skill/          # YES! Create here first
→ Run install.sh
→ Copies to .claude/skills/new-skill/
```

### Installation Flow

**Framework Development**: Create components in `src/` → run install scripts → copies to `.claude/`

**User Projects**: Use installed components or create custom ones in `.claude/` or `~/.claude/`

**See**: "Installation & Requirements" section for detailed commands.

### Templates Folder - ONLY for User Project Root

**Purpose**: `src/templates/` contains ONLY files that get copied to user's project root when they run `/create-project`.

**What belongs in templates/**:
- ✅ `.gitignore` (for user's project)
- ✅ `CLAUDE.md.template` (becomes user's CLAUDE.md)
- ✅ `README.md.template` (becomes user's README.md)
- ✅ `config.yaml` (becomes user's .specweave/config.yaml)
- ✅ `docs/` folder (ADR, PRD, RFC templates for documentation)

**What does NOT belong in templates/**:
- ❌ `skills/` (belongs in src/skills/)
- ❌ `commands/` (belongs in src/commands/)
- ❌ `hooks/` (belongs in src/hooks/)
- ❌ `agents/` (belongs in src/agents/)

### Summary: Where to Create New Components

| Component Type | Create In | Installed To | User Custom Location |
|----------------|-----------|--------------|----------------------|
| Agent | `src/agents/[name]/` | `.claude/agents/[name]/` | `.claude/agents/` or `~/.claude/agents/` |
| Skill | `src/skills/[name]/` | `.claude/skills/[name]/` | `.claude/skills/` or `~/.claude/skills/` |
| Command | `src/commands/[name].md` | `.claude/commands/[name].md` | `.claude/commands/` |
| Hook | `src/hooks/[name].sh` | `.claude/hooks/[name].sh` | `.claude/hooks/` |
| Project file | `src/templates/[file]` | User's project root | N/A |

**Golden Rule**: If it's part of SpecWeave framework → `src/[type]/`. If it's for user's project root → `src/templates/`.

---

## File Organization Rules

### Source Code vs Supporting Files

**CRITICAL**: Separate source code from supporting files to maintain clean project structure.

#### Source Code (Project Root)
Files that ARE source code and belong in project root:
- Application source code (`src/`, `lib/`, `app/`)
- Package configuration (`package.json`, `pyproject.toml`, `Cargo.toml`)
- Build configuration (`tsconfig.json`, `webpack.config.js`, `.babelrc`)
- Environment files (`.env.example`, `.env.local`)
- Version control (`.git/`, `.gitignore`)
- **ONLY these docs in root**: `README.md`, `CLAUDE.md`, `LICENSE`, `CONTRIBUTING.md`
- Framework configuration (`.specweave/`, `.claude/`)

#### Increment-Centric Organization - **MANDATORY**

**CRITICAL RULE**: ALL supporting files (logs, scripts, reports, analysis) MUST belong to an INCREMENT in `.specweave/increments/{increment-id}/`

**ROOT FOLDER MUST STAY CLEAN** - Only `CLAUDE.md` added to user's project root.

**Increment Organization**:
- **Logs** → `.specweave/increments/{increment-id}/logs/`
- **Scripts** → `.specweave/increments/{increment-id}/scripts/`
- **Reports** → `.specweave/increments/{increment-id}/reports/`

**Rules**:
- ✅ **ALLOWED in root**: `CLAUDE.md` (ONLY file we add), user's existing files (unchanged)
- ❌ **MUST GO in increments**: All logs, scripts, reports, increment-related files

**Benefits**: Complete traceability, easy cleanup, clear context, no root clutter.

**See**: "Scalable Directory Structure" section below for complete increment structure example.

---

## Scalable Directory Structure

**CRITICAL DISTINCTION**: Understand the difference between framework development vs using the framework:

### Framework Development (SpecWeave Repo)
**What**: Building the SpecWeave framework itself
**Increments**: ONE increment (`001-core-framework`) representing "Build SpecWeave"
**Components**: 20 agents + 24 skills in `src/` (NOT separate increments)
**Purpose**: Create the tools that enable spec-driven development

### Using SpecWeave (User Projects)
**What**: Building YOUR SaaS/application using SpecWeave
**Increments**: MANY increments (authentication, payments, calendar, booking, etc.)
**Components**: Uses installed agents/skills from framework
**Purpose**: Build production applications following spec-driven methodology

**IMPORTANT**: This section shows TWO SEPARATE projects:
1. **User Project Structure** - When you use SpecWeave in YOUR project
2. **SpecWeave Framework Structure** - The SpecWeave repository itself (for framework development)

These are NOT nested! They are completely separate projects.

---

### User Project Structure (YOUR PROJECT)

**Location**: `/Users/yourname/Projects/your-project/`

```
your-project/                       # YOUR project using SpecWeave
├── .specweave/                     # Framework internals (DO NOT MODIFY USER'S ROOT)
│   ├── config.yaml                 # Project configuration
│   ├── cache/                      # Performance cache
│   │   ├── context-index.json
│   │   └── spec-embeddings/
│   │
│   ├── docs/                       # Project documentation (HOW - built gradually or upfront)
│   │   ├── README.md               # Documentation index
│   │   ├── architecture/           # System design
│   │   │   ├── overview.md
│   │   │   ├── system-design.md
│   │   │   └── deployment/
│   │   ├── decisions/              # Architecture Decision Records (ADRs)
│   │   │   ├── README.md
│   │   │   ├── 001-tech-stack.md
│   │   │   └── 002-database-choice.md
│   │   ├── guides/                 # How-to guides
│   │   └── changelog/              # Release notes
│   │
│   ├── increments/                 # ALL work organized by increments (auto-numbered)
│   │   ├── README.md               # Features index
│   │   ├── roadmap.md              # Project roadmap
│   │   └── 0001-user-authentication/  # Example increment
│   │       ├── spec.md             # Feature specification (WHAT, WHY)
│   │       ├── plan.md             # Implementation plan (HOW)
│   │       ├── tasks.md            # Executable tasks checklist
│   │       ├── tests.md            # Test strategy and coverage
│   │       ├── context-manifest.yaml  # What context to load
│   │       ├── logs/               # ✅ Increment-specific logs
│   │       │   ├── execution.log   # Execution history
│   │       │   ├── errors.log      # Error tracking
│   │       │   └── ai-session.log  # AI conversation logs
│   │       ├── scripts/            # ✅ Increment-specific scripts
│   │       │   ├── migration.py    # Data migration
│   │       │   ├── validation.sh   # Validation helpers
│   │       │   └── setup.js        # Setup automation
│   │       └── reports/            # ✅ Increment-specific reports
│   │           ├── completion.md   # Completion report
│   │           ├── test-results.md # Test execution results
│   │           └── performance.md  # Performance analysis
│   │
│   └── tests/                      # ✅ Imported/centralized test repository
│       ├── README.md               # Test organization and import guide
│       ├── _import-manifest.yaml   # Tracks where tests came from
│       ├── playwright/             # Imported E2E tests (from user's repo/folder)
│       │   ├── auth.spec.ts
│       │   └── checkout.spec.ts
│       ├── jest/                   # Imported unit tests
│       │   └── utils.test.ts
│       ├── junit/                  # If Java project
│       └── pytest/                 # If Python project
│
├── .claude/
│   ├── skills/                     # Installed SpecWeave skills
│   │   ├── feature-planner/
│   │   ├── context-loader/
│   │   ├── test-importer/          # NEW: Imports user's tests to .specweave/tests/
│   │   └── ...
│   └── commands/                   # Slash commands
│
├── CLAUDE.md                       # ✅ ONLY file we add to user's root
├── src/                            # User's source code (unchanged)
│   └── ...
└── tests/                          # User's own tests (we DON'T touch this)
    └── ...
```

---

### SpecWeave Framework Structure (FRAMEWORK DEVELOPMENT ONLY)

**Location**: `/Users/yourname/Projects/specweave/` (the framework repository itself)

**NOTE**: This is a SEPARATE project from your user project above. Only relevant if you're developing SpecWeave framework itself.

```
specweave/                          # SpecWeave framework repository
├── .specweave/
│   ├── config.yaml
│   ├── cache/
│   ├── docs/                       # Framework documentation
│   │   ├── architecture/
│   │   ├── decisions/
│   │   ├── guides/
│   │   └── changelog/
│   ├── increments/                 # Framework development (ONE increment)
│   │   └── 001-core-framework/     # The ONLY increment: "Build SpecWeave"
│   │       ├── spec.md             # Complete framework specification
│   │       ├── tasks.md            # Implementation tasks
│   │       ├── tests.md            # Test strategy (optional)
│   │       ├── logs/               # Increment-specific logs
│   │       ├── scripts/            # Increment-specific scripts
│   │       └── reports/            # Increment-specific reports
│   │   # NOTE: All agents/skills are in src/, NOT separate increments
│   └── tests/                      # Framework's own tests
│
├── .claude/
│   ├── skills/
│   └── commands/
│
├── src/
│   ├── cli/                        # CLI implementation
│   ├── agents/                     # Core agents (shipped with framework)
│   │   ├── pm/
│   │   │   ├── AGENT.md
│   │   │   ├── templates/
│   │   │   ├── test-cases/        # NOT copied to user project
│   │   │   │   ├── test-1.yaml
│   │   │   │   ├── test-2.yaml
│   │   │   │   └── test-3.yaml
│   │   │   └── references/
│   │   ├── qa-lead/
│   │   └── test-engineer/          # NEW: Test import/management
│   └── skills/                     # Core skills (shipped with framework)
│       ├── feature-planner/
│       │   ├── SKILL.md
│       │   └── test-cases/         # NOT copied to user project
│       │       ├── test-1.yaml
│       │       ├── test-2.yaml
│       │       └── test-3.yaml
│       ├── test-importer/          # NEW: Import user's tests
│       │   ├── SKILL.md
│       │   └── test-cases/
│       └── ...
│
├── CLAUDE.md
├── README.md
├── install.sh
└── package.json
```

### Key Structure Principles

#### 1. Agents and Skills Source of Truth in src/

**CRITICAL**: SpecWeave framework agents and skills are developed in `src/agents/` and `src/skills/`, then installed to `.claude/`

**Structure**: Agents/skills require AGENT.md/SKILL.md (with YAML frontmatter) and minimum 3 test cases.

**See**: "Agents vs Skills Architecture" section for complete details on structure, differences, and usage.

#### 2. Modular Specifications (.specweave/docs/internal/strategy/)

**Problem**: Monolithic 500-page specs in single files are overwhelming and context-inefficient.

**Solution**: Organize specs by functional modules, each with nested submodules:

**Note**: 500-600 page specifications are VALID and NECESSARY for enterprise/production systems. The key is **modular organization**, not avoiding comprehensive documentation!

```
.specweave/docs/internal/strategy/payments/
├── overview.md              # High-level payment module description
├── stripe/
│   ├── spec.md              # Stripe-specific specification
│   ├── api-contracts.md     # Stripe API contracts
│   └── data-model.md        # Stripe data entities
├── paypal/
│   ├── spec.md
│   └── webhooks.md          # PayPal webhook handling
└── shared/
    ├── payment-entities.md  # Common payment models
    └── compliance.md        # PCI-DSS, regulations
```

**Benefits**:
- Load only relevant module (e.g., `.specweave/docs/internal/strategy/payments/stripe/`)
- Shared concepts in dedicated files (e.g., `shared/payment-entities.md`)
- Enterprise scale: 100+ modules without context bloat

#### 3. Separation of Specifications from Documentation (5-Pillar Architecture)

**.specweave/docs/internal/strategy/**: Business specifications (WHAT and WHY - user stories, acceptance criteria, PRDs)
**.specweave/docs/internal/architecture/**: Technical documentation (HOW - system design, HLDs, ADRs, RFCs)
**.specweave/docs/internal/delivery/**: Roadmap, release plans, CI/CD
**.specweave/docs/internal/operations/**: Runbooks, SLOs, monitoring, incident response
**.specweave/docs/internal/governance/**: Security policies, compliance, change management
**.specweave/docs/public/**: Customer-facing documentation (published to docs site)

**Note**: ALL specifications go in `.specweave/docs/internal/strategy/` (modular organization for enterprise scale). Documentation can be built **comprehensively upfront** (500+ pages for enterprise) OR **gradually** (incremental for startups) - see "Documentation Philosophy & Approaches" section.

#### 4. Features with Auto-Numbering

Features are auto-numbered for conflict prevention:

```
.specweave/increments/0001-skills-framework/
.specweave/increments/0002-brownfield-tools/
.specweave/increments/0003-integrations/
```

Each feature contains:
- `spec.md`: What this feature does and why
- `plan.md`: How to implement it
- `tasks.md`: Executable checklist
- `tests.md`: Test strategy and cases
- `context-manifest.yaml`: What specs/docs to load

#### 5. Context Manifests (70%+ Token Reduction)

**Revolutionary**: Each issue/feature declares what context it needs:

```yaml
# .specweave/increments/0001-skills-framework/context-manifest.yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/core/skills-system.md
  - .specweave/docs/internal/strategy/core/context-loading.md#selective-loading

documentation:
  - .specweave/docs/internal/architecture/skills-system.md
  - .specweave/docs/internal/architecture/adr/0002-context-loading-approach.md
  - CLAUDE.md#context-precision                    # CLAUDE.md is the main guide

max_context_tokens: 10000
priority: high
auto_refresh: false
---
```

**Benefits**:
- Precision loading (load exactly what's needed)
- 70%+ token reduction vs loading full specs
- Context-aware AI agents
- Cache-friendly
- Scalable to enterprise (500+ page specs)

---

## Development Workflow

**IMPORTANT**: Choose your documentation approach based on project needs (see "Documentation Philosophy & Approaches"):
- **Enterprise/Production**: Create comprehensive specs upfront (500-600+ pages)
- **Startup/Iterative**: Build documentation gradually as you go (like Microsoft)
- Both approaches are fully supported by SpecWeave

### For Greenfield Projects

**Choose your approach** (see "Documentation Philosophy & Approaches" section for details):

**Option A: Comprehensive Upfront** (Enterprise/Production)
- Create 500-600+ page specifications before coding
- Full architecture and ADRs documented upfront
- Complete API contracts and security docs

**Option B: Incremental/Evolutionary** (Startup/Iterative)
- Start with overview (10-20 pages)
- Build documentation as you go
- Add modules/specs as features are planned

**Workflow**:
1. Create specifications (`.specweave/docs/internal/strategy/`) - technology-agnostic WHAT/WHY
2. Design architecture (`.specweave/docs/internal/architecture/`) - technical HOW with ADRs
3. Plan features in auto-numbered increments (`.specweave/increments/{id}/`)
4. Implement with context manifests (70%+ token reduction)
5. Documentation auto-updates via hooks

### For Brownfield Projects

**CRITICAL PRINCIPLE**: Document before modifying to prevent regression.

#### Step 0: Merge Existing CLAUDE.md (If Exists)

**Problem**: If your project already has `CLAUDE.md`, SpecWeave installation will backup it to `.claude/backups/CLAUDE-backup-{timestamp}.md`

**Solution**: Intelligently merge project-specific content using `brownfield-onboarder` skill

**Process**:
1. **After installation**, check if backup was created:
   ```bash
   ls .claude/backups/CLAUDE-backup-*.md
   ```

2. **Trigger intelligent merge**:
   - Ask Claude: "merge my old CLAUDE.md" or "specweave merge-docs"
   - Or use: `brownfield-onboarder` skill

3. **What happens**:
   - ✅ Skill analyzes backup CLAUDE.md
   - ✅ Extracts project-specific content (domain knowledge, architecture, conventions)
   - ✅ Distributes to appropriate SpecWeave folders:
     - Domain knowledge → `.specweave/docs/internal/strategy/{domain}/`
     - Architecture → `.specweave/docs/internal/architecture/`
     - Tech stack → `.specweave/docs/internal/architecture/tech-stack.md`
     - Business rules → `.specweave/docs/internal/strategy/{module}/business-rules.md`
     - Conventions → `.specweave/docs/internal/delivery/guides/project-conventions.md`
     - Workflows → `.specweave/docs/internal/delivery/guides/team-workflows.md`
     - Deployment → `.specweave/docs/internal/operations/runbooks/deployment.md`
   - ✅ Updates CLAUDE.md with minimal project summary (12 lines max)
   - ✅ Generates merge report

4. **Result**:
   - ✅ 99%+ content distributed to folders (not bloating CLAUDE.md)
   - ✅ CLAUDE.md remains concise with quick links
   - ✅ All project knowledge preserved and organized

**See**: [BROWNFIELD-CLAUDE-MERGE-STRATEGY.md](.specweave/increments/0002-brownfield-tools/reports/BROWNFIELD-CLAUDE-MERGE-STRATEGY.md) for complete strategy (when brownfield tools increment is implemented)

**Important**: This prevents losing valuable project context during SpecWeave installation.

---

#### Step 1: Analyze Existing Code

- Use `brownfield-analyzer` skill
- Generate specs from existing implementation
- Create retroactive ADRs in `.specweave/docs/internal/architecture/adr/`

#### Step 2: Document Related Modules

- Before modifying payment flow, document current implementation
- Create specs in `.specweave/docs/internal/strategy/payments/existing/`
- Extract data models, API contracts

#### Step 3: Create Tests for Current Behavior

- Write E2E tests that validate current functionality
- User reviews tests to ensure completeness
- Tests act as regression safety net

#### Step 4: Plan Modifications

- Create feature in `.specweave/increments/####-new-feature/`
- Reference existing specs in context manifest
- Show what changes and what stays the same

#### Step 5: Implement with Regression Monitoring

- Run existing tests before changes
- Implement new feature
- Verify existing tests still pass

---

## Testing Philosophy

**Core Principle**: Test cases exist at **FOUR distinct levels** in SpecWeave, each serving a different purpose with full traceability from business requirements to automated tests.

---

### The Four Levels of Test Cases

#### Level 1: Specification Acceptance Criteria (WHAT must be true)

**Purpose**: Define business validation - WHAT must be true from user/business perspective

**Location**: `.specweave/docs/internal/strategy/{module}/{feature}-spec.md`

**Format**: Markdown with test case IDs (TC-0001)

**Example**:
```markdown
### User Story: US1-001 - User Login

**As a** user
**I want to** log in with email and password
**So that** I can access my account

**Acceptance Criteria** (Test Cases):
- [ ] **TC-0001**: Valid credentials → redirect to dashboard
- [ ] **TC-0002**: Invalid password → error message "Invalid password" shown
- [ ] **TC-0003**: Non-existent email → error message "Email not found" shown
- [ ] **TC-0004**: Empty email field → validation error "Email required"
```

**Key Points**:
- Test Case IDs: `TC-0001` format for traceability
- Business language (technology-agnostic)
- Testable conditions (no ambiguity)
- Part of specification (WHAT/WHY)

---

#### Level 2: Feature Test Strategy (HOW to validate)

**Purpose**: Define HOW to validate feature meets acceptance criteria

**Location**: `.specweave/increments/0001-feature-name/tests.md`

**Format**: Markdown with test coverage matrix and detailed strategies

**Example Structure**:
```markdown
# Test Strategy: User Login Feature

## Test Coverage Matrix

| TC ID | Acceptance Criteria | Test Type | Location | Priority |
|-------|---------------------|-----------|----------|----------|
| TC-0001 | Valid login flow | E2E | tests/e2e/login.spec.ts | P1 |
| TC-0002 | Invalid password | E2E | tests/e2e/login.spec.ts | P1 |

## Test Details

### TC-0001: Valid Login Flow
- **Type**: E2E (Playwright)
- **Given**: User has registered account
- **When**: User enters valid credentials
- **Then**: Redirect to dashboard with session token
```

**Key Points**:
- Maps TC-0001 IDs to test implementations
- Defines test types (E2E, Unit, Integration)
- Specifies exact test file locations
- Includes priorities (P1, P2, P3)
- Documents Given/When/Then scenarios

**See**: [.specweave/increments/0001-skills-framework/tests.md](.specweave/increments/0001-skills-framework/tests.md) for complete example

---

#### Level 3: Skill Test Cases (VALIDATE skill works)

**Purpose**: Validate that SpecWeave skills function correctly

**Location**: `src/skills/{skill-name}/test-cases/`

**Format**: YAML files with structured test definitions

**MANDATORY**: Minimum 3 test cases per skill

**Example**:
```yaml
---
name: "Create Basic Specification"
description: "Tests if spec-author can create a specification from user story"
input:
  prompt: "Create a spec for user authentication"
  files: []
expected_output:
  type: "files_generated"
  files:
    - ".specweave/docs/internal/strategy/auth/authentication-spec.md"
  contains:
    - "User Story"
    - "TC-0001"
validation:
  - "Specification is technology-agnostic"
  - "Test case IDs follow TC-0001 format"
success_criteria:
  - "File exists at specified path"
  - "Contains all required sections"
---
```

**Structure** (MANDATORY):
```
src/skills/{skill-name}/
├── SKILL.md
├── test-cases/              # REQUIRED (min 3 tests)
│   ├── test-1-basic.yaml    # Basic functionality
│   ├── test-2-edge.yaml     # Edge cases, error handling
│   └── test-3-integration.yaml  # Integration scenarios
└── test-results/            # Generated (gitignored)
```

**Key Points**:
- 3+ test cases MANDATORY for every skill
- YAML format for structured validation
- Test results gitignored (generated dynamically)
- Covers: basic, edge cases, integration

**Examples**:
- `src/skills/specweave-detector/test-cases/` ✅
- `src/skills/skill-router/test-cases/` ✅
- `src/skills/context-loader/test-cases/` ✅
- `src/skills/feature-planner/test-cases/` ✅

---

#### Level 4: Code Tests (AUTOMATE validation)

**Purpose**: Automated continuous validation

**Location**: `tests/`

**Format**: Unit/Integration/E2E test code

**Organization**:
```
tests/
├── README.md                   # Test organization guide
├── unit/                       # Unit tests (or co-located with code)
│   ├── skills/
│   │   ├── structure.test.ts
│   │   └── skill-md-validation.test.ts
│   └── spec-validation.test.ts
├── integration/                # Integration tests
│   ├── skill-testing.test.ts
│   ├── context-loading.test.ts
│   ├── routing-accuracy.test.ts
│   └── project-detection.test.ts
├── e2e/                        # E2E tests (Playwright, MANDATORY when UI exists)
│   ├── setup.ts
│   ├── skill-installation.spec.ts
│   ├── spec-authoring.spec.ts
│   └── code-implementation.spec.ts
└── skills/                     # Skill validation results (gitignored)
```

**Example**:
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('TC-0001: Valid Login Flow', async ({ page }) => {
  // Given: User has registered account
  await page.goto('/login');

  // When: User enters valid credentials
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123');
  await page.click('button[type="submit"]');

  // Then: Redirect to dashboard with session
  await expect(page).toHaveURL('/dashboard');

  // Validate session token exists
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find(c => c.name === 'session_token');
  expect(sessionToken).toBeDefined();
});
```

**Key Points**:
- Reference TC-0001 IDs in test names
- Use Given/When/Then pattern
- E2E tests MUST tell the truth (no false positives)
- Run in CI/CD pipeline

**See**: [tests/README.md](tests/README.md) for complete testing guide

---

### Test Case Traceability

**Flow**: Specification → Feature → Skill → Code

**Example Trace: TC-0001 (Valid Login)**

1. **Specification**: `.specweave/docs/internal/strategy/auth/login-spec.md`
   ```markdown
   - [ ] **TC-0001**: Valid credentials → redirect to dashboard
   ```

2. **Feature**: `.specweave/increments/0002-user-login/tests.md`
   ```markdown
   | TC-0001 | Valid login flow | E2E | tests/e2e/login.spec.ts | P1 |
   ```

3. **Skill**: `src/skills/playwright-tester/test-cases/test-1-login.yaml`
   ```yaml
   expected_output:
     files: ["tests/e2e/login.spec.ts"]
     contains: ["TC-0001"]
   ```

4. **Code**: `tests/e2e/login.spec.ts`
   ```typescript
   test('TC-0001: Valid Login Flow', async ({ page }) => {
     // Implementation
   });
   ```

**Benefits**:
- Requirements → Tests (complete coverage)
- Failed test → Business impact (TC-0001 → User Story)
- Change request → Impact analysis (which tests affected)

---

### Test Requirements by Level

#### Specification Level (MANDATORY when spec exists)
- ✅ All user stories have acceptance criteria
- ✅ Acceptance criteria use TC-0001 format
- ✅ Criteria are testable (no ambiguity)
- ✅ Technology-agnostic (business language)

#### Feature Level (MANDATORY for all features)
- ✅ Feature has `tests.md` file
- ✅ Test coverage matrix maps TC-0001 to implementations
- ✅ All acceptance criteria covered
- ✅ Test types specified (E2E, Unit, Integration)

#### Skill Level (MANDATORY for all skills)
- ✅ Minimum 3 test cases in `test-cases/`
- ✅ YAML format with input/expected_output/validation
- ✅ Cover: basic, edge cases, integration
- ✅ Results gitignored (`test-results/`)

#### Code Level (MANDATORY for implementation)
- ✅ Unit tests for critical functions
- ✅ Integration tests for component interactions
- ✅ E2E tests when UI exists (Playwright)
- ✅ >80% test coverage for critical paths
- ✅ Reference TC-0001 in test names

---

### E2E Testing with Playwright (MANDATORY when UI exists)

**CRITICAL**: When UI requirements exist, Playwright E2E tests are MANDATORY.

**Requirements**:
- Tests in `tests/e2e/`
- Use Playwright framework
- MUST tell the truth (no false positives)
- Close the loop with validation reports

**Truth-Telling Requirement**:
- If test passes, feature MUST actually work
- If test fails, report EXACTLY what failed
- No masking failures
- No assuming success without validation
- Close the loop with real verification

---

### TDD is OPTIONAL

**Important**: Test-Driven Development (TDD) is OPTIONAL for greenfield development.

**TDD Skill**: `tdd-guide` (P2 priority)
- Available for developers who prefer TDD workflow
- Write tests before implementation
- Red → Green → Refactor cycle
- Not enforced by framework
- Separate from MANDATORY E2E/skill testing

---

### Running Tests

**By Type**:
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only
npm run test:skills        # Skill validation only
```

**By Priority**:
```bash
npm run test:p1            # P1 tests (must pass before merge)
npm run test:p2            # P2 tests (must pass before release)
```

**All Tests**:
```bash
npm test                   # Run all tests
npm run test:coverage      # Generate coverage report
```

---

### Success Criteria

**Code Coverage**:
- Target: >80% for critical paths
- Measured via Jest coverage reports

**Test Execution**:
- P1 tests: Must pass before merge to main
- P2 tests: Must pass before release
- Performance: All tests complete in <5 minutes
- Reliability: 0% flaky tests

**Quality Metrics**:
- Routing accuracy: >90%
- Context efficiency: 70%+ token reduction
- Skill test coverage: 100% of skills have ≥3 tests
- E2E truth-telling: 0% false positives

---

### Related Documentation

- [TEST-CASE-STRATEGY.md](.specweave/increments/0001-skills-framework/reports/TEST-CASE-STRATEGY.md) - Comprehensive test case strategy
- [tests/README.md](tests/README.md) - Complete testing guide
- [.specweave/increments/0001-skills-framework/tests.md](.specweave/increments/0001-skills-framework/tests.md) - Feature test strategy example

---

## Test Import Workflow

**Purpose**: Import existing tests from user's project or external repository to `.specweave/tests/` for centralized regression testing.

### Overview

SpecWeave provides a **test-importer** skill/agent that:
1. **Detects** test frameworks in user's project
2. **Imports** tests to `.specweave/tests/`
3. **Organizes** by framework (Playwright, Jest, JUnit, pytest)
4. **Tracks** import source via manifest
5. **Syncs** changes when requested

### Test Repository Structure

```
.specweave/tests/                   # Centralized test repository
├── README.md                       # Import guide and organization
├── _import-manifest.yaml           # Tracks import source and sync
├── playwright/                     # E2E tests (imported from user)
│   ├── auth.spec.ts
│   ├── checkout.spec.ts
│   └── payments.spec.ts
├── jest/                           # Unit/integration tests
│   ├── utils.test.ts
│   └── api.test.ts
├── junit/                          # Java tests (if applicable)
│   └── UserServiceTest.java
└── pytest/                         # Python tests (if applicable)
    └── test_api.py
```

### Import Manifest Format

```yaml
---
# .specweave/tests/_import-manifest.yaml

import_source:
  type: "local_folder"              # or "github_repo", "gitlab_repo"
  path: "tests/"                    # or URL: "https://github.com/user/test-repo"
  imported_at: "2025-10-26T14:00:00Z"
  last_sync: "2025-10-26T14:00:00Z"

frameworks_detected:
  - name: "playwright"
      config_file: "playwright.config.ts"
      source_path: "tests/e2e"
      imported_to: ".specweave/tests/playwright/"
      test_count: 15
      last_modified: "2025-10-25T10:30:00Z"

  - name: "jest"
      config_file: "jest.config.js"
      source_path: "src/**/*.test.ts"
      imported_to: ".specweave/tests/jest/"
      test_count: 47
      last_modified: "2025-10-24T16:20:00Z"

sync_strategy: "manual"             # or "auto" (with user confirmation)
sync_interval: "on_demand"          # or "daily", "weekly"

exclude_patterns:
  - "**/*.skip.ts"
  - "**/temp/**"
  - "**/__snapshots__/**"
---
```

### Import Workflow

#### 1. Detection Phase

**test-importer** skill automatically:
```bash
# Detect test frameworks
- playwright.config.ts  → Playwright detected
- jest.config.js        → Jest detected
- pytest.ini            → Pytest detected
- pom.xml (with JUnit)  → JUnit detected
```

#### 2. User Confirmation

**Questions asked**:
1. "We detected Playwright tests in `tests/e2e/`. Import to `.specweave/tests/playwright/`?"
2. "Do you have tests in a separate repository (e.g., GitHub)?"
3. "Sync strategy: manual (ask before re-import) or auto (sync on changes)?"

#### 3. Import Execution

**test-importer** performs:
```bash
# Copy tests to centralized location
cp -r tests/e2e/* .specweave/tests/playwright/

# Generate import manifest
cat > .specweave/tests/_import-manifest.yaml << EOF
...
EOF

# Create README
cat > .specweave/tests/README.md << EOF
# Test Repository

Imported from: tests/e2e/
Last sync: 2025-10-26T14:00:00Z
...
EOF
```

#### 4. Sync Phase (Ongoing)

**When source tests change**:
1. **Manual sync**: User runs `/sync-tests` or asks Claude to "sync tests"
2. **Auto sync**: Hook detects changes, asks user to confirm re-import
3. **Manifest updated**: Tracks last sync timestamp

### Usage Examples

**Import from local folder**:
```bash
# Ask Claude
"Import my tests from tests/ folder"

# Or use slash command
/import-tests --source tests/
```

**Import from external repository**:
```bash
# Ask Claude
"Import tests from https://github.com/mycompany/test-repo"

# Or use slash command
/import-tests --source https://github.com/mycompany/test-repo
```

**Sync after changes**:
```bash
# Ask Claude
"Sync my tests" or "Re-import tests from source"

# Or use slash command
/sync-tests
```

### Test Execution

**Running imported tests**:
```bash
# Run specific framework tests
npm run test:playwright:specweave    # Runs .specweave/tests/playwright/
npm run test:jest:specweave          # Runs .specweave/tests/jest/

# Run all imported tests
npm run test:specweave:all
```

### Important Notes

1. **User's `tests/` folder is NEVER modified** - SpecWeave only READS from it
2. **`.specweave/tests/` is a COPY** - Modifications don't affect user's original tests
3. **Sync is controlled by user** - Manual sync by default, auto requires confirmation
4. **Framework-specific configs preserved** - Playwright config, Jest config, etc. are copied too

### Skills & Agents Involved

| Component | Role |
|-----------|------|
| `test-importer` skill | Detects frameworks, imports tests, manages sync |
| `test-engineer` agent | Analyzes test coverage, suggests improvements |
| `qa-lead` agent | Reviews test strategy, validates regression coverage |

---

## Agents vs Skills Architecture

**CRITICAL**: SpecWeave uses TWO distinct concepts from Claude Code: **Agents** and **Skills**.

### What Are Agents?

**Agents** (`.claude/agents/`) are **pre-configured AI personalities** with separate context windows for complex, delegated tasks.

**Examples**:
- PM Agent: Product requirements, user stories, roadmap
- Architect Agent: System design, ADRs, component architecture
- DevOps Agent: Infrastructure as Code, deployment, CI/CD
- Security Agent: Threat modeling, penetration testing
- QA Lead Agent: Test strategy, test case design

**Characteristics**:
- **Separate context windows** (prevents pollution of main conversation)
- Can use different AI models (sonnet, opus, haiku)
- Can have restricted tool access
- Invoked via Task tool with `subagent_type` parameter
- Best for: Complex workflows, distinct roles, long-running tasks

**Structure**:
```
src/agents/pm/
├── AGENT.md           # YAML frontmatter + system prompt
├── templates/         # Templates for outputs
├── test-cases/        # Minimum 3 test cases
└── references/        # Reference documentation
```

**Agent Format**:
```yaml
---
name: pm
description: Product Manager for requirements, user stories, roadmap...
tools: Read, Grep, Glob  # Optional: restrict tools
model: sonnet  # Optional: specify model
---

You are an expert Product Manager with 10+ years of experience...

Your responsibilities:
1. Define product vision and strategy
2. Gather and analyze requirements
...
```

**Installation**:
```bash
npm run install:agents         # Install to .claude/agents/ (project)
npm run install:agents:global  # Install to ~/.claude/agents/ (global)
```

**Current Agents** (in `src/agents/`):
- `pm/` - Product Manager
- `architect/` - System Architect
- `devops/` - DevOps Engineer
- `sre/` - Site Reliability Engineer
- `tech-lead/` - Technical Lead
- `qa-lead/` - QA Lead
- `security/` - Security Engineer
- `frontend/` - Frontend Developer
- `nextjs/` - Next.js Specialist
- `nodejs-backend/` - Node.js Backend Developer
- `python-backend/` - Python Backend Developer
- `dotnet-backend/` - .NET Backend Developer
- `docs-writer/` - Documentation Writer
- `performance/` - Performance Engineer

---

### What Are Skills?

**Skills** (`.claude/skills/`) are **lightweight capabilities** that extend Claude's functionality.

**Examples**:
- specweave-detector: Detect SpecWeave projects
- feature-planner: Plan features with context awareness
- skill-router: Route requests to appropriate skills/agents
- context-loader: Load context manifests

**Characteristics**:
- Share the main conversation context
- Inherit all tools by default (can be restricted)
- Activate automatically based on description matching
- Best for: Focused capabilities, quick operations, extensions

**Structure**:
```
src/skills/feature-planner/
├── SKILL.md           # YAML frontmatter + instructions
├── scripts/           # Helper scripts
├── test-cases/        # Minimum 3 test cases
└── references/        # Reference documentation
```

**Skill Format**:
```yaml
---
name: feature-planner
description: Plan features with context awareness...
allowed-tools: Read, Write, Edit  # Optional: restrict tools
---

# Feature Planner Skill

This skill helps you plan features...
```

**Installation**:
```bash
npm run install:skills         # Install to .claude/skills/ (project)
npm run install:skills:global  # Install to ~/.claude/skills/ (global)
```

**Install Everything**:
```bash
npm run install:all         # Install agents + skills (project)
npm run install:all:global  # Install agents + skills (global)
```

**Current Skills** (in `src/skills/`):
- `specweave-detector/` - Auto-detect SpecWeave projects
- `feature-planner/` - Plan features with context manifests
- `skill-router/` - Route requests intelligently
- `context-loader/` - Load context selectively
- `role-orchestrator/` - Orchestrate multi-agent workflows
- `hetzner-provisioner/` - Hetzner cloud provisioning
- `cost-optimizer/` - Infrastructure cost optimization

---

### When to Use Agent vs Skill

| Create Agent When | Create Skill When |
|-------------------|-------------------|
| Complex, multi-step workflows | Simple, focused tasks |
| Needs separate context window | Can share main context |
| Distinct personality/role needed | Capability extension |
| Tool restrictions by role | All tools acceptable |
| Long-running tasks | Quick operations |
| Different AI model needed | Default model OK |
| **Example**: Security audit | **Example**: Code formatter |
| **Example**: Product requirements | **Example**: Spec validator |

---

### Invoking Agents vs Skills

**Agents** are invoked via the Task tool:

```typescript
// Invoke PM Agent
await Task({
  subagent_type: "pm",
  prompt: "Create product requirements for task management SaaS",
  description: "Product requirements analysis"
});

// Invoke DevOps Agent
await Task({
  subagent_type: "devops",
  prompt: "Create Terraform for AWS ECS deployment",
  description: "Infrastructure setup"
});
```

**Skills** activate automatically based on their description:
- User asks: "Plan implementation for user authentication"
- Claude Code detects `feature-planner` skill matches
- Skill activates automatically

---

### Client Project Usage

**Users can create custom agents and skills** in their own projects:

**Custom Agent Example**:
```bash
mkdir -p .claude/agents/stripe-integration
```

```yaml
---
name: stripe-integration
description: Expert in Stripe API integration, webhooks, subscriptions...
tools: Read, Write, Edit, Bash
model: sonnet
---

You are a Stripe integration expert with deep knowledge of:
- Stripe API (Charges, Payment Intents, Subscriptions)
- Webhook handling and signature verification
- PCI compliance
...
```

**Custom Skill Example**:
```bash
mkdir -p .claude/skills/company-api-validator
```

```yaml
---
name: company-api-validator
description: Validates API contracts against company standards...
allowed-tools: Read, Grep, Glob
---

# Company API Validator

Validates that APIs follow company standards:
- RESTful naming conventions
- Consistent error handling
...
```

---

## Agents Development

### Core Agents (Shipped with SpecWeave)

**Location**: `src/agents/` (source of truth for SpecWeave framework agents)

These agents are PART OF SpecWeave framework and installed with it:

| # | Agent | Role | Status |
|---|-------|------|--------|
| 1 | pm | Product Manager - requirements, user stories, roadmap | ✅ In src/agents/ |
| 2 | architect | System Architect - design, ADRs, component architecture | ✅ In src/agents/ |
| 3 | devops | DevOps Engineer - infrastructure, deployment, CI/CD | ✅ In src/agents/ |
| 4 | sre | Site Reliability Engineer - monitoring, incidents, reliability | ✅ In src/agents/ |
| 5 | tech-lead | Technical Lead - code review, best practices, mentorship | ✅ In src/agents/ |
| 6 | qa-lead | QA Lead - test strategy, test cases, quality gates | ✅ In src/agents/ |
| 7 | security | Security Engineer - threat modeling, penetration testing | ✅ In src/agents/ |
| 8 | frontend | Frontend Developer - React, UI/UX implementation | ✅ In src/agents/ |
| 9 | nextjs | Next.js Specialist - Next.js app development | ✅ In src/agents/ |
| 10 | nodejs-backend | Node.js Backend - API, services, backend logic | ✅ In src/agents/ |
| 11 | python-backend | Python Backend - FastAPI, Django, data services | ✅ In src/agents/ |
| 12 | dotnet-backend | .NET Backend - C#, ASP.NET Core, enterprise apps | ✅ In src/agents/ |
| 13 | docs-writer | Documentation Writer - guides, references, tutorials | ✅ In src/agents/ |
| 14 | performance | Performance Engineer - optimization, profiling, scaling | ✅ In src/agents/ |

### Integration Agents (P2 Priority)

**Location**: `src/agents/` (part of SpecWeave framework)

These agents handle integration with external tools and diagram generation:

| # | Agent | Role | Status |
|---|-------|------|--------|
| 15 | specweave-jira-mapper | JIRA ↔ SpecWeave bidirectional conversion | ✅ In src/agents/ |
| 16 | specweave-ado-mapper | Azure DevOps ↔ SpecWeave bidirectional conversion | ✅ In src/agents/ |
| 17 | diagrams-architect | Diagram creation (Mermaid, C4 Model) following conventions | ✅ In src/agents/ |

**Key Features**:
- **specweave-jira-mapper**: Converts increments to JIRA Epics/Stories/Subtasks and vice versa
- **specweave-ado-mapper**: Converts increments to ADO Epics/Features/User Stories/Tasks (handles 4-level hierarchy)
- **diagrams-architect**: Creates C4 diagrams (Context, Container, Component, Code), sequence diagrams, ER diagrams, deployment diagrams

---

## Skills Development

### Core Skills (P1 Priority)

**Location**: `src/skills/` (source of truth for SpecWeave framework skills)

These skills are PART OF SpecWeave framework and shipped with it:

| # | Skill | Purpose | Status |
|---|-------|---------|--------|
| 1 | specweave-detector | Entry point, auto-detect SpecWeave projects (proactive) | ✅ In src/skills/ |
| 2 | feature-planner | Plan features with context awareness | ✅ In src/skills/ |
| 3 | skill-router | Parse requests, route to appropriate skills/agents (>90% accuracy) | ✅ In src/skills/ |
| 4 | context-loader | Load specs selectively via manifests (70%+ token reduction) | ✅ In src/skills/ |
| 5 | role-orchestrator | Orchestrate multi-agent workflows | ✅ In src/skills/ |
| 6 | hetzner-provisioner | Provision Hetzner cloud infrastructure | ✅ In src/skills/ |
| 7 | cost-optimizer | Optimize infrastructure costs | ✅ In src/skills/ |

### Integration Skills (P2 Priority)

**Location**: `src/skills/` (part of SpecWeave framework)

These skills coordinate with integration agents:

| # | Skill | Purpose | Status |
|---|-------|---------|--------|
| 8 | jira-sync | Sync with JIRA (coordinates with specweave-jira-mapper agent) | ✅ In src/skills/ |
| 9 | ado-sync | Sync with Azure DevOps (coordinates with specweave-ado-mapper agent) | ✅ In src/skills/ |
| 10 | diagrams-generator | Generate diagrams (coordinates with diagrams-architect agent) | ✅ In src/skills/ |

**Key Features**:
- **jira-sync**: Lightweight coordinator - delegates all conversion logic to specweave-jira-mapper agent
- **ado-sync**: Handles Area Paths and Iterations - delegates to specweave-ado-mapper agent
- **diagrams-generator**: Detects diagram type (C4, sequence, ER, deployment) - delegates to diagrams-architect agent

### Enhanced Skills (P2 Priority)

| # | Skill | Purpose |
|---|-------|---------|
| 11 | spec-author | Create and update specifications | To be created |
| 12 | docs-updater | Auto-update documentation via hooks | To be created |
| 13 | brownfield-analyzer | Analyze existing codebases | To be created |
| 14 | github-sync | Sync with GitHub | To be created |
| 15 | tdd-guide | Optional TDD workflow | To be created |
| 16 | playwright-tester | E2E testing skill (coordinates with agents) | To be created |

### Skills as MCP Wrappers

**Philosophy**: Skills wrap Model Context Protocol tools intelligently and delegate complex logic to specialized agents.

**Architecture**:
```
Skill (Coordinator) → Agent (Conversion Logic) → MCP (API Calls)
```

**Example**: `jira-sync` skill
- Detects sync requests (export, import, bidirectional)
- Validates prerequisites (JIRA credentials, increment structure)
- Invokes `specweave-jira-mapper` agent for all conversion logic
- Uses JIRA MCP server for API operations (if available)
- Updates SpecWeave files with metadata

**Benefits**:
- **Separation of concerns**: Skills coordinate, agents convert
- **Testable**: Agents have 3+ test cases each
- **Reusable**: Agents can be used independently
- **Maintainable**: Conversion rules in agent prompts, not scattered code

---

## Naming Conventions

### Features
- **Format**: `####-short-descriptive-name`
- **Examples**: `0001-skills-framework`, `0002-brownfield-tools`
- **Auto-increment**: Scan `.specweave/increments/` and increment highest number

### Specifications Modules
- **Format**: `lowercase-kebab-case`
- **Examples**: `payments`, `authentication`, `user-management`
- **Submodules**: Nested folders (e.g., `payments/stripe/`, `payments/paypal/`)

### ADRs (Architecture Decision Records)
- **Format**: `####-decision-title.md`
- **Examples**: `0001-tech-stack.md`, `0002-context-loading-approach.md`
- **Index**: Maintain `.specweave/docs/decisions/README.md` with all decisions

### Issues
- **Format**: `####-action-object`
- **Examples**: `0001-implement-skill-router`, `0002-test-context-loader`

---

## Regression Prevention Strategy

### Brownfield Modification Checklist

Before modifying any existing code:

1. ✅ **Documentation exists**
   - Specs for current behavior in `.specweave/docs/internal/strategy/{module}/existing/`
   - Architecture documented in `.specweave/docs/internal/architecture/`

2. ✅ **Tests exist**
   - E2E tests for critical paths (Playwright if UI)
   - Unit tests for key functions
   - User has reviewed and approved tests

3. ✅ **Context manifest prepared**
   - Identifies all related specs
   - Includes architecture docs
   - Lists relevant ADRs

4. ✅ **Impact analysis completed**
   - Dependency graph generated
   - Affected modules identified
   - Regression risk assessed

5. ✅ **Approval obtained**
   - User reviews impact analysis
   - User approves modification plan
   - Tests validated

Only after all checks pass → proceed with implementation.

---

## Living Documentation Principles

### Documentation Types (5-Pillar Structure)

**Internal Documentation** (NOT published):

1. **Strategy** (`.specweave/docs/internal/strategy/`)
   - PRDs, vision, OKRs, business case
   - Technology-agnostic requirements

2. **Architecture** (`.specweave/docs/internal/architecture/`)
   - HLDs, system design
   - ADRs (Architecture Decision Records) in `adr/`
   - RFCs (Request for Comments) in `rfc/`
   - Component diagrams (Mermaid)

3. **Delivery** (`.specweave/docs/internal/delivery/`)
   - Roadmap, release plans
   - Test strategy, CI/CD docs
   - Development guides in `guides/`

4. **Operations** (`.specweave/docs/internal/operations/`)
   - Runbooks, SLOs, monitoring
   - Incident response procedures

5. **Governance** (`.specweave/docs/internal/governance/`)
   - Security policies, compliance
   - Change management, audit trails

**Public Documentation** (PUBLISHED):

6. **Public Docs** (`.specweave/docs/public/`)
   - `overview/` - Product overview, features
   - `api/` - API documentation, OpenAPI specs
   - `guides/` - User guides, tutorials
   - `faq/` - Frequently Asked Questions
   - `changelog/` - Release notes, breaking changes

### Auto-Update Rules

The `docs-updater` skill automatically updates:
- **CLAUDE.md** when project structure changes
- **API reference** (`.specweave/docs/public/api/`) when new endpoints added
- **CLI reference** (`.specweave/docs/public/api/`) when commands change
- **Changelog** (`.specweave/docs/public/changelog/`) when features completed
- **Development guides** (`.specweave/docs/internal/delivery/guides/`) when workflows modified

**Manual documentation** (user-written guides, tutorials, strategy docs, architecture overviews) is preserved and never auto-modified.

---

## C4 Diagram Conventions

**CRITICAL**: SpecWeave adopts the **C4 Model** (Context, Container, Component, Code) for architecture diagrams.

### C4 Model Mapping to SpecWeave

| C4 Level | SpecWeave Equivalent | Status | Purpose | Location |
|----------|----------------------|--------|---------|----------|
| **C4-1: Context** | HLD Context Diagram | ✅ Defined | System boundaries, external actors | `.specweave/docs/internal/architecture/diagrams/` |
| **C4-2: Container** | HLD Component Diagram | ✅ Defined | Applications, services, data stores | `.specweave/docs/internal/architecture/diagrams/` |
| **C4-3: Component** | LLD Component Diagram | ✅ Defined (NEW) | Internal structure of a container | `.specweave/docs/internal/architecture/diagrams/{module}/` |
| **C4-4: Code** | Source code + UML | ⚠️ Optional | Class diagrams, implementation details | Code comments or separate docs |

### Design Decision

- **HLD (High-Level Design) = C4 Levels 1-2** (Context + Container)
- **LLD (Low-Level Design) = C4 Level 3** (Component)
- **Code-Level Documentation = C4 Level 4** (Optional, generated from code)

### C4 Level 1: Context Diagram (HLD)
**Purpose**: System boundaries, external actors. **Location**: `.specweave/docs/internal/architecture/diagrams/system-context.mmd`. **Syntax**: `C4Context` with Person/System/System_Ext/Rel.

### C4 Level 2: Container Diagram (HLD)
**Purpose**: Applications, services, databases. **Location**: `.specweave/docs/internal/architecture/diagrams/system-container.mmd`. **Syntax**: `C4Container` with Container/ContainerDb/Container_Boundary.

### C4 Level 3: Component Diagram (LLD)
**Purpose**: Internal container structure (modules, classes). **Location**: `.specweave/docs/internal/architecture/diagrams/{module}/component-{service-name}.mmd`. **Syntax**: `C4Component` with Component/ComponentDb. **Naming**: `component-auth-service.mmd`, `component-payment-service.mmd`.

### C4 Level 4: Code Diagram (Optional)
**Purpose**: Class diagrams. **Approach**: Generate from code using TypeDoc/JSDoc/Sphinx/Javadoc.

**If Manual Creation Required**: Use standard UML class diagrams with Mermaid `classDiagram`.

### Other Diagram Types

**Sequence**: Interaction flows → `.specweave/docs/internal/architecture/diagrams/{module}/flows/{flow-name}.mmd`
**ER**: Data models → `.specweave/docs/internal/architecture/diagrams/{module}/data-model.mmd`
**Deployment**: Infrastructure → `.specweave/docs/internal/operations/diagrams/deployment-{environment}.mmd`

### Diagram Agent & Skill

**Agent**: `diagrams-architect` (`src/agents/diagrams-architect/`)
- Expert in creating Mermaid diagrams following C4 conventions
- Contains all diagram rules and best practices
- Creates diagrams with correct syntax and placement

**Skill**: `diagrams-generator` (`src/skills/diagrams-generator/`)
- Detects diagram requests
- Coordinates with `diagrams-architect` agent
- Saves diagrams to correct locations

**Usage**:
```
User: "Create C4 context diagram"
→ diagrams-generator skill activates
→ Invokes diagrams-architect agent
→ Agent creates diagram following C4 Level 1 conventions
→ Saves to .specweave/docs/internal/architecture/diagrams/system-context.mmd
```

### Best Practices

1. **Follow C4 hierarchy** - Context → Container → Component → Code
2. **Keep diagrams focused** - One concept per diagram
3. **Use consistent naming** - Follow file naming conventions
4. **Place correctly** - HLD in `architecture/diagrams/`, LLD in `architecture/diagrams/{module}/`
5. **Add annotations** - Performance notes, security considerations
6. **Version control** - Track diagram changes with git
7. **Link from docs** - Reference diagrams in architecture documents

---

## SpecWeave Documentation Maintenance

### Documentation Philosophy for SpecWeave Itself

**CRITICAL**: The `.specweave/docs/` folder contains COMPLETE documentation ABOUT SpecWeave framework.

**This is different from**:
- User project documentation (which is built gradually)
- SpecWeave's own documentation MUST be comprehensive

### Documentation Structure

See [.specweave/docs/README.md](.specweave/docs/README.md) for complete 5-pillar structure.

**SpecWeave Framework Documentation** (follows 5-pillar structure):

**Internal** (NOT published):
- `.specweave/docs/internal/strategy/` - Framework vision, PRDs, OKRs
- `.specweave/docs/internal/architecture/` - System design, skills system, context loading, ADRs
- `.specweave/docs/internal/delivery/` - Roadmap, release plans, development guides
- `.specweave/docs/internal/operations/` - Framework operations, monitoring
- `.specweave/docs/internal/governance/` - Security, compliance

**Public** (PUBLISHED to docs site):
- `.specweave/docs/public/overview/` - Framework introduction, features
- `.specweave/docs/public/guides/` - How-to guides (creating skills, writing specs, etc.)
- `.specweave/docs/public/api/` - CLI commands, skills API (AUTO-UPDATED)
- `.specweave/docs/public/changelog/` - Releases, breaking changes (AUTO-UPDATED)

### MkDocs Navigation

**File**: `mkdocs.yml`

Pull-based navigation structure with:
- Clear hierarchy
- Logical grouping
- Easy to find information

**Deploy**: `mkdocs build` → GitHub Pages

### Auto-Update via Hooks

**Hook**: `.claude/hooks/post_task_completion.sh`

**Auto-updated documentation**:
1. **CLAUDE.md** - When project structure changes
2. **.specweave/docs/public/api/cli-commands.md** - When CLI changes
3. **.specweave/docs/public/api/skills-api.md** - When skills API changes
4. **.specweave/docs/public/changelog/** - When features completed

**Manual documentation** (preserved):
- Getting Started guides
- How-to guides
- Architecture overviews
- ADRs (after initial creation)

### Backwards Links

Every documentation file MUST include "Related Documentation" section:

```markdown
## Related Documentation

- [Link to related doc](../path/to/doc.md) - Description
- [Another related doc](../other/path.md) - Description

**See also**: [CLAUDE.md](../../CLAUDE.md) for complete development guide.
```

### Documentation Skills

#### `docs-updater` Skill (P2)

**Purpose**: Auto-update documentation via hooks

**Responsibilities**:
1. Update CLI reference when commands change
2. Update skills API reference when API changes
3. Update changelog when features completed
4. Update CLAUDE.md when structure changes
5. Preserve manual content

**Usage**: Activated automatically via `.claude/hooks/post_task_completion.sh`

#### Creating New Documentation

When creating new documentation files:

1. **Follow the 5-pillar structure** (see `.specweave/docs/README.md`)
2. **Use templates** if available
3. **Add backwards links** to related docs
4. **Update mkdocs.yml** if new file
5. **Test locally**: `mkdocs serve`
6. **Build**: `mkdocs build`

### Deployment

**To GitHub Pages**:
```bash
# Build documentation
mkdocs build

# Deploy (automatic via GitHub Actions)
# or manually:
mkdocs gh-deploy
```

**CI/CD**: Should be automated via GitHub Actions

---

## Summary

**SpecWeave** replaces vibe coding with **Spec-Driven Development**:

1. **CLAUDE.md is your guide** - No separate constitution/principles file
2. **Specifications are SOURCE OF TRUTH** - Code expresses specs
3. **Framework-agnostic** - Works with ANY language/framework (TypeScript, Python, Go, Rust, Java, etc.)
4. **Generic commands** - `/create-project`, `/create-increment`, `/review-docs` adapt to detected tech stack
5. **ONE framework increment** - SpecWeave repo has 1 increment (`001-core-framework`), user projects have many (auth, payments, etc.)
6. **Agents/skills in src/** - 20 agents + 24 skills installed to .claude/ (NOT separate increments)
7. **Flexible documentation** - Supports BOTH comprehensive upfront (500-600+ pages for enterprise) AND incremental (like Microsoft for startups)
8. **Context precision** - Load only what's needed (70%+ token reduction), scales from 10 to 1000+ pages
9. **Auto-role routing** - Skills detect expertise automatically
10. **Test-validated** - 3+ tests per skill, E2E Playwright when UI exists
11. **TDD optional** - Separate skill, not enforced
12. **Closed-loop validation** - E2E tests MUST tell the truth
13. **Living documentation** - Auto-update via Claude hooks
14. **Brownfield-ready** - Analyze, document, then modify safely
15. **Production-ready** - Documentation is CRUCIAL for production, supports enterprise scale

This framework enables building software at ANY scale, with ANY tech stack, with confidence, clarity, continuous validation, and minimal context usage.

---

**Last Updated**: Auto-updated via `post-task-completion` hook
**Source of Truth**: **THIS FILE (CLAUDE.md)** is your complete development guide
**Specifications**: See `.specweave/docs/internal/strategy/` for business requirements (WHAT/WHY)
**Documentation**: See `.specweave/docs/` for implementation guides (HOW) - supports both comprehensive upfront (500-600+ pages for enterprise/production) AND incremental (like Microsoft for startups)
