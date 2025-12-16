---
sidebar_position: 99
title: YouTube Tutorial Script
description: Video script for SpecWeave introduction tutorial
draft: true
---

# SpecWeave Tutorial - YouTube Video Script

**Duration**: ~15-20 minutes
**Format**: Screen recording of spec-weave.com + terminal demo
**Diagrams**: Mermaid (embedded in docs) + 2-3 Excalidraw transitions

---

## INTRO (0:00 - 1:30)

**[SCREEN: spec-weave.com homepage]**

> "Every AI coding tool promises productivity. But after the chat ends... where does your work go?"

**[SCROLL to "What Makes SpecWeave Different" section]**

> "Your specs disappear into chat history. Your architecture decisions are forgotten. Your tests are 'maybe later.' Your JIRA stays outdated. New team members start from zero.
>
> I built SpecWeave to solve this. And I didn't just build it — I used it to build itself. 186,000 lines of code. 1,327 commits. 65 releases with zero failures.
>
> Today I'll show you how it works."

**[EXCALIDRAW TRANSITION: Simple diagram showing "Chat History → Permanent Documentation"]**

---

## SECTION 1: THE PROBLEM (1:30 - 3:00)

**[SCREEN: Still on homepage, scroll to mermaid flowchart]**

> "Here's the typical AI development workflow..."

**[Point to the Mermaid diagram showing the flow]**

```
Your Idea → Spec ✓ → Plan ✓ → Tasks ✓ → Code → Living Docs
```

> "See these checkmarks? In SpecWeave, every step creates a permanent file. Not chat history. Not 'I'll document it later.' Permanent, searchable, version-controlled documentation."

**[SCROLL to "What You Get" comparison table]**

> "Before SpecWeave: specs in chat, manual JIRA updates, tests maybe later, architecture in your head, onboarding takes two weeks.
>
> After SpecWeave: permanent searchable specs, auto-sync on every task, tests embedded in your tasks, ADRs captured automatically, onboarding in one day."

---

## SECTION 2: INSTALLATION (3:00 - 4:30)

**[SCREEN: Navigate to docs/guides/getting-started/quickstart]**

> "Let's get you running. Three commands."

**[TERMINAL: Show installation]**

```bash
npm install -g specweave
cd your-project
specweave init .
```

**[Show init wizard running]**

> "The init wizard detects your project type, tech stack, and existing documentation. It's smart enough to work with brownfield projects — not just greenfield."

**[SCREEN: Back to quickstart page, scroll to "What You Get" table]**

> "After init, you get:
> - 136 auto-activating skills
> - 68 specialized agents — PM, Architect, DevOps, QA, Security, SRE
> - 53 slash commands
> - Event-driven hooks for automation
> - Your own CLAUDE.md project reference"

---

## SECTION 3: YOUR FIRST FEATURE (4:30 - 8:00)

**[TERMINAL: Claude Code open in a project]**

> "Let's build something. I'll add dark mode to an app."

```bash
/sw:increment "Add dark mode toggle"
```

**[Show the output as SpecWeave creates files]**

> "Watch what happens. SpecWeave doesn't just take notes — it creates a complete specification."

**[NAVIGATE to the created increment folder]**

```
.specweave/increments/0001-dark-mode/
├── spec.md    <- WHAT: User stories + acceptance criteria
├── plan.md    <- HOW: Architecture + tech decisions
└── tasks.md   <- DO: Tasks with embedded tests
```

**[OPEN spec.md]**

> "The spec has user stories, acceptance criteria with checkboxes, and clear requirements. This isn't generated fluff — it's actionable specification."

**[EXCALIDRAW TRANSITION: Show the three-file foundation with arrows]**

**[OPEN tasks.md]**

> "Each task is linked to user stories and acceptance criteria. And notice — tests are embedded right in the task. Not 'add tests later.' Tests are part of the definition of done."

**[TERMINAL: Execute the increment]**

```bash
/sw:do
```

