# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Version**: 0.6.0 (LLM-Native i18n Complete! - Ready for Release)
**NPM Version**: 0.5.1 (Latest Published)
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
├── spec.md                            # Spec files (core 4)
├── plan.md
├── tasks.md
├── tests.md
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

### Why This Matters

- ✅ **Complete traceability** - Know which increment created which files
- ✅ **Easy cleanup** - Delete increment folder = delete all files
- ✅ **Clear context** - All files for a feature in one place
- ✅ **No root clutter** - Project root stays clean and professional
- ✅ **Better git history** - Changes grouped by increment

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

## Why Claude Code is Best-in-Class

**CRITICAL**: SpecWeave is designed for Claude Code FIRST. Other tools are supported but with reduced capabilities.

### Anthropic Sets the Standards

Claude Code isn't just another AI coding assistant - **Anthropic defines the industry standards**:

1. **MCP (Model Context Protocol)** - Industry standard for context management
2. **Skills** - Proven pattern for auto-activating capabilities
3. **Agents** - Proven pattern for role-based, isolated workflows
4. **Hooks** - Proven pattern for lifecycle automation

### Why SpecWeave + Claude Code = 10x Better

| Feature | Claude Code (Native) | Cursor 2.0 | Copilot | Generic |
|---------|---------------------|------------|---------|---------|
| **Living Docs** | ✅ Auto-sync via hooks | ❌ Manual | ❌ Manual | ❌ Manual |
| **Skills** | ✅ Auto-activate | 🟡 Must @mention | ❌ None | ❌ None |
| **Commands** | ✅ Plugin-based `/specweave:*` | 🟡 Team commands | ❌ None | ❌ None |
| **Hooks** | ✅ Pre/Post lifecycle | ❌ No hooks | ❌ No hooks | ❌ No hooks |
| **Agents** | ✅ Isolated contexts | 🟡 Shared (8 parallel) | ❌ None | ❌ None |
| **Context** | ✅ MCP + 60-80% reduction | 🟡 @ shortcuts | ❌ Limited | ❌ None |
| **Quality** | ⭐⭐⭐⭐⭐ 100% | ⭐⭐⭐⭐ 85% | ⭐⭐⭐ 60% | ⭐⭐ 40% |

**Quick Comparison**:

**Claude Code** - Full automation with native hooks, MCP protocol, plugin system, isolated agent contexts
**Cursor 2.0** - Good multi-tool support (AGENTS.md compilation, team commands, @ shortcuts) but no hooks or agent isolation
**Copilot** - Basic instructions.md support, no automation features
**Generic** - Manual copy-paste workflow

**The Key Differentiator**: Only Claude Code supports **automated living docs** via native hooks. After EVERY task completion, docs sync automatically - zero manual intervention. This is why SpecWeave is designed Claude Code-first, though it gracefully degrades to other tools.

---

## Increment Naming Convention

**CRITICAL**: All increments MUST use descriptive names, not just numbers.

**Format**: `####-descriptive-kebab-case-name`

**Examples**:
- ✅ `0001-core-framework`
- ✅ `0002-core-enhancements`
- ✅ `0003-intelligent-model-selection`
- ❌ `0003` (too generic, rejected)
- ❌ `0004` (no description, rejected)

**Rationale**:
- **Clear intent at a glance** - "0003-intelligent-model-selection" tells you exactly what it does
- **Easy to reference** - "the model selection increment" vs "increment 3"
- **Better git history** - Commit messages naturally include feature name
- **Searchable by feature** - `git log --grep="model-selection"` works
- **Self-documenting** - Increment folders are readable without opening files

**When Creating Increments**:
```bash
# ❌ Wrong
/specweave:inc "0004"

# ✅ Correct
/specweave:inc "0004-cost-optimization"
/specweave:inc "0005-github-sync-enhancements"
```

**Enforcement**:
- `/specweave:inc` command validates naming (rejects bare numbers)
- Code review requirement (descriptive names mandatory)
- This document serves as the source of truth

**Quick Reference**:
- `####` = Zero-padded 4-digit number (0001, 0002, 0003, ...)
- `-descriptive-name` = Kebab-case description (lowercase, hyphens)
- Max 50 chars total (for readability)
- No special characters except hyphens

---

## Increment Discipline (v0.6.0+ MANDATORY)

**⛔ THE IRON RULE: You CANNOT start increment N+1 until increment N is DONE**

This is **NOT negotiable**. It is a **hard enforcement** to prevent chaos, scope creep, and stale documentation.

### Why This Rule Exists

**The Problem (before v0.6.0)**:
- Multiple incomplete increments piling up (0002, 0003, 0006 all in progress)
- No clear source of truth ("which increment are we working on?")
- Living docs become stale (sync doesn't know what's current)
- Scope creep (jumping between features without finishing)
- Quality degradation (tests not run, docs not updated)

**The Solution (v0.6.0+)**:
- ✅ **Hard block** on `/specweave:inc` if previous increments incomplete
- ✅ **Helper commands** to close increments properly
- ✅ **Clear guidance** on how to resolve incomplete work
- ✅ **Force discipline** = force quality

