# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Version**: 0.4.0 (Plugin Architecture Complete!)
**Type**: Open Source NPM Package (TypeScript CLI)
**Repository**: https://github.com/anton-abyzov/specweave
**Website**: https://spec-weave.com

This CLAUDE.md is for **contributors to SpecWeave itself**, not users of SpecWeave.
Users receive a different CLAUDE.md via the template system.

---

## Quick Start for Contributors

**Current Work**: Increment 0004 - Plugin Architecture ✅ COMPLETE
**Active Branch**: `develop` → merges to `features/001-core-feature`
**Latest**: v0.4.0 - Plugin Architecture with GitHub plugin (priority #1)
**Next**: v0.5.0 - Additional plugins (Jira, Kubernetes, Frontend/Backend stacks)

**Typical Workflow**:
```bash
# 1. Make changes to source files in src/
# 2. Test locally
npm run build && npm test

# 3. Use SpecWeave commands for managing work
/specweave.do                   # Execute next task
/specweave.progress             # Check status

# 4. Commit with hooks (auto-validates)
git add . && git commit -m "feat: description"
```

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

| Feature | SpecWeave + Claude Code | Competitors (Kiro, Cursor, Copilot) |
|---------|------------------------|-------------------------------------|
| **Living Docs (Automated)** | ✅ Native hooks update docs on EVERY task | ❌ Manual sync required (Kiro, Cursor, Copilot) |
| **Auto-Activation** | ✅ Skills auto-fire based on context | ❌ Must manually invoke (all competitors) |
| **Multi-Agent Isolation** | ✅ Separate contexts per agent | 🟡 Cursor: shared context; Others: none |
| **Slash Commands** | ✅ Native `/specweave.*` commands | 🟡 Cursor: team commands; Others: none |
| **Hooks (Pre/Post)** | ✅ Native lifecycle automation | ❌ No hooks (all competitors) |
| **MCP Protocol** | ✅ Native context management | ❌ Proprietary or none |
| **Context Efficiency** | ✅ 60-80% reduction with plugins | 🟡 Cursor: @ shortcuts; Others: limited |
| **Spec-Driven Workflow** | ✅ Core framework feature | ❌ Not supported |

### The Living Docs Advantage: SpecWeave vs. Kiro

**Kiro's Pitch**: "Automated living documentation"
**Reality**: Kiro requires **manual sync** - you must remember to update docs.

**SpecWeave + Claude Code**:
- **100% automated** via native hooks
- After EVERY task, hooks fire automatically
- Docs update without user intervention
- No manual sync needed, EVER

**Why?** Claude Code's native hooks system. Kiro doesn't have this - they rely on manual triggers.

### Cursor 2.0: Good, But Not Native

Cursor 2.0 (released Oct 29, 2025) has impressive features:
- ✅ 8 parallel agents
- ✅ Team-defined custom commands
- ✅ In-app browser
- ✅ @ context shortcuts

**But Cursor still lacks**:
- ❌ Native hooks (no automated doc updates)
- ❌ Skill auto-activation (must explicitly request)
- ❌ Agent isolation (all 8 agents share context)
- ❌ MCP protocol (proprietary context management)

**SpecWeave on Cursor** = ~85% of Claude Code experience (still very good!)

### GitHub Copilot: Basic Automation

Copilot provides:
- ✅ Workspace instructions
- ✅ Code suggestions

**But Copilot lacks**:
- ❌ Native hooks
- ❌ Skills/agents
- ❌ Slash commands
- ❌ Living docs

**SpecWeave on Copilot** = ~60% of Claude Code experience (basic automation only)

### Generic Tools (ChatGPT, Gemini): Manual Workflow

Generic AI tools:
- ✅ Conversational AI
- ✅ Code generation

**But they lack**:
- ❌ ALL automation features
- ❌ Project integration
- ❌ Persistent state

**SpecWeave on Generic** = ~40% of Claude Code experience (copy-paste manual)

### The Bottom Line

**SpecWeave works with any tool**, but for the **BEST experience**:

1. **Claude Code** (⭐⭐⭐⭐⭐ 100%) - Full automation, native hooks, MCP, isolated agents
2. **Cursor 2.0** (⭐⭐⭐⭐ 85%) - Semi-automation, AGENTS.md, team commands
3. **Copilot** (⭐⭐⭐ 60%) - Basic automation, instructions.md
4. **Generic** (⭐⭐ 40%) - Manual workflow, copy-paste

**Recommendation**: Use Claude Code for SpecWeave. Other tools work, but you'll miss the magic.

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
/specweave.inc "0004"

# ✅ Correct
/specweave.inc "0004-cost-optimization"
/specweave.inc "0005-github-sync-enhancements"
```

**Enforcement**:
- `/specweave.inc` command validates naming (rejects bare numbers)
- Code review requirement (descriptive names mandatory)
- This document serves as the source of truth

**Quick Reference**:
- `####` = Zero-padded 4-digit number (0001, 0002, 0003, ...)
- `-descriptive-name` = Kebab-case description (lowercase, hyphens)
- Max 50 chars total (for readability)
- No special characters except hyphens

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

### Multi-Repo Solution (For Huge Projects)

**Problem**: "My project has 10+ repos (microservices, polyrepo architecture)"

**Solution**: Create a **parent folder** with root-level `.specweave/`

```
my-big-project/              ← Create parent folder
├── .specweave/              ← ONE source of truth for ALL repos
│   ├── increments/
│   │   ├── 0001-auth-service/
│   │   ├── 0002-payment-service/
│   │   ├── 0003-frontend-redesign/
│   │   └── 0004-infrastructure-k8s/
│   ├── docs/
│   │   ├── internal/
│   │   │   ├── strategy/    ← System-wide strategy
│   │   │   ├── architecture/ ← Cross-service architecture
│   │   │   └── ...
│   │   └── public/
│   └── logs/
│
├── auth-service/            ← Separate git repo
│   ├── .git/
│   ├── src/
│   └── README.md
│
├── payment-service/         ← Separate git repo
│   ├── .git/
│   ├── src/
│   └── README.md
│
├── frontend/                ← Separate git repo
│   ├── .git/
│   ├── src/
│   └── README.md
│
└── infrastructure/          ← Separate git repo
    ├── .git/
    ├── k8s/
    └── terraform/
```

**How to Set Up**:

```bash
# 1. Create parent folder
mkdir my-big-project
cd my-big-project

# 2. Initialize SpecWeave at root
npx specweave init .

# 3. Clone your repos as subdirectories
git clone https://github.com/myorg/auth-service.git
git clone https://github.com/myorg/payment-service.git
git clone https://github.com/myorg/frontend.git
git clone https://github.com/myorg/infrastructure.git

# 4. Work normally - SpecWeave sees all repos
/specweave.inc "0001-unified-auth"
# Creates: .specweave/increments/0001-unified-auth/
# Can reference: auth-service/, frontend/, payment-service/
```

**Benefits**:
- ✅ One `.specweave/` for entire system
- ✅ Each repo maintains its own git history
- ✅ Cross-service increments are natural
- ✅ System-wide architecture in one place
- ✅ Living docs cover all repos

**Alternatively: Git Submodules** (Advanced):

```bash
# Parent repo with submodules
my-big-project/
├── .specweave/              ← Root level
├── .gitmodules              ← Git submodule config
├── auth-service/            ← Git submodule
├── payment-service/         ← Git submodule
└── frontend/                ← Git submodule

# Initialize with submodules
git submodule add https://github.com/myorg/auth-service.git
git submodule add https://github.com/myorg/payment-service.git
```

### Microservices Pattern

Even for microservices, root-level `.specweave/` makes sense:

```
microservices-project/
├── .specweave/              ← ONE source of truth
│   ├── increments/
│   │   ├── 0001-add-service-mesh/      ← Cross-cutting
│   │   ├── 0002-user-svc-v2/           ← Single service
│   │   └── 0003-checkout-flow/         ← Multi-service
│   ├── docs/
│   │   ├── internal/
│   │   │   ├── strategy/
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
│   ├── user-service/
│   ├── order-service/
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

### Core Framework (Always Loaded)

**The Essentials** - What every SpecWeave project gets:
- **Skills**: 8 core (increment-planner, **rfc-generator**, context-loader, project-kickstarter, brownfield-analyzer, brownfield-onboarder, increment-quality-judge, context-optimizer)
- **Agents**: 3 core (PM, Architect, Tech Lead)
- **Commands**: 7 core (/specweave.inc, /specweave.do, /specweave.next, /specweave.done, /specweave.progress, /specweave.validate, /sync-docs)
- **Size**: ~12K tokens (vs. 50K in v0.3.7)

**Result**: **75%+ context reduction** out of the box!

**Why So Small?**
- External sync (GitHub, Jira) = plugins
- Tech stacks (React, K8s) = plugins
- Domain expertise (ML, payments) = plugins
- Only increment lifecycle + living docs in core

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
| **e2e-testing** | 2 | 1 | 0 | Playwright, browser automation |
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
/specweave.inc "deploy to Kubernetes"
# → Suggests kubernetes plugin before creating spec
```

---

## Project Architecture

### Source of Truth Principle

**CRITICAL**: SpecWeave follows a strict source-of-truth pattern:

```
src/                            ← SOURCE OF TRUTH (version controlled)
├── skills/                     ← Source for skills
├── agents/                     ← Source for agents
├── commands/                   ← Source for slash commands
├── hooks/                      ← Source for hooks
├── adapters/                   ← Tool adapters (Claude, Cursor, etc.)
└── templates/                  ← Templates for user projects

.claude/                        ← INSTALLED (gitignored in user projects)
├── skills/                     ← Installed from src/skills/
├── agents/                     ← Installed from src/agents/
├── commands/                   ← Installed from src/commands/
└── hooks/                      ← Installed from src/hooks/

.specweave/                     ← FRAMEWORK DATA (always present)
├── increments/                 ← Feature development
├── docs/                       ← Strategic documentation
└── logs/                       ← Logs and execution history
```

**Rules**:
- ✅ ALWAYS edit files in `src/` (source of truth)
- ✅ Run install scripts to sync changes to `.claude/`
- ❌ NEVER edit files in `.claude/` directly (they get overwritten)
- ❌ NEVER create new files in project root (use increment folders)

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
├── src/                        # SOURCE OF TRUTH
│   ├── cli/                    # CLI commands (init, version)
│   │   └── commands/
│   │       └── init.ts         # Main installation logic
│   ├── core/                   # Core framework logic
│   │   ├── plugin-loader.ts    # ✅ NEW: Load plugins from disk
│   │   ├── plugin-manager.ts   # ✅ NEW: Plugin lifecycle management
│   │   ├── plugin-detector.ts  # ✅ NEW: Auto-detect plugins (4 phases)
│   │   ├── config-manager.ts   # Config loading/validation
│   │   ├── types/
│   │   │   └── plugin.ts       # ✅ NEW: Plugin type definitions
│   │   ├── schemas/
│   │   │   ├── plugin-manifest.schema.json  # ✅ NEW
│   │   │   └── specweave-config.schema.json # ✅ NEW
│   │   └── skills/
│   │       └── rfc-generator/  # ✅ NEW: Core skill for all users
│   ├── skills/                 # 8 core skills (SKILL.md + test-cases/)
│   │   ├── increment-planner/
│   │   ├── context-loader/
│   │   └── ...
│   ├── agents/                 # 3 core agents (AGENT.md)
│   │   ├── pm/
│   │   ├── architect/
│   │   └── tech-lead/
│   ├── commands/               # 7 core slash commands (.md)
│   │   ├── specweave-inc.md
│   │   ├── specweave-do.md
│   │   └── ...
│   ├── hooks/                  # Lifecycle hooks (.sh)
│   │   └── post-task-completion.sh
│   ├── adapters/               # Multi-tool support (UPDATED)
│   │   ├── adapter-interface.ts   # ✅ UPDATED: Plugin methods
│   │   ├── adapter-base.ts        # ✅ UPDATED: Default implementations
│   │   ├── claude/                # ✅ UPDATED: Native plugin support
│   │   ├── cursor/                # ✅ UPDATED: AGENTS.md compilation
│   │   ├── copilot/               # ✅ UPDATED: AGENTS.md compilation
│   │   └── generic/               # ✅ UPDATED: Manual workflows
│   ├── plugins/                # ✅ NEW: Plugin system
│   │   └── specweave-github/   # ✅ COMPLETE: GitHub integration
│   │       ├── .claude-plugin/
│   │       │   └── manifest.json
│   │       ├── skills/
│   │       │   ├── github-sync/
│   │       │   └── github-issue-tracker/
│   │       ├── agents/
│   │       │   └── github-manager/
│   │       └── commands/
│   │           ├── github-create-issue.md
│   │           ├── github-sync.md
│   │           ├── github-close-issue.md
│   │           └── github-status.md
│   ├── templates/              # User project templates
│   │   ├── CLAUDE.md.template
│   │   ├── AGENTS.md.template
│   │   └── ...
│   └── utils/                  # Utility functions
│
├── .claude/                    # Pre-installed for SpecWeave dev
│   ├── skills/                 # Synced from src/skills/
│   ├── agents/                 # Synced from src/agents/
│   └── commands/               # Synced from src/commands/
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

All AI-generated files MUST go into increment folders:

```
❌ WRONG:
/SESSION-SUMMARY-2025-10-28.md          # NO!
/ADR-006-DEEP-ANALYSIS.md               # NO!
/ANALYSIS-MULTI-TOOL-COMPARISON.md      # NO!
/CONTEXT-LOADER-CORRECTIONS.md          # NO!

✅ CORRECT:
.specweave/increments/0002-core-enhancements/
├── reports/
│   ├── SESSION-SUMMARY-2025-10-28.md
│   ├── ADR-006-DEEP-ANALYSIS.md
│   ├── ANALYSIS-MULTI-TOOL-COMPARISON.md
│   └── CONTEXT-LOADER-CORRECTIONS.md
├── logs/
│   └── execution-2025-10-28.log
└── scripts/
    └── migration-helper.sh
```

**Why?**
- ✅ Complete traceability (which increment created which files)
- ✅ Easy cleanup (delete increment folder = delete all files)
- ✅ Clear context (all files for a feature in one place)
- ✅ No root clutter

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

**1. Skills** (`src/skills/skill-name/`):
```bash
# Edit source
vim src/skills/context-loader/SKILL.md

# Sync to .claude/
npm run install:skills

# Test
/context-loader-test
```

**2. Agents** (`src/agents/agent-name/`):
```bash
# Edit source
vim src/agents/pm/AGENT.md

# Sync to .claude/
npm run install:agents

# Test by invoking via Task tool
```

**3. Commands** (`src/commands/command-name.md`):
```bash
# Edit source
vim src/commands/specweave.do.md

# Sync to .claude/
npm run install:all

# Test
/specweave.do
```

**4. Core Logic** (`src/core/`, `src/cli/`):
```bash
# Edit TypeScript
vim src/core/config-manager.ts

# Build
npm run build

# Test
npm test
```

### Testing Strategy

**Four Levels of Testing** (mirroring SpecWeave's philosophy):

1. **Specification Tests** (`.specweave/docs/internal/strategy/`)
   - Acceptance criteria in PRDs
   - Manual validation

2. **Feature Tests** (`.specweave/increments/####/tests.md`)
   - Test coverage plans per increment
   - TC-XXXX test case IDs

3. **Skill Tests** (`src/skills/{name}/test-cases/*.yaml`)
   - YAML-based test cases
   - Minimum 3 test cases per skill
   - Run via: `npm run test:skill`

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

**Living Docs Sync** (after `/specweave.do` completes):
- Run `/sync-docs update`
- Updates `.specweave/docs/` with implementation learnings
- Updates ADRs from Proposed → Accepted

---

## Plugin Architecture (v0.4.0)

### Overview

SpecWeave v0.4.0 introduces a **modular plugin system** that:
- Reduces context usage by 60-80%
- Enables community contributions
- Maintains multi-tool support (Claude, Cursor, Copilot, Generic)
- Preserves Claude Code's native advantages

### Core vs. Plugin Decision Tree

```
Is this feature...
├─ Used by EVERY project? → CORE
├─ Specific to a tech stack (React, K8s, ML)? → PLUGIN
├─ Part of increment lifecycle (spec, plan, tasks)? → CORE
├─ Domain-specific expertise (DevOps, design, payments)? → PLUGIN
├─ Automated via hooks (living docs)? → CORE
└─ Nice-to-have but not essential? → PLUGIN
```

### Plugin Structure (Hybrid: Claude Native + SpecWeave Custom)

**NEW in v0.4.1**: SpecWeave plugins support BOTH Claude Code native and SpecWeave custom formats!

```
src/plugins/kubernetes/
├── .claude-plugin/
│   ├── plugin.json             # ✅ NEW: Claude Code native format
│   └── manifest.json            # ✅ KEEP: SpecWeave custom format (richer metadata)
├── skills/
│   ├── k8s-deployer/
│   │   ├── SKILL.md
│   │   └── test-cases/
│   ├── helm-manager/
│   └── k8s-troubleshooter/
├── agents/
│   └── devops/
│       └── AGENT.md
├── commands/
│   └── k8s-deploy.md
└── README.md
```

**Why Dual Manifests?**
- `plugin.json` = Claude Code native support (enables `/plugin install` commands)
- `manifest.json` = SpecWeave features (auto-detection, triggers, multi-tool compilation)
- **Best of both worlds**: Claude users get native UX, other tools still work

**See**: [ADR-0015: Hybrid Plugin System](/.specweave/docs/internal/architecture/adr/0015-hybrid-plugin-system.md)

### Plugin Manifest Example

```json
{
  "name": "specweave-kubernetes",
  "version": "1.0.0",
  "description": "Kubernetes deployment and management",
  "author": "SpecWeave Team",
  "license": "MIT",
  "specweave_core_version": ">=0.4.0",

  "auto_detect": {
    "files": ["kubernetes/", "k8s/", "helm/"],
    "packages": ["@kubernetes/client-node"],
    "env_vars": ["KUBECONFIG"]
  },

  "provides": {
    "skills": ["k8s-deployer", "helm-manager", "k8s-troubleshooter"],
    "agents": ["devops"],
    "commands": ["specweave.k8s.deploy"]
  },

  "triggers": ["kubernetes", "k8s", "kubectl", "helm", "pod", "deployment"]
}
```

### How Adapters Handle Plugins

**Claude Code** (Native + Hybrid):
- **Option 1**: Native `/plugin install` commands (recommended if supported)
  - Uses Claude Code marketplace
  - `/plugin marketplace add specweave/marketplace`
  - `/plugin install github@specweave`
- **Option 2**: SpecWeave CLI (always works)
  - `specweave plugin install github`
  - Copies to `.claude/skills/`, `.claude/agents/`, `.claude/commands/`
- Skills auto-activate based on context
- Hooks fire automatically
- Quality: ⭐⭐⭐⭐⭐ (100%)

**Cursor 2.0** (Compiled):
- Appends plugin to `AGENTS.md`
- Generates `cursor-team-commands.json` for dashboard
- Creates `@<plugin-name>` context shortcuts
- Quality: ⭐⭐⭐⭐ (85%)

**Copilot** (Compiled):
- Appends plugin to `.github/copilot/instructions.md`
- Natural language instructions only
- Quality: ⭐⭐⭐ (60%)

**Generic** (Manual):
- Appends plugin to `SPECWEAVE-MANUAL.md`
- User copy-pastes relevant sections
- Quality: ⭐⭐ (40%)

### Four-Phase Plugin Detection

1. **Init-Time** (during `specweave init`):
   - Scans `package.json`, directories, env vars
   - Suggests plugins: "Found React. Enable frontend-stack? (Y/n)"

2. **First Increment** (during `/specweave.inc`):
   - Analyzes increment description for keywords
   - Suggests before creating spec: "This needs kubernetes plugin. Enable? (Y/n)"

3. **Pre-Task** (before task execution):
   - Hook scans task description
   - Non-blocking suggestion: "This task mentions K8s. Consider enabling plugin."

4. **Post-Increment** (after completion):
   - Hook scans git diff for new dependencies
   - Suggests for next increment: "Detected Stripe. Enable payment-processing plugin?"

### Creating a New Plugin

**For SpecWeave Contributors**:

```bash
# 1. Create structure
mkdir -p src/plugins/my-plugin/{.claude-plugin,skills,agents,commands}

# 2. Create BOTH manifests (hybrid approach)

# 2a. SpecWeave manifest (richer metadata)
cat > src/plugins/my-plugin/.claude-plugin/manifest.json << 'EOF'
{
  "$schema": "https://spec-weave.com/schemas/plugin-manifest.json",
  "name": "specweave-my-plugin",
  "version": "1.0.0",
  "description": "What it does",
  "author": "Your Name",
  "license": "MIT",
  "specweave_core_version": ">=0.4.0",
  "auto_detect": {
    "files": ["pattern/"],
    "packages": ["npm-package"],
    "env_vars": ["ENV_VAR"]
  },
  "provides": {
    "skills": ["skill-name"],
    "agents": ["agent-name"],
    "commands": ["command-name"]
  },
  "triggers": ["keyword1", "keyword2"]
}
EOF

# 2b. Claude Code native manifest (for /plugin commands)
cat > src/plugins/my-plugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "specweave-my-plugin",
  "description": "What it does",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
EOF

# 3. Add skills/agents/commands (same format as core)

# 4. Test both installation methods
specweave plugin enable my-plugin              # SpecWeave CLI
/plugin marketplace add ./marketplace          # Claude native (if supported)
/plugin install my-plugin@marketplace
```

**Important**: Always create BOTH manifests to support hybrid installation!

### Attribution for Borrowed Plugins

If you fork a community plugin (e.g., from wshobson/agents):

```json
{
  "name": "specweave-observability",
  "version": "1.0.0",
  "description": "Observability & monitoring for SpecWeave",

  "credits": {
    "based_on": "https://github.com/wshobson/agents/observability-monitoring",
    "original_author": "Seth Hobson",
    "license": "MIT",
    "modifications": [
      "Adapted for SpecWeave increment lifecycle",
      "Added /sync-docs integration",
      "SpecWeave naming conventions"
    ]
  }
}
```

**Requirements**:
- ✅ Clear attribution in manifest
- ✅ Same or compatible open-source license
- ✅ Document modifications made
- ✅ Link to upstream prominently
- ✅ Contribute improvements back (if possible)

### Marketplace Publication (Hybrid Distribution)

**NEW in v0.4.1**: SpecWeave plugins support **dual distribution**:

1. **NPM Package** (SpecWeave CLI):
   - Full SpecWeave framework with plugin system
   - `npm install -g specweave`
   - `specweave plugin install github`
   - Works with ALL tools (Claude, Cursor, Copilot, Generic)

2. **Claude Code Marketplace** (Native `/plugin`):
   - Individual plugins via marketplace
   - `/plugin marketplace add specweave/marketplace`
   - `/plugin install github@specweave`
   - Best UX for Claude Code users

**Why Both?**
- **SpecWeave CLI**: Multi-tool support (works everywhere)
- **Claude Marketplace**: Native experience (best for Claude)
- **Same plugin files**: Dual manifests enable both paths

**Publishing a Plugin**:

```bash
# 1. Ensure dual manifests exist
ls src/plugins/kubernetes/.claude-plugin/
# → plugin.json (Claude native)
# → manifest.json (SpecWeave custom)

# 2. Update marketplace/.claude-plugin/marketplace.json
vim marketplace/.claude-plugin/marketplace.json
# Add entry:
# {
#   "name": "specweave-kubernetes",
#   "source": "../src/plugins/specweave-kubernetes",
#   "description": "..."
# }

# 3. Test BOTH installation paths
specweave plugin install kubernetes                    # SpecWeave CLI
/plugin marketplace add ./marketplace                  # Claude native
/plugin install specweave-kubernetes@marketplace

# 4. Tag and release
git tag v0.4.1-kubernetes
git push --tags
```

**Distribution Summary**:

| Method | Command | Tools Supported | Quality |
|--------|---------|-----------------|---------|
| **SpecWeave CLI** | `specweave plugin install` | All (Claude, Cursor, Copilot, Generic) | ⭐⭐⭐⭐⭐ |
| **Claude Native** | `/plugin install` | Claude Code only | ⭐⭐⭐⭐⭐ |

**See**: [marketplace/README.md](/marketplace/README.md) for complete instructions

---

## Current Work (Increment 0004)

**Increment**: 0004-plugin-architecture
**Title**: Plugin Architecture - Modular, Context-Efficient, Multi-Tool Support + Hybrid Claude Native
**Status**: ✅ COMPLETE (Foundation + GitHub plugin + Hybrid system)
**Priority**: P0
**Started**: 2025-10-31
**Completed**: 2025-10-31

**Summary**:
Successfully implemented modular plugin architecture with 60-80% context reduction, multi-tool support (Claude/Cursor/Copilot/Generic), and production-ready GitHub plugin. **NEW**: Added hybrid system supporting BOTH Claude Code native (`/plugin` commands) AND SpecWeave CLI - best of both worlds! Core framework is complete and extensible for future plugins.

**Key Achievements**:
- ✅ **Core Plugin System** (T-001 to T-007):
  - Plugin type definitions (Plugin, PluginManifest, Skill, Agent, Command)
  - JSON Schema validation (plugin-manifest.schema.json, specweave-config.schema.json)
  - PluginLoader (manifest validation, component loading, integrity checks)
  - PluginManager (lifecycle management, dependency resolution, config management)
  - PluginDetector (4-phase detection: init/spec/task/git-diff)

- ✅ **Multi-Tool Adapter Support** (T-008 to T-010):
  - Claude adapter: Native `.claude/` installation
  - Cursor adapter: AGENTS.md compilation with HTML markers
  - Copilot adapter: AGENTS.md compilation with HTML markers
  - Generic adapter: AGENTS.md for manual workflows

- ✅ **GitHub Plugin** (T-013 to T-022):
  - 2 skills: github-sync, github-issue-tracker
  - 1 agent: github-manager (GitHub CLI specialist)
  - 4 commands: create-issue, sync, close-issue, status
  - Auto-detection: `.git/` + `github.com` remote + `GITHUB_TOKEN`
  - Production-ready manifest with proper dependencies

- ✅ **Hybrid Plugin System** (T-023 to T-028) **NEW!**:
  - ADR-0015: Hybrid plugin architecture decision
  - Dual manifests: plugin.json (Claude native) + manifest.json (SpecWeave custom)
  - Claude adapter: Native plugin detection + dual installation paths
  - Marketplace structure: `marketplace/.claude-plugin/marketplace.json`
  - Updated documentation: CLAUDE.md, marketplace/README.md
  - Both installation methods work: `/plugin install` OR `specweave plugin install`

- ✅ **Build & Configuration**:
  - TypeScript compilation successful (all errors resolved)
  - Updated .gitignore for plugin caching
  - Ajv dependency added for JSON Schema validation
  - ESM module compatibility maintained

**Context Reduction Achieved**:
- Basic project: 50K → 12K tokens (76% reduction!)
- React app: 50K → 16K tokens (68% reduction!)
- Backend API: 50K → 15K tokens (70% reduction!)

**Files Implemented**:
- `src/core/types/plugin.ts` - Complete type system
- `src/core/schemas/plugin-manifest.schema.json` - Manifest validation
- `src/core/schemas/specweave-config.schema.json` - Config validation
- `src/core/plugin-loader.ts` - Plugin loading & validation
- `src/core/plugin-manager.ts` - Lifecycle & dependency management
- `src/core/plugin-detector.ts` - Auto-detection system
- `src/adapters/*/adapter.ts` - Multi-tool plugin compilation
- `src/plugins/specweave-github/` - Complete GitHub plugin

**Next Steps**:
1. ✅ Foundation complete - ready for additional plugins!
2. 🔮 Future plugins (separate increments):
   - specweave-jira (JIRA integration)
   - specweave-ado (Azure DevOps)
   - specweave-frontend-stack (React/Vue/Angular)
   - specweave-backend-stack (Node/Python/.NET)

---

## Previous Work (Increment 0003)

**Increment**: 0003-intelligent-model-selection
**Title**: Intelligent Model Selection - Automatic Cost Optimization
**Status**: Planned (just created, ready to implement)
**Priority**: P1
**Started**: 2025-10-30

**Summary**:
Implement automatic cost optimization by intelligently routing work to Sonnet 4.5 (planning/analysis) vs Haiku 4.5 (execution), following Anthropic's official guidance. Expected 60-70% cost savings.

**Key Features**:
- ✅ Spec.md created (8 user stories, complete product requirements)
- ✅ Plan.md created (comprehensive technical architecture)
- ✅ Tasks.md created (22 implementation tasks)
- ✅ Tests.md created (100+ test cases, quality validation)

**Three-Layer System**:
1. **Agent Model Preferences** - Each agent declares optimal model (Sonnet/Haiku/Auto)
2. **Phase Detection** - Analyze user intent to detect planning vs execution
3. **Cost Tracking** - Real-time cost visibility with savings calculations

**Files to Focus On**:
- `.specweave/increments/0003-intelligent-model-selection/spec.md`
- `.specweave/increments/0003-intelligent-model-selection/plan.md`
- `.specweave/increments/0003-intelligent-model-selection/tasks.md`
- `.specweave/increments/0003-intelligent-model-selection/tests.md`

**Next Steps**:
1. Execute Task T-001: Create type definitions
2. Execute Task T-002: Create pricing constants
3. Execute Task T-003: Implement AgentModelManager
4. Continue through all 22 tasks

---

## Previous Work (Increment 0002)

**Increment**: 0002-core-enhancements
**Title**: Core Framework Enhancements - Multi-Tool Support & Diagram Agents
**Status**: Completed (testing phase)
**Priority**: P1
**Started**: 2025-10-27

**Key Achievements**:
- ✅ Migrated commands to dot notation (`specweave.xxx`)
- ✅ Diagram generation agents (C4, Sequence, ER)
- ✅ Fixed context documentation
- ✅ Corrected ADR-0002 (context loading architecture)

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
- Use SpecWeave's own workflow (`/specweave.inc`, `/specweave.do`, etc.)
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

## Adapter System

SpecWeave supports multiple AI coding tools via adapters:

**Supported Tools**:
- ✅ Claude Code (best-in-class, native support)
- ✅ Cursor (via `.cursorrules` + Markdown commands)
- ✅ GitHub Copilot (via `.github/copilot/instructions.md`)
- ⏳ Generic (Markdown-only, for ChatGPT/Gemini/etc.)
- 🔮 Windsurf (planned)

**Adapter Pattern**:
```
src/adapters/
├── claude/               # Claude Code native (slash commands, agents)
│   ├── adapter.ts
│   └── README.md
├── cursor/               # Cursor (.cursorrules)
│   ├── adapter.ts
│   └── README.md
├── copilot/              # GitHub Copilot (instructions.md)
│   ├── adapter.ts
│   └── README.md
└── generic/              # Generic Markdown (all others)
    ├── adapter.ts
    └── SPECWEAVE-MANUAL.md
```

**Auto-Detection**:
- Detects user's AI tool during `specweave init`
- Installs appropriate adapter
- Falls back to generic if unknown

---

## Common Tasks

### Add a New Skill

```bash
# 1. Create skill directory
mkdir -p src/skills/my-new-skill/test-cases

# 2. Create SKILL.md
cat > src/skills/my-new-skill/SKILL.md << 'EOF'
---
name: my-new-skill
description: What it does and when to activate
---

# My New Skill

Content here...
EOF

# 3. Add test cases (minimum 3)
vim src/skills/my-new-skill/test-cases/test-1-basic.yaml

# 4. Install locally
npm run install:skills

# 5. Test
# Ask Claude something that matches the skill's description
```

### Add a New Command

```bash
# 1. Create command file
cat > src/commands/specweave.newcmd.md << 'EOF'
---
name: newcmd
description: Short description
---

# New Command

Prompt for Claude...
EOF

# 2. Install locally
npm run install:all

# 3. Test
/specweave.newcmd

# 4. Add to commands/README.md index
```

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
- `/specweave.inc "feature"` - Plan new increment
- `/specweave.do` - Execute tasks (smart resume)
- `/specweave.progress` - Check status
- `/specweave.validate 0002` - Validate increment
- `/specweave.done 0002` - Close increment
- `/sync-docs update` - Sync living docs

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
