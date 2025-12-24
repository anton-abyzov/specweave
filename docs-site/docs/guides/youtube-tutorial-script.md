---
sidebar_position: 99
title: YouTube Tutorial Script
description: Video script for SpecWeave introduction tutorial - comprehensive walkthrough of spec-weave.com
draft: true
---

# SpecWeave Complete Tutorial - YouTube Video Script

**Duration**: ~30-32 minutes
**Format**: Screen recording walking through spec-weave.com documentation + terminal demos
**Diagrams**: Mermaid (already embedded in docs) + 3 Excalidraw transitions
**Teaching Claude**: This script teaches Claude how SpecWeave works by walking through real docs

---

## INTRO - THE VIBE CODING PROBLEM (0:00 - 2:30)

**[SCREEN: Navigate to docs/guides/lessons/11-vibe-coding-problem]**

> "Before I show you SpecWeave, let me explain the problem it solves.
>
> This is what I call 'Vibe Coding' — and almost everyone does it."

**[READ from the page - The 5 Pain Points]**

> "Pain Point 1: **Context Evaporation**. Monday you have a great conversation with Claude about payment architecture. Friday, nobody remembers why you chose idempotency keys.
>
> Pain Point 2: **Scattered Implementation**. Each AI request produces isolated code. No shared services. No consistent patterns.
>
> Pain Point 3: **No Quality Gates**. Generated code goes straight to production. No tests. No review. No validation.
>
> Pain Point 4: **Documentation Debt**. You promise to document later. You never do.
>
> Pain Point 5: **Onboarding Nightmare**. New developers have zero context. Everything is tribal knowledge."

**[PERSONAL STORY - WHY I BUILT THIS]**

> "Now, I didn't just read about these problems — I lived them. For months, I used BMAD and speckit for my AI-assisted development. Great tools. Seriously.
>
> But I kept hitting walls. Context would disappear between sessions. Specifications lived in chat history. There was no traceability from requirements to code. Every new project meant rebuilding the same scaffolding.
>
> I'd finish a feature on Monday and by Thursday couldn't remember why I made certain decisions. Sound familiar?
>
> So I asked myself: what would a framework look like that solves these problems for good? Not just for this project, but for the next ten projects. Something I could rely on for months and years, not just days.
>
> That question became SpecWeave."

**[EXCALIDRAW TRANSITION: "Vibe Coding" crossed out → "Spec-Driven Development"]**

> "SpecWeave solves ALL of these. Let me show you how."

---

## SECTION 1: WHAT IS SPECWEAVE (2:30 - 4:30)

**[SCREEN: Navigate to docs/intro.md - Homepage]**

> "SpecWeave is the AI development framework that doesn't lose your work."

**[SCROLL to the main mermaid flowchart]**

```
Your Idea → Spec ✓ → Plan ✓ → Tasks ✓ → Code → Living Docs
```

> "See these checkmarks? Every step creates a permanent file. Not chat history. Permanent, version-controlled documentation."

**[SCROLL to "What You Get" comparison table]**

> "Before SpecWeave: specs in chat, manual JIRA updates, tests maybe later, architecture in your head, onboarding takes two weeks.
>
> After SpecWeave: permanent searchable specs, auto-sync on every task, tests embedded in tasks, ADRs captured automatically, onboarding in one day."

**[SCROLL to DORA badges]**

> "And these aren't marketing numbers. SpecWeave builds SpecWeave. 100 deploys per month. Zero failures across 65 releases. We'll come back to this."

---

## SECTION 2: CORE PHILOSOPHY (4:30 - 7:00)

**[SCREEN: Navigate to docs/overview/philosophy]**

> "Let me explain the eight principles that guide everything in SpecWeave."

**[READ through principles]**

> "**Principle 1: Specification Before Implementation**. Define WHAT and WHY before HOW. No more jumping straight to code.
>
> **Principle 2: Append-Only Snapshots + Living Documentation**. This is revolutionary — most systems make you choose between historical context OR current docs. SpecWeave gives you BOTH."