### What "DONE" Means

An increment is DONE if **ONE** of the following is true:

1. **All tasks completed**: All tasks in `tasks.md` marked `[x] Completed`
2. **Completion report exists**: `COMPLETION-SUMMARY.md` with "✅ COMPLETE" status
3. **Explicit closure**: Closed via `/specweave:close` with documentation

### The Enforcement

**When you try to start a new increment**:

```bash
/specweave:inc "new feature"
```

**If previous increments are incomplete, you'll see**:

```
❌ Cannot create new increment!

Previous increments are incomplete:

📋 Increment 0002-core-enhancements
   Status: 73% complete (11/15 tasks)
   Pending:
     - T-008: Migrate DIAGRAM-CONVENTIONS.md content
     - T-010: Create context-manifest.yaml
     - T-012: Test agent invocation manually
     - T-013: Run skill test suite
     - T-015: Create PR when increment complete

📋 Increment 0003-intelligent-model-selection
   Status: 50% complete (11/22 tasks)
   Pending: 11 tasks

💡 What would you like to do?

1️⃣  Close incomplete increments:
   /specweave:close

2️⃣  Check status:
   /specweave:status

3️⃣  Force create (DANGEROUS - violates discipline!):
   Add --force flag to bypass this check

⚠️  The discipline exists for a reason:
   - Prevents scope creep
   - Ensures completions are tracked
   - Maintains living docs accuracy
   - Keeps work focused
```

### How to Resolve Incomplete Increments

#### Option 1: Complete the Work (Recommended)

```bash
# Continue working on incomplete increment
/specweave:do

# Once all tasks done, it's automatically complete
/specweave:inc "new feature"  # ✅ Now works!
```

#### Option 2: Close Interactively

```bash
# Interactive closure with options
/specweave:close

# You'll be asked to choose:
# - Force complete (mark all tasks done)
# - Move tasks to next increment (defer work)
# - Reduce scope (mark tasks as won't-do)
# - Create completion report (manual close)
```

#### Option 3: Check Status First

```bash
# See all incomplete increments
/specweave:status

# Output shows:
# ✅ 0001-core-framework
# ✅ 0004-plugin-architecture
# ⏳ 0002-core-enhancements (73% complete)
# ⏳ 0003-intelligent-model-selection (50% complete)
```

#### Option 4: Force Create (Emergency Only!)

```bash
# Bypass the check (USE SPARINGLY!)
/specweave:inc "urgent-hotfix" --force

# This is logged and should be explained in the next standup/PR
```

### The Three Options for Closing

When using `/specweave:close`, you get **THREE options**:

#### 1. **Adjust Scope** (Simplest - Recommended)

Remove parts from `spec.md`, regenerate `plan.md` and `tasks.md` to match reduced scope:

```bash
# 1. Edit spec.md - remove features you're not doing
# 2. Delete plan.md and tasks.md
# 3. Regenerate from spec
/specweave:inc "same increment" --regenerate

# Now tasks match reduced scope → 100% complete!
```

#### 2. **Move Scope to Next Increment**

Transfer incomplete tasks to the new increment:

```bash
# Via /specweave:close
# Select "Move tasks to next increment"
# Tasks are migrated with documentation
# Old increment closed, new increment gets the work
```

#### 3. **Extend Existing Increment** (Merge Work)

Simplest option: **Don't start a new increment**. Just extend the current one:

```bash
# Instead of creating 0003, extend 0002:
# 1. Update spec.md to include new features
# 2. Update plan.md with new implementation details
# 3. Add new tasks to tasks.md
# 4. Minimize tests if needed (focus on critical paths)

# Work on combined scope in ONE increment
/specweave:do
```

### Helper Commands

| Command | Purpose |
|---------|---------|
| `/specweave:status` | Show all increments and their completion status |
| `/specweave:close` | Interactive closure of incomplete increments |
| `/specweave:force-close <id>` | Mark all tasks complete (dangerous!) |

### Enforcement Points

1. **`/specweave:inc` command** - Hard block (Step 0A)
2. **PM agent** - Pre-flight validation before planning
3. **CI/CD** (future) - Prevent PR merges with incomplete increments

### Philosophy: Discipline = Quality

**Why enforce this strictly?**

- **Focus**: Work on ONE thing at a time
- **Completion**: Finish before starting new
- **Quality**: Tests run, docs updated, code reviewed
- **Clarity**: Everyone knows what's current
- **Velocity**: Actually shipping > endless WIP

**Old Way (suggest)**:
```
User: "Just let me start the new feature, I'll come back to this"
Result: 5 incomplete increments, nothing ships
```

**New Way (enforce)**:
```
Framework: "Close this first, then start new"
User: *closes increment properly*
Result: Clean increments, clear progress, shipping regularly
```

### Real-World Example

**Scenario**: You have 0002 at 73% complete, want to start 0006.

**Before v0.6.0** (broken):
```bash
/specweave:inc "0006-i18n"
# ✅ Creates 0006 (no check)
# Result: 0002, 0003, 0006 all incomplete
```

