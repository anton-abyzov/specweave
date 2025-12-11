# SpecWeave Skills Index

**Purpose**: Lightweight skill manifest for lazy loading. Load SKILL.md only when triggers match.

**Total Skills**: 27 | **Last Updated**: 2025-11-24

---

## Lazy Loading Pattern

1. **Match triggers** below to user intent
2. **Load SKILL.md** only for matched skill
3. **Follow workflow** in loaded skill

---

## Skills by Category

### Planning & Workflow

| Skill | Triggers | Location |
|-------|----------|----------|
| **increment-planner** | increment, feature, plan, create increment, new feature, organize work, MVP, SaaS, product, build project, tech stack | `skills/increment-planner/SKILL.md` |
| **increment-work-router** | implement, complete, build, develop, work on, continue, resume, finish, fix, resolve, let's implement, start working | `skills/increment-work-router/SKILL.md` |
| **spec-generator** | specification, spec.md, plan.md, tasks.md, generate spec, create tasks, requirements, acceptance criteria | `skills/spec-generator/SKILL.md` |
| **project-kickstarter** | project, product, SaaS, app, MVP, build, new project, features, I want to build, let's build, quick build | `skills/project-kickstarter/SKILL.md` |
| **roadmap-planner** | roadmap, prioritization, RICE, MoSCoW, Kano, product planning, feature ranking, KPIs, Q1 Q2 Q3 Q4, release planning | `skills/roadmap-planner/SKILL.md` |
| **role-orchestrator** | multi-agent, orchestrate, coordinate roles, complex project, end-to-end, full implementation, build product | `skills/role-orchestrator/SKILL.md` |

### Quality & Validation

| Skill | Triggers | Location |
|-------|----------|----------|
| **increment-quality-judge-v2** | quality check, assess spec, risk assessment, qa check, quality gate, /sw:qa, validate quality, evaluate increment | `skills/increment-quality-judge-v2/SKILL.md` |
| **pm-closure-validation** | /done, close increment, validate increment, completion check, quality gate, PM approval, ready to close, scope creep | `skills/pm-closure-validation/SKILL.md` |
| **code-reviewer** | code review, security vulnerabilities, performance optimization, static analysis, code quality, pull request review | `skills/code-reviewer/SKILL.md` |
| **code-standards-analyzer** | coding standards, conventions, code style, naming conventions, linting rules, best practices, standards audit, anti-patterns | `skills/code-standards-analyzer/SKILL.md` |
| **tdd-workflow** | TDD, test-driven, red-green-refactor, write tests first, test-first, Kent Beck, TDD cycle | `skills/tdd-workflow/SKILL.md` |

### Synchronization

| Skill | Triggers | Location |
|-------|----------|----------|
| **external-sync-wizard** | GitHub sync, Jira integration, Azure DevOps, ADO, issue tracking sync, bidirectional sync, import issues, export increments | `skills/external-sync-wizard/SKILL.md` |
| **progress-sync** | sync progress, update progress, sync everything, sync all systems, sync to GitHub, sync to JIRA, /sw:sync-progress | `skills/progress-sync/SKILL.md` |
| **multi-project-spec-mapper** | multi-project, project mapping, spec splitting, JIRA projects, multiple projects, microservices, FE/BE/MOBILE split | `skills/multi-project-spec-mapper/SKILL.md` |

### Framework & Context

| Skill | Triggers | Location |
|-------|----------|----------|
| **specweave-detector** | slash commands, /sw:increment, /sw:do, /sw:progress, /sw:done, specweave commands, workflow help | `skills/specweave-detector/SKILL.md` |
| **specweave-framework** | specweave rules, how does specweave work, framework structure, increment lifecycle, source of truth, tasks.md format | `skills/specweave-framework/SKILL.md` |
| **context-loader** | context loading, progressive disclosure, token efficiency, sub-agents, context management, how SpecWeave scales | `skills/context-loader/SKILL.md` |
| **context-optimizer** | optimize context, reduce tokens, clean context, smart context, precision loading, 80% reduction | `skills/context-optimizer/SKILL.md` |
| **plugin-validator** | plugin validation, validate plugins, check plugins, specweave init, fresh setup, marketplace registration | `skills/plugin-validator/SKILL.md` |

### Maintenance & Migration

| Skill | Triggers | Location |
|-------|----------|----------|
| **archive-increments** | archive, clean workspace, too many increments, archive old, archive completed, _archive folder, preserve history | `skills/archive-increments/SKILL.md` |
| **smart-reopen-detector** | not working, broken, bug, issue, problem, failing, error, crash, regression, still broken, incorrect, missing | `skills/smart-reopen-detector/SKILL.md` |
| **brownfield-analyzer** | brownfield, existing project, migrate, analyze structure, legacy documentation, PRD/HLD mapping | `skills/brownfield-analyzer/SKILL.md` |
| **brownfield-onboarder** | merge docs, merge claude, onboard brownfield, import existing docs, claude backup, CLAUDE.md merge | `skills/brownfield-onboarder/SKILL.md` |
| **translator** | translate, translation, language, multilingual, i18n, internationalization, Russian, Spanish, Chinese, localization | `skills/translator/SKILL.md` |

### Infrastructure & Compliance

| Skill | Triggers | Location |
|-------|----------|----------|
| **serverless-recommender** | serverless, AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase, which platform, serverless cost | `skills/serverless-recommender/SKILL.md` |
| **compliance-architecture** | compliance, HIPAA, SOC2, SOC 2, GDPR, PCI-DSS, regulatory, healthcare data, payment card, audit, security standards | `skills/compliance-architecture/SKILL.md` |

---

## Quick Lookup Table

| User Intent | Best Skill |
|-------------|-----------|
| "Plan a new feature" | `increment-planner` |
| "Implement X" / "Build Y" | `increment-work-router` |
| "Quality check" / "Review spec" | `increment-quality-judge-v2` |
| "Close increment" / "/done" | `pm-closure-validation` |
| "Sync to GitHub/JIRA" | `external-sync-wizard` |
| "Archive old increments" | `archive-increments` |
| "Bug/issue/broken" | `smart-reopen-detector` |
| "AWS vs Azure vs GCP" | `serverless-recommender` |
| "SOC2/HIPAA compliance" | `compliance-architecture` |
| "Review my code" | `code-reviewer` |

---

## Token Efficiency

- **This index**: ~200 lines (~4KB)
- **All skills loaded**: ~2,500 lines (~50KB)
- **Savings**: ~92% by loading skills on-demand

**Pattern**: Load this index → Match triggers → Load only matched SKILL.md