**[Point to the table explaining increments vs living docs]**

> "Increments are immutable snapshots — like Git commits for features. Living docs are always current, auto-updated by hooks. Both are essential.
>
> **Principle 3: Context Precision**. 70% token reduction. Load only what you need.
>
> **Principle 4: Test-Validated Features**. Every feature proven through tests. Embedded in your tasks.
>
> **Principle 5: Regression Prevention**. Document before you modify brownfield code.
>
> **Principle 6: Scalable**. Works for solo developers or 100-person teams.
>
> **Principle 7: Auto-Role Routing**. Skills detect what you need automatically. Over 90% routing accuracy.
>
> **Principle 8: Closed-Loop Validation**. E2E tests must tell the truth. No false positives."

---

## SECTION 3: THE THREE-FILE STRUCTURE (7:00 - 10:00)

**[SCREEN: Navigate to docs/guides/lessons/02-three-file-structure]**

> "This is the foundation of SpecWeave — three files that replace chaos with clarity."

**[Point to the diagram showing spec.md, plan.md, tasks.md]**

> "**spec.md** is WHAT — owned by PM/Product. Business language. User stories, acceptance criteria.
>
> **plan.md** is HOW — owned by Architect. Technical language. Architecture, ADRs, design decisions.
>
> **tasks.md** is DO — owned by Developer. Checkboxes, embedded tests, implementation steps."

**[SCROLL to the Click Counter example]**

> "Let's see a real example. Adding a click counter to a homepage."

**[READ the spec.md example]**

> "The spec has user stories — 'As a visitor, I want to click a button that increments a counter.' And acceptance criteria with IDs — AC-US1-01: Button displays 'Click me!', AC-US1-02: Counter starts at 0."

**[READ the tasks.md example]**

> "The tasks reference those AC-IDs. Task T-001 satisfies AC-US1-01 through AC-US1-04. And look — test cases are embedded right in the task. Not 'add tests later.' Tests ARE the task."

**[EXCALIDRAW TRANSITION: Three files connected with AC-ID arrows]**

> "The magic is traceability. AC-IDs connect requirements to tasks to tests. Six months later, you can answer: 'Why did we build it this way?' Just read the increment."

---

## SECTION 4: WHAT IS AN INCREMENT (10:00 - 12:30)

**[SCREEN: Navigate to docs/guides/core-concepts/what-is-an-increment]**

> "An increment is SpecWeave's fundamental unit of work. Think of it as a Git commit for features."

**[Point to the mermaid diagram showing increment sequence]**

> "Each increment contains complete context — spec, plan, tasks, logs, reports. Everything needed to understand why something was built and how."

**[SCROLL to "Anatomy of an Increment"]**

```
.specweave/increments/0001-user-authentication/
├── spec.md     # WHAT: Requirements, user stories, AC-IDs
├── plan.md     # HOW: Architecture + test strategy
├── tasks.md    # Checklist + embedded tests
├── logs/       # Execution history
└── reports/    # Completion summaries
```

**[SCROLL to "Why Increments?"]**

> "Three reasons:
>
> 1. **Complete Context**. Every increment is a snapshot in time with all context preserved.
>
> 2. **Traceability**. Clear path from requirements to implementation to tests. Critical for compliance — HIPAA, SOC 2, FDA.
>
> 3. **Focused Work**. One increment at a time prevents context switching."

**[SCROLL to "Increment Sizing"]**

> "Golden rule: 5-15 tasks, 1-3 user stories, completable in 1-3 days. Small increments = faster feedback, better AI accuracy, achievable goals."

**[SCROLL to lifecycle state diagram]**

> "Increments have a lifecycle: Planning → Active → Paused/Completed/Abandoned. Each transition has a command."

---

## SECTION 5: INSTALLATION & FIRST INCREMENT (12:30 - 16:00)

**[SCREEN: Navigate to docs/guides/getting-started/quickstart]**