**After v0.6.0** (disciplined):
```bash
/specweave:inc "0006-i18n"
# ❌ Blocked! "Close 0002 and 0003 first"

# Check status
/specweave:status
# Shows: 0002 (73%), 0003 (50%) incomplete

# Close them
/specweave:close
# Select 0002 → Force complete (work was done, just not marked)
# Select 0003 → Move tasks to 0007 (defer work)

# Now can proceed
/specweave:inc "0006-i18n"
# ✅ Works! Clean slate, disciplined workflow
```

### Exception: The `--force` Flag

For **emergencies only** (hotfixes, urgent features):

```bash
/specweave:inc "urgent-security-fix" --force
```

**This bypasses the check** but:
- ✅ Logs the force creation
- ✅ Warns in CLI output
- ✅ Should be explained in PR/standup
- ✅ Should close previous increments ASAP

**Use sparingly!** The discipline exists for a reason.

---

**Summary**: Close previous increments before starting new ones. Use `/specweave:status` and `/specweave:close` to maintain discipline. This isn't bureaucracy—it's quality enforcement.

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

**Single Source of Truth**:
- ✅ One central location for all specs, increments, architecture
- ✅ No duplication or fragmentation
- ✅ Clear ownership and responsibility
- ✅ Simplified living docs sync (one place to update)

**Cross-Cutting Features**:
- ✅ Increments often span multiple modules (frontend + backend + infra)
- ✅ Architecture decisions (ADRs) apply system-wide
- ✅ Strategy docs are project-level, not module-level
- ✅ Living docs sync works best with one central location

**Plugin Detection**:
- ✅ Four-phase detection assumes one `.specweave/` folder
- ✅ Auto-detection scans from root only
- ✅ No ambiguity about where plugins are enabled

**Prevents Chaos**:
- ❌ Nested folders cause: Which is the source of truth?
- ❌ Duplication: Same increment in multiple places?
- ❌ Conflicts: Different modules with same increment numbers?
- ❌ Complexity: Where do cross-cutting features live?

### Multi-Repo & Microservices Pattern

**Problem**: "My project has multiple repos, microservices, or complex architecture"

**Solution**: Create a **parent folder** with ONE root-level `.specweave/`

The pattern is the same whether you have:
- Multiple git repos (polyrepo architecture)
- Microservices (separate service directories)
- Monorepo with multiple modules

```
microservices-project/       ← Create parent folder
├── .specweave/              ← ONE source of truth for entire system
│   ├── increments/
│   │   ├── 0001-add-service-mesh/      ← Cross-cutting
│   │   ├── 0002-user-svc-v2/           ← Single service
│   │   └── 0003-checkout-flow/         ← Multi-service
│   ├── docs/
│   │   ├── internal/
│   │   │   ├── strategy/               ← System-wide strategy
│   │   │   ├── architecture/
│   │   │   │   ├── service-mesh.md     ← System-wide
│   │   │   │   ├── api-contracts.md    ← Cross-service
│   │   │   │   └── adr/
│   │   │   │       └── 0001-service-mesh-choice.md
│   │   │   └── ...
│   │   └── public/
│   └── logs/
│
├── services/
│   ├── user-service/        ← Can be separate git repos
│   ├── order-service/       ← Or monorepo subdirectories
│   ├── payment-service/
│   └── notification-service/
│
├── infrastructure/
│   ├── k8s/
│   └── terraform/
│
└── shared/
    └── api-contracts/
```

**How to Set Up**:

```bash
# Option 1: Multiple repos (clone as subdirectories)
mkdir microservices-project && cd microservices-project
npx specweave init .
git clone https://github.com/myorg/user-service.git services/user-service
git clone https://github.com/myorg/order-service.git services/order-service

# Option 2: Git submodules (advanced)
mkdir microservices-project && cd microservices-project
git init && npx specweave init .
git submodule add https://github.com/myorg/user-service.git services/user-service

# Option 3: Monorepo (services in same repo)
mkdir microservices-project && cd microservices-project
git init && npx specweave init .
mkdir -p services/{user,order,payment}

# Work normally - SpecWeave sees all services
/specweave:inc "0001-add-service-mesh"
# Creates: .specweave/increments/0001-add-service-mesh/
# Can reference: services/user-service/, infrastructure/k8s/, etc.
```

**Benefits**:
- ✅ One `.specweave/` for entire system (no duplication)
- ✅ Each repo maintains its own git history (if using polyrepo)
- ✅ Cross-service increments are natural (e.g., checkout flow)
- ✅ System-wide architecture docs in one place
- ✅ Living docs cover all services

### Enforcement

**Validation in `init.ts`**:

```typescript
// Check for parent .specweave/
function detectNestedSpecweave(targetDir: string): string | null {
  let currentDir = path.dirname(targetDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, '.specweave');
    if (fs.existsSync(specweavePath)) {
      return currentDir; // Found parent .specweave/
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

// Prevent nested initialization
const parentSpecweave = detectNestedSpecweave(targetDir);
if (parentSpecweave) {
  console.error('❌ Nested .specweave/ folders are not supported!');
  console.error(`   Found parent .specweave/ at: ${parentSpecweave}`);
  console.error(`   Use the parent folder for all increments.`);
  process.exit(1);
}
```

