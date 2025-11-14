# SpecWeave Skills Index

**Purpose**: Quick reference for all available skills. Read this file BEFORE starting any task.

**Last Updated**: 2025-11-13 (removed deprecated skills: plugin-installer, increment-quality-judge v1)

**Total Skills**: 18

---

## 🚀 Quick Start (Progressive Disclosure)

**MANDATORY**: Skills are your expert manuals. Always check for relevant skills BEFORE starting implementation.

### Progressive Disclosure Pattern

1. **Scan this index** to find skills matching your task
2. **Match activation keywords** to your current request
3. **Load full SKILL.md** for matching skills
4. **Follow the workflow** in SKILL.md precisely

### Example Workflow

```
User asks: "Plan a new feature for user authentication"

Step 1: Scan this index → Find "increment-planner" skill
Step 2: Check keywords → Matches "feature planning", "create increment"
Step 3: Load skill → cat .claude/skills/increment-planner/SKILL.md
Step 4: Execute → Follow the increment planning workflow
```

---

## 📚 All Available Skills


### Framework Core

#### plugin-expert

**Description**: Expert knowledge of Claude Code's plugin system, marketplace management, and installation commands. Activates for plugin installation, marketplace setup, plugin troubleshooting, plugin commands. Keywords plugin install, plugin marketplace, claude code plugins, plugin management, plugin errors, marketplace add, plugin list.

**Activates for**: plugin installation, marketplace setup, plugin troubleshooting, plugin commands, plugin install, plugin marketplace

**Location**: `.claude/skills/plugin-expert/SKILL.md`

---

#### context-loader

**Description**: Explains how SpecWeave achieves context efficiency through Claude's native progressive disclosure mechanism and sub-agent parallelization. Skills load only when relevant, sub-agents isolate context. Activates when users ask about context loading, token usage, or how SpecWeave scales. Keywords: context loading, progressive disclosure, token efficiency, sub-agents, context management.

**Location**: `.claude/skills/context-loader/SKILL.md`

---

#### context-optimizer

**Description**: Second-pass context optimization that analyzes user prompts and removes irrelevant specs, agents, and skills from loaded context. Achieves 80%+ token reduction through smart cleanup. Activates for optimize context, reduce tokens, clean context, smart context, precision loading.

**Location**: `.claude/skills/context-optimizer/SKILL.md`

**Allowed tools**: Read, Grep, Glob

---

#### increment-planner

**Description**: Creates comprehensive implementation plans for SpecWeave increments (aka features - both terms are interchangeable). This skill should be used when planning new increments/features, creating specifications, or organizing implementation work. Activates for: increment planning, feature planning, implementation plan, create increment, create feature, plan increment, plan feature, organize work, break down increment, break down feature, new product, build project, MVP, SaaS, app development, product description, tech stack planning, feature list.

**Activates for**: increment planning, feature planning, implementation plan, create increment, create feature, plan increment, plan feature, organize work, break down increment, break down feature, new product, build project, MVP, SaaS, app development, product description, tech stack planning, feature list

**Location**: `.claude/skills/increment-planner/SKILL.md`

---

#### specweave-detector

**Description**: Detects SpecWeave context (.specweave/ directory exists) and provides workflow documentation. Explains available slash commands and workflow. Keywords slash commands, /specweave:increment, /increment, /specweave:do, /specweave:progress, /specweave:validate, /specweave:done, specweave commands, workflow help, specweave folder.

**Note**: Auto-detection of product descriptions is handled by the `project-kickstarter` skill.

**Location**: `.claude/skills/specweave-detector/SKILL.md`

---

#### specweave-framework

**Description**: Expert knowledge of SpecWeave framework structure, rules, conventions, and increment lifecycle. Deep understanding of source-of-truth discipline, increment naming, hook system, and plugin architecture. Activates for: specweave rules, how does specweave work, framework structure, increment lifecycle, what is specweave, specweave conventions, specweave discipline, specweave architecture, where do files go, source of truth, increment naming, tasks.md format, spec.md structure, living docs sync, hook system, plugin architecture, how to use specweave, specweave best practices.

**Activates for**: specweave rules, how does specweave work, framework structure, increment lifecycle, what is specweave, specweave conventions, specweave discipline, specweave architecture, where do files go, source of truth, increment naming, tasks

**Location**: `.claude/skills/specweave-framework/SKILL.md`

**Allowed tools**: Read, Grep, Glob

---


### Orchestration & Planning

#### role-orchestrator

**Description**: Multi-agent orchestration system that coordinates specialized agents (PM, Architect, DevOps, QA, Tech Lead, Security) to work together on complex tasks. Implements hierarchical orchestrator-worker pattern. Activates for complex multi-step requests requiring multiple roles/skills. Keywords: build product, create SaaS, full implementation, end-to-end, multi-agent, orchestrate, coordinate roles, complex project.

