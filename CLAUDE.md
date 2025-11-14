# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: Open Source NPM Package (TypeScript CLI)
**Repository**: https://github.com/anton-abyzov/specweave
**Website**: https://spec-weave.com

This CLAUDE.md is for **contributors to SpecWeave itself**, not users of SpecWeave.
Users receive a different CLAUDE.md via the template system.

---

## 🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!

**⛔ THIS IS THE #1 RULE - VIOLATING THIS WILL GET YOUR PR REJECTED ⛔**

**ALL AI-generated files MUST go into the CURRENT INCREMENT folder**, NOT in the project root!

### ❌ NEVER Create in Root (Pollutes Repository)

```
❌ WRONG - ROOT FILES (REJECTED!):
/PLUGIN-MIGRATION-COMPLETE.md          # NO! Goes to increment reports/
/SESSION-SUMMARY-2025-10-28.md         # NO! Goes to increment reports/
/ADR-006-DEEP-ANALYSIS.md              # NO! Goes to .specweave/docs/internal/architecture/adr/
/ANALYSIS-MULTI-TOOL-COMPARISON.md     # NO! Goes to increment reports/
/migration-helper.sh                   # NO! Goes to increment scripts/
/execution.log                         # NO! Goes to increment logs/
/specweave-0.5.1.tgz                   # NO! Build artifact, should be in .gitignore
/yolov8n.pt                            # NO! ML model, should be in .gitignore

✅ CORRECT - INCREMENT FOLDERS:
.specweave/increments/0004-plugin-architecture/
├── spec.md                            # Spec files (core 3)
├── plan.md
├── tasks.md                           # Tasks with embedded tests
├── reports/                           # ✅ PUT REPORTS HERE!
│   ├── PLUGIN-MIGRATION-COMPLETE.md   # ✅ Completion reports
│   ├── SESSION-SUMMARY.md             # ✅ Session summaries
│   └── ANALYSIS-*.md                  # ✅ Analysis files
├── scripts/                           # ✅ PUT SCRIPTS HERE!
│   └── migration-helper.sh            # ✅ Helper scripts
└── logs/                              # ✅ PUT LOGS HERE!
    └── execution.log                  # ✅ Execution logs

.specweave/docs/internal/architecture/ # ✅ PUT ADRS/DIAGRAMS HERE!
└── adr/
    └── 0006-deep-analysis.md          # ✅ Architecture decisions
```