> "Now SpecWeave works autonomously. It implements each task, runs tests, and updates documentation automatically."

**[Show tasks completing]**

> "When it's done, validate and close:"

```bash
/sw:done 0001
```

> "This runs quality gates — are all tasks complete? Is test coverage above 60%? Are the living docs updated? Only then does it close."

---

## SECTION 4: THE WORKFLOW DIAGRAM (8:00 - 10:00)

**[SCREEN: Navigate back to intro.md, scroll to "The Workflow" mermaid diagram]**

> "Let me walk through the full workflow."

**[Point to each section of the diagram]**

> "Step 1: You type one command — `/sw:increment 'Add dark mode'`
>
> Step 2: AI agents kick in. PM Agent creates user stories and acceptance criteria. Architect Agent designs the solution and creates ADRs. Planner Agent breaks it into tasks with tests.
>
> Step 3: You get three permanent files — spec.md for WHAT, plan.md for HOW, tasks.md for DO.
>
> Step 4: Build with `/sw:do`. It executes autonomously.
>
> Step 5: Auto-sync. Your GitHub issues, JIRA epics, Azure DevOps work items — they all update automatically."

---

## SECTION 5: EXTERNAL TOOL SYNC (10:00 - 12:00)

**[SCREEN: Show the External Tool Integration table on intro page]**

> "One of the most powerful features — bidirectional sync with your existing tools."

**[Point to the table]**

> "GitHub Issues: create, update, close, progress sync, checkbox tracking.
> JIRA: Epic and Story hierarchy, status sync, custom fields.
> Azure DevOps: Work items, area paths, status sync.
> Linear coming Q1 2026."

**[TERMINAL: Show sync command]**

```bash
/sw:sync-progress
```

> "This pushes your local progress to all connected tools. Your JIRA updates. Your GitHub issues update. No manual copying."

**[SCREEN: Navigate to integrations page if available]**

> "And it works both ways. Update status in JIRA? SpecWeave sees it. Someone comments on a GitHub issue? It appears in your increment notes."

---

## SECTION 6: BROWNFIELD PROJECTS (12:00 - 13:30)

**[SCREEN: Navigate to quickstart, scroll to "Joining an Existing Project" section]**

> "What if you have an existing codebase? SpecWeave handles brownfield projects too."

```bash
specweave init .
# During init, select "Run brownfield analysis"
```

> "It analyzes your codebase for documentation gaps, undocumented APIs, missing specs. Then you can turn those gaps into increments."

```bash
/sw:discrepancies                    # View all documentation gaps
/sw:discrepancy-to-increment DISC-0001 DISC-0002  # Create increment
```

**[SCREEN: Show import docs section]**

> "You can also import existing documentation:"

```bash
/sw:import-docs ~/exports/notion --source=notion
```

> "From Notion, Confluence, GitHub Wiki — it classifies docs automatically and creates retroactive specifications."

---

## SECTION 7: DORA METRICS (13:30 - 15:00)

**[SCREEN: Navigate back to intro.md, scroll to DORA badges]**

> "Here's where it gets interesting. These aren't fake numbers."

**[Point to each badge]**

> "100 deploys per month — that's multiple times per day.
> 3.4 hours lead time.
> 0% change failure rate across 65 releases.
> Zero mean time to recovery because we haven't needed it."

**[Click through to metrics page]**

> "SpecWeave builds SpecWeave using SpecWeave. Every feature, every bug fix went through this workflow. 186,000 lines of code. 1,327 commits over 52 days."

**[SCREEN: Navigate to dogfooding page if we created it]**

> "I spent every weekend on this project. Many sleepless nights debugging edge cases. 26 commits per day on average. 100 commits in a single peak day.
>
> This isn't a demo framework. It's production-tested — on itself."

---

## SECTION 8: GETTING STARTED (15:00 - 17:00)

**[SCREEN: Navigate to quickstart page]**

> "Ready to try it? Here's the fastest path."

