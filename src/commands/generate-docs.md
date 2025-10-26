# /generate-docs - Generate Comprehensive Documentation

**Command**: `/generate-docs [--mode=MODE] [--type=TYPE]`

**Purpose**: Automatically generate comprehensive documentation by scanning the project (supports BOTH SpecWeave framework AND user projects)

**Framework**: Framework-agnostic documentation generation

---

## Dual Mode Support

**SpecWeave generates documentation for TWO different scenarios**:

1. **Framework Mode** (`--mode=framework`): Generate documentation ABOUT SpecWeave framework itself
   - For SpecWeave repository developers
   - Documents agents, skills, commands, hooks
   - Creates framework user guides

2. **Project Mode** (`--mode=project`): Generate documentation FOR user's project
   - For teams using SpecWeave in their projects
   - Documents project APIs, architecture, deployment
   - Works with brownfield projects (existing codebases)
   - Supports ANY tech stack (Next.js, Django, Go, etc.)

**Auto-detection** (`--mode=auto`, default): Automatically detects which mode based on project structure

---

## Usage

```bash
# Auto-detect mode (recommended)
/generate-docs --type=all              # Detects framework vs project automatically

# Explicit framework mode (SpecWeave repo)
/generate-docs --mode=framework --type=all

# Explicit project mode (user's project)
/generate-docs --mode=project --type=all

# Brownfield project documentation
/generate-docs --mode=project --type=all

# Specific documentation types
/generate-docs --type=public           # Only public user-facing docs
/generate-docs --type=internal         # Only internal development docs
/generate-docs --type=diagrams         # Only C4 architecture diagrams
/generate-docs --type=adrs             # Only Architecture Decision Records
/generate-docs --type=api              # Only API reference (auto-generated)
/generate-docs --type=youtube          # Only YouTube scripts (framework mode only)
```

---

## Mode Detection (Auto)

**How SpecWeave determines which mode to use**:

```
1. Check for src/agents/ AND src/skills/ AND CLAUDE.md mentions "SpecWeave framework"
   → Framework mode (documenting SpecWeave itself)

2. Check for .specweave/ folder in project root
   → Project mode (documenting user's project)

3. If ambiguous → Ask user which mode
```

**Override detection** with `--mode=framework` or `--mode=project`

---

## What Gets Generated

### Framework Mode (`--mode=framework`)

**For SpecWeave repository** (~120+ pages):

✅ **Public Documentation** (40+ pages in `.specweave/docs/public/`):
- Overview (introduction, features, how-it-works, use-cases, comparison)
- Guides (installation, quick-start, first-increment, agents, skills, lifecycle)
- API Reference (CLI commands, agents, skills, hooks) - AUTO-GENERATED
- Changelog - AUTO-GENERATED

✅ **Internal Documentation** (80+ pages in `.specweave/docs/internal/`):
- Strategy (vision, framework capabilities, agents system, skills system, workflows)
- Architecture (system design, C4 diagrams, ADRs)
- Delivery (roadmap, release process, conventions, testing strategy)
- Operations (deployment, monitoring)
- Governance (security, compliance)

✅ **C4 Architecture Diagrams** (5 diagrams):
- System Context (C4 Level 1)
- System Container (C4 Level 2)
- Agents Architecture (C4 Level 3)
- Skills Architecture (C4 Level 3)
- Lifecycle Flow (Sequence diagram)

✅ **Architecture Decision Records** (20+ ADRs):
- ADR-001 through ADR-020 documenting all major decisions

✅ **YouTube Scripts** (6 scripts in `youtube-content/scripts/`):
- Introduction to SpecWeave (5-10 min)
- Increment Lifecycle Management (10-15 min)
- Agents vs Skills (5-10 min)
- Context Loading (5-10 min)
- Autonomous SaaS Development (15-20 min)
- Complete Tutorial (30-45 min)

**Estimated time**: 10-15 minutes
**Estimated output**: 120+ files

---

### Project Mode (`--mode=project`)

**For user's project** (varies by project size, typically 30-100+ pages):

✅ **Public Documentation** (`.specweave/docs/public/`):
- Overview (project introduction, features, use cases)
- User Guides (getting started, how-to guides, tutorials)
- API Documentation (endpoints, authentication, examples) - AUTO-GENERATED from code
- Changelog (releases, breaking changes) - AUTO-GENERATED from increments