> "Let's get you running. Three commands."

**[TERMINAL: Show installation]**

```bash
npm install -g specweave
cd your-project
specweave init .
```

**[Show init wizard running]**

> "The init wizard detects your project type, tech stack, existing documentation. It works with greenfield AND brownfield projects."

**[SCREEN: Back to quickstart, scroll to "What You Get"]**

> "After init, you get 136 auto-activating skills, 68 specialized agents, 53 slash commands, event-driven hooks, and your own CLAUDE.md project reference."

**[TERMINAL: Create first increment]**

```bash
/sw:increment "Add dark mode toggle"
```

> "Watch what happens. SpecWeave creates a complete specification."

**[NAVIGATE to increment folder]**

> "Three files created — spec.md, plan.md, tasks.md. Each with proper structure, user stories, acceptance criteria, architecture decisions, implementation tasks with embedded tests."

**[TERMINAL: Execute and close]**

```bash
/sw:do        # Autonomous execution
/sw:done 0001 # Close with quality gates
```

> "Quality gates verify: all tasks complete, test coverage above 60%, living docs updated. Only then does it close."

**[SCREEN: Show the :next command section]**

```bash
/sw:next
```

> "Pro tip: This one command auto-closes completed work and suggests what's next. Just keep clicking 'next'."

---

## SECTION 6: LIVING DOCS FOR AI CONTEXT (16:00 - 17:30)

**[SCREEN: Navigate to docs/guides/core-concepts/who-benefits-from-living-docs]**

> "Here's something most people miss — living docs aren't just for humans. They're context for AI."

**[SCROLL to the Progressive Disclosure section]**

> "SpecWeave uses Claude's native progressive disclosure. No RAG. No vector databases. Just smart file organization and grep searches.
>
> Here's how it works."

**[Point to the flow diagram]**

> "When you ask Claude to implement something, three mechanisms kick in:
>
> 1. **CLAUDE.md** is always loaded. It tells Claude: 'Before implementing, check existing docs.'
>
> 2. **The living-docs-navigator skill** activates. It's a built-in skill that shows Claude WHERE to look and HOW to search.
>
> 3. Claude uses grep — yes, plain grep — to search your living docs for relevant specs and ADRs."

**[TERMINAL: Show the flow]**

```bash
# Claude internally runs:
grep -ril "auth" .specweave/docs/internal/

# Finds:
# - specs/us-001-authentication.md
# - architecture/adr/0001-jwt-auth.md
# - architecture/auth-flow.md
```

> "Then Claude reads exactly those files. Not everything. Just what's relevant."

**[SCROLL to "Why Not RAG?"]**

> "Why not RAG or vector databases?
>
> Progressive disclosure is simpler — no infrastructure.
> More accurate — reads actual files, not embeddings.
> Always current — no index to update.
> Zero cost — it's native Claude.
>
> Your living docs automatically become AI context. No extra work."

---

## SECTION 7: THE COMPLETE WORKFLOW (17:30 - 19:30)

**[SCREEN: Navigate to docs/workflows/overview]**

> "Let me show you the complete development journey."

**[Point to the mermaid diagram showing all phases]**

> "Seven phases: Concept → Research → Design → Planning → Implementation → Validation → Deployment.
>
> Each phase has clear inputs, outputs, and SpecWeave commands."

**[SCROLL through each phase briefly]**

> "Research produces user personas and feature lists. Design produces architecture and ADRs. Planning creates the three files. Implementation uses `/sw:do`. Validation runs `/sw:validate`. Deployment is your CI/CD."

**[Point to the phase diagram for Planning → Implementation]**

> "The key transition: `/sw:increment` creates spec + plan + tasks. `/sw:do` builds it. Hooks update living docs after every task."

---

## SECTION 8: EXTERNAL TOOL SYNC (19:30 - 21:30)

**[SCREEN: Navigate back to intro.md, scroll to External Tool Integration table]**

> "SpecWeave doesn't replace your existing tools — it synchronizes with them."