**Detection Rules**:
- ❌ Prevent `specweave init` in subdirectories if parent `.specweave/` exists
- ✅ Suggest using parent folder instead
- ✅ Provide clear error messages with path to parent

**Code Review**:
- ❌ Reject PRs with nested `.specweave/` folders
- ✅ Enforce via linting/validation scripts

### Summary

| Aspect | Root-Level Only | Nested (NOT Supported) |
|--------|----------------|------------------------|
| **Source of Truth** | ✅ One central location | ❌ Multiple conflicting sources |
| **Cross-Cutting Features** | ✅ Natural | ❌ Complex coordination |
| **Living Docs Sync** | ✅ Simple | ❌ Merge conflicts |
| **Plugin Detection** | ✅ Works | ❌ Ambiguous |
| **Multi-Repo** | ✅ Parent folder | ❌ Fragmented |
| **Complexity** | ✅ Simple | ❌ High |

**Bottom Line**: Root-level `.specweave/` only. For multi-repo projects, create a parent folder. No exceptions.

---

## Project Scale (v0.4.0 - Plugin Architecture)

### Core Plugin (Always Auto-Loaded)

**Plugin**: `specweave-core` - The essential SpecWeave plugin loaded in every project:
- **Skills**: 9 skills (increment-planner, tdd-workflow, rfc-generator, context-loader, project-kickstarter, brownfield-analyzer, brownfield-onboarder, increment-quality-judge, context-optimizer)
- **Agents**: 22 agents (PM, Architect, Tech Lead, + 19 specialized including tdd-orchestrator)
- **Commands**: 22 commands (/specweave:inc, /specweave:do, /specweave:next, /specweave:done, /specweave:progress, /specweave:validate, /specweave:sync-docs, + 15 specialized)
- **Hooks**: 8 lifecycle hooks
- **Size**: ~12K tokens (vs. 50K in v0.3.7)

**Result**: **75%+ context reduction** out of the box!

**Why So Small?**
- External sync (GitHub, Jira) = separate plugins
- Tech stacks (React, K8s) = separate plugins
- Domain expertise (ML, payments) = separate plugins
- Core plugin = only increment lifecycle + living docs automation

### Available Plugins (Opt-In)

**Implemented Plugins** (v0.4.0):

| Plugin | Skills | Agents | Commands | Status |
|--------|--------|--------|----------|--------|
| **specweave-github** | 2 | 1 | 4 | ✅ COMPLETE |

**GitHub Plugin Features:**
- github-sync: Bidirectional increment ↔ issue sync
- github-issue-tracker: Task-level progress tracking
- github-manager agent: AI specialist for GitHub CLI
- Commands: create-issue, sync, close-issue, status
- Auto-detects: `.git/`, `github.com` remote, `GITHUB_TOKEN`

**Planned Plugins** (future releases):

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **frontend-stack** | 5 | 1 | 0 | React, Next.js, design systems |
| **kubernetes** | 3 | 1 | 2 | Deploying to K8s, Helm |

**Domain Plugins**:

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **ml-ops** | 3 | 3 | 1 | Machine learning, TensorFlow, PyTorch |
| **observability** | 4 | 4 | 2 | Prometheus, Grafana, monitoring |
| **payment-processing** | 4 | 1 | 0 | Stripe, billing, subscriptions |
| **e2e-testing** | 1 | 0 | 0 | Playwright, E2E browser automation, visual regression |
| **figma-ecosystem** | 5 | 2 | 0 | Design integration, Figma API |
| **security** | 3 | 1 | 0 | Security scanning, best practices |
| **diagrams** | 2 | 1 | 0 | C4 diagrams, Mermaid |

**Backend Stacks**:

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **nodejs-backend** | 1 | 1 | 0 | Express, Fastify, NestJS |
| **python-backend** | 1 | 1 | 0 | FastAPI, Django, Flask |
| **dotnet-backend** | 1 | 1 | 0 | ASP.NET Core, EF Core |

**Enterprise Sync** (Alternative to GitHub):

| Plugin | Skills | Agents | Commands | Use When |
|--------|--------|--------|----------|----------|
| **jira-sync** | 1 | 1 | 2 | JIRA project tracking |
| **ado-sync** | 1 | 1 | 2 | Azure DevOps tracking |

### Context Efficiency Examples

**Before (v0.3.7)** - Monolithic:
- Simple React app: Loads ALL 44 skills + 20 agents ≈ **50K tokens**
- Backend API: Loads ALL 44 skills + 20 agents ≈ **50K tokens**
- ML pipeline: Loads ALL 44 skills + 20 agents ≈ **50K tokens**

**After (v0.4.0)** - Modular:
- Simple React app: Core + frontend-stack + github ≈ **16K tokens** (68% reduction!)
- Backend API: Core + nodejs-backend + github ≈ **15K tokens** (70% reduction!)
- ML pipeline: Core + ml-ops + github ≈ **18K tokens** (64% reduction!)
- SpecWeave itself: Core + github + diagrams ≈ **15K tokens** (70% reduction!)