✅ **Internal Documentation** (`.specweave/docs/internal/`):
- Strategy (product vision, roadmap, specs from `.specweave/docs/internal/strategy/`)
- Architecture (system design, tech stack, component diagrams, ADRs)
- Delivery (release process, testing strategy, conventions)
- Operations (deployment guides, monitoring, runbooks)
- Governance (security policies, compliance requirements)

✅ **C4 Architecture Diagrams** (project-specific):
- System Context (external systems, users)
- System Container (databases, services, APIs)
- Component diagrams (high-level components)

✅ **Architecture Decision Records** (ADRs):
- Extracted from CLAUDE.md, increment reports, architecture docs
- Documents tech stack choices, design patterns

✅ **Brownfield Support** (for existing codebases):
- Scans existing code to extract API endpoints
- Generates OpenAPI/Swagger specs
- Documents database schema
- Creates component diagrams from code structure

**Estimated time**: 5-10 minutes
**Estimated output**: 30-100+ files (depends on project size)

---

## Workflow

### Step 1: Detect Mode and Scan Project

**Framework Mode**:
```
Detecting mode... Framework mode detected ✅

Scanning SpecWeave project...
→ CLAUDE.md (2062 lines) ✅
→ Agents: 20 (src/agents/) ✅
→ Skills: 24 (src/skills/) ✅
→ Commands: 9 (src/commands/) ✅
→ Hooks: 4 (src/hooks/) ✅
→ Increments: 1 (001-core-framework) ✅
→ Reports: 5 (lifecycle, consolidation, etc.) ✅

Analysis complete.
```

**Project Mode** (example: Next.js SaaS):
```
Detecting mode... Project mode detected ✅
Tech stack detected: Next.js 14, TypeScript, PostgreSQL, Stripe

Scanning project...
→ CLAUDE.md (found, project-specific) ✅
→ Tech stack: Next.js, TypeScript ✅
→ Source code: src/ (48 files) ✅
→ API routes: app/api/ (12 endpoints) ✅
→ Database schema: prisma/schema.prisma ✅
→ Increments: 5 (.specweave/increments/) ✅
→ Specs: 8 modules (.specweave/docs/internal/strategy/) ✅
→ Architecture docs: 12 files ✅

Analysis complete.
```

**Project Mode** (brownfield example: Django REST API):
```
Detecting mode... Project mode detected ✅
Tech stack detected: Django 5.0, Python 3.12, PostgreSQL, Redis

Scanning brownfield project...
→ Existing codebase detected ✅
→ Tech stack: Django, Python ✅
→ Source code: app/ (127 files) ✅
→ API endpoints: 34 (extracted from urls.py + views) ✅
→ Models: 18 (Django ORM) ✅
→ No .specweave/docs/ found → Will generate from code ✅

Analysis complete. Brownfield mode activated.
```

### Step 2: Invoke Documentation Agent

```
Activating docs-architect agent...

→ Agent: docs-architect (specialized documentation expert)
→ Mode: [framework|project]
→ Task: Generate comprehensive documentation
→ Type: all
→ Output: .specweave/docs/

Agent working...
```

### Step 3: Generate Documentation