**[Point to the table]**

> "GitHub Issues: create, update, close, progress sync, checkbox tracking.
> JIRA: Epic and Story hierarchy, status sync, custom fields.
> Azure DevOps: Work items, area paths, status sync.
> Linear: Coming Q1 2026."

**[SCREEN: Navigate to docs/guides/lessons/07-external-tools]**

> "Bidirectional sync means: update status in JIRA, SpecWeave sees it. Complete a task in SpecWeave, your GitHub issue updates."

**[TERMINAL: Show sync commands]**

```bash
/sw:sync-progress  # Push updates to external tools
/sw:sync-monitor   # See sync status dashboard
```

> "Your JIRA updates. Your GitHub issues update. No manual copying. Ever."

---

## SECTION 9: BROWNFIELD PROJECTS (21:30 - 23:30)

**[SCREEN: Navigate to docs/workflows/brownfield]**

> "What about existing codebases? This is the ultimate challenge — and SpecWeave handles it."

**[Point to the brownfield challenge mermaid diagram]**

> "Common problems: no documentation, tribal knowledge, fear of breaking production, scattered docs, unknown architecture decisions, no tests."

**[SCROLL to "The SpecWeave Brownfield Approach"]**

> "Two paths based on project size:
>
> **Quick Start** for large projects (50k+ LOC): Document core only, start immediately, docs grow with changes.
>
> **Comprehensive** for smaller projects: Full docs, baseline tests, then increments."

**[SCROLL to init command section]**

```bash
specweave init .
# During init, select "Run brownfield analysis"
```

> "SpecWeave analyzes your codebase for documentation gaps. Then you turn gaps into increments."

```bash
/sw:discrepancies                    # View all documentation gaps
/sw:discrepancy-to-increment DISC-0001  # Create increment from gap
```

**[SCREEN: Show import docs section]**

```bash
/sw:import-docs ~/exports/notion --source=notion
```

> "Import from Notion, Confluence, GitHub Wiki. AI classifies docs automatically."

---

## SECTION 10: QUALITY GATES & TDD (23:30 - 25:30)

**[SCREEN: Navigate to docs/guides/lessons/05-quality-gates]**

> "SpecWeave enforces quality before shipping. Three gates."

**[READ the three gates]**

> "**Gate 1: Tasks**. All tasks marked complete with checkboxes.
>
> **Gate 2: Tests**. Minimum 60% coverage enforced. Tests embedded in tasks, not afterthoughts.
>
> **Gate 3: Documentation**. Living docs auto-updated via hooks."

**[SCREEN: Navigate to docs/guides/lessons/06-tdd-workflow]**

> "If you want test-first development, SpecWeave has a full TDD workflow."

```bash
/sw:tdd-cycle  # Full red-green-refactor workflow
```

> "Red: write failing tests. Green: make them pass. Refactor: improve without breaking. SpecWeave guides you through each phase."

---

## SECTION 11: THE LEARNING PATH (25:30 - 27:30)

**[SCREEN: Navigate to docs/guides/lessons/index (SpecWeave Academy)]**

> "If you're new, we have a complete learning path. 16 lessons from beginner to expert."

**[Point to the paths table]**

> "**Path 1: Getting Started** — Lessons 1-3. Install, understand the three files, build your first increment. 90 minutes.
>
> **Path 2: Core Workflow** — Lessons 4-5. Master the :next command and quality gates.
>
> **Path 3: Testing** — Lesson 6. TDD with SpecWeave.
>
> **Path 4: Integration** — Lessons 7-10. External tools, AI model selection, troubleshooting, advanced patterns.
>
> **Path 5: Deep Dive** — Lessons 11-16. Vibe coding problem, init deep dive, increment lifecycle, GitHub/JIRA/ADO integrations."

**[SCREEN: Navigate to docs/academy if exists]**

> "For complete beginners to software engineering, we have the full Academy. 14 parts, 44 modules — from single-file scripts to microservices with CI/CD."