**[TERMINAL: Quick demo]**

```bash
# Install
npm install -g specweave

# Initialize in your project
cd your-project
specweave init .

# Create your first feature
/sw:increment "Your feature idea"

# Build it
/sw:do

# Close it
/sw:done 0001
```

> "That's the core loop. But here's a pro tip..."

```bash
/sw:next
```

> "One command to rule them all. It auto-closes completed work and suggests what's next. Just keep clicking 'next' and reviewing when needed."

**[SCREEN: Scroll to "Essential Commands" table]**

> "Key commands to remember:
> - `/sw:increment` to create
> - `/sw:do` to build
> - `/sw:done` to close with quality gates
> - `/sw:next` for the full flow
> - `/sw:progress` to check status
> - `/sw:sync-progress` to push to external tools"

---

## SECTION 9: NEXT STEPS (17:00 - 18:30)

**[SCREEN: Navigate to Academy section]**

> "If you're new to software engineering, we have a complete academy."

**[Scroll through academy paths]**

> "Quick Start path: 2 hours for experienced devs.
> Beginner path: 4 weeks from zero to coding.
> Full-Stack: 10 weeks to build complete web apps.
> Enterprise: 16 weeks for Fortune 500-ready skills.
>
> 14 parts, 44 modules — from single-file scripts to microservices with CI/CD."

**[SCREEN: Navigate to Discord invite]**

> "Join the community. Ask questions. Share your projects. We're building this together."

---

## OUTRO (18:30 - 19:00)

**[SCREEN: Back to intro page]**

> "Stop losing your AI work. Start building permanent knowledge.
>
> SpecWeave: the AI development framework that doesn't lose your work.
>
> Install it now:"

```bash
npm install -g specweave
```

**[EXCALIDRAW: Final slide with logo and links]**

> "Links in the description. See you in the Discord.
>
> Thanks for watching."

---

## VIDEO NOTES

### Excalidraw Diagrams Needed

1. **Intro transition**: "Chat History → Permanent Documentation" (simple arrow diagram)
2. **Three-file foundation**: spec.md, plan.md, tasks.md with connecting arrows
3. **Outro slide**: Logo + links (spec-weave.com, Discord, YouTube, GitHub)

### Mermaid Diagrams (Already in docs)

- Workflow flowchart (intro.md)
- Input → Agents → Output → Build → Sync diagram (intro.md)
- DORA metrics can use the badges

### B-roll Suggestions

- Terminal showing commands executing
- VS Code with spec files open
- GitHub Issues updating automatically
- JIRA board with synced statuses

### Timestamps for Description

```
0:00 - Intro: The problem with AI coding tools
1:30 - Why specs disappear and how to fix it
3:00 - Installation in 30 seconds
4:30 - Your first feature with SpecWeave
8:00 - Understanding the workflow
10:00 - External tool sync (GitHub, JIRA, ADO)
12:00 - Working with existing codebases
13:30 - Real DORA metrics from dogfooding
15:00 - Getting started walkthrough
17:00 - Academy and next steps
18:30 - Outro
```

### Description Template

```
SpecWeave: The AI Development Framework That Doesn't Lose Your Work

Stop losing your AI conversations to chat history. SpecWeave captures every spec,
architecture decision, and test in permanent, searchable documentation.

In this tutorial, I walk through:
- Why AI coding tools fail at documentation
- How SpecWeave creates permanent specs from every feature
- Live demo: building a feature from scratch
- Syncing with GitHub, JIRA, and Azure DevOps
- Real metrics from building SpecWeave with SpecWeave

Links:
- Documentation: https://spec-weave.com
- GitHub: https://github.com/anton-abyzov/specweave
- Discord: https://discord.gg/UYg4BGJ65V
- Install: npm install -g specweave

Built with 186,000 lines of code. 1,327 commits. 0% failure rate across 65 releases.
This isn't a demo — it's production-tested.

#ai #coding #developer #programming #typescript #nodejs #claude
```