**Location**: `.claude/skills/role-orchestrator/SKILL.md`

---


### Documentation

#### brownfield-analyzer

**Description**: Analyzes existing brownfield projects to map documentation structure to SpecWeave's PRD/HLD/Spec/Runbook pattern. Scans folders, classifies documents, detects external tools (Jira, ADO, GitHub), and generates migration plan. Activates for brownfield, existing project, migrate, analyze structure, legacy documentation.

**Location**: `.claude/skills/brownfield-analyzer/SKILL.md`

---

#### translator

**Description**: LLM-native translation skill for SpecWeave content. Activates when translation is needed for CLI messages, templates, documentation, or living docs. Uses the current LLM session for zero-cost translation. Keywords: translate, translation, language, multilingual, i18n, internationalization, Russian, Spanish, Chinese, German, French, localization, translate to.

**Location**: `.claude/skills/translator/SKILL.md`

**Allowed tools**: Read, Write, Edit, Grep, Glob

---


### Other

#### brownfield-onboarder

**Description**: Intelligently onboards brownfield projects by merging existing CLAUDE.md backups into SpecWeave structure. Extracts project-specific knowledge, domain context, team conventions, and technical details from backup CLAUDE.md files, then distributes content to appropriate SpecWeave folders without bloating CLAUDE.md. Activates for: merge docs, merge claude, onboard brownfield, import existing docs, claude backup, specweave merge-docs.

**Activates for**: merge docs, merge claude, onboard brownfield, import existing docs, claude backup, specweave merge-docs

**Location**: `.claude/skills/brownfield-onboarder/SKILL.md`

---

#### project-kickstarter

**Description**: Proactively detects product/project descriptions and guides users through SpecWeave increment planning. Activates when user provides product name, features, tech stack, timeline, or problem description. Keywords: project, product, SaaS, app, MVP, build, new project, features, tech stack, core functionality, monetization, timeline, I want to build, let's build, quick build, core features.

**Location**: `.claude/skills/project-kickstarter/SKILL.md`

---

#### tdd-workflow

**Description**: Test-Driven Development workflow coordinator. Detects TDD intent and offers guided red-green-refactor cycle. Activates for TDD, test-driven, red-green-refactor, write tests first, test-first development, Kent Beck, TDD cycle.

**Location**: `.claude/skills/tdd-workflow/SKILL.md`

---


## 💡 How Skills Work

**Level 1 - Discovery (this file)**:
- Scan activation keywords
- Match to your current task
- Identify 1-3 relevant skills

**Level 2 - Deep Dive (SKILL.md)**:
- Load full skill documentation
- Read required prerequisites
- Follow step-by-step workflow

**Level 3 - Execution**:
- Apply skill's instructions
- Use recommended tools
- Follow SpecWeave best practices

---

## 🎯 Task → Skill Matching Guide

| Your Task | Relevant Skill | Keywords |
|-----------|---------------|----------|
| "Plan a new feature" | `increment-planner` | "feature planning", "create increment" |
| "Implement feature" | `increment-work-router` | "implement", "complete", "build", "work on" |
| "Sync to JIRA" | `jira-sync` | "JIRA sync", "create JIRA issue" |
| "Create diagram" | `diagrams-architect` | "architecture diagram", "C4 diagram" |
| "Build React UI" | `frontend` | "React", "components", "UI" |
| "Deploy to cloud" | `hetzner-provisioner` | "deploy", "infrastructure" |
| "Quality check" | `increment-quality-judge-v2` | "quality check", "assess spec", "risk assessment" |
| "E2E testing" | `e2e-playwright` | "E2E test", "browser test" |
| "Generate docs site" | `docusaurus` | "documentation site", "docs" |

---

## ⚡ Why Skills Matter

**Without skills**:
- ❌ Reinvent workflows every session
- ❌ Inconsistent increment structure
- ❌ Miss SpecWeave conventions
- ❌ Waste tokens on irrelevant docs

**With skills**:
- ✅ Proven workflows ready to use
- ✅ Consistent high-quality output
- ✅ SpecWeave best practices enforced
- ✅ Efficient token usage (load only what's needed)

---

## 🔧 For AI Tool Developers

This index simulates Claude Code's native progressive disclosure:
- Claude pre-loads skill metadata at startup (name + description)
- Other tools read this index file for same benefit
- Single file read replaces 12 individual file scans
- Token savings: ~97% (1 file vs 12 files)

**How to use in your AI tool**:
1. Load this file at session start
2. Parse activation keywords
3. Match user requests to keywords
4. Load full SKILL.md when matched
5. Execute skill workflow

---

**Generated by**: `src/utils/generate-skills-index.ts`

**Regenerate with**: `npm run generate-skills-index`
