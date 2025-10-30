# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Version**: 0.3.7 (Windows fix + Competitive advantages documented)
**Type**: Open Source NPM Package (TypeScript CLI)
**Repository**: https://github.com/anton-abyzov/specweave
**Website**: https://spec-weave.com

This CLAUDE.md is for **contributors to SpecWeave itself**, not users of SpecWeave.
Users receive a different CLAUDE.md via the template system.

---

## Quick Start for Contributors

**Current Work**: Increment 0003 - Intelligent Model Selection (just created - ready to implement)
**Active Branch**: `develop` → merges to `features/001-core-feature`
**Latest**: v0.3.7 - Fixed Windows installation (defaults to claude instead of generic)
**Next**: v0.4.0 - Intelligent cost optimization with Haiku 4.5 + Sonnet 4.5

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
└── config.yaml                 ← Configuration
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
│   │   ├── config-manager.ts   # Config loading/validation
│   │   └── project-structure-detector.ts
│   ├── skills/                 # 35+ skills (SKILL.md + test-cases/)
│   │   ├── increment-planner/
│   │   ├── context-loader/
│   │   └── ...
│   ├── agents/                 # 10 specialized agents (AGENT.md)
│   │   ├── pm/
│   │   ├── architect/
│   │   └── ...
│   ├── commands/               # Slash commands (.md)
│   │   ├── specweave.inc.md
│   │   ├── specweave.do.md
│   │   └── ...
│   ├── hooks/                  # Lifecycle hooks (.sh)
│   │   └── post-task-completion.sh
│   ├── adapters/               # Multi-tool support
│   │   ├── claude/
│   │   ├── cursor/
│   │   ├── copilot/
│   │   └── generic/
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
│   │   ├── internal/           # Strategic docs
│   │   └── public/             # Published docs
│   ├── config.yaml             # SpecWeave's config
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

**Post-Task Completion Hook** (`.claude/hooks/post-task-completion.sh`):
- ✅ Plays completion sound (Glass.aiff on macOS)
- ✅ Outputs JSON systemMessage reminder
- ✅ Logs to `.specweave/logs/tasks.log`

**Manual Actions** (Claude MUST do after each task):
- Update `CLAUDE.md` when structure changes
- Update `README.md` for user-facing changes
- Update `CHANGELOG.md` for API changes

**Living Docs Sync** (after `/specweave.do` completes):
- Run `/sync-docs update`
- Updates `.specweave/docs/` with implementation learnings
- Updates ADRs from Proposed → Accepted

---

## Current Work (Increment 0003)

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