**Framework Mode** (SpecWeave repo):
```
**Public Docs** (15 files):
Creating .specweave/docs/public/overview/introduction.md
Creating .specweave/docs/public/overview/features.md
Creating .specweave/docs/public/overview/how-it-works.md
Creating .specweave/docs/public/overview/use-cases.md
Creating .specweave/docs/public/overview/comparison.md

Creating .specweave/docs/public/guides/installation.md
Creating .specweave/docs/public/guides/quick-start.md
Creating .specweave/docs/public/guides/your-first-increment.md
Creating .specweave/docs/public/guides/understanding-agents.md
Creating .specweave/docs/public/guides/understanding-skills.md
Creating .specweave/docs/public/guides/lifecycle-management.md

Generating .specweave/docs/public/api/cli-commands.md (AUTO-GENERATED)
Generating .specweave/docs/public/api/agents-reference.md (AUTO-GENERATED)
Generating .specweave/docs/public/api/skills-reference.md (AUTO-GENERATED)
Generating .specweave/docs/public/api/hooks-reference.md

Generating .specweave/docs/public/changelog/CHANGELOG.md (AUTO-GENERATED)

**Internal Docs** (20+ files):
Creating .specweave/docs/internal/strategy/overview.md
Creating .specweave/docs/internal/strategy/core/framework-capabilities.md
Creating .specweave/docs/internal/strategy/agents/agents-system.md
Creating .specweave/docs/internal/strategy/skills/skills-system.md
Creating .specweave/docs/internal/strategy/workflows/increment-lifecycle.md

Creating .specweave/docs/internal/architecture/system-design.md
Creating .specweave/docs/internal/architecture/diagrams/system-context.mmd
Creating .specweave/docs/internal/architecture/diagrams/system-container.mmd
Creating .specweave/docs/internal/architecture/diagrams/agents/agents-architecture.mmd
Creating .specweave/docs/internal/architecture/diagrams/skills/skills-architecture.mmd
Creating .specweave/docs/internal/architecture/diagrams/lifecycle/lifecycle-flow.mmd

Creating .specweave/docs/internal/architecture/adr/001-tech-stack.md
Creating .specweave/docs/internal/architecture/adr/002-context-loading.md
... (18 more ADRs)

Creating .specweave/docs/internal/delivery/roadmap.md
Creating .specweave/docs/internal/delivery/release-process.md
Creating .specweave/docs/internal/delivery/guides/project-conventions.md
Creating .specweave/docs/internal/delivery/guides/testing-strategy.md

Creating .specweave/docs/internal/operations/deployment.md
Creating .specweave/docs/internal/operations/monitoring.md

Creating .specweave/docs/internal/governance/security.md
Creating .specweave/docs/internal/governance/compliance.md

**YouTube Scripts** (6 files):
Creating youtube-content/scripts/01-introduction-to-specweave.md
Creating youtube-content/scripts/02-increment-lifecycle-management.md
Creating youtube-content/scripts/03-agents-vs-skills.md
Creating youtube-content/scripts/04-context-loading.md
Creating youtube-content/scripts/05-autonomous-saas-development.md
Creating youtube-content/scripts/06-complete-tutorial.md
```