**Why**: Traceability, easy cleanup, clear context. See [File Organization Guide](https://spec-weave.com/docs/learn/file-organization).

### ⚠️ CRITICAL: reports/ Folder is MANDATORY!

**EVERY increment MUST have a reports/ subfolder for ALL analysis and summary files:**

```bash
# ✅ CORRECT Structure:
.specweave/increments/0017-sync-fix/
├── spec.md                         # Core: What we're building
├── plan.md                         # Core: How we'll build it
├── tasks.md                        # Core: Task checklist (REQUIRED for status line!)
├── reports/                        # 📁 ALL reports and analysis go here!
│   ├── STATUS-LINE-DEBUG.md        # ✅ Analysis files
│   ├── TEST-REPORT-COMPLETE.md     # ✅ Test reports
│   ├── IMPLEMENTATION-SUMMARY.md   # ✅ Implementation summaries
│   ├── CODE-REVIEW-*.md            # ✅ Code review reports
│   └── SESSION-SUMMARY-*.md        # ✅ Session notes
├── scripts/                        # Optional: Helper scripts
└── logs/                           # Optional: Execution logs

# ❌ WRONG - Files in root will BREAK status line!
.specweave/increments/0017-sync-fix/
├── spec.md
├── plan.md
├── tasks.md
├── TEST-REPORT-COMPLETE.md         # ❌ NO! Breaks status line parsing
├── ANALYSIS-*.md                   # ❌ NO! Confuses file parsers
└── SESSION-SUMMARY.md              # ❌ NO! Should be in reports/
```

**Rule**: Only 3 core files in increment root: `spec.md`, `plan.md`, `tasks.md`. Everything else → subfolders (reports/, scripts/, logs/). Required for status line parsing.

### What IS Allowed in Root?

**ONLY these files belong in root**:
- ✅ `CLAUDE.md` (this file - contributor guide)
- ✅ `README.md`, `CHANGELOG.md`, `LICENSE` (project documentation)
- ✅ `package.json`, `tsconfig.json`, `.gitignore` (config files)
- ✅ Directories: `src/`, `tests/`, `plugins/`, `.specweave/`, etc. (source code)

**Everything else goes in increment folders or `.gitignore`!**

### Build Artifacts (Add to .gitignore)

These should NEVER be committed:
- ❌ `*.tgz`, `*.tar.gz` - NPM package archives
- ❌ `*.pt`, `*.pth` - ML model files (download on demand)
- ❌ `dist/`, `build/` - Compiled outputs (already in .gitignore)
- ❌ `*.log` - Log files (already in .gitignore)

**Before committing, ALWAYS check**: `git status` - If you see `.md` files in root, MOVE THEM!

---

## Tool Support

Claude Code-first (native hooks, plugins, MCP). See [Why Claude Code?](https://spec-weave.com/docs/overview/why-claude-code).

---

## Increment Naming Convention

**CRITICAL**: All increments MUST use descriptive names, not just numbers.

**Format**: `####-descriptive-kebab-case-name`

**Examples**:
- ✅ `0001-core-framework` ← Clear what it does
- ✅ `0003-intelligent-model-selection` ← Searchable
- ❌ `0003` ← Too generic (rejected!)

**Why**: Clear intent, better git history, searchable, self-documenting.

**For complete naming rules**: See `increment-planner` skill (auto-loads when using `/specweave:increment`)

---

## Increment Discipline

**⛔ THE IRON RULE**: You CANNOT start increment N+1 until increment N is DONE.

**Core Philosophy**:
- ✅ **Default**: 1 active increment (maximum productivity)
- ✅ **Emergency ceiling**: 2 active max (hotfix/bug can interrupt)
- ✅ **Hard cap**: Never >2 active (enforced)

**Why**: Focus = Quality. Research shows 1 task = 100% productivity, 2 tasks = 20% slower, 3+ = 40% slower + more bugs.

**For complete discipline rules**: See [Increment Lifecycle Guide](.specweave/docs/internal/delivery/guides/increment-lifecycle.md#increment-discipline-the-iron-rule)

This guide auto-loads when using increment commands (progressive disclosure pattern).

**Quick Reference**:
- Complete work: `/specweave:do`
- Close increments: `/specweave:close` (3 options: adjust scope, move scope, extend)
- Check status: `/specweave:status`
- Emergency bypass: `--force` (use sparingly!)

**What "DONE" means**: All P1 tasks completed OR completion report exists OR explicit closure via `/specweave:done`.

---

## Test-Aware Planning

Tests embedded in tasks.md (no separate tests.md).

**Architecture**:
- **spec.md**: User stories with AC-IDs (AC-US1-01, AC-US1-02)
- **plan.md**: Technical design + test strategy
- **tasks.md**: Tasks with embedded test plans (BDD format)

**Example Task with Tests**:
```markdown
## T-001: Implement Authentication Service

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD):
- **Given** valid credentials → **When** login → **Then** receive JWT token

**Test Cases**:
- Unit (`auth.test.ts`): validLogin, invalidPassword → 90% coverage
- Integration (`auth-flow.test.ts`): loginEndpoint → 85% coverage

**Implementation**: AuthService.ts, bcrypt, JWT, Redis rate limiting
```

**Key Benefits**:
- ✅ Single source of truth (no sync issues)
- ✅ AC-ID traceability (spec → tasks → tests)
- ✅ BDD format (Given/When/Then - clear intent)
- ✅ TDD support (set `test_mode: TDD` in frontmatter)
- ✅ Realistic coverage (80-90%, not 100%)

**For complete workflow**: The `increment-planner` skill contains comprehensive test-aware planning guide (auto-loads when using `/specweave:increment`)

**Validation**: `/specweave:check-tests` shows AC-ID coverage and missing tests

---

## Bidirectional Task ↔ User Story Linking

**CRITICAL FEATURE**: SpecWeave automatically creates bidirectional links between tasks and user stories during living docs sync.

### How It Works

**AC-ID Based Mapping**: Uses acceptance criteria IDs from tasks to map back to user stories.

**Example Task** (WITH bidirectional link):
```markdown
### T-001: Implement Authentication Service

**User Story**: [US-001: User Authentication](../../docs/internal/specs/default/auth-service/us-001-user-authentication.md)

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD):
- **Given** valid credentials → **When** login → **Then** receive JWT token
```

### Traceability Flow

**Complete Bidirectional Navigation**:
```
User Story (US-001) ←――――――――――┐
  ↓                            |
  ↓ Links to Tasks (forward)  | Link to User Story (reverse)
  ↓                            |
Tasks (T-001, T-002, T-003) ――┘
```

**Forward Links** (US → Tasks):
- User story files contain **Implementation** section
- Lists all tasks that implement the user story
- Example: `[T-001: Implement Auth](../../../../../increments/0031/tasks.md#t-001-implement-auth)`

**Reverse Links** (Tasks → US) - **AUTOMATIC**:
- Added during living docs sync (`/specweave:done` or manual distribution)
- Uses AC-IDs from **AC**: field to map task → user story
- Mapping: `AC-US1-01` → `US-001` → User story file
- Injected as `**User Story**: [US-XXX: Title](path)` after task heading

### Multi-Project Support

**Project Detection** (automatic):
```typescript
// Detects from config or path
projectId = "default" | "backend" | "frontend" | "mobile" | ...

// Paths adapt automatically
../../docs/internal/specs/${projectId}/${featureFolder}/us-001-*.md
```

**Example Paths**:
- **Default**: `../../docs/internal/specs/default/auth-service/us-001-*.md`
- **Backend**: `../../docs/internal/specs/backend/auth-service/us-001-*.md`
- **Frontend**: `../../docs/internal/specs/frontend/dashboard/us-001-*.md`

### When Links Are Created

**Automatic** (during living docs sync):
1. Complete increment: `/specweave:done 0031`
2. System automatically:
   - Extracts user stories from spec.md
   - Writes user story files with forward links (US → Tasks)
   - Parses tasks.md for **AC**: fields
   - Creates task → user story mapping
   - **Injects reverse links** (Tasks → US) into tasks.md

**Manual** (if needed):
```bash
node -e "import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
  const dist = new SpecDistributor(process.cwd());
  await dist.distribute('0031-external-tool-status-sync');
});"
```

### Requirements for Bidirectional Links

**Must Have**:
- ✅ **AC**: field in tasks with AC-IDs (e.g., `AC-US1-01, AC-US1-02`)
- ✅ User stories in spec.md with matching IDs (e.g., `### US-001:` or `#### US-001:`)
- ✅ Living docs sync enabled

**Optional**:
- No configuration needed (works out of the box)
- Can disable with `livingDocs.intelligent.bidirectionalLinks: false`

### Key Benefits

- ✅ **Complete Traceability**: Navigate from tasks to user stories and back
- ✅ **LLM-Friendly**: AI can understand relationships bidirectionally
- ✅ **Zero Manual Work**: Links created automatically during sync
- ✅ **Multi-Project Aware**: Paths adapt to project structure
- ✅ **Idempotent**: Safe to run sync multiple times

### Implementation Details

**Code**: `src/core/living-docs/spec-distributor.ts`
- `updateTasksWithUserStoryLinks()` - Adds links to tasks.md
- `mapTasksToUserStories()` - Creates AC-ID based mapping

**Pattern Support**:
- Task headings: Both `## T-001:` and `### T-001:`
- User story headings: Both `### US-001:` and `#### US-001:`

**For complete technical details**: See `.specweave/increments/0030-intelligent-living-docs/reports/BIDIRECTIONAL-LINKING-COMPLETE.md`

---

## Root-Level .specweave/ Folder (MANDATORY)

**CRITICAL ARCHITECTURE RULE**: SpecWeave ONLY supports root-level `.specweave/` folders. Nested `.specweave/` folders are NOT supported and MUST be prevented.

### The Rule: ONE Source of Truth

```
✅ CORRECT - Root-level only:
my-project/
├── .specweave/              ← ONE source of truth
│   ├── increments/
│   ├── docs/
│   └── logs/
├── frontend/
├── backend/
└── infrastructure/

❌ WRONG - Nested .specweave/ (NOT SUPPORTED):
my-project/
├── .specweave/              ← Root level
│   └── ...
├── backend/
│   └── .specweave/          ← ❌ NESTED - PREVENTS THIS!
└── frontend/
    └── .specweave/          ← ❌ NESTED - PREVENTS THIS!
```

### Why Root-Level Only?

Single source of truth, cross-cutting features, simpler sync. Prevents duplication and conflicts. See [Multi-Repo Setup Guide](https://spec-weave.com/docs/learn/multi-repo-setup).

### Multi-Repo & Microservices Pattern

Create parent folder with ONE `.specweave/`. Three options: GitHub parent (teams), local parent (solo), or per-repo (not recommended). Works for polyrepo, microservices, monorepo. See [Multi-Repo Setup Guide](https://spec-weave.com/docs/learn/multi-repo-setup).

**Setup**: `mkdir parent && cd parent && npx specweave init .` → Select option during init. See guide for full examples.

### Enforcement

`init.ts` detects parent `.specweave/` and prevents nested init. Code review rejects nested folders.

---

## Project Scale - Plugin Architecture

### Core Plugin (Always Auto-Loaded)

**Plugin**: `specweave` - The essential SpecWeave plugin loaded in every project:
- **Skills**: 9 skills (increment-planner, tdd-workflow, spec-generator, context-loader, project-kickstarter, brownfield-analyzer, brownfield-onboarder, increment-quality-judge, context-optimizer)
- **Agents**: 22 agents (PM, Architect, Tech Lead, + 19 specialized including tdd-orchestrator)
- **Commands**: 22 commands (/specweave:increment, /specweave:do, /specweave:next, /specweave:done, /specweave:progress, /specweave:validate, /specweave:sync-docs, + 15 specialized)
- **Hooks**: 8 lifecycle hooks
- **Size**: ~12K tokens

**Result**: **75%+ context reduction** out of the box!

**Why So Small?**
- External sync (GitHub, Jira) = separate plugins
- Tech stacks (React, K8s) = separate plugins
- Domain expertise (ML, payments) = separate plugins
- Core plugin = only increment lifecycle + living docs automation

### Available Plugins (All Auto-Installed)

**Implemented Plugins**:

| Plugin | Skills | Agents | Commands | Status |
|--------|--------|--------|----------|--------|
| **specweave-github** | 2 | 1 | 4 | ✅ COMPLETE |

**GitHub Plugin Features:**
- github-sync: Bidirectional increment ↔ issue sync
- github-issue-tracker: Task-level progress tracking
- github-manager agent: AI specialist for GitHub CLI
- Commands: create-issue, sync, close-issue, status
- Auto-detects: `.git/`, `github.com` remote, `GITHUB_TOKEN`

**Available Plugins**: See `plugins/` directory or `/plugin list --installed`
**Plugin Roadmap**: See [Roadmap](https://spec-weave.com/docs/overview/roadmap) for planned plugins and release timeline

### Context Efficiency

**All plugins are installed, but only relevant skills activate based on context**. Claude Code's native skill system ensures:
- Skills only activate when their description keywords match the conversation
- Agents only load when explicitly invoked
- Commands only appear when relevant

**Example**: Working on a React frontend:
- ✅ `specweave-frontend` skills activate (React, Next.js, design systems)
- ✅ `specweave-github` skills activate (if mentioning GitHub)
- ❌ `specweave-ml` skills stay dormant (ML keywords not detected)
- ❌ `specweave-payments` skills stay dormant (Stripe not mentioned)

**Result**: Even with 19+ plugins installed, you only "pay" (in tokens) for what you're actively using in the conversation.

### How Plugins Are Loaded (All Plugins Installed Upfront)

**SpecWeave's plugin system is designed to be intelligent and non-intrusive:**

#### Phase 1: Initialize (FULLY AUTOMATED!)

When you run `specweave init`:

1. ✅ **GitHub Marketplace Registration** (CLI-Only, GLOBAL)
   - Registers marketplace via CLI: `claude plugin marketplace add anton-abyzov/specweave`
   - **Marketplace is GLOBAL** - persists across ALL projects, not per-project
   - **No `.claude/settings.json` created** - redundant because CLI registration is global
   - Installation process:
     1. Removes existing marketplace (if present)
     2. Re-adds marketplace from GitHub (always fresh)
     3. Reads marketplace.json to get list of all plugins
     4. Installs each plugin via `claude plugin install {name}`
     5. Reports success/failure for each plugin
   - All slash commands available IMMEDIATELY - no manual install needed!
   - Success message: "✔ Installed: 19/19 plugins"
   - Graceful fallback: If CLI unavailable, shows manual install instructions
   - **No selective loading**: Everything installed upfront for full capabilities

**Key Architectural Change**:
- ❌ Old: Copied `.claude-plugin/` + `plugins/` to every project (~2MB bloat)
- ✅ New: CLI-based GLOBAL marketplace registration (zero per-project files, always up-to-date)

#### Phase 2: Implementation (All Plugins Ready)

After `specweave init`, ALL plugins are already installed. No additional steps needed!

1. **Skills Auto-Activate**
   - Based on description keywords (Claude Code native behavior)
   - No manual invocation needed
   - Example: Mention "GitHub" → github-sync skill activates

2. **All Capabilities Available**
   - GitHub integration: `/specweave-github:sync`
   - JIRA integration: `/specweave-jira:sync`
   - Frontend tools: React, Next.js, design systems
   - Backend tools: Node.js, Python, .NET
   - Infrastructure: Kubernetes, Helm, monitoring
   - ...and 19+ more plugins ready to use!

### Plugin Management

**All 19+ plugins are automatically installed during `specweave init`**. You rarely need to manage plugins manually, but Claude Code's native commands are available if needed:

```bash
# List installed plugins (should show all 19+ SpecWeave plugins)
/plugin list --installed

# Uninstall a plugin (not recommended - breaks functionality)
/plugin uninstall specweave-kubernetes

# Reinstall all plugins (if you uninstalled something by mistake)
specweave init .  # Re-runs full installation
```

**Key Insight**: SpecWeave uses **ONLY** Claude Code's native plugin system:
- ALL plugins installed automatically during init (no manual selection)
- Plugins install globally via `/plugin install specweave-{name}`
- Work across ALL projects (like VS Code extensions)
- Auto-activate based on skills' description keywords
- Managed by Claude Code (updates handled via `specweave init` re-run)

### Development vs Production Setup

**Two different scenarios with different marketplace configurations:**

#### SpecWeave Repo (Development)

```
specweave/  (GitHub repo - Contributors)
├── .claude/
│   └── settings.json              # Empty or minimal (no local paths supported)
├── .claude-plugin/
│   └── marketplace.json           # Marketplace definition
└── plugins/
    ├── specweave/                 # Core plugin SOURCE CODE
    └── specweave-github/          # Plugin SOURCE CODE
```

**Marketplace setup for development** (use CLI, NOT settings.json):

Local paths are **NOT supported** in `extraKnownMarketplaces` in settings.json. Use CLI instead:

```bash
# Add local marketplace (only way for development)
/plugin marketplace add ./.claude-plugin

# Then install plugins
/plugin install specweave
```

**Why CLI-only?** Claude Code's `extraKnownMarketplaces` in settings.json only supports remote sources (GitHub, Git). Local paths must be added via CLI commands.

#### User Projects (Production)

```
my-saas-app/  (User's project)
├── .specweave/                    # SpecWeave data ONLY
│   └── increments/
└── src/
```

**NO `.claude/` folder created!** Marketplace registration is GLOBAL via CLI, not per-project.

**Marketplace Registration** (via `specweave init`):
```bash
# Registers marketplace GLOBALLY (persists across all projects)
claude plugin marketplace add anton-abyzov/specweave

# Check registration (works from ANY project)
claude plugin marketplace list
# Output: ❯ specweave (Source: GitHub anton-abyzov/specweave)
```

**Key Differences**:
- ✅ **Development**: Local `.claude-plugin/` and `plugins/` in repo (for editing)
- ✅ **Production**: GLOBAL CLI registration (zero per-project files)
- ✅ **Development**: Use CLI `/plugin marketplace add ./.claude-plugin`
- ✅ **Production**: Use CLI `claude plugin marketplace add anton-abyzov/specweave`
- ✅ **Both**: Marketplace persists across projects and IDE restarts

No per-project installation needed!

---

## Project Structure

### Source of Truth Principle

**CRITICAL**: SpecWeave follows a strict source-of-truth pattern:

```
src/                    # TypeScript code ONLY (compiled to dist/)
plugins/                # ALL Claude Code components (skills, agents, commands, hooks)
├── specweave/          # Core plugin (auto-loaded)
└── specweave-*/        # Optional plugins (GitHub, JIRA, etc.)
.specweave/             # Framework data (increments, docs, logs)
```

**Key Rules**:
- ✅ `src/` = TypeScript code ONLY
- ✅ ALL skills/agents/commands/hooks = Inside `plugins/`
- ✅ Marketplace = GLOBAL via CLI (no per-project `.claude/`)
- ❌ NEVER mix `*.ts` and `SKILL.md` in same directory
- ❌ NEVER create new files in project root (use increment folders)

### Tech Stack

**Core**: TypeScript 5.x, Node.js 18+, Commander.js, Inquirer.js
**Testing**: Playwright (E2E), Jest (unit/integration)
**Docs**: Docusaurus 3.x, Mermaid diagrams
**Distribution**: NPM package, install script

**For complete directory structure**: See `README.md` or browse the repository

---

## File Organization Rules

### ✅ ALLOWED in Root

- `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `LICENSE`
- Config files (`package.json`, `tsconfig.json`, `.gitignore`)
- Build artifacts (`dist/`, only if needed temporarily)

### ❌ NEVER Create in Root

**See comprehensive rules at top**: [🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!](#-critical-never-pollute-project-root)

**Quick summary**:
- ✅ ALL AI-generated files → `.specweave/increments/####/reports/`
- ✅ Architecture decisions → `.specweave/docs/internal/architecture/adr/`
- ❌ NEVER create `.md` files, scripts, or logs in project root

### Runtime Artifacts (NOT Source Controlled)

```
❌ NEVER COMMIT:
.specweave/logs/                # Runtime logs
.specweave/increments/*/logs/   # Increment logs
.specweave/cache/               # Temporary cache
```

**Why?** Logs are execution artifacts, not source code. They cause merge conflicts and bloat the repo.

**Enforcement**: `.gitignore` excludes these automatically.


## Internal Documentation Structure

**Location**: `.specweave/docs/internal/` - Cross-project folders + multi-project organization

### Cross-Project Documentation (Top-Level)

**Five cross-project folders** apply to the entire system:

| Folder | Purpose | Use When | Examples |
|--------|---------|----------|----------|
| **strategy/** | Business rationale (Why?) | Defining business case for features | `prd-user-auth.md` |
| **architecture/** | System-wide technical design | Architecture affecting all projects | `hld-system.md`, `adr/0001-postgres.md` |
| **delivery/** | Build & release (How we build) | Git workflow, DORA metrics, CI/CD | `branch-strategy.md`, `dora-metrics.md` |
| **operations/** | Production ops (How we run) | Runbooks, incidents, performance | `runbook-api.md`, `performance-tuning.md` |
| **governance/** | Policies (Guardrails) | Security, compliance, coding standards | `security-policy.md`, `coding-standards.md` |

### Multi-Project Organization

**FLATTENED STRUCTURE**: Simpler, cleaner paths with document-type-first organization

```
.specweave/docs/internal/
├── strategy/              # Cross-project (unchanged)
├── architecture/          # System-wide ADRs (unchanged)
├── delivery/              # Cross-project (unchanged)
├── operations/            # Cross-project (unchanged)
├── governance/            # Cross-project (unchanged)
│
├── specs/                 # ✨ FLATTENED: Living docs specs
│   ├── default/           # Default project (single-project mode)
│   ├── backend/           # Backend project
│   ├── frontend/          # Frontend project
│   └── _parent/           # Parent repository (multi-repo setups)
│
├── modules/               # ✨ FLATTENED: Module documentation
│   ├── default/
│   ├── backend/
│   └── frontend/
│
├── team/                  # ✨ FLATTENED: Team playbooks
│   ├── default/
│   ├── backend/
│   └── frontend/
│
├── project-arch/          # ✨ RENAMED: Project-specific ADRs
│   ├── backend/           # (Renamed to avoid conflict with top-level architecture/)
│   └── frontend/
│
└── legacy/                # ✨ FLATTENED: Brownfield imports
    ├── default/
    └── backend/
```

**Benefits of Flattened Structure**:
- ✅ Simpler paths (no extra `projects/` nesting)
- ✅ Consistent with cross-project folders (all at same level)
- ✅ Clearer parent repo naming (`_parent` for multi-repo)
- ✅ Easier GitHub sync (shorter paths)
- ✅ Document-type-first organization (group by specs/, modules/, etc.)

**Five Documentation Types Per Project**:

1. **specs/{project-id}/** - Living documentation specs (user stories, acceptance criteria)
   - Permanent, feature-level knowledge base
   - ALL user stories for a feature area
   - 3-digit numbers: `spec-001-user-auth.md`

2. **modules/{project-id}/** - Module/component documentation
   - Architecture, API contracts, integration guides
   - Created when module >1000 lines or has security implications
   - Example: `auth-module.md`, `payment-module.md`

3. **team/{project-id}/** - Team playbooks
   - Onboarding, conventions, workflows, contacts
   - Team-specific processes and practices
   - Example: `onboarding.md`, `conventions.md`, `workflows.md`

4. **project-arch/{project-id}/** - Project-specific ADRs (optional)
   - Decisions affecting only this project
   - Use top-level `architecture/` for system-wide decisions
   - Example: `adr/0001-use-postgres.md`

5. **legacy/{project-id}/** - Brownfield imports (temporary)
   - Imported from Notion, Confluence, Wiki
   - Migration report + classified files
   - Clean up after migration complete

**Key Architecture Principle**: Single project = multi-project with 1 project called "default" (NO special cases!)

**Document Flow**: `PRD → Spec → Architecture → Delivery → Operations`

**See**:
- [Internal Docs README](.specweave/docs/internal/README.md) for complete guidance
- [Multi-Project Setup Guide](.specweave/docs/public/guides/multi-project-setup.md) for usage
- [ADR-0017](/.specweave/docs/internal/architecture/adr/0017-multi-project-internal-structure.md) for architecture decisions

---

## Specs: Two Locations

1. **Living Docs** (`.specweave/docs/internal/specs/`): Permanent, feature-level, 20+ user stories (3-digit: spec-001)
2. **Increment Specs** (`.specweave/increments/####/`): Temporary, focused, 3-5 user stories (4-digit: 0001)

**Relationship**: One living docs spec → Many increment specs.

See [SPECS-ARCHITECTURE-CLARIFICATION.md](.specweave/increments/0007-smart-increment-discipline/reports/SPECS-ARCHITECTURE-CLARIFICATION.md) for full explanation.

---

## Living Docs Sync (Universal Hierarchy)

**CRITICAL**: SpecWeave uses Universal Hierarchy architecture for living docs. This section explains the structure and automatic sync process.

### Structure (Standard Level)

**Location**: `.specweave/docs/internal/specs/{project-id}/`

Each FS-* (Feature Spec / Epic) folder contains:
- **README.md** - Epic overview (high-level feature summary, business value, implementation history)
- **us-\*.md** - User story files DIRECTLY in epic folder (NOT in subfolder)

**Correct Structure**:
```
.specweave/docs/internal/specs/
└── default/                              ← Project: default
    ├── README.md                         ← Project overview
    ├── FS-024-bidirectional-spec-sync/
    │   ├── README.md                     ← Epic overview
    │   ├── us-001-*.md                   ← User stories
    │   ├── us-002-*.md
    │   └── us-003-*.md
    ├── FS-030-intelligent-living-docs/
    │   ├── README.md
    │   ├── us-001-*.md
    │   └── (more user stories...)
    └── FS-031-external-tool-status-synchronization/
        ├── README.md
        ├── us-001-rich-external-issue-content.md
        ├── us-002-task-level-mapping.md
        └── (5 more user stories...)
```

**❌ WRONG - Do NOT create**:
- `spec.md` files (use README.md instead)
- `user-stories/` subfolders (user stories go directly in FS-* folder)
- Root-level `user-stories/` folder

### Hierarchy Mapping

| SpecWeave | GitHub | Jira | ADO | Description |
|-----------|--------|------|-----|-------------|
| **FS-* (Epic)** | Project/Milestone | Epic | Epic | Strategic feature (20+ user stories) |
| **US-* (User Story)** | Issue | Story | User Story | Detailed requirement (5-10 AC) |
| **T-* (Task)** | Checkbox | Sub-task | Task | Implementation unit (1-4 hours) |

### Automatic Sync Process

**When**: After completing an increment with `/specweave:done`

**How It Works**:
1. **HierarchyMapper** detects which FS-* folder the increment belongs to:
   - **Method 1 (Frontmatter)**: Checks `epic: FS-031` in increment's `spec.md` (100% confidence)
   - **Method 2 (Increment ID)**: Maps `0031-feature` → `FS-031` (90% confidence)
   - **Method 3 (Config)**: Checks explicit mapping in `config.json` (100% confidence)
   - **Fallback**: Auto-creates new FS-* folder if needed (50% confidence)

2. **SpecDistributor** writes files:
   - Epic overview → `FS-031/README.md` (high-level summary, business value, implementation history)
   - User stories → `FS-031/us-001-*.md`, `FS-031/us-002-*.md`, etc. (directly in folder)

**ID Normalization**: Handles both `0031` and `31` → `FS-031` (removes leading zeros, pads to 3 digits)

### Manual Sync (If Needed)

If automatic sync doesn't trigger, run manually:

```bash
# From project root
node -e "import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
  const distributor = new SpecDistributor(process.cwd());
  await distributor.distribute('0031-external-tool-status-sync');
});"
```

### Key Implementation Files

- **`src/core/living-docs/hierarchy-mapper.ts`** - Detects epic folder (400+ lines)
- **`src/core/living-docs/spec-distributor.ts`** - Distributes content to FS-* folders
- **`.specweave/docs/internal/specs/default/README.md`** - Project overview with sync instructions

### User Story Format

Each `us-*.md` file contains:
- **Frontmatter**: `id`, `epic`, `title`, `status`, `priority`, `created`, `completed`
- **Epic Link**: `[SPEC-0031](./README.md)` (links to README.md in same folder)
- **User Story**: "As a... I want... So that..."
- **Acceptance Criteria**: AC-US1-01, AC-US1-02, etc. (with P1/P2 priorities)
- **Implementation**: Links to increment and tasks
- **Business Rationale**: Why this user story matters
- **Related Stories**: Cross-links to other US-*.md files

### Epic Overview Format (README.md)

Each `README.md` contains:
- **Frontmatter**: `id`, `title`, `type: epic`, `status`, `priority`, `created`, `last_updated`, `external_tools`
- **Epic Overview**: High-level feature description
- **Business Value**: Key benefits (bullet points)
- **Implementation History**: Table showing which increments implemented which stories
- **User Stories**: Links to all us-*.md files (grouped by phase)
- **External Tool Integration**: GitHub/Jira/ADO links

### Troubleshooting

**Problem**: Sync creates wrong folder (e.g., FS-0031 instead of FS-031)
**Solution**: ID normalization is already implemented. Rebuild: `npm run build`

**Problem**: Files go to wrong location (root level or wrong subfolder)
**Solution**: Check `userStoriesSubdir` is empty string in HierarchyMapper

**Problem**: Epic not detected
**Solution**: Add `epic: FS-031` to increment's `spec.md` frontmatter

---

## Enterprise Specs Organization

Living docs organized by feature domain (core-framework, integrations, infrastructure, etc.). Six domains, rich YAML metadata, auto-generated indices (by-status, by-domain, by-release, by-priority, by-team). Migration scripts available. See [Organization Strategy](.specweave/docs/internal/specs/ORGANIZATION-STRATEGY.md).

---

## Living Completion Reports

Update reports during work (not at end) for complete audit trail. Log scope changes with `/specweave:update-scope`. Commands: `/specweave:increment` (init), `/specweave:update-scope` (log changes), `/specweave:done` (finalize). See [update-scope.md](plugins/specweave/commands/update-scope.md).

---

## Development Workflow

### Making Changes

**ALL components belong to plugins** (following [Claude Code's plugin system](https://docs.claude.com/en/docs/claude-code/plugins)).

**1. Editing Skills** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave/skills/spec-generator/SKILL.md

# Other plugins (opt-in):
vim plugins/specweave-github/skills/github-sync/SKILL.md

# Skills auto-activate based on description keywords
```

**2. Editing Agents** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave/agents/pm/AGENT.md

# Other plugins (opt-in):
vim plugins/specweave-github/agents/github-manager/AGENT.md

# Test by invoking via Task tool
```

**3. Editing Commands** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave/commands/do.md

# Other plugins (opt-in):
vim plugins/specweave-github/commands/github-sync.md

# Test via /command-name
```

**4. Creating New Plugins** (see "Plugins" section below for complete instructions)

**5. Editing Framework Code** (`src/core/`, `src/cli/`):
```bash
# Edit TypeScript (config manager, plugin loader, etc.)
vim src/core/config-manager.ts

# Build and test
npm run build && npm test
```

### Testing Strategy

**Four Levels of Testing** (mirroring SpecWeave's philosophy):

1. **Specification Tests** (`.specweave/docs/internal/strategy/`)
   - Acceptance criteria in PRDs
   - Manual validation

2. **Embedded Tests** (`.specweave/increments/####/tasks.md`)
   - Test plans embedded in tasks (BDD format)
   - AC-ID traceability (AC-US1-01, AC-US1-02, etc.)

3. **Integration Tests** (`tests/integration/{skill-name}/`)
   - Tests for plugin and skill functionality
   - Tool sync (github, ado, jira)
   - Brownfield detection and other integrations
   - Run via: `npm run test:integration`

4. **Code Tests** (`tests/`)
   - **E2E (Playwright)**: MANDATORY for UI features
     - `tests/e2e/specweave-smoke.spec.ts`
     - Run: `npm run test:e2e`
   - **Integration**: Tool sync, brownfield detection
     - `tests/integration/`
     - Run: `npm run test:integration`
   - **Unit**: Core logic, config parsing
     - `tests/unit/`
     - Run: `npm test`

**Coverage Requirements**:
- Critical paths: 90%+
- Overall: 80%+
- Tests MUST tell the truth (no false positives)

### Hooks and Automation

## Hooks (Automated Workflows)

Hooks live in plugins (`plugins/specweave/hooks/`), auto-discovered via `plugin.json`. No `.claude/` folder needed (global CLI registration). Configure behavior in `.specweave/config.json`. See [Plugin Hook Docs](plugins/specweave/hooks/README.md) and [Claude Code Hooks](https://code.claude.com/docs/en/hooks).

---

**Key Hooks**:
- **post-task-completion**: Smart session-end detection (15s inactivity), sound notification, living docs sync, external tool sync
- **pre-tool-use**: Immediate sound on AskUserQuestion (before task completion)
- **Living docs sync**: Auto-syncs increment specs to `.specweave/docs/internal/specs/` (permanent archive)

Configure via `.specweave/config.json` → `hooks.post_task_completion`. Manual sync: `/specweave:sync-docs`.

**Intelligent Living Docs Sync**: Two modes - Simple (single file) or Intelligent (parses, classifies, distributes by category+project). 9 categories, multi-project support. Enable in `.specweave/config.json` → `livingDocs.intelligent.enabled`. See [Intelligent Living Docs Guide](.specweave/docs/public/guides/intelligent-living-docs-sync.md).

**Enable Intelligent Mode** (`.specweave/config.json`):
```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true
    }
  },
  "livingDocs": {
    "intelligent": {
      "enabled": true,
      "splitByCategory": true,
      "generateCrossLinks": true,
      "preserveOriginal": true,
      "classificationConfidenceThreshold": 0.6,
      "fallbackProject": "default"
    }
  }
}
```

**Result** (Intelligent Mode):
```
✅ BEFORE (Simple Mode):
.specweave/docs/internal/specs/spec-0016-authentication.md  (5,000 lines, mixed content)

✅ AFTER (Intelligent Mode):
.specweave/docs/internal/
├── specs/backend/
│   ├── us-001-backend-api-auth.md        (User Story + Docusaurus frontmatter)
│   ├── us-002-session-management.md      (User Story + Cross-links)
│   ├── _archive/spec-0016-authentication.md  (Original preserved)
│   └── README.md                         (Auto-generated project index)
├── architecture/
│   ├── authentication-flow.md            (HLD)
│   └── adr/0001-oauth-vs-jwt.md          (ADR)
├── operations/
│   ├── runbook-auth-service.md           (Runbook)
│   └── slo-auth-availability.md          (SLO)
├── delivery/
│   └── test-strategy-authentication.md   (Test Strategy)
└── strategy/
    └── auth-business-requirements.md     (Business Requirements)
```

**Classification System** (9 Categories):

| Category | Detects | Goes To |
|----------|---------|---------|
| **User Story** | US-XXX pattern, "As a" format, AC | `specs/{project}/` |
| **NFR** | NFR-XXX pattern, metrics, SLAs | `specs/{project}/nfr/` |
| **Architecture** | HLD, LLD, diagrams | `architecture/` |
| **ADR** | ADR-XXX pattern, decision structure | `architecture/adr/` |
| **Operations** | Runbooks, SLOs | `operations/` |
| **Delivery** | Test strategy, release plans | `delivery/` |
| **Strategy** | Business requirements, PRDs | `strategy/` |
| **Governance** | Security, compliance | `governance/` |
| **Overview** | Summaries | `specs/{project}/` |

**Project Detection** (Multi-Project Support):

Intelligent sync detects which project (backend/frontend/mobile) via:
- Increment name contains project ID (e.g., `0016-backend-auth`) → +10 points
- Frontmatter `project:` field → +20 points (highest)
- Team name match → +5 points
- Keyword match → +3 points each
- Tech stack match → +2 points each

**Example**:
```yaml
---
title: User Authentication
project: backend    # ← Explicit project (100% confidence)
---

# User Authentication

Quick overview: Implement OAuth for **backend services** using Node.js...
# Keywords: backend, service, Node.js → detected!
```

**Multi-Project Setup** (`.specweave/config.json`):
```json
{
  "multiProject": {
    "projects": {
      "backend": {
        "name": "Backend Services",
        "keywords": ["api", "backend", "service"],
        "techStack": ["Node.js", "PostgreSQL"]
      },
      "frontend": {
        "name": "Frontend App",
        "keywords": ["ui", "frontend", "react"],
        "techStack": ["React", "Next.js"]
      }
    }
  }
}
```

**Result**: Content distributed to `specs/backend/` and `specs/frontend/` automatically!

**Docusaurus Frontmatter** (Auto-Generated):

Every distributed file gets rich frontmatter for LLM context:

```yaml
---
id: us-001-user-login
title: "US-001: User Login"
sidebar_label: "User Login"
description: "User can log in with email and password"
tags: ["user-story", "backend", "authentication"]
increment: "0016-authentication"
project: "backend"                    # ← LLM knows which project
category: "user-story"                # ← LLM knows document type
last_updated: "2025-11-10"
status: "planning"
priority: "P1"
---
```

**Cross-Linking** (Bidirectional):

Intelligent sync generates "Related Documents" sections:

```markdown
## Related Documents

### Implements
- [Authentication Architecture](../../architecture/auth-flow.md)

### References
- [ADR-001: OAuth vs JWT](../../architecture/adr/0001-oauth-vs-jwt.md)

### Defined In
- [Business Requirements](../../strategy/auth-requirements.md)
```

**Benefits of Intelligent Mode**:
- ✅ **Better organization**: Content organized by type and project
- ✅ **Easier navigation**: Find docs quickly (specs vs architecture vs operations)
- ✅ **LLM-friendly**: Rich context (project, category, tags) for AI assistants
- ✅ **Cross-linked**: Related documents automatically connected
- ✅ **Docusaurus-ready**: Frontmatter works out-of-the-box
- ✅ **Multi-project**: Separate docs for backend/frontend/mobile
- ✅ **Traceability**: Footer shows source increment and last updated

**Performance**:
- Fast: ~10-50ms to parse, classify, and distribute
- Async: Runs in background (non-blocking)
- Fallback: Falls back to simple mode on error

**User Guide**: `.specweave/docs/public/guides/intelligent-living-docs-sync.md`
**Architecture**: `.specweave/docs/internal/architecture/adr/0030-intelligent-living-docs-sync.md`

---

**🔧 HOOKS ARCHITECTURE CHANGES (v0.13.0)**

**What Changed**: External tool sync logic (GitHub, JIRA, Azure DevOps) has been **moved from core plugin to respective plugin hooks** to follow Claude Code's native plugin architecture.

**Before (v0.12.x)**:
```
Core hook: plugins/specweave/hooks/post-task-completion.sh (452 lines)
├── Core concerns (sound, living docs, translation)
├── GitHub sync (107 lines)    ← Embedded in core!
├── JIRA sync (11 lines)        ← Embedded in core!
└── Azure DevOps sync (11 lines) ← Embedded in core!
```

**After**:
```
Core hook: plugins/specweave/hooks/post-task-completion.sh (330 lines)
├── Core concerns ONLY (sound, living docs, translation, reflection)

GitHub plugin: plugins/specweave-github/hooks/post-task-completion.sh (241 lines)
├── GitHub API calls, issue updates, progress comments

JIRA plugin: plugins/specweave-jira/hooks/post-task-completion.sh (150 lines)
├── JIRA API calls, issue status updates

ADO plugin: plugins/specweave-ado/hooks/post-task-completion.sh (150 lines)
├── Azure DevOps API calls, work item updates
```

**Benefits**:
- ✅ **27% smaller core hook** (452 → 330 lines)
- ✅ **No external tool dependencies** in core plugin (no gh CLI, JIRA API, ADO API)
- ✅ **Optional plugins** (GitHub sync only runs if `specweave-github` installed)
- ✅ **Independent testing** (test each hook in isolation)
- ✅ **Parallel execution** (Claude Code runs all hooks concurrently)

**How Claude Code's Hook System Works**:
1. Task completes → `TodoWrite` tool fires
2. Claude Code triggers `PostToolUse` event
3. **ALL registered plugin hooks fire in parallel**:
   - Core hook: Sound + Living docs + Translation + Reflection
   - GitHub hook: Update issue checkboxes (if installed)
   - JIRA hook: Update issue status (if installed)
   - ADO hook: Update work item (if installed)

**Key Insight**: Each plugin registers its own hooks via `hooks.json`, enabling clean modularity and separation of concerns.

**Migration**: No action needed! Existing increments with GitHub/JIRA/ADO links will continue to sync automatically.

**Documentation**:
- **Architecture Analysis**: `.specweave/increments/0018-strict-increment-discipline-enforcement/reports/HOOKS-ARCHITECTURE-ANALYSIS.md`
- **Core Plugin Hooks**: `plugins/specweave/hooks/README.md`
- **GitHub Plugin Hooks**: `plugins/specweave-github/hooks/README.md`
- **JIRA Plugin Hooks**: `plugins/specweave-jira/hooks/README.md`
- **ADO Plugin Hooks**: `plugins/specweave-ado/hooks/README.md`

---

**Post-Increment-Planning Hook** (AUTOMATIC after `/specweave:increment`):

**GitHub Issue Auto-Creation**:

**The Critical Problem**: Without automatic GitHub issue creation, increments don't sync to GitHub automatically. This requires manual `/specweave-github:create-issue` calls, which are often forgotten.

**The Solution**: The `post-increment-planning.sh` hook now auto-creates GitHub issues immediately after increment planning completes.

**Issue Title Format** (IMPORTANT):

SpecWeave uses **date-based naming** for GitHub issues to match the Epic folder structure:

| Context | Format | Example | Code Location |
|---------|--------|---------|---------------|
| **Increment Issue** | `[FS-YY-MM-DD] Title` | `[FS-25-11-12] External Tool Status Sync` | `post-increment-planning.sh` (line 409) |
| **Epic/Spec Issue** | `[FS-NNN] Title` | `[FS-031] External Tool Status Sync` | `github-epic-sync.ts` (line 540) |

**Legacy Format** (deprecated): `[INC-0031]` - No longer used in codebase!

The date format (`FS-YY-MM-DD`) is extracted from `metadata.json` creation date and matches the Epic folder naming convention in `.specweave/docs/internal/specs/default/FS-YY-MM-DD-feature-name/`.

**How It Works** (Automatic):
1. **Hook Triggers**: After `/specweave:increment` completes planning (spec.md, plan.md, tasks.md created)
2. **Auto-Create Check**: Checks if `config.sync.settings.autoCreateIssue` is enabled
3. **GitHub CLI Available**: Verifies `gh` CLI is installed and authenticated
4. **Issue Creation**:
   - Extracts title from spec.md frontmatter (`title: "..."`)
   - Extracts summary from "Quick Overview" section
   - Generates task checklist from tasks.md (all tasks as GitHub checkboxes)
   - Calls `gh issue create` with proper labels (`specweave`, `increment`)
   - Parses output to get issue number
5. **Metadata Update**: Creates/updates `.metadata.json` with GitHub issue number and URL
6. **Result**: Increment is now linked to GitHub issue for bidirectional sync!

**Configuration** (`.specweave/config.json`):
```json
{
  "sync": {
    "settings": {
      "autoCreateIssue": true,  // ✅ Enable auto-creation!
      "syncDirection": "bidirectional"
    },
    "activeProfile": "specweave-dev",
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        }
      }
    }
  }
}
```

**What Gets Created**:
```markdown
# [INC-0016] AI Self-Reflection System

**Status**: Planning → Implementation
**Priority**: P1
**Increment**: 0016-self-reflection-system

## Summary

Add AI self-reflection capabilities inspired by Kimi model...

## Tasks

Progress: 0/30 tasks (0%)

- [ ] T-001: Create Reflection Configuration Schema
- [ ] T-002: Create Configuration Loader
- [ ] T-003: Create Git Diff Analyzer
... (all 30 tasks)

## Links

- **Spec**: `spec.md`
- **Plan**: `plan.md`
- **Tasks**: `tasks.md`

---

🤖 Auto-created by SpecWeave | Updates automatically on task completion
```

**Error Handling** (Robust):
- ✅ **Missing files**: Graceful fallback if spec.md or tasks.md missing
- ✅ **Title extraction**: Multiple fallbacks (frontmatter → heading → increment ID)
- ✅ **Overview extraction**: Tries "Quick Overview", "Summary", or first paragraph
- ✅ **Task count**: Extracts from frontmatter or counts tasks
- ✅ **GitHub CLI failures**: Non-blocking (logs error, continues)
- ✅ **Duplicate prevention**: Checks metadata.json for existing issue number
- ✅ **Repository detection**: Auto-detects from git remote or config

**Manual Override** (When Needed):
```bash
# Disable auto-create for one increment
# Just don't set autoCreateIssue in config

# Or create manually if auto-create failed
/specweave-github:create-issue 0016

# Check if issue was created
cat .specweave/increments/0016-self-reflection-system/metadata.json
# Should show: "github": {"issue": 30, "url": "..."}
```

**Why This Matters**:
- ✅ **Zero manual work**: Issues auto-create on every increment
- ✅ **Immediate tracking**: Increment linked to GitHub from start
- ✅ **Bidirectional sync**: Task completion updates GitHub automatically
- ✅ **Team visibility**: Stakeholders see progress in GitHub without asking
- ✅ **Audit trail**: All increments tracked in one place
- ✅ **DORA metrics**: Automatic deployment frequency tracking

**Workflow Example**:
```bash
# 1. Create increment
/specweave:increment "AI self-reflection system"

# 2. Hook auto-fires:
# 🔗 Checking GitHub issue auto-creation...
#   📦 Auto-create enabled, checking for GitHub CLI...
#   ✓ GitHub CLI found
#   🚀 Creating GitHub issue for 0016-self-reflection-system...
#   📝 Issue #30 created
#   🔗 https://github.com/anton-abyzov/specweave/issues/30
#   ✅ metadata.json updated

# 3. Start work
/specweave:do

# 4. Complete tasks → GitHub updates automatically via post-task-completion hook!
```

**Requirements**:
- GitHub CLI (`gh`) installed and authenticated (`gh auth login`)
- Repository with GitHub remote configured
- `autoCreateIssue: true` in config.json
- Write permissions to repository

---

**✅ Metadata Validation & Fallback Creation**:

**The Problem**: Hook failures (no GitHub CLI, network issues, permission problems) left increments without metadata.json, breaking status line, WIP limits, and external sync.

**The Solution**: Multi-layer validation ensures 100% metadata.json coverage.

**How It Works**:

**Layer 1: Hook Fallback** (Automatic)
- After GitHub issue creation (success or fail)
- Hook validates metadata.json exists
- If missing → creates minimal metadata automatically
- User sees warning + manual fix instructions

```bash
# Hook output example (GitHub CLI not found):
🔗 Checking GitHub issue auto-creation...
  ⚠️  GitHub CLI (gh) not found, skipping issue creation

🔍 Validating metadata.json existence...
  ⚠️  metadata.json not found (hook may have failed)
  📝 Creating minimal metadata as fallback...
  ✅ Created minimal metadata.json
  ⚠️  Note: No GitHub issue linked
  💡 Run /specweave-github:create-issue 0023-feature to create one manually
```

**Layer 2: PM Agent Validation** (Automatic)
- PM agent checks metadata.json after creating spec/plan/tasks
- If missing → creates minimal metadata + warns user
- Shows GitHub issue status (linked or not)

```markdown
✅ Increment validation passed - metadata.json exists
   ✅ GitHub issue #45 linked
   🔗 https://github.com/anton-abyzov/specweave/issues/45
```

**Layer 3: Lazy Initialization** (Fallback)
- `MetadataManager.read()` creates metadata on first access
- Used by `/specweave:status`, `/pause`, `/resume` commands
- Creates basic metadata but WITHOUT GitHub info

**Minimal Metadata Format** (when GitHub fails):
```json
{
  "id": "0023-release-management-enhancements",
  "status": "active",
  "type": "feature",
  "created": "2025-11-11T15:43:00Z",
  "lastActivity": "2025-11-11T15:43:00Z"
}
```

**Full Metadata Format** (when GitHub succeeds):
```json
{
  "id": "0016-self-reflection-system",
  "status": "active",
  "type": "feature",
  "created": "2025-11-10T12:00:00Z",
  "lastActivity": "2025-11-10T12:00:00Z",
  "github": {
    "issue": 30,
    "url": "https://github.com/anton-abyzov/specweave/issues/30",
    "synced": "2025-11-10T12:00:00Z"
  },
  "githubProfile": "specweave-dev"
}
```

**Benefits**:
- ✅ **100% coverage**: Every increment gets metadata.json (no silent failures)
- ✅ **Immediate feedback**: User knows if GitHub issue creation failed
- ✅ **Graceful degradation**: Creates minimal metadata as fallback
- ✅ **Clear next steps**: Shows manual fix command if needed
- ✅ **Status line works**: Even without GitHub integration
- ✅ **WIP limits work**: Counts active increments correctly

**Configuration Note**:

The old config key `hooks.post_increment_planning.auto_create_github_issue` is **deprecated**.

```json
{
  "hooks": {
    "post_increment_planning": {
      // ❌ REMOVED (deprecated)
      // "auto_create_github_issue": false
    }
  },
  "sync": {
    "settings": {
      "autoCreateIssue": true  // ✅ Use this instead
    }
  }
}
```

**Single source of truth**: `sync.settings.autoCreateIssue`

---

## Status Line Feature

<1ms render, auto-updates after tasks, multi-window support, external edit detection. Shows most recent increment progress. See [Status Line Guide](https://spec-weave.com/docs/learn/status-line).

---

## Plugins

**SpecWeave is built 100% on [Claude Code's native plugin system](https://docs.claude.com/en/docs/claude-code/plugins)**.

### Architecture: Everything is a Plugin

**Critical Understanding**: SpecWeave doesn't have a "core framework" separate from plugins. Instead:

```
SpecWeave = Collection of Claude Code Plugins
├── specweave (auto-installed) ← The "framework" IS a plugin
├── specweave-github (auto-installed)
├── specweave-figma (auto-installed)
└── ...all 19+ plugins (auto-installed)
```

**What this means**:
- ✅ `specweave` is a Claude Code plugin (happens to auto-load)
- ✅ All plugins follow identical structure (`.claude-plugin/plugin.json`, `skills/`, `agents/`, `commands/`)
- ✅ Adding a skill = adding it to a plugin (always)
- ❌ There are NO "core framework components" outside plugins

**Why this matters**:
- Uniform architecture (no special cases)
- All plugins discoverable via Claude Code's plugin system
- Easy to extend (just add another plugin)
- Future-proof (follows Anthropic's standards)

**Further reading**:
- 📖 [Claude Code Plugin Docs](https://docs.claude.com/en/docs/claude-code/plugins)
- 📖 [Plugin Reference](https://docs.claude.com/en/docs/claude-code/plugins-reference)
- 📖 [Plugin Marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)

### Available SpecWeave Plugins

**Location**: `plugins/` (root level)

**Discovery**:
- Browse all plugins: `ls plugins/` or check [.claude-plugin/marketplace.json](/.claude-plugin/marketplace.json)
- Live catalog: See `.claude-plugin/README.md` for current marketplace contents
- **All plugins automatically installed** during `specweave init` (no manual selection needed)

**Plugin Structure** (all follow same pattern):
```
plugins/specweave-{name}/
├── .claude-plugin/plugin.json  # Claude native manifest
├── skills/                     # Auto-activating capabilities (SKILL.md files)
├── agents/                     # Specialized AI agents (AGENT.md files)
├── commands/                   # Slash commands (.md files)
└── lib/                        # TypeScript utilities (optional)
```

**Key Plugins** (for reference - all auto-installed):
- `specweave` - Framework essentials
- `specweave-github` - GitHub Issues integration
- `specweave-{frontend|backend|infrastructure}` - Tech stack plugins

**For complete list**: Check `plugins/` directory or marketplace.json

### Plugin Decision Tree

**Key Insight**: In Claude Code's plugin system, EVERYTHING is a plugin. The only question is: **Which plugin does this belong to?**

**Decision**: Which plugin should contain this feature?

```
Is this feature...
├─ Used by EVERY project? → specweave (auto-loaded)
│  Examples: increment-planner, spec-generator, tdd-workflow, PM/Architect agents
│
├─ Part of increment lifecycle? → specweave (auto-loaded)
│  Examples: /specweave:increment, /specweave:do, living docs hooks
│
├─ Tech stack specific? → New plugin: specweave-{stack}
│  Examples: specweave-frontend (React, Next.js), specweave-kubernetes
│
├─ Domain expertise? → New plugin: specweave-{domain}
│  Examples: specweave-ml (TensorFlow), specweave-payments (Stripe)
│
├─ External integration? → New plugin: specweave-{tool}
│  Examples: specweave-github, specweave-jira, specweave-figma
│
└─ Optional enhancement? → New plugin: specweave-{feature}
   Examples: specweave-diagrams, specweave-cost-optimizer
```

**Plugin Structure** (all follow Claude Code's standard):
```
plugins/specweave-{name}/
├── .claude-plugin/plugin.json  # Required
├── skills/                     # Optional
├── agents/                     # Optional
├── commands/                   # Optional
└── hooks/                      # Optional
```

**Result**: Core plugin stayed at ~12K tokens (75% smaller than v0.3.7!)

### Plugin Manifest Validation Rules

**CRITICAL**: Claude Code enforces strict validation on plugin.json manifests. Follow these rules to avoid loading errors:

#### Required Format

```json
{
  "name": "specweave-plugin-name",
  "description": "What it does and when to use it",
  "version": "1.0.0",
  "author": {
    "name": "Author Name",
    "url": "https://example.com"
  },
  "repository": "https://github.com/owner/repo",
  "homepage": "https://example.com",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

#### Validation Rules

| Field | Type | Rules | Example |
|-------|------|-------|---------|
| **name** | string | Required, lowercase, hyphens only | `"specweave-github"` |
| **description** | string | Required, max 1024 chars | `"GitHub integration..."` |
| **version** | string | Required, semver format | `"1.0.0"` |
| **author** | object | Required, with name field | `{"name": "Team"}` |
| **repository** | string | Must be string, NOT object | `"https://github.com/..."` ✅ |
| **keywords** | array | Optional, array of strings | `["github", "sync"]` |
| **homepage** | string | Optional, URL | `"https://spec-weave.com"` |
| **license** | string | Optional, SPDX identifier | `"MIT"` |

#### Common Validation Errors

**❌ repository: Expected string, received object**
```json
// WRONG
"repository": {
  "type": "git",
  "url": "https://github.com/..."
}

// CORRECT
"repository": "https://github.com/..."
```

**❌ Unrecognized key(s): 'engines', 'dependencies'**
```json
// WRONG - These are NPM fields, not Claude plugin fields
"engines": {"node": ">=18.0.0"},
"dependencies": {"specweave": ">=0.14.0"}

// CORRECT - Omit these fields entirely
// Claude plugins don't support dependency declaration
```

**❌ skills/agents/commands: Invalid input**
```json
// WRONG - Directory references not supported in plugin.json
"skills": "skills",
"agents": "agents",
"commands": "commands"

// CORRECT - Omit these fields entirely
// Claude Code auto-discovers skills/, agents/, commands/ by convention
```

#### Auto-Discovery vs Explicit Declaration

**Claude Code auto-discovers components by directory convention**:
- `skills/` directory → auto-discovered (no plugin.json field needed)
- `agents/` directory → auto-discovered (no plugin.json field needed)
- `commands/` directory → auto-discovered (no plugin.json field needed)
- `hooks/hooks.json` → auto-discovered (no plugin.json field needed)

**Example: Working plugin.json**
```json
{
  "name": "specweave-github",
  "description": "GitHub integration",
  "version": "1.0.0",
  "author": {"name": "SpecWeave Team"},
  "repository": "https://github.com/anton-abyzov/specweave",
  "license": "MIT",
  "keywords": ["github", "sync"]
}
```

**Directory structure** (auto-discovered):
```
plugins/specweave-github/
├── .claude-plugin/
│   └── plugin.json          ← Plugin metadata only
├── skills/                  ← Auto-discovered
│   └── github-sync/
├── agents/                  ← Auto-discovered
│   └── github-manager/
├── commands/                ← Auto-discovered
│   └── github-sync.md
└── hooks/
    ├── hooks.json           ← Auto-discovered
    └── post-task-completion.sh
```

#### Quick Validation Checklist

Before committing a new plugin:
- [ ] repository is a string, not an object
- [ ] No NPM-specific fields (engines, dependencies)
- [ ] No directory references in plugin.json (skills, agents, commands, hooks)
- [ ] Valid JSON syntax (use `jq . < plugin.json` to validate)
- [ ] Test with: `/plugin marketplace add ./.claude-plugin && /plugin install plugin-name`

### Adding a New Plugin (Contributors)

**Create New Plugin**:
```bash
# 1. Create plugin structure
mkdir -p plugins/specweave-myplugin/{.claude-plugin,skills,agents,commands,lib}

# 2. Create plugin.json (Claude native format)
cat > plugins/specweave-myplugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "specweave-myplugin",
  "description": "What it does and when to use it",
  "version": "1.0.0",
  "author": {"name": "Your Name"},
  "repository": "https://github.com/anton-abyzov/specweave",
  "homepage": "https://spec-weave.com",
  "license": "MIT",
  "keywords": ["specweave", "plugin"]
}
EOF

# 3. Add components (see Claude docs for format):
# - skills/my-skill/SKILL.md
# - agents/my-agent/AGENT.md
# - commands/my-command.md
# - lib/my-utility.ts (optional)

# 4. Add to marketplace
vim .claude-plugin/marketplace.json
# Add entry:
# {
#   "name": "specweave-myplugin",
#   "description": "What it does and when to use it",
#   "source": "../plugins/specweave-myplugin"
# }

# 5. Test locally
/plugin marketplace add ./.claude-plugin
/plugin install specweave-myplugin
```

**See**: [.claude-plugin/README.md](/.claude-plugin/README.md) for marketplace documentation

---

## Multi-Project Sync Architecture

**SpecWeave supports syncing increments to unlimited external repositories** (GitHub, JIRA, Azure DevOps) with intelligent rate limiting and time range filtering.

**Quick Summary**:
- ✅ **Local is source of truth** - `.specweave/` → External tools (mirrors)
- ✅ **3-layer architecture** - Credentials → Profiles → Per-increment metadata
- ✅ **Unlimited profiles** - Frontend → repo-A, Backend → repo-B, Client-C → repo-C
- ✅ **Smart project detection** - Auto-selects profile based on keywords
- ✅ **Time range filtering** - 1W/1M/3M/6M/ALL (prevents rate limit issues)
- ✅ **Rate limit protection** - Pre-flight validation, safe thresholds

**Example**:
```bash
# Interactive sync (selects time range)
/specweave-github:sync 0004

# Specify time range (recommended: 1M)
/specweave-github:sync 0004 --time-range 1M
```

**For complete architecture, configuration, profiles, project contexts, and time range filtering**: See [Multi-Project Sync Architecture](https://spec-weave.com/docs/integrations/multi-project-sync) (comprehensive guide with 3-layer architecture, rate limiting, smart detection, and migration guide)

---

## Key SpecWeave Principles (for Contributors)

### 1. Source of Truth Discipline
- `src/` is ALWAYS the source of truth
- `.claude/` is ALWAYS installed/generated (never edit directly)
- Keep root folder clean (use increment folders)

### 2. Documentation = Code
- All changes must update relevant documentation
- ADRs for architecture decisions
- RFCs for feature proposals
- Inline code comments for complex logic

### 3. Testing is Non-Negotiable
- E2E tests MANDATORY for UI features (Playwright)
- 80%+ coverage for critical paths
- Tests must tell the truth (no false positives)

### 4. Incremental Development
- Work in small, measurable increments
- Use SpecWeave's own workflow (`/specweave:increment`, `/specweave:do`, etc.)
- All work traces back to specs

### 5. Adapter-First Design
- Core framework must be tool-agnostic
- Tool-specific features in adapters only
- Plain Markdown + YAML = maximum portability

---

## Release Process

### Versioning Strategy

**IMPORTANT**: SpecWeave follows semantic versioning (semver), but version bumps are **MANUAL** and controlled:

**The Rules**:
- ✅ **Patch version** (0.7.X) - Increment ONLY when explicitly requested by maintainer
- ✅ **Minor version** (0.X.0) - Increment ONLY when maintainer says to
- ✅ **Major version** (X.0.0) - Increment ONLY when maintainer says to
- ❌ **NEVER auto-increment** versions after each increment completion

**Why Manual Control?**
- Multiple increments may be part of the same release (e.g., 0.7.0 = increments 0006 + 0007 + 0008)
- Version bumps signal user-facing releases, not internal development progress
- Maintainer decides when features are ready to ship
- Prevents version number inflation (e.g., jumping from 0.7.0 to 0.12.0 in one day)

**When Completing Increments**:
```bash
# ❌ WRONG - Don't auto-bump version
git commit -m "feat: complete increment 0008"
npm version patch  # ❌ NO! Wait for maintainer approval

# ✅ CORRECT - Just commit the work
git commit -m "feat: complete increment 0008"
# Version stays at 0.7.0 until maintainer says to bump
```

**When Maintainer Requests Version Bump**:
```bash
# Maintainer says: "Bump to 0.7.1"
npm version patch  # ✅ Now bump
npm publish        # ✅ And publish

# Maintainer says: "Bump to 0.8.0"
npm version minor  # ✅ New minor version
npm publish
```

**Summary**: Complete increments → commit code → maintainer decides when to bump version and publish.

---

### Release Process (Automated via GitHub Actions)

**CRITICAL**: GitHub releases and NPM versions MUST ALWAYS be in sync!

**Automated Release Workflow** (`.github/workflows/release.yml`):

The release process is fully automated via GitHub Actions. To publish a new version:

1. **Update CHANGELOG.md** first (manually):
   ```bash
   vim CHANGELOG.md
   # Add new version section with release notes
   # Commit: git commit -m "docs: update changelog for v0.8.19"
   ```

2. **Trigger GitHub Actions Workflow**:
   - Go to: https://github.com/anton-abyzov/specweave/actions/workflows/release.yml
   - Click "Run workflow"
   - Select branch: `develop`
   - Enter version: e.g., `0.8.19`
   - Select version type: `patch`, `minor`, or `major`
   - Click "Run workflow"

3. **What the workflow does automatically**:
   - ✅ Runs tests (`npm test`)
   - ✅ Builds project (`npm run build`)
   - ✅ Bumps version in `package.json`
   - ✅ Verifies version matches input
   - ✅ Extracts release notes from CHANGELOG.md
   - ✅ Commits version bump
   - ✅ Creates and pushes git tag (`v0.8.19`)
   - ✅ **Publishes to NPM** (with provenance)
   - ✅ **Creates GitHub Release** (with CHANGELOG notes)
   - ✅ Notifies success/failure

**Result**: NPM package and GitHub release are created together atomically.

**Manual Release (Emergency Only)**:
```bash
# Only if GitHub Actions is down or fails
# 1. Update version
npm version patch|minor|major

# 2. Build and test
npm run build && npm test && npm run test:e2e

# 3. Publish to NPM
npm publish --provenance --access public

# 4. Create GitHub release
gh release create v$(node -p "require('./package.json').version") \
  --title "v$(node -p "require('./package.json').version")" \
  --notes-file /tmp/release-notes.md

# 5. Push tags
git push origin develop --tags
```

**Installation Methods**:
1. **NPM**: `npm install -g specweave`
2. **Script**: `curl -fsSL https://spec-weave.com/install.sh | bash`
3. **Manual**: Clone repo, `npm install`, `npm run build`

---

## Adapter System (Legacy)

**SpecWeave is Claude Code-first** - The framework is designed specifically for Claude Code's native capabilities.

**Primary Tool**:
- ✅ **Claude Code** - Native support (slash commands, agents, skills, hooks, MCP)

**Legacy Multi-Tool Support** (may be removed):
- ⚠️  Cursor (via `.cursorrules` + AGENTS.md compilation)
- ⚠️  Generic (via AGENTS.md, for Copilot/ChatGPT/Gemini/etc.)

**Why Claude-First?**
The adapter system was originally designed to support multiple tools, but this added significant complexity without meaningful benefit. Claude Code provides:
- ✅ **Native plugin marketplace** - No compilation needed
- ✅ **Auto-activating skills** - No manual @ mentions
- ✅ **Isolated agent contexts** - True role separation
- ✅ **Pre/post lifecycle hooks** - Automated living docs sync
- ✅ **MCP protocol** - Industry standard for context management

Other tools simply can't match these capabilities. The adapters remain in the codebase for now but are considered legacy and may be removed in a future version.

**See**: "Why Claude Code is Best-in-Class" section above for detailed comparison

---

## Common Tasks

### Adding Skills, Agents, or Commands

**All components go into plugins** (see "Plugins" section above for complete instructions).

**Quick reference**:
- **Core components**: `plugins/specweave/{skills|agents|commands|hooks}/`
- **Plugin components**: `plugins/specweave-{name}/{skills|agents|commands}/`
- **Tests**: `tests/integration/{component-name}/` or `tests/unit/`

**For detailed instructions**: See "Adding a New Plugin (Contributors)" section above

### Update Documentation

```bash
# Internal docs (architecture, ADRs, RFCs)
vim .specweave/docs/internal/architecture/hld-system.md

# Public docs (user-facing guides, can be published)
vim .specweave/docs/public/guides/user-guide.md
vim docs-site/docs/guides/getting-started.md

# Build docs site
cd docs-site && npm run build
```

### Translation Workflow

Two-phase post-generation: Phase 1 (increment files), Phase 2 (ADRs/HLDs). 9 languages, ~$0.02/increment, 100% auto. See [Translation Guide](https://spec-weave.com/docs/learn/translation).

---

## Troubleshooting

**Skills not activating?**
1. Check plugin is installed: `/plugin list --installed`
2. Verify YAML frontmatter in `plugins/{plugin}/skills/{skill}/SKILL.md`
3. Restart Claude Code
4. Check description has clear trigger keywords

**Commands not working?**
1. Check plugin is installed: `/plugin list --installed`
2. Verify command exists: `plugins/{plugin}/commands/{command}.md`
3. Check YAML frontmatter
4. Restart Claude Code

**Tests failing?**
1. Run `npm run build` first
2. Check test output for specific errors
3. Verify test data in `tests/fixtures/`
4. Check Playwright browser install: `npx playwright install`

**Root folder polluted?**
1. Identify which increment created the files
2. Move to `.specweave/increments/####/reports/`
3. Update `.gitignore` if needed

**Plugin hooks not working? (Development Setup)**

**Symptom 1**: Errors like `"post-task-completion.sh: No such file or directory"` after TodoWrite
**Symptom 2**: `✘ Plugin 'specweave' not found in marketplace 'specweave'`

**Root Cause**: Two common issues:
1. **No symlink**: Directory doesn't exist at `~/.claude/plugins/marketplaces/specweave`
2. **No registration**: Marketplace not registered with Claude Code (common after updates/restarts)

**The Key Insight**:
- ✅ **Symlink**: Creates directory structure for hooks
- ✅ **Registration**: Tells Claude Code where to find plugins
- ⚠️ **Both required**: Having one without the other breaks functionality!

**🚀 Automated Setup (Recommended)**:

```bash
# Run smart setup script (auto-detects and fixes BOTH issues)
./scripts/setup-dev-plugins.sh

# What it does:
# 1. Detects environment (local vs VM)
# 2. Creates/verifies symlink
# 3. ✨ NEW: Checks marketplace registration
# 4. ✨ NEW: Auto-registers if missing
# 5. Installs core plugins
# 6. Verifies everything works
```

**Environment Detection**:
- **Local machine** → Symlink + Registration (instant updates)
- **claude.ai/code VM** → GitHub marketplace (reliable, auto-clones)
- **Codespaces/Gitpod** → GitHub marketplace (cloud-friendly)

**Manual Fix (If Script Fails)**:

**Step 1: Check Registration**
```bash
# See if marketplace is registered
claude plugin marketplace list

# If empty or no "specweave" → Need to register!
```

**Step 2: Fix Registration**
```bash
# Register marketplace (use PROJECT ROOT, not .claude-plugin!)
claude plugin marketplace add /Users/antonabyzov/Projects/github/specweave

# OR from within project:
cd /path/to/specweave
claude plugin marketplace add $(pwd)

# Verify it worked
claude plugin marketplace list
# Should show: ❯ specweave (Source: Directory /path/to/specweave)
```

**Step 3: Install Plugins**
```bash
# Now plugins should install successfully
claude plugin install specweave
claude plugin install specweave-github
claude plugin install specweave-jira
claude plugin install specweave-ado
```

**Alternative: Use GitHub Marketplace** (VM/Cloud)
```bash
# Remove local marketplace
claude plugin marketplace remove specweave

# Add from GitHub (like production users)
claude plugin marketplace add anton-abyzov/specweave

# Install plugins (should work immediately)
claude plugin install specweave
claude plugin install specweave-github
```

**Benefits**:
- ✅ **Local + Registration**: Instant updates + Plugin installation works
- ✅ **VM (GitHub)**: Always reliable, no registration issues
- ✅ **Automated script**: Handles both symlink AND registration
- ✅ **Self-healing**: Re-running script fixes broken registrations

**Why This Matters**:
- **Production users**: No issue (GitHub marketplace via `specweave init`)
- **Contributors**: Need both symlink AND registration (script handles it)
- **After Claude Code updates**: Registration can be lost (script detects and fixes)

**Documentation**: See `.specweave/increments/0030-intelligent-living-docs/reports/MARKETPLACE-REGISTRATION-FIX.md` for complete analysis

---

## Getting Help

**Documentation**:
- User docs: https://spec-weave.com
- Contributor docs: `.specweave/docs/internal/`
- Architecture: `.specweave/docs/internal/architecture/`

**Community**:
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Discussions: https://github.com/anton-abyzov/specweave/discussions

**Current Increment**:
- Spec: `.specweave/increments/0002-core-enhancements/spec.md`
- Plan: `.specweave/increments/0002-core-enhancements/plan.md`
- Tasks: `.specweave/increments/0002-core-enhancements/tasks.md`

---

## Quick Reference

**Commands (for SpecWeave development)**:

**IMPORTANT**: All commands MUST use the `/specweave:*` namespace prefix to avoid conflicts with Claude Code's native commands.

*Primary commands*:
- `/specweave:increment "feature"` - Plan new increment
- `/specweave:do` - Execute tasks (smart resume)
- `/specweave:done 0002` - Close increment
- `/specweave:validate 0002` - Validate increment
- `/specweave:qa 0002` - Quality assessment with risk scoring
- `/specweave:status` - Show increment status overview
- `/specweave:progress` - Check current increment progress
- `/specweave:check-tests` - Validate test coverage (NEW format)

*State management (mostly automatic)*:
- `/specweave:pause 0002 --reason="..."` - Pause active increment
- `/specweave:resume 0002` - Resume paused increment
- `/specweave:abandon 0002 --reason="..."` - Abandon increment

*Documentation sync*:
- `/specweave:sync-docs update` - Sync living docs after implementation
- `/specweave:sync-tasks` - Sync tasks with completion status

*Other commands*:
- `/specweave:costs` - Show AI cost dashboard
- `/specweave:translate` - Translate content
- `/specweave:update-scope` - Log scope changes
- `/specweave:next` - Smart increment transition

**NO SHORTCUTS**: Do NOT use shortcuts like `/inc`, `/do`, `/pause`, `/resume` etc. They conflict with Claude Code's native commands and will break functionality.

**File naming**: All commands are `specweave-{name}.md` (e.g., `specweave-increment.md`)

**Build & Test**:
- `npm run build` - Compile TypeScript
- `npm test` - Run unit tests (includes skill tests in `tests/unit/`, `tests/integration/`)
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:integration` - Run integration tests

**File Structure**:
- Source of truth: `src/` (TypeScript) and `plugins/` (skills/agents/commands)
- Marketplace: GLOBAL (via CLI, not per-project files)
- Increments: `.specweave/increments/`
- Internal Docs: `.specweave/docs/internal/` (strategy, architecture, ADRs)
- Public Docs: `.specweave/docs/public/` and `docs-site/` (user guides, API docs)
- Tests: `tests/` (unit, integration, E2E, skill tests)

---

**Remember**:
1. Edit source files in `src/`, not `.claude/`
2. Keep root folder clean (use increment folders)
3. Test before committing (E2E + unit + integration)
4. Update docs when structure changes
5. Follow increment-based workflow

**SpecWeave Documentation**: https://spec-weave.com
**Last Updated**: 2025-11-04