---

## SECTION 12: DOGFOODING - REAL METRICS (27:30 - 29:30)

**[SCREEN: Navigate to docs/overview/dogfooding]**

> "Now the proof. SpecWeave builds SpecWeave using SpecWeave."

**[Point to the numbers]**

> "186,719 lines of code. 567 TypeScript files. 581 test files. 4,405 documentation files. 47 CLI commands. 24 plugins. 65 hooks."

**[Point to development activity]**

> "1,327 commits over 52 days. 26 commits per day average. 100 commits in a single peak day.
>
> Every weekend. Many sleepless nights. This wasn't a side project — it was an obsession."

**[Point to DORA metrics]**

> "The result:
> - **Deployment Frequency**: 100/month (Elite tier)
> - **Lead Time**: 3.4 hours (High tier)
> - **Change Failure Rate**: 0% across 65 releases (Elite tier)
> - **MTTR**: N/A because nothing failed"

> "5+ production applications built with SpecWeave — including SpecWeave itself, BizZone mobile app, Event Management SaaS, and more.
>
> This isn't a demo framework. It's production-tested — on itself."

---

## OUTRO (29:30 - 31:00)

**[SCREEN: Navigate back to intro.md]**

> "Let me recap. SpecWeave solves the vibe coding problem with:
>
> - **Three permanent files** instead of chat history
> - **Append-only snapshots + living docs** for complete context
> - **Living docs as AI context** — progressive disclosure, not RAG
> - **Quality gates** that enforce tests and documentation
> - **External tool sync** with GitHub, JIRA, Azure DevOps
> - **Brownfield support** for existing codebases
> - **16 lessons** to take you from beginner to expert"

**[TERMINAL: Final commands]**

```bash
npm install -g specweave
cd your-project
specweave init .
/sw:increment "Your first feature"
/sw:do
/sw:done 0001
```

**[EXCALIDRAW: Final slide with logo and links]**

> "Stop losing your AI work. Start building permanent knowledge.
>
> Links in the description. Join the Discord. Ask questions.
>
> Thanks for watching."

---

## VIDEO PRODUCTION NOTES

### Excalidraw Diagrams Needed

1. **Intro transition**: "Vibe Coding" crossed out → "Spec-Driven Development" (0:00)
2. **Three-file foundation**: spec.md, plan.md, tasks.md with AC-ID arrows connecting them (10:00)
3. **Outro slide**: SpecWeave logo + links (spec-weave.com, Discord, YouTube, GitHub) (28:00)

### Mermaid Diagrams (Already in docs - no work needed)

- Workflow flowchart (intro.md)
- Phase-by-phase workflow (workflows/overview.md)
- Increment lifecycle state diagram (core-concepts/what-is-an-increment.md)
- Brownfield challenge diagram (workflows/brownfield.md)
- Three-file structure diagram (lessons/02-three-file-structure.md)

### Screen Recording Checklist

| Timestamp | Page to Show | Key Action |
|-----------|--------------|------------|
| 0:00 | lessons/11-vibe-coding-problem | Read pain points |
| 2:30 | intro.md | Show workflow diagram |
| 4:30 | overview/philosophy | Scroll through principles |
| 7:00 | lessons/02-three-file-structure | Show examples |
| 10:00 | core-concepts/what-is-an-increment | Explain lifecycle |
| 12:30 | getting-started/quickstart | Terminal demo |
| 16:00 | core-concepts/who-benefits-from-living-docs | Living docs for AI |
| 17:30 | workflows/overview | Show complete workflow |
| 19:30 | intro.md (external tools) | Show sync table |
| 21:30 | workflows/brownfield | Show brownfield approach |
| 23:30 | lessons/05-quality-gates | Explain gates |
| 25:30 | lessons/index | Show learning paths |
| 27:30 | overview/dogfooding | Show real metrics |
| 29:30 | intro.md | Final recap |

### Terminal Commands to Demo