### How to Enable Plugins

**Auto-Detection** (recommended):
```bash
specweave init  # Auto-detects and suggests plugins
```

**Manual**:
```bash
specweave plugin list           # See all available
specweave plugin enable kubernetes
specweave plugin disable figma-ecosystem
```

**Spec-Based** (during increment planning):
```bash
/specweave:inc "deploy to Kubernetes"
# → Suggests kubernetes plugin before creating spec
```

---

## Project Architecture

### Source of Truth Principle

**CRITICAL**: SpecWeave follows a strict source-of-truth pattern:

```
src/                            ← SOURCE OF TRUTH (TypeScript code only)
├── core/                       ← Core framework logic (TypeScript utilities)
│   ├── plugin-loader.ts
│   ├── config-manager.ts
│   ├── types/                  ← TypeScript type definitions
│   └── schemas/                ← JSON schemas
├── cli/                        ← CLI commands
├── hooks/                      ← TypeScript utilities for hooks
│   └── lib/                    ← Hook helper functions
├── adapters/                   ← Tool adapters (legacy)
├── templates/                  ← Templates for user projects
└── utils/                      ← Utility functions

plugins/                        ← ROOT: All plugins (version controlled)
├── specweave-core/             ← CORE PLUGIN (framework essentials)
│   ├── .claude-plugin/         ← plugin.json (Claude native)
│   ├── skills/                 ← Core skills (9 total)
│   │   ├── rfc-generator/
│   │   ├── increment-planner/
│   │   ├── tdd-workflow/
│   │   └── ...
│   ├── agents/                 ← Core agents (3 core + 19 specialized)
│   │   ├── pm/
│   │   ├── architect/
│   │   ├── tech-lead/
│   │   └── ...
│   ├── commands/               ← Core commands (7 core + 15 specialized)
│   │   ├── specweave.inc.md
│   │   ├── specweave.do.md
│   │   └── ...
│   ├── hooks/                  ← Lifecycle hooks (8 total)
│   │   ├── post-task-completion.sh
│   │   ├── pre-implementation.sh
│   │   └── ...
│   └── lib/                    ← TypeScript utilities (optional)
│
└── specweave-{name}/           ← Other plugins (GitHub, Figma, etc.)
    ├── .claude-plugin/         ← plugin.json (Claude native)
    ├── skills/                 ← Plugin skills
    ├── agents/                 ← Plugin agents
    ├── commands/               ← Plugin commands
    └── lib/                    ← TypeScript utilities (optional)

.claude/                        ← INSTALLED (gitignored in user projects)
├── agents/                     ← Installed from plugins/*/agents/
├── commands/                   ← Installed from plugins/*/commands/
├── hooks/                      ← Installed from plugins/*/hooks/
└── skills/                     ← Installed from plugins/*/skills/

.specweave/                     ← FRAMEWORK DATA (always present)
├── increments/                 ← Feature development
├── docs/                       ← Strategic documentation
└── logs/                       ← Logs and execution history
```

**Rules**:
- ✅ `src/` = TypeScript code ONLY (compiled to `dist/`)
- ✅ ALL skills/agents/commands/hooks = Inside plugins (including core!)
- ✅ `plugins/specweave-core/` = Core framework plugin (always loaded)
- ✅ `.claude/` = Installed from all enabled plugins
- ❌ NEVER mix `*.ts` and `SKILL.md` in the same directory
- ❌ NEVER edit files in `.claude/` directly (they get overwritten)
- ❌ NEVER create new files in project root (use increment folders)

**Key Architectural Principle**:
- TypeScript code (`*.ts`) goes in `src/` → compiled to `dist/`
- Claude-native files (`SKILL.md`, `AGENT.md`, `*.md`) go in `plugins/` → copied to `.claude/`
- Even "core" framework components are in `plugins/specweave-core/` (everything is a plugin!)
- This separation ensures clean builds and prevents mixing compiled code with runtime files

### Tech Stack

**Core**:
- TypeScript 5.x (strict mode)
- Node.js 18+ (ESM + CommonJS)
- Commander.js (CLI framework)
- Inquirer.js (interactive prompts)
- fs-extra (file operations)

**Testing**:
- Playwright (E2E browser tests)
- Jest (unit + integration tests)
- ts-jest (TypeScript support)

**Documentation**:
- Docusaurus 3.x (docs-site/)
- Mermaid diagrams (architecture visualization)
- Markdown (all docs)

**Distribution**:
- NPM package (`npm publish`)
- Install script (`install.sh`)

---

## Directory Structure