**Project Mode** (user's Next.js SaaS example):
```
**Public Docs** (project-specific):
Creating .specweave/docs/public/overview/introduction.md (TaskManager SaaS)
Creating .specweave/docs/public/overview/features.md (project features)
Creating .specweave/docs/public/guides/getting-started.md
Creating .specweave/docs/public/guides/user-guide.md
Creating .specweave/docs/public/guides/integrations.md

Generating .specweave/docs/public/api/endpoints.md (AUTO-GENERATED from app/api/)
→ Extracted 12 API endpoints
→ Generated OpenAPI 3.0 spec
→ Created authentication guide

Generating .specweave/docs/public/changelog/CHANGELOG.md (AUTO-GENERATED)
→ Extracted from 5 increments
→ Parsed release history

**Internal Docs** (project-specific):
Creating .specweave/docs/internal/architecture/system-design.md (Next.js architecture)
Creating .specweave/docs/internal/architecture/tech-stack.md (Next.js, Prisma, PostgreSQL)
Creating .specweave/docs/internal/architecture/diagrams/system-context.mmd
Creating .specweave/docs/internal/architecture/diagrams/database-schema.mmd (from Prisma)

Creating .specweave/docs/internal/architecture/adr/001-nextjs-app-router.md
Creating .specweave/docs/internal/architecture/adr/002-prisma-orm.md
Creating .specweave/docs/internal/architecture/adr/003-stripe-integration.md
... (extracted from CLAUDE.md + increment reports)

Creating .specweave/docs/internal/operations/deployment.md (Vercel deployment guide)
Creating .specweave/docs/internal/operations/monitoring.md (Vercel Analytics + Sentry)
```

**Project Mode** (brownfield Django example):
```
**Brownfield mode activated** - Generating docs from existing codebase

Scanning existing codebase...
→ Extracting API endpoints from urls.py + views.py
→ Documenting Django models (18 models found)
→ Analyzing settings.py for tech stack
→ Creating architecture diagrams from code structure

Creating .specweave/docs/public/api/endpoints.md (AUTO-GENERATED)
→ 34 API endpoints documented
→ Generated OpenAPI spec from Django REST Framework serializers

Creating .specweave/docs/internal/architecture/database-schema.md
→ 18 Django models documented
→ Relationships mapped

Creating .specweave/docs/internal/architecture/system-design.md
→ Architecture extracted from code structure
→ Services, middleware, authentication documented
```

### Step 4: Summary

**Framework Mode**:
```
✅ Documentation generation complete

Summary:
→ Public docs: 15 files (40+ pages)
→ Internal docs: 25 files (80+ pages)
→ C4 diagrams: 5 files
→ ADRs: 20 files
→ YouTube scripts: 6 files
→ Total: 71 files created/updated

Location: .specweave/docs/
Time: 12 minutes

Next steps:
1. Review documentation: ls -R .specweave/docs/
2. View diagrams: cat .specweave/docs/internal/architecture/diagrams/*.mmd
3. Deploy docs: mkdocs build && mkdocs gh-deploy
```

**Project Mode** (Next.js example):
```
✅ Documentation generation complete

Summary:
→ Public docs: 8 files (user-facing)
→ API documentation: 1 file (12 endpoints)
→ Internal docs: 12 files (architecture, ADRs, operations)
→ C4 diagrams: 3 files
→ ADRs: 5 files
→ Total: 29 files created/updated

Location: .specweave/docs/
Tech stack: Next.js, TypeScript, PostgreSQL, Stripe
Time: 7 minutes

Next steps:
1. Review documentation: ls -R .specweave/docs/
2. View API docs: cat .specweave/docs/public/api/endpoints.md
3. Deploy docs: mkdocs build && mkdocs gh-deploy
```

**Project Mode** (brownfield Django example):
```
✅ Documentation generation complete (brownfield mode)

Summary:
→ API documentation: 1 file (34 endpoints extracted from code)
→ Database schema: 1 file (18 Django models)
→ Architecture docs: 8 files (extracted from codebase)
→ C4 diagrams: 3 files
→ Total: 21 files created from existing codebase

Location: .specweave/docs/
Tech stack: Django 5.0, Python 3.12, PostgreSQL, Redis
Time: 6 minutes

Next steps:
1. Review extracted documentation: ls -R .specweave/docs/
2. Verify API endpoints: cat .specweave/docs/public/api/endpoints.md
3. Review architecture: cat .specweave/docs/internal/architecture/system-design.md
```

---

## Auto-Generated vs Manual

### Auto-Generated Files (Marked with Comment)

**DO NOT EDIT MANUALLY** - Regenerate with `/generate-docs --type=api`

```markdown
<!-- AUTO-GENERATED - DO NOT EDIT MANUALLY -->
<!-- Last generated: 2025-10-26 -->
<!-- To update: Run /generate-docs --type=api -->
```

**Files**:
- `.specweave/docs/public/api/cli-commands.md` - Scans `.claude/commands/*.md`
- `.specweave/docs/public/api/agents-reference.md` - Scans `src/agents/*/AGENT.md`
- `.specweave/docs/public/api/skills-reference.md` - Scans `src/skills/*/SKILL.md`
- `.specweave/docs/public/changelog/CHANGELOG.md` - Scans git tags + reports

### Manual Files (Preserved)

**Edit freely** - Will not be overwritten on regeneration

**Examples**:
- `.specweave/docs/public/overview/introduction.md`
- `.specweave/docs/public/guides/quick-start.md`
- `.specweave/docs/internal/architecture/system-design.md`

**On regeneration**:
- Checks if file exists
- If exists: Preserves content (unless force flag)
- If new: Generates from template

---

## Specific Type Options

### --type=public

Generates only user-facing documentation:
- Overview (5 files)
- Guides (6 files)
- API reference (4 files)
- Changelog (1 file)

**Use when**: Updating public docs for users

### --type=internal

Generates only framework development documentation:
- Strategy (5 files)
- Architecture (6 files + diagrams)
- Delivery (4 files)
- Operations (2 files)
- Governance (2 files)

**Use when**: Updating internal framework docs

### --type=diagrams

Generates only C4 architecture diagrams:
- System Context (C4 Level 1)
- System Container (C4 Level 2)
- Component diagrams (C4 Level 3)
- Sequence diagrams (flows)

**Use when**: Updating architecture visualizations

### --type=adrs

Generates only Architecture Decision Records:
- Scans CLAUDE.md for decisions
- Scans increment reports
- Creates ADR-XXX.md files
- Documents context, decision, consequences

**Use when**: Documenting new architectural decisions

### --type=youtube (OPTIONAL)

**Optional**: Generates YouTube video scripts for your project

**Framework Mode**: SpecWeave marketing/tutorial videos
- Introduction to SpecWeave (5-10 min)
- Lifecycle management (10-15 min)
- Agents vs Skills (5-10 min)
- Context loading (5-10 min)
- Autonomous development (15-20 min)
- Complete tutorial (30-45 min)

**Project Mode**: Project-specific video scripts
- Introduction to your project
- Key features walkthrough
- How-to tutorials
- Architecture overview

**Use when**: Creating YouTube content for framework or your project

### --type=api

Regenerates only auto-generated API reference:
- CLI commands reference
- Agents reference
- Skills reference
- Hooks reference
- Changelog

**Use when**: New agent/skill/command added

---

## Documentation Structure

### Public (`.specweave/docs/public/`)

```
public/
├── overview/
│   ├── introduction.md
│   ├── features.md
│   ├── how-it-works.md
│   ├── use-cases.md
│   └── comparison.md
├── guides/
│   ├── installation.md
│   ├── quick-start.md
│   ├── your-first-increment.md
│   ├── understanding-agents.md
│   ├── understanding-skills.md
│   └── lifecycle-management.md
├── api/
│   ├── cli-commands.md (AUTO-GENERATED)
│   ├── agents-reference.md (AUTO-GENERATED)
│   ├── skills-reference.md (AUTO-GENERATED)
│   └── hooks-reference.md
└── changelog/
    └── CHANGELOG.md (AUTO-GENERATED)
```

### Internal (`.specweave/docs/internal/`)

```
internal/
├── strategy/
│   ├── overview.md
│   ├── core/framework-capabilities.md
│   ├── agents/agents-system.md
│   ├── skills/skills-system.md
│   └── workflows/increment-lifecycle.md
├── architecture/
│   ├── system-design.md
│   ├── diagrams/
│   │   ├── system-context.mmd
│   │   ├── system-container.mmd
│   │   ├── agents/agents-architecture.mmd
│   │   ├── skills/skills-architecture.mmd
│   │   └── lifecycle/lifecycle-flow.mmd
│   └── adr/
│       ├── 001-tech-stack.md
│       ├── 002-context-loading.md
│       └── ... (18 more)
├── delivery/
│   ├── roadmap.md
│   ├── release-process.md
│   └── guides/
│       ├── project-conventions.md
│       └── testing-strategy.md
├── operations/
│   ├── deployment.md
│   └── monitoring.md
└── governance/
    ├── security.md
    └── compliance.md
```

---

## Related Documentation

- [DOCUMENTATION-GENERATION-ANALYSIS.md](../../.specweave/increments/001-core-framework/reports/DOCUMENTATION-GENERATION-ANALYSIS.md) - Complete analysis
- [CLAUDE.md](../../CLAUDE.md) - Source of truth for framework
- [mkdocs.yml](../../mkdocs.yml) - Documentation site configuration

---

## First Time Setup

```bash
# 1. Generate all documentation
/generate-docs --type=all

# 2. Verify output
ls -R .specweave/docs/

# 3. View a sample
cat .specweave/docs/public/overview/introduction.md

# 4. View diagrams
cat .specweave/docs/internal/architecture/diagrams/system-context.mmd

# 5. Build docs site
mkdocs build

# 6. Serve locally
mkdocs serve

# 7. Open browser
open http://127.0.0.1:8000
```

---

**Command Type**: Documentation generation
**Framework Support**: All
**Output**: 120+ documentation files in `.specweave/docs/`
**Estimated Time**: 10-15 minutes
**Agent Used**: `docs-architect` (invoked automatically)