```bash
# Installation
npm install -g specweave
specweave init .

# Core workflow
/sw:increment "Add dark mode toggle"
/sw:do
/sw:done 0001
/sw:next

# Living docs context
/sw:context authentication   # Load relevant docs
grep -ril "auth" .specweave/docs/internal/  # Search docs

# External sync
/sw:sync-progress
/sw:sync-monitor

# Brownfield
/sw:discrepancies
/sw:import-docs ~/notion --source=notion

# TDD
/sw:tdd-cycle
```

### Timestamps for YouTube Description

```
0:00 - The Vibe Coding Problem
2:30 - What is SpecWeave?
4:30 - Core Philosophy (8 Principles)
7:00 - The Three-File Structure (spec.md, plan.md, tasks.md)
10:00 - What is an Increment?
12:30 - Installation & Your First Feature
16:00 - Living Docs for AI Context (Progressive Disclosure)
17:30 - The Complete Workflow
19:30 - External Tool Sync (GitHub, JIRA, ADO)
21:30 - Working with Existing Codebases (Brownfield)
23:30 - Quality Gates & TDD
25:30 - The Learning Path (16 Lessons)
27:30 - Dogfooding: Real Metrics (186K LOC, 0% failures)
29:30 - Recap & Getting Started
```

### YouTube Description Template

```
SpecWeave: The AI Development Framework That Doesn't Lose Your Work

In this tutorial, I walk through the complete spec-weave.com documentation,
showing you how to go from "vibe coding" to spec-driven development.

What you'll learn:
- Why AI coding tools fail (the vibe coding problem)
- The three-file structure: spec.md, plan.md, tasks.md
- What increments are and how they preserve context
- Live demo: building your first feature
- Living docs as AI context (progressive disclosure, not RAG)
- External tool sync (GitHub, JIRA, Azure DevOps)
- Working with existing codebases (brownfield)
- Quality gates and TDD workflow
- The complete 16-lesson learning path
- Real metrics from building SpecWeave with SpecWeave

Links:
- Documentation: https://spec-weave.com
- GitHub: https://github.com/anton-abyzov/specweave
- Discord: https://discord.gg/UYg4BGJ65V
- Install: npm install -g specweave

Dogfooding stats:
- 186,719 lines of code
- 1,327 commits in 52 days
- 100 deploys/month (Elite DORA tier)
- 0% failure rate across 65 releases
- 5+ production applications

This isn't a demo framework — it's production-tested on itself.

#ai #coding #developer #programming #typescript #nodejs #claude #specweave
```

### Key Topics Covered

| Topic | Section | Page Referenced |
|-------|---------|-----------------|
| Vibe Coding Problem | 0:00 | lessons/11-vibe-coding-problem |
| Philosophy & Principles | 4:30 | overview/philosophy |
| Three-File Structure | 7:00 | lessons/02-three-file-structure |
| What is an Increment | 10:00 | core-concepts/what-is-an-increment |
| Quick Start | 12:30 | getting-started/quickstart |
| Living Docs for AI | 16:00 | core-concepts/who-benefits-from-living-docs |
| Complete Workflow | 17:30 | workflows/overview |
| External Tool Sync | 19:30 | lessons/07-external-tools |
| Brownfield Projects | 21:30 | workflows/brownfield |
| Quality Gates | 23:30 | lessons/05-quality-gates |
| TDD Workflow | 23:30 | lessons/06-tdd-workflow |
| Learning Path | 25:30 | lessons/index |
| Dogfooding | 27:30 | overview/dogfooding |

### Brief Mentions (Not Deep Dives)

These topics are mentioned briefly but have full documentation available:

- **16 Expert Lessons** (lessons/01-16)
- **Full Academy** (14 parts, 44 modules)
- **Multi-project mode** (covered in advanced patterns)
- **Cost optimization** (covered in advanced patterns)
- **AI model selection** (lesson 8)
- **Troubleshooting** (lesson 9)
- **Compliance** (reference/compliance-standards)