```
specweave/
├── src/                        # SOURCE OF TRUTH (TypeScript code ONLY)
│   ├── cli/                    # CLI commands (init, version)
│   │   └── commands/
│   │       └── init.ts         # Main installation logic
│   ├── core/                   # Core framework logic (TypeScript only)
│   │   ├── plugin-loader.ts    # Load plugins from disk
│   │   ├── plugin-manager.ts   # Plugin lifecycle management
│   │   ├── plugin-detector.ts  # Auto-detect plugins (4 phases)
│   │   ├── config-manager.ts   # Config loading/validation
│   │   ├── types/
│   │   │   └── plugin.ts       # Plugin type definitions
│   │   └── schemas/
│   │       ├── plugin-manifest.schema.json
│   │       └── specweave-config.schema.json
│   ├── hooks/                  # TypeScript utilities for hooks
│   │   └── lib/                # Hook helper functions
│   ├── adapters/               # Tool adapters (legacy)
│   │   ├── adapter-interface.ts
│   │   ├── adapter-base.ts
│   │   ├── claude/
│   │   ├── cursor/ (legacy)
│   │   ├── copilot/ (legacy)
│   │   └── generic/ (legacy)
│   ├── templates/              # User project templates
│   │   ├── CLAUDE.md.template
│   │   ├── AGENTS.md.template
│   │   └── ...
│   └── utils/                  # Utility functions
│
├── plugins/                    # ALL PLUGINS (root level)
│   ├── specweave-core/         # CORE PLUGIN (framework essentials)
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json     # Claude native manifest
│   │   ├── skills/             # Core skills (9 total)
│   │   │   ├── rfc-generator/          # RFC generation for increments
│   │   │   ├── increment-planner/      # Increment planning and spec generation
│   │   │   ├── context-loader/         # Context loading optimization
│   │   │   ├── tdd-workflow/           # Test-driven development workflow
│   │   │   ├── project-kickstarter/    # New project bootstrapping
│   │   │   ├── brownfield-analyzer/    # Existing codebase analysis
│   │   │   ├── brownfield-onboarder/   # Brownfield project onboarding
│   │   │   ├── increment-quality-judge/# Quality assessment
│   │   │   └── context-optimizer/      # Context optimization
│   │   ├── agents/             # Core agents (22 total)
│   │   │   ├── pm/             # Product Manager agent
│   │   │   ├── architect/      # System Architect agent
│   │   │   ├── tech-lead/      # Tech Lead agent
│   │   │   └── ...
│   │   ├── commands/           # Core commands (22 total)
│   │   │   ├── specweave.inc.md        # /specweave:inc
│   │   │   ├── specweave.do.md         # /specweave:do
│   │   │   ├── specweave.done.md       # /specweave:done
│   │   │   └── ...
│   │   ├── hooks/              # Lifecycle hooks (8 total)
│   │   │   ├── post-task-completion.sh # Auto-runs after tasks complete
│   │   │   ├── pre-implementation.sh   # Pre-task validation
│   │   │   └── ...
│   │   └── lib/                # TypeScript utilities (optional)
│   │
│   ├── specweave-github/       # GitHub Issues integration
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json     # Claude native manifest
│   │   ├── skills/
│   │   │   ├── github-sync/
│   │   │   └── github-issue-tracker/
│   │   ├── agents/
│   │   │   └── github-manager/
│   │   ├── commands/
│   │   │   ├── github-create-issue.md
│   │   │   ├── github-sync.md
│   │   │   └── ...
│   │   └── lib/                # TypeScript utilities
│   ├── specweave-figma/        # Figma design sync
│   ├── specweave-infrastructure/ # K8s, Helm, Terraform
│   └── ... (18 plugins total)
│
├── .claude-plugin/             # Claude Code marketplace (root level)
│   ├── marketplace.json        # Plugin catalog (18 plugins)
│   └── README.md               # Marketplace documentation
│
├── .claude/                    # Pre-installed for SpecWeave dev
│   ├── agents/                 # Installed from plugins/*/agents/
│   ├── commands/               # Installed from plugins/*/commands/
│   ├── hooks/                  # Installed from plugins/*/hooks/
│   └── skills/                 # Installed from plugins/*/skills/
│
├── .specweave/                 # SpecWeave's own increments
│   ├── increments/
│   │   ├── 0001-core-framework/
│   │   ├── 0002-core-enhancements/
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   ├── tasks.md
│   │   │   ├── tests.md
│   │   │   ├── logs/           # ✅ Session logs go here
│   │   │   ├── scripts/        # ✅ Helper scripts
│   │   │   └── reports/        # ✅ Analysis files
│   │   └── _backlog/
│   ├── docs/
│   │   ├── internal/           # Strategic docs (NEVER published)
│   │   │   ├── strategy/       # Business strategy, market analysis
│   │   │   ├── architecture/   # Technical architecture
│   │   │   │   ├── adr/        # Architecture Decision Records
│   │   │   │   ├── rfc/        # ✅ Request for Comments (detailed specs)
│   │   │   │   ├── diagrams/   # Mermaid + SVG
│   │   │   │   └── hld-system.md # High-Level Design
│   │   │   └── delivery/       # Implementation notes, runbooks
│   │   └── public/             # User-facing docs (can publish)
│   │       ├── guides/
│   │       └── api/
│   └── logs/
│
├── tests/
│   ├── e2e/                    # Playwright E2E tests
│   ├── integration/            # Integration tests
│   ├── unit/                   # Unit tests
│   └── specs/                  # Test specifications
│
├── bin/                        # Installation scripts
│   ├── install-all.sh
│   ├── install-skills.sh
│   └── install-agents.sh
│
├── scripts/                    # Build/deployment scripts
│   ├── install-brownfield.sh
│   └── generate-diagram-svgs.sh
│
├── docs-site/                  # Docusaurus documentation site
│
├── CLAUDE.md                   # This file (for contributors)
├── README.md                   # GitHub README (for users)
├── CHANGELOG.md                # Version history
├── package.json                # NPM package definition
└── tsconfig.json               # TypeScript configuration
```

---

## File Organization Rules

### ✅ ALLOWED in Root

- `CLAUDE.md` (this file)
- `README.md`, `CHANGELOG.md`, `LICENSE`
- Standard config files (`package.json`, `tsconfig.json`, `.gitignore`)
- Build artifacts (`dist/`, only if needed temporarily)

### ❌ NEVER Create in Root (Pollutes Repository)

**See comprehensive rules at top of document**: [🚨 CRITICAL: NEVER POLLUTE PROJECT ROOT!](#-critical-never-pollute-project-root)

**Quick summary**:
- ✅ ALL AI-generated files → increment folders (`.specweave/increments/####/reports/`, `logs/`, `scripts/`)
- ✅ Architecture decisions → `.specweave/docs/internal/architecture/adr/`
- ❌ NEVER create `.md` files, scripts, or logs in project root
- ❌ Build artifacts (`.tgz`, `.pt`, etc.) → add to `.gitignore`

### Runtime Artifacts (NOT Source Controlled)

**Logs and ephemeral files** should NEVER be committed:

```
❌ NEVER COMMIT:
.specweave/logs/                        # Framework runtime logs
.specweave/logs/last-hook-fire          # Hook execution timestamps
.specweave/increments/*/logs/           # Increment execution logs
.specweave/cache/                       # Temporary cache
*.tmp                                   # Temporary files
```

**Why?**
- ✅ Logs are execution artifacts, not source code
- ✅ They change on every run (noise in git history)
- ✅ They cause unnecessary merge conflicts
- ✅ They bloat the repository over time
- ✅ They're developer-specific, not shared state

**Enforcement**: `.gitignore` excludes these patterns automatically.

---

## Development Workflow

### Making Changes

**ALL components belong to plugins** (following [Claude Code's plugin system](https://docs.claude.com/en/docs/claude-code/plugins)).

**1. Editing Skills** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave-core/skills/rfc-generator/SKILL.md

# Other plugins (opt-in):
vim plugins/specweave-github/skills/github-sync/SKILL.md

# Skills auto-activate based on description keywords
```

**2. Editing Agents** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave-core/agents/pm/AGENT.md

# Other plugins (opt-in):
vim plugins/specweave-github/agents/github-manager/AGENT.md

# Test by invoking via Task tool
```

**3. Editing Commands** (any plugin):
```bash
# Core plugin (auto-loaded):
vim plugins/specweave-core/commands/specweave.do.md

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

2. **Feature Tests** (`.specweave/increments/####/tests.md`)
   - Test coverage plans per increment
   - TC-XXXX test case IDs

3. **Skill Tests** (`tests/specs/{skill-name}/` or `tests/integration/{skill-name}/`)
   - Test cases for skill functionality
   - Minimum 3 test cases per skill
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

**Post-Task Completion Hook v2.0** (`.claude/hooks/post-task-completion.sh`):

**Smart Session-End Detection**:
- ✅ Tracks inactivity gaps between TodoWrite calls
- ✅ Only plays sound when session is TRULY ending (15s+ inactivity after all tasks complete)
- ✅ Skips sound during rapid work (Claude creating multiple todo lists)
- ✅ Enhanced logging with decision reasoning in `.specweave/logs/hooks-debug.log`
- ✅ Debouncing prevents duplicate hook fires

**How It Works**:
```
Problem: Claude creates multiple todo lists in one conversation
- List 1: [A, B, C] → completes → sound plays ❌
- List 2: [D, E] → completes 30s later → sound plays again ❌
- User hears sounds while Claude is still working!

Solution: Inactivity-based detection
- 10:00:00 - Task done (gap: 5s) → skip sound
- 10:00:05 - Task done (gap: 5s) → skip sound
- 10:00:10 - All done (gap: 5s) → skip sound (rapid work)
- ... (15+ seconds pass)
- 10:01:00 - All done (gap: 50s) → PLAY SOUND! ✅ (session ending)
```

**Configuration** (`src/hooks/post-task-completion.sh`):
- `INACTIVITY_THRESHOLD=15` - Seconds of inactivity to assume session ending (adjustable)
- `DEBOUNCE_SECONDS=2` - Prevents duplicate hook fires

**Manual Actions** (Claude MUST do after each task):
- Update `CLAUDE.md` when structure changes
- Update `README.md` for user-facing changes
- Update `CHANGELOG.md` for API changes

**Living Docs Sync** (after `/specweave:do` completes):
- Run `/specweave:sync-docs update`
- Updates `.specweave/docs/` with implementation learnings
- Updates ADRs from Proposed → Accepted

---

## Plugins

**SpecWeave is built 100% on [Claude Code's native plugin system](https://docs.claude.com/en/docs/claude-code/plugins)**.

### Architecture: Everything is a Plugin

**Critical Understanding**: SpecWeave doesn't have a "core framework" separate from plugins. Instead:

```
SpecWeave = Collection of Claude Code Plugins
├── specweave-core (auto-loaded) ← The "framework" IS a plugin
├── specweave-github (opt-in)
├── specweave-figma (opt-in)
└── ...all other plugins (opt-in)
```

**What this means**:
- ✅ `specweave-core` is a Claude Code plugin (happens to auto-load)
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
- Auto-detection during `specweave init` suggests relevant plugins

**Plugin Structure** (all follow same pattern):
```
plugins/specweave-{name}/
├── .claude-plugin/plugin.json  # Claude native manifest
├── skills/                     # Auto-activating capabilities (SKILL.md files)
├── agents/                     # Specialized AI agents (AGENT.md files)
├── commands/                   # Slash commands (.md files)
└── lib/                        # TypeScript utilities (optional)
```

**Key Plugins** (for reference):
- `specweave-core` - Framework essentials (always loaded)
- `specweave-github` - GitHub Issues integration
- `specweave-{frontend|backend|infrastructure}` - Tech stack plugins

**For complete list**: Check `plugins/` directory or marketplace.json

### Plugin Decision Tree

**Key Insight**: In Claude Code's plugin system, EVERYTHING is a plugin. The only question is: **Which plugin does this belong to?**

**Decision**: Which plugin should contain this feature?

```
Is this feature...
├─ Used by EVERY project? → specweave-core (auto-loaded)
│  Examples: increment-planner, rfc-generator, tdd-workflow, PM/Architect agents
│
├─ Part of increment lifecycle? → specweave-core (auto-loaded)
│  Examples: /specweave:inc, /specweave:do, living docs hooks
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
  "author": {"name": "Your Name"}
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
/plugin install myplugin@marketplace
```

**See**: [.claude-plugin/README.md](/.claude-plugin/README.md) for marketplace documentation

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
- Use SpecWeave's own workflow (`/specweave:inc`, `/specweave:do`, etc.)
- All work traces back to specs

### 5. Adapter-First Design
- Core framework must be tool-agnostic
- Tool-specific features in adapters only
- Plain Markdown + YAML = maximum portability

---

## Release Process

**NPM Publishing**:
```bash
# 1. Update version
npm version patch|minor|major

# 2. Update CHANGELOG.md
vim CHANGELOG.md

# 3. Build and test
npm run build
npm test
npm run test:e2e

# 4. Publish to NPM
npm publish

# 5. Tag and push
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
- ⚠️  GitHub Copilot (via `.github/copilot/instructions.md`)
- ⚠️  Generic (Markdown-only, for ChatGPT/Gemini/etc.)

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
- **Core components**: `plugins/specweave-core/{skills|agents|commands|hooks}/`
- **Plugin components**: `plugins/specweave-{name}/{skills|agents|commands}/`
- **Tests**: `tests/integration/{component-name}/` or `tests/unit/`

**For detailed instructions**: See "Adding a New Plugin (Contributors)" section above (line ~1250)

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

---

## Troubleshooting

**Skills not activating?**
1. Check YAML frontmatter in `SKILL.md`
2. Verify installation: `ls ~/.claude/skills/skill-name/`
3. Restart Claude Code
4. Check description has clear trigger keywords

**Commands not working?**
1. Verify file in `.claude/commands/`
2. Check YAML frontmatter
3. Restart Claude Code
4. Check command name matches file name

**Tests failing?**
1. Run `npm run build` first
2. Check test output for specific errors
3. Verify test data in `tests/fixtures/`
4. Check Playwright browser install: `npx playwright install`

**Root folder polluted?**
1. Identify which increment created the files
2. Move to `.specweave/increments/####/reports/`
3. Update `.gitignore` if needed

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
- `/specweave:inc "feature"` - Plan new increment
- `/specweave:do` - Execute tasks (smart resume)
- `/specweave:progress` - Check status
- `/specweave:validate 0002` - Validate increment
- `/specweave:done 0002` - Close increment
- `/specweave:sync-docs update` - Sync living docs

**Build & Test**:
- `npm run build` - Compile TypeScript
- `npm test` - Run all unit tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:integration` - Run integration tests
- `npm run install:all` - Sync src/ to .claude/

**File Structure**:
- Source of truth: `src/`
- Installed: `.claude/`
- Increments: `.specweave/increments/`
- Internal Docs (strategy, architecture): `.specweave/docs/internal/`
- Public Docs (user guides): `.specweave/docs/public/` and `docs-site/`
- Tests: `tests/`

---

**Remember**:
1. Edit source files in `src/`, not `.claude/`
2. Keep root folder clean (use increment folders)
3. Test before committing (E2E + unit + integration)
4. Update docs when structure changes
5. Follow increment-based workflow

**SpecWeave Documentation**: https://spec-weave.com
**Last Updated**: 2025-10-28 (Increment 0002)
