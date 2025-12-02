# Video 001: Finally: A Framework That Works on Legacy, Startup, AND Enterprise

## The Complete SpecWeave Masterclass - From Zero to Production

**Duration**: ~61 minutes
**YouTube**: [Link pending]

**Tags**: SpecWeave, AI coding framework, living documentation, spec-driven development, Claude Code, Opus 4.5, JIRA sync, GitHub sync, Azure DevOps, plugins, skills, AI agents, enterprise engineering, open source, free tools, BMAD alternative, developer productivity, GPT, Gemini, Copilot, translation, multilingual

---

## VIDEO STRUCTURE

| Timestamp | Section | Duration |
|-----------|---------|----------|
| 0:00 | Hook (The Pain → The Solution) | 1.5 min |
| 1:30 | The Problem (BMAD, SpecKit, chaos) | 5 min |
| 6:30 | What is SpecWeave? (15 agents, quick wins) | 4 min |
| 10:30 | Docs Architecture: Internal vs Public + Hosting | 3 min |
| 13:30 | Enterprise Engineering 101 + Hierarchy Mapping | 6 min |
| 19:30 | Project-Aware Sync & The /next Flow | 4 min |
| 23:30 | Plugins & Skills System | 4 min |
| 27:30 | Installation Mac & Windows | 5 min |
| 32:30 | VS Code + 4-Terminal Setup | 4 min |
| 36:30 | DEMO 1: Greenfield Project | 4 min |
| 40:30 | DEMO 2: Translation Feature | 3 min |
| 43:30 | DEMO 3: Brownfield with Living Docs Builder (NEW!) | 10 min |
| 53:30 | DEMO 4: GitHub Sync with Bidirectional Pull (NEW!) | 4 min |
| 57:30 | DEMO 5: JIRA Sync | 3 min |
| 60:30 | DEMO 6: Azure DevOps with Hierarchy Intelligence (NEW!) | 4 min |
| 64:30 | Background Jobs Monitoring (NEW!) | 2 min |
| 66:30 | AGENT.md for Non-Claude Tools | 2 min |
| 68:30 | Academy + Resources | 1.5 min |
| 70:00 | Outro (This was HUGE work!) | 1 min |

**Total: ~71 minutes** (extended for new features)

---

## FULL SCRIPT

---

### HOOK (0:00 - 1:30)

**[VISUAL: Three project types appearing - "Legacy Codebase 💀", "Startup MVP 🚀", "Enterprise Platform 🏢"]**

> "I've worked on legacy codebases where nobody knows how anything works. I've built startup MVPs at 2am with zero documentation. I've navigated enterprise platforms with 50 microservices and JIRA boards from hell.

> Every time, I thought: there HAS to be a framework that works on ALL of these.

> There wasn't. So I built one."

**[VISUAL: SpecWeave logo appearing]**

> "SpecWeave."

**[VISUAL: Quick montage - dropping into different project types]**

> "Drop it into a 10-year-old legacy codebase — it GENERATES documentation automatically in the background. Use it on your weekend startup — specs write themselves. Scale it to enterprise with 50 teams — JIRA, GitHub, Azure DevOps all sync BIDIRECTIONALLY.

> ONE framework. ANY project. ANY scale."

**[VISUAL: Side-by-side - spec.md updating, JIRA syncing, GitHub issue updating]**

> "Living documentation that never goes stale. BIDIRECTIONAL sync — changes flow BOTH ways. Background jobs that clone repos, import work items, and build docs while you work. And here's the crazy part — it works with ANY AI. Claude, GPT, Gemini, Copilot. Your team uses whatever they want.

> Need translations? One command. Russian, Spanish, German — done.

> Fortune 500 companies pay MILLIONS for systems like this.

> This? Free. Open source. And I'm going to show you EVERYTHING."

**[VISUAL: Title card - "Finally: A Framework That Works on Legacy, Startup, AND Enterprise"]**

> "Finally. A framework that actually works everywhere.

> Installation. 6 real demos. Legacy brownfield. Fresh greenfield. JIRA. GitHub. Azure DevOps.

> If this helps you — star the GitHub repo. That's how other devs find this.

> Let's go."

---

### THE PROBLEM (1:30 - 6:30)

**[VISUAL: Split screen - chaotic docs vs clean structure]**

> "Before we dive in, let me tell you why I built this.

> Every dev team I've worked with has the same problem: specs live in one place, tasks in another, code somewhere else. Nothing stays in sync. Sound familiar?"

**[VISUAL: Diagram showing disconnected tools]**

#### The Documentation Graveyard

> "You write a beautiful spec in Confluence. Two weeks later, it's wrong. The code evolved. Nobody updated the docs. Now your spec is a lie.

> JIRA says one thing. The README says another. The actual code? Who knows."

#### BMAD-Method Problems

**[VISUAL: BMAD logo/reference]**

> "Some of you tried BMAD — the AI prompt framework. Good idea. Heavy execution.

> BMAD gives you personas, mega-prompts, multi-stage workflows. But here's the problem:

> - Too much ceremony upfront
> - Not designed for real tool integration
> - No sync with JIRA, GitHub, or ADO
> - Manual everything

> It's a prompt library, not a workflow."

#### SpecKit Limitations

**[VISUAL: SpecKit reference]**

> "SpecKit tried to solve specs for AI. Better structure. But:

> - No bidirectional sync
> - No external tool integration
> - Manual status tracking
> - Closed ecosystem

> You're still copying checkboxes by hand."

#### What We Actually Need

**[VISUAL: Checklist appearing one by one]**

> "What I wanted:
> - Specs that STAY in sync with reality
> - Tasks that track themselves
> - One command to sync everything to JIRA, GitHub, or ADO
> - AI-native — Claude reads and writes specs
> - Free. Open source. No vendor lock-in.

> That's SpecWeave."

---

### WHAT IS SPECWEAVE? (6:00 - 10:00)

**[VISUAL: SpecWeave logo + quick demo montage]**

> "SpecWeave is spec-driven development for the AI age. Let me show you what you get."

#### Quick Wins in 60 Seconds

**[VISUAL: Terminal showing commands]**

```bash
# Plan work
/specweave:increment "Add user authentication"

# Execute tasks
/specweave:do

# Check progress
/specweave:progress

# Sync to GitHub/JIRA/ADO
/specweave:sync-progress

# Close when done
/specweave:done 0042
```

> "Five commands. That's your daily workflow."

#### The Magic: Living Documentation

**[VISUAL: Side-by-side - spec.md and GitHub issue updating together]**

> "When you complete a task in tasks.md, SpecWeave:
> - Updates your spec.md acceptance criteria
> - Syncs to your GitHub issue
> - Updates your JIRA epic
> - Pushes to Azure DevOps work item
> - All automatically. All bidirectional."

#### What You Get

**[VISUAL: Feature cards appearing]**

| Feature | What It Does |
|---------|--------------|
| Increments | Atomic units of work with specs, plans, tasks |
| Living Docs | Specs that update when code changes |
| **Living Docs Builder (NEW!)** | Auto-generates docs for brownfield projects |
| External Sync | **Bidirectional** with GitHub, JIRA, ADO |
| **Pull Sync (NEW!)** | External changes flow back to SpecWeave |
| **Background Jobs (NEW!)** | Clone, import, build docs — all in background |
| AI-Native | Claude reads specs, writes code, updates tasks |
| Multi-Repo | Enterprise monorepo and multi-repo support |
| **ADO Intelligence (NEW!)** | Auto-detect process templates (SAFe, Agile, Scrum) |
| Free & Open | MIT license, no vendor lock-in |

> "All of this — free. Open source. On my GitHub right now. And these new features? Game changers. Let me teach you the foundation."

#### Documentation Architecture: Internal vs Public

**[VISUAL: Folder structure diagram]**

> "One thing that makes SpecWeave different — it separates your documentation into TWO categories."

```
.specweave/docs/
├── internal/           ← Team-only: ADRs, architecture, secrets docs
│   ├── architecture/
│   │   └── adr/        ← Architecture Decision Records
│   ├── governance/     ← Coding standards, team processes
│   └── emergency/      ← Runbooks, incident procedures
│
└── public/             ← User-facing: API docs, guides, tutorials
    ├── academy/        ← Learning materials
    ├── api/            ← API reference
    └── guides/         ← How-to guides
```

> "Why does this matter?

> **Internal docs** — Architecture decisions, coding standards, emergency runbooks. Stuff your TEAM needs but users don't. This stays in your repo, version-controlled with your code.

> **Public docs** — User guides, API reference, tutorials. This is what you publish to your docs site.

> The magic? Both live in the same repo. Both update with your code. But they serve DIFFERENT audiences."

#### One Command to Preview Everything

**[VISUAL: Terminal showing docs preview]**

> "Want to see your docs before publishing? One command."

```bash
# From your project root
cd docs-site && npm run start

# Opens at localhost:3016
# Hot reload - edit markdown, see changes instantly
```

> "That's it. Docusaurus spins up, hot reloads everything. Edit your markdown, see it live. No build step needed for development."

#### Hosting Options

**[VISUAL: Hosting providers logos]**

> "When you're ready to publish:"

```bash
# Build static site
npm run build

# Output in docs-site/build/
# Deploy ANYWHERE that hosts static files
```

> "Options:

> **GitHub Pages** — Free. Push to `gh-pages` branch, done. Perfect for open source.

> **Vercel/Netlify** — Free tier. Connect repo, auto-deploys on push. Zero config.

> **Self-hosted** — It's just HTML/CSS/JS. Nginx, Apache, S3, whatever.

> The point? Your docs are YOURS. Not locked in Notion. Not trapped in Confluence. Version-controlled markdown that deploys anywhere."

---

### ENTERPRISE ENGINEERING 101 (10:00 - 16:00)

**[VISUAL: Whiteboard-style diagrams appearing]**

> "Before we install, you need to understand HOW enterprise teams build software. This is the foundation everything else rests on."

#### The Hierarchy of Work

**[VISUAL: Pyramid diagram building up]**

```
                    ┌─────────────┐
                    │   PRODUCT   │  ← Vision
                    │   ROADMAP   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   FEATURES  │  ← Big chunks (FS-001)
                    │   (Epics)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    USER     │  ← Who wants what (US-001)
                    │   STORIES   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ ACCEPTANCE  │  ← How we know it's done (AC-US1-01)
                    │  CRITERIA   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    TASKS    │  ← Actual work (T-001)
                    └─────────────┘
```

> "Every mature company follows this pattern. JIRA does it. Azure DevOps does it. GitHub Projects tries to do it. SpecWeave makes it automatic."

#### What's a Feature?

**[VISUAL: Feature card example]**

> "A Feature — or Epic in JIRA — is a BIG piece of functionality. Something you'd put on a roadmap."

```markdown
# Feature: FS-001 User Authentication

Complete authentication system with login, registration,
password reset, and social OAuth.

Contains:
- US-001: User Registration
- US-002: User Login
- US-003: Password Reset
- US-004: OAuth Integration
```

> "One feature = multiple user stories. Features take weeks. User stories take days."

#### What's a User Story?

**[VISUAL: User story format]**

> "A User Story answers: WHO wants WHAT and WHY?"

```markdown
### US-001: User Registration

**As a** new visitor
**I want to** create an account with email and password
**So that** I can access personalized features

#### Acceptance Criteria
- [ ] AC-US1-01: Registration form validates email format
- [ ] AC-US1-02: Password requires 8+ characters
- [ ] AC-US1-03: Duplicate emails show clear error
- [ ] AC-US1-04: Success redirects to dashboard
```

> "Notice the format: As a WHO, I want WHAT, so that WHY. This forces clarity. No vague requirements."

#### Acceptance Criteria — The Contract

**[VISUAL: Checkboxes checking themselves]**

> "Acceptance Criteria are your contract. When all boxes are checked, the story is DONE. Not 'mostly done.' Not 'almost there.' DONE."

```markdown
- [x] AC-US1-01: Registration form validates email format
- [x] AC-US1-02: Password requires 8+ characters
- [ ] AC-US1-03: Duplicate emails show clear error  ← NOT DONE
- [x] AC-US1-04: Success redirects to dashboard
```

> "One unchecked box = story not complete. That's the discipline."

#### Tasks — The Actual Work

**[VISUAL: Task list]**

> "Tasks are what developers actually DO. Each task satisfies one or more acceptance criteria."

```markdown
### T-001: Create registration API endpoint
**Satisfies**: AC-US1-01, AC-US1-02
**Status**: [x] completed

### T-002: Add duplicate email check
**Satisfies**: AC-US1-03
**Status**: [ ] pending
```

> "See the link? Task → Acceptance Criteria → User Story → Feature. Everything traces back. Nothing gets lost."

#### SpecWeave's Increment = Atomic Delivery

**[VISUAL: Increment folder structure]**

> "SpecWeave wraps all this into an INCREMENT — an atomic unit of shippable work."

```
.specweave/increments/0001-user-auth/
├── spec.md      ← User stories + acceptance criteria
├── plan.md      ← Technical approach
├── tasks.md     ← Actual tasks with AC links
└── metadata.json ← Status, timestamps, external IDs
```

> "One increment = one deliverable. Could be a feature. Could be a bug fix. Could be a refactor. But it's COMPLETE or it's not shipped."

#### Why This Matters for AI

**[VISUAL: Claude reading spec.md]**

> "Here's the key insight: Claude reads spec.md. It sees the user stories. It understands the acceptance criteria. It generates tasks that SATISFY those criteria.

> Then when you run `/specweave:do`, Claude checks off tasks, which checks off ACs, which completes stories.

> It's not magic. It's structure. And structure is what makes AI productive."

#### Pro Tip: Keep Increments Small (2-3x Faster with Opus 4.5!)

**[VISUAL: Small vs large increment comparison + speed metrics]**

> "Quick tip that will save you HOURS: keep your increments small.
>
> 5-15 tasks. 1-3 user stories. Something you can finish in 1-3 days.
>
> Why?
>
> **For YOU**:
> - Easier to track progress (12 of 15 tasks done feels great!)
> - Faster feedback loops (ship something every few days)
> - Less overwhelming (know exactly what to do next)
>
> **For AI**:
> - Claude maintains better context with smaller specs
> - Fewer tasks = higher accuracy per task
> - Easier to validate acceptance criteria
>
> **GAME CHANGER: Claude Opus 4.5**
>
> Here's the thing that's absolutely transforming my workflow. With **Claude Opus 4.5** (released November 2025), the development speed has increased **2-3x** — some developers report even **5-10x** faster completions!
>
> The secret? Formulate small, well-defined increments, and Opus 4.5 can complete them almost **without manual interaction**:
>
> 1. Define clear user stories and acceptance criteria in spec.md
> 2. Let the Architect agent create the plan
> 3. Run `/specweave:do`
> 4. **Just review what's done** — Opus handles the rest
>
> I've had increments where I typed `/specweave:do`, went for coffee, and came back to working, tested, documented code. That's the power of small increments + Opus 4.5.
>
> **Anti-pattern**: 50-task mega-increment that runs for weeks. You lose context. AI loses context. Nothing ships.
>
> **Good pattern**: Small increments, quick wins, fast iterations. Each one COMPLETE before the next. With Opus 4.5, you're mostly reviewing, not hand-holding."

#### Universal Hierarchy Mapping (External Tools)

**[VISUAL: Side-by-side comparison table]**

> "Now here's where SpecWeave gets REALLY powerful. Every tool has different names for the same things. JIRA calls it an Epic. GitHub calls it a Milestone. ADO calls it a Feature.

> SpecWeave maps them ALL to one universal hierarchy."

**[VISUAL: Mapping diagram appearing]**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL HIERARCHY MAPPING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SpecWeave         │  JIRA            │  Azure DevOps      │  GitHub         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  LEVEL 1: PROJECT  │  Project         │  Project           │  Repository     │
│       ↓            │       ↓          │       ↓            │       ↓         │
│  LEVEL 2: FEATURE  │  Epic            │  Feature           │  Milestone      │
│  (FS-001)          │                  │                    │  (or Label)     │
│       ↓            │       ↓          │       ↓            │       ↓         │
│  LEVEL 3: USER     │  Story           │  User Story        │  Issue          │
│  STORY (US-001)    │                  │                    │                 │
│       ↓            │       ↓          │       ↓            │       ↓         │
│  LEVEL 4: TASK     │  Subtask         │  Task              │  Checklist      │
│  (T-001)           │                  │                    │  Item           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

> "See that? Your Feature in SpecWeave becomes an Epic in JIRA. A Feature in ADO. A Milestone in GitHub. ALL AUTOMATICALLY.

> Your User Story becomes a JIRA Story. An ADO User Story. A GitHub Issue. Same content. Different systems. Zero manual mapping."

#### Project Hierarchy (1-2 Levels)

**[VISUAL: Multi-project structure]**

> "For enterprise teams, you also have PROJECT hierarchy. SpecWeave supports two patterns:"

```
PATTERN 1: Single Project (Simple)
─────────────────────────────────
.specweave/
├── increments/         ← All work here
└── docs/

PATTERN 2: Multi-Project (Enterprise)
──────────────────────────────────────
.specweave/
├── projects/
│   ├── frontend/       ← Maps to FE JIRA project
│   │   └── increments/
│   ├── backend/        ← Maps to BE JIRA project
│   │   └── increments/
│   └── mobile/         ← Maps to MOBILE ADO area path
│       └── increments/
└── docs/
```

> "If you have separate JIRA projects for frontend, backend, mobile — SpecWeave maps them. If you use ADO area paths for team separation — SpecWeave maps them. If you have multiple GitHub repos in an umbrella — SpecWeave maps them.

> One framework. Any structure. Enterprise-grade."

#### Why This Matters

> "Without this mapping, you're doing mental translation. 'Okay, my spec is a JIRA Epic... no wait, it's a Story... let me check ADO...'

> With SpecWeave: one command, correct mapping, every tool. That's the enterprise power other frameworks don't have."

---

### PROJECT-AWARE SYNC & THE /NEXT FLOW (16:30 - 20:30)

**[VISUAL: Sync flow diagram animating]**

> "Okay, here's where it gets REALLY exciting. This is the part that took MONTHS to build. Project-aware synchronization."

#### How Increment Generation Works

**[VISUAL: Terminal showing /specweave:increment]**

> "When you run `/specweave:increment`, SpecWeave doesn't just create files. It UNDERSTANDS your project."

```bash
/specweave:increment "Add payment processing"
```

**[VISUAL: Behind-the-scenes flow]**

```
YOU TYPE: /specweave:increment "Add payment processing"

SPECWEAVE DOES:
1. Detects current project (frontend? backend? mobile?)
2. Reads existing specs for context
3. PM agent creates user stories
4. Architect agent designs approach
5. Tasks generated with AC links
6. Metadata tracks external IDs
7. Ready for /specweave:do
```

> "One command. Full spec. Full plan. Full task list. All project-aware."

#### The Sync Flow

**[VISUAL: Animated sync diagram]**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYNC FLOW                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   LOCAL (SpecWeave)              EXTERNAL (JIRA/GitHub/ADO)         │
│                                                                      │
│   ┌──────────────┐               ┌──────────────┐                   │
│   │   spec.md    │──── PUSH ────▶│  Epic/Issue  │                   │
│   │   tasks.md   │◀─── PULL ─────│  Subtasks    │                   │
│   │   metadata   │               │  Comments    │                   │
│   └──────────────┘               └──────────────┘                   │
│                                                                      │
│   /specweave:sync-progress                                          │
│   ─────────────────────────────                                     │
│   • Reads tasks.md completion status                                │
│   • Updates spec.md acceptance criteria                             │
│   • Pushes to GitHub issue checkboxes                               │
│   • Updates JIRA story status                                       │
│   • Syncs ADO work item state                                       │
│   • ALL BIDIRECTIONAL                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

> "See that? Bidirectional. You check a box in JIRA — SpecWeave sees it. You complete a task locally — GitHub updates. This is REAL sync, not one-way export."

#### The Magic: /specweave:next

**[VISUAL: Terminal showing /next command]**

> "Now the command that ties it ALL together: `/specweave:next`"

```bash
/specweave:next
```

**[VISUAL: Flow chart of /next decision tree]**

```
/specweave:next DOES:
│
├─▶ Is current increment done?
│   ├─ YES: Run quality gates (tasks/tests/docs)
│   │       └─ Pass? Auto-close increment
│   └─ NO: Continue working
│
├─▶ What's next?
│   ├─ Backlog items? Suggest highest priority
│   ├─ No backlog? Offer to plan new increment
│   └─ Blocked? Show blockers
│
└─▶ Keep clicking "next" until done
```

> "One command. It figures out what to do. Close this? Start that? Review specs? Just keep clicking next.

> This is the flow I use every day. Start morning. `/specweave:next`. Keep going until lunch. `/specweave:next`. It's INTUITIVE."

#### Sync Commands Reference

**[VISUAL: Command cheat sheet]**

```bash
# Full sync (tasks → docs → external)
/specweave:sync-progress

# Just GitHub
/specweave:github-sync

# Just JIRA
/specweave:jira-sync

# Just ADO
/specweave:ado-sync

# The flow command
/specweave:next
```

> "That's the sync system. Months of work. Battle-tested on real projects. And it just WORKS."

---

### PLUGINS & SKILLS SYSTEM (20:30 - 24:30)

**[VISUAL: Plugin architecture diagram]**

> "SpecWeave isn't a monolith. It's a plugin system. Let me show you why that matters."

#### How Claude Code Extensions Work

**[VISUAL: Extension points diagram]**

> "Claude Code has three extension points:"

```
┌─────────────────────────────────────────────────────┐
│                  CLAUDE CODE                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. SKILLS (SKILL.md)                               │
│     └─ Auto-activate based on keywords              │
│     └─ Inject knowledge when relevant               │
│                                                      │
│  2. SLASH COMMANDS (.claude/commands/)              │
│     └─ User-invoked actions                         │
│     └─ /specweave:do, /specweave:progress           │
│                                                      │
│  3. HOOKS (hooks.json)                              │
│     └─ React to events                              │
│     └─ Post-task completion, pre-commit, etc.       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Skills — AI Knowledge Injection

**[VISUAL: Skill activation demo]**

> "Skills are markdown files that Claude loads automatically when relevant."

```yaml
# SKILL.md
---
name: specweave-increment-planner
description: Creates implementation plans for increments.
             Activates for: feature planning, increment,
             new product, MVP, build project.
---

# How to Plan an Increment

When user asks to plan work, follow these steps...
```

> "I say 'plan a new feature' — Claude sees the keyword, loads the skill, now it knows SpecWeave's way of planning.

> No prompting needed. No copy-paste. The knowledge is there when Claude needs it."

#### Slash Commands — User Actions

**[VISUAL: Command being typed]**

> "Slash commands are explicit actions. You type them, they run."

```bash
/specweave:increment "Add dark mode"    # Plan new work
/specweave:do                           # Execute tasks
/specweave:progress                     # Show status
/specweave:done 0001                    # Close increment
/specweave:github-sync                  # Sync to GitHub
```

> "Each command is a markdown file that expands into a full prompt. Claude executes it."

#### Hooks — Automatic Reactions

**[VISUAL: Hook flow diagram]**

> "Hooks fire automatically when events happen."

```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "match": { "tool": "Edit" },
      "script": "check-task-completion.sh"
    }
  ]
}
```

> "Every time Claude edits a file, the hook runs. It checks: did this complete a task? Should we update tasks.md? Should we sync to GitHub?

> Automation without thinking about it."

#### The Plugin Ecosystem

**[VISUAL: Plugin list]**

> "SpecWeave ships as plugins you install:"

```
specweave              ← Core framework
specweave-github       ← GitHub Issues sync
specweave-jira         ← JIRA integration
specweave-ado          ← Azure DevOps sync
specweave-infrastructure ← DevOps/Terraform agents
specweave-testing      ← QA automation
specweave-ml           ← ML pipeline support
```

> "Install what you need. Ignore what you don't. No bloat."

```bash
# During init, select your plugins
npx specweave init .
# → Select: GitHub, JIRA, or ADO
# → Plugins auto-install
```

#### Why This Architecture?

**[VISUAL: Comparison with monolithic tools]**

> "BMAD gives you prompts. SpecKit gives you templates. SpecWeave gives you a SYSTEM.

> Skills load knowledge on demand. Commands let you act. Hooks automate reactions. Plugins extend capabilities.

> It's not a script. It's a framework."

---

### INSTALLATION (21:00 - 27:00)

**[VISUAL: Terminal full screen]**

> "Two things to install: Claude Code CLI and SpecWeave. Both take 60 seconds."

#### Mac Installation

**[VISUAL: macOS terminal]**

> "If you're on Mac, here's the fastest path."

```bash
# Step 1: Install Claude Code
# Option A: Homebrew (recommended)
brew install claude-code

# Option B: npm (if you prefer)
npm install -g @anthropic-ai/claude-code

# Verify
claude --version
```

> "Homebrew is cleaner. npm works too if you already have Node."

```bash
# Step 2: First run - authenticate
claude
# Follow prompts for API key or login
```

```bash
# Step 3: Install SpecWeave (inside any project)
npx specweave init .
```

> "That's it. Three commands. You're ready."

**[VISUAL: Show successful installation]**

#### Windows Installation

**[VISUAL: Windows PowerShell]**

> "Windows users — same deal, different commands."

```powershell
# Step 1: Install Claude Code
# Option A: winget (recommended)
winget install Anthropic.ClaudeCode

# Option B: npm
npm install -g @anthropic-ai/claude-code

# Verify
claude --version
```

```powershell
# Step 2: First run
claude
# Authenticate with API key or login
```

```powershell
# Step 3: Install SpecWeave
npx specweave init .
```

> "Same three steps. Works identical."

**[VISUAL: Side-by-side Mac and Windows showing same result]**

#### What Just Happened?

**[VISUAL: File tree appearing]**

> "SpecWeave created a `.specweave` folder in your project:"

```
.specweave/
├── increments/          # Your work units
├── docs/
│   ├── public/          # User-facing docs
│   └── internal/        # Architecture, ADRs
├── config.json          # Settings (committed)
└── state/               # Runtime state
```

> "This is your spec-driven workspace. Everything lives here."

---

### VS CODE + 4-TERMINAL SETUP (27:00 - 31:00)

**[VISUAL: VS Code opening]**

> "Now the productivity multiplier. I run four terminals. Every terminal auto-launches Claude. Here's the setup."

#### Installing VS Code

```bash
# Mac
brew install --cask visual-studio-code

# Windows
winget install Microsoft.VisualStudioCode
```

#### Auto-Launch Claude Configuration

> "Open VS Code settings. Search 'settings.json'. Add this:"

**[VISUAL: settings.json file]**

**Mac:**
```json
{
    "terminal.integrated.profiles.osx": {
        "zsh": {
            "path": "zsh",
            "args": ["-i", "-c", "claude && exec zsh"]
        }
    },
    "terminal.integrated.defaultProfile.osx": "zsh",
    "security.workspace.trust.untrustedFiles": "open"
}
```

**Windows:**
```json
{
    "terminal.integrated.profiles.windows": {
        "PowerShell": {
            "source": "PowerShell",
            "args": ["-NoExit", "-Command", "claude"]
        }
    },
    "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

> "Now every new terminal starts with Claude ready."

#### The Skip-Permissions Trick

**[VISUAL: ~/.zshrc file]**

> "By default, Claude asks permission for everything. For your own projects, add this to `.zshrc`:"

```bash
function claude() {
    command claude --dangerously-skip-permissions "$@"
}
```

```bash
source ~/.zshrc
```

> "Now Claude reads and writes without asking. Only use this in YOUR projects."

#### My 4-Terminal Layout

**[VISUAL: VS Code with 4 terminals split]**

> "Here's how I actually work. Four terminals, each with its own Claude session. Let me show you how to set this up."

**Creating Multiple Terminals:**

> "In VS Code, use **Cmd+\\** (Mac) or **Ctrl+\\** (Windows) to split your terminal. Or click the split icon in the terminal panel.

> Quick note: **Cmd+\\** might conflict with 1Password's autofill shortcut. If nothing happens when you press it, check your 1Password settings and change one of the shortcuts.

> To create a NEW terminal (not split), use **Ctrl+Shift+\`** (backtick). Each new terminal auto-launches Claude with our config."

**[VISUAL: Demonstrating terminal creation]**

```
┌─────────────────────────┬─────────────────────────┐
│   TERMINAL 1            │   TERMINAL 2            │
│   Claude - Main         │   Claude - Research     │
│   (building features)   │   (exploring, asking)   │
├─────────────────────────┼─────────────────────────┤
│   TERMINAL 3            │   TERMINAL 4            │
│   Tests (watch)         │   Dev Server            │
│   npm test --watch      │   npm run dev           │
└─────────────────────────┴─────────────────────────┘
```

> "Here's why this matters:

> **Terminal 1** — Your main Claude. This is where you do the actual work. `/specweave:do`, implementing features, writing code.

> **Terminal 2** — Research Claude. Ask questions without interrupting your main work. 'Hey Claude, how does this API work?' Your main session stays focused.

> **Terminal 3** — Tests running in watch mode. Every save triggers tests. Instant feedback.

> **Terminal 4** — Dev server logs. See errors immediately.

> The magic? Each Claude session is INDEPENDENT. Different context. Different conversation. You can have one Claude building a feature while another one helps you understand the codebase.

> Never context-switch. Never lose focus. This is how I ship features 3x faster."

**[VISUAL: Demo showing all 4 terminals active]**

> "Let's see it in action."

---

### DEMO 1: GREENFIELD PROJECT (31:00 - 43:00)

**[VISUAL: Empty folder in terminal]**

> "Let's build something from scratch. A real project. A task management API."

#### Step 1: Initialize

```bash
mkdir task-api && cd task-api
npm init -y
npx specweave init .
```

**[VISUAL: Init wizard running]**

> "SpecWeave asks a few questions:
> - Project name
> - Git provider (GitHub, JIRA, ADO, or none)
> - Testing framework
> - That's it."

#### Step 2: Plan First Increment

**[VISUAL: Claude running /specweave:increment]**

```bash
/specweave:increment "Build REST API for task management with CRUD operations"
```

> "Watch what happens. Claude becomes your product manager."

**[VISUAL: Claude generating spec.md, plan.md, tasks.md]**

> "It creates:
> - `spec.md` — full specification with user stories and acceptance criteria
> - `plan.md` — technical implementation plan
> - `tasks.md` — actionable tasks with dependencies

> All structured. All linked. All tracked."

#### Step 3: Review the Spec

**[VISUAL: Open spec.md in editor]**

```markdown
# spec.md
---
increment: 0001-task-management-api
---
<!-- Feature ID (FS-001) is derived from increment number - not stored -->

## User Stories

### US-001: Create Task
As a user, I want to create a new task...

#### Acceptance Criteria
- [ ] **AC-US1-01**: POST /tasks creates a task
- [ ] **AC-US1-02**: Returns 201 with task object
- [ ] **AC-US1-03**: Validates required fields
```

> "Every user story has testable acceptance criteria. Claude will check these boxes as we build."

#### Step 4: Execute

**[VISUAL: Terminal running /specweave:do]**

```bash
/specweave:do
```

> "This is the magic command. Claude reads the spec, reads the tasks, and starts building.

> Watch — it's writing actual code. Creating files. Running tests."

**[VISUAL: Code being written in real-time, tests running]**

> "See the tasks.md updating? Each task goes from pending to in_progress to completed. Live."

#### Step 5: Check Progress

**[VISUAL: Progress output]**

```bash
/specweave:progress
```

```
Increment 0001-task-management-api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress: ████████░░ 80% (8/10 tasks)

Completed:
✓ T-001: Set up Express server
✓ T-002: Create task model
✓ T-003: POST /tasks endpoint
...

In Progress:
→ T-009: Add validation middleware

Pending:
○ T-010: Write integration tests
```

> "Real-time progress. No guessing. No asking 'where are we?'"

#### Step 6: Close the Increment

**[VISUAL: Closing increment]**

```bash
/specweave:done 0001
```

> "SpecWeave validates:
> - All tasks completed?
> - Tests passing?
> - Acceptance criteria checked?

> If anything's missing, it tells you. No incomplete work ships."

**[VISUAL: Show final project structure]**

> "In 12 minutes: a complete API with specs, tests, documentation. All synced. All tracked."

---

### DEMO 2: TRANSLATION FEATURE (43:00 - 48:00)

**[VISUAL: Existing project with i18n need]**

> "SpecWeave isn't just for code. Let me show you the translation skill."

#### The Problem

> "Your app is English-only. Marketing says: 'We need Spanish, German, French. Yesterday.'

> Translation is tedious. File by file. Key by key. Easy to miss things."

#### SpecWeave Translation

**[VISUAL: Translation command]**

```bash
/specweave:translate --target es,de,fr
```

> "One command. Watch."

**[VISUAL: Files being created/updated]**

> "SpecWeave:
> - Finds all translatable content
> - Generates language files
> - Maintains consistency
> - Uses Claude's native language understanding

> Not Google Translate. Not copy-paste. Claude actually understands context."

#### Demo: Translate Increment Specs

**[VISUAL: spec.md being translated]**

```bash
/specweave:specweave-translate --increment 0001 --target ru
```

> "Even your specs can be translated. Teams in different countries read specs in their language. Code stays English. Specs go multilingual."

**[VISUAL: Russian spec.md appearing]**

> "Russian user stories. Spanish acceptance criteria. German documentation. One command."

---

### DEMO 3: BROWNFIELD WITH LIVING DOCS BUILDER (43:30 - 53:30) — NEW!

**[VISUAL: EasyChamp codebase opening]**

> "Now the real test. A brownfield project. Existing code. Existing mess. This is EasyChamp — my company's product. Real production code.

> And here's what's BRAND NEW in v0.28 — the Living Docs Builder. This is a game-changer. Watch."

**[NOTE TO VIEWERS]**
> "EasyChamp is proprietary — you can't access this repo. But the technique works on any project. Let me show you."

#### Step 1: Initialize with Pre-Flight Questions (NEW!)

**[VISUAL: Running init with smart prompts]**

```bash
npx specweave init .
```

> "Watch — SpecWeave detects this is a brownfield project and asks smart questions UPFRONT before any analysis starts."

**[VISUAL: Pre-flight prompts appearing]**

```
🔍 Brownfield Project Detected!

Additional documentation sources? (Notion export, Confluence, MD folders)
> /docs/legacy, ./wiki

Priority areas to analyze first? (comma-separated)
> auth, payments, api

Known pain points? (describe what's confusing)
> Authentication is a mess, nobody understands the payment flow

Analysis depth? [quick/standard/deep]
> standard (estimated: 2-4 hours)
```

> "These inputs guide the ENTIRE analysis. Priority areas get analyzed first. Pain points get special attention. You tell SpecWeave what matters — it focuses there."

#### Step 2: Background Jobs Launch Automatically (NEW!)

**[VISUAL: Terminal showing job launches]**

```
Launching background jobs...

✓ clone-repos (job-id: abc123)
  → Cloning 3 repositories in background

✓ import-issues (job-id: def456)
  → Importing from JIRA project EASY (2,847 items)

✓ living-docs-builder (job-id: ghi789)
  → WAITING for clone and import jobs
  → Then: discovery → foundation → integration → deep-dive → suggestions

Init complete! Monitor with: specweave jobs --follow ghi789
```

> "THREE background jobs. All running while you work. Clone repos. Import work items. And the star of the show — Living Docs Builder.

> See 'WAITING for clone and import'? That's the job DEPENDENCY system. Living Docs Builder won't analyze until it has all the data. Smart."

#### Step 3: Monitor Jobs (Real-Time Progress)

**[VISUAL: Split screen - terminal running specweave jobs]**

```bash
specweave jobs --follow ghi789
```

```
Living Docs Builder: ghi789
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase: discovery (2/6)
Progress: ████████░░░░░░░░ 47%

Scanning: src/payments/
Files analyzed: 1,247 / 2,650
Tech stack: TypeScript, React, Node.js, PostgreSQL
Modules discovered: 12

Rate: 23 files/sec
ETA: 19 minutes
```

> "Real-time progress. Phase markers. File counts. ETA. I can go grab coffee and come back to GENERATED documentation."

#### Step 4: What Gets Generated (The Magic)

**[VISUAL: Generated files appearing in tree view]**

> "After 1-2 hours, you get THIS:"

```
Generated Documentation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
.specweave/docs/internal/architecture/
├── overview.md           # Project summary, main components
├── tech-stack.md         # All technologies + versions
└── modules-skeleton.md   # Every module with description

.specweave/docs/internal/strategy/modules/
├── auth.md               # Deep dive: authentication
├── payments.md           # Deep dive: payments (priority!)
└── api.md                # Deep dive: API layer

.specweave/docs/internal/
└── SUGGESTIONS.md        # Gap analysis + next steps ⭐
```

> "That SUGGESTIONS.md is pure gold. Let me show you what's inside."

**[VISUAL: Opening SUGGESTIONS.md]**

```markdown
# Living Docs Builder: Suggestions

## Priority Zones (by work item density)
1. **payments/** - 47 linked JIRA items (HIGH)
2. **auth/** - 32 linked JIRA items (HIGH)
3. **api/** - 18 linked JIRA items (MEDIUM)

## Documentation Gaps
- [ ] No API docs for /api/v2/*
- [ ] payments/refund.ts - complex, no comments
- [ ] auth/oauth.ts - uses deprecated library

## Recommended Next Steps
1. Create increment: "Document payment refund flow"
2. Review deprecated oauth library (security risk)
3. Add API v2 endpoint documentation

## Sampling Notes
- test/ excluded (default)
- 847 files in low-priority modules (sampled 3/dir)
- Full analysis available with: --depth deep
```

> "ACTIONABLE suggestions. It tells you exactly what to document next. Where the gaps are. What's risky. This is WEEKS of manual analysis — done in hours."

#### Step 5: Work Item Matching (Killer Feature)

**[VISUAL: Module-workitem mapping visualization]**

> "Here's the killer feature — it matched your imported JIRA items to discovered modules."

```
Module-Work Item Mapping:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
payments/     → EASY-142, EASY-187, EASY-203... (47 items)
auth/         → EASY-089, EASY-124, EASY-156... (32 items)
api/          → EASY-067, EASY-098, EASY-112... (18 items)
utils/        → EASY-012                        (1 item)
```

> "Now I KNOW: payments has 47 work items. That's where the action is. That's where I should focus first. Data-driven prioritization."

#### Step 6: Continue with Enhanced Context

```bash
/specweave:increment "Refactor payment refund flow"
```

> "When Claude generates the spec, it reads the GENERATED docs. It understands your codebase from the analysis. It knows about the 47 JIRA items. It saw the gaps."

**[VISUAL: Spec being generated with rich context]**

> "See? References to payments.md. References to discovered modules. Pain points we identified. It's not guessing — it KNOWS your codebase."

#### Pause and Resume (For Long Analyses)

```bash
# Pause the job (saves checkpoint)
specweave jobs --kill ghi789

# Later: resume from checkpoint
specweave jobs --resume ghi789
```

> "Multi-day analyses? No problem. Kill it, go home, resume tomorrow. Checkpoints save after every module. Zero data loss."

> "This is brownfield done RIGHT. Analyze first. Understand everything. THEN build with full context."

---

### DEMO 4: GITHUB SYNC WITH BIDIRECTIONAL PULL (53:30 - 57:30) — NEW!

**[VISUAL: GitHub issues page]**

> "Let's connect SpecWeave to GitHub. Bidirectional sync."

#### Setup

```bash
# During init, select GitHub
npx specweave init .
# → Select "GitHub" as repository provider
# → Authenticate with gh CLI or token
```

**[VISUAL: GitHub auth flow]**

#### Create Increment → Auto-Create Issue

```bash
/specweave:increment "Add dark mode toggle"
```

**[VISUAL: Split screen - terminal and GitHub]**

> "Increment created locally. Now watch GitHub..."

```bash
/specweave:github-create-issue --increment 0003
```

**[VISUAL: GitHub issue appearing]**

> "Issue created automatically:
> - Title from increment
> - Description from spec
> - Tasks as checklist
> - Labels applied

> All from one command."

#### Push Sync (Local → GitHub)

**[VISUAL: Completing task locally, GitHub updating]**

> "When you complete tasks locally, SpecWeave pushes to GitHub automatically."

```bash
/specweave:do
# Task completed...
# Hook fires automatically...
# GitHub issue checkbox updates!
```

> "No manual sync needed. The EDA hooks detect task completion and push."

#### Pull Sync (GitHub → Local) — NEW in v0.28!

**[VISUAL: PM updating GitHub, showing terminal pulling changes]**

> "Here's the NEW part. Your PM updates GitHub directly. What happens locally?"

```bash
# PM closes an issue in GitHub at 3am...
# You start work next morning:
/specweave:sync-pull

# Or it runs automatically on session start!
```

**[VISUAL: Living docs updating from external change]**

```
Pull Sync: GitHub → SpecWeave
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue #42: Status changed
  → External: closed
  → Local: active
  → Resolution: External wins (timestamp newer)
  → Updated: living docs + spec.md

Audit logged: pull-sync-2025-12-02.json
```

> "External changes flow BACK. Status updates. Priority changes. Assignee changes. All pulled automatically with full audit trail."

#### Conflict Resolution

**[VISUAL: Conflict resolution diagram]**

> "What if both sides changed? Timestamp-based resolution."

```
Conflict Resolution (latest wins):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Local modified:    2025-12-02 10:30:00
External modified: 2025-12-02 11:45:00
                   ↑ Newer
→ External wins. Local updated.

All logged for compliance.
```

> "No guessing. No conflicts. Timestamps decide. Everything logged."

#### Full Sync Command

```bash
/specweave:sync-progress
```

> "One command syncs EVERYTHING:
> - Pull external changes first
> - Push local changes
> - Update tasks.md → spec.md → GitHub
> - All timestamps recorded
> - Full audit trail"

---

### DEMO 5: JIRA SYNC (57:30 - 60:30)

**[VISUAL: JIRA board]**

> "Enterprise teams use JIRA. SpecWeave speaks JIRA fluently."

#### Setup

```bash
npx specweave init .
# → Select "JIRA"
# → Enter JIRA URL, email, API token
```

**[VISUAL: JIRA config in .env]**

```env
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-token
JIRA_PROJECT_KEY=PROJ
```

#### Import Existing JIRA Epics

```bash
/specweave:jira-sync --mode import --project PROJ
```

**[VISUAL: JIRA epics flowing into SpecWeave]**

> "All your existing epics become features in living docs. Stories become specs. Tasks become tasks.

> Nothing lost. Everything connected."

#### Create and Push Back

```bash
/specweave:increment "Performance optimization sprint"
/specweave:jira-sync --mode export --increment 0004
```

**[VISUAL: JIRA epic being created]**

> "New increment becomes a JIRA epic. Tasks become subtasks. Acceptance criteria in the description.

> Your JIRA board stays the source of truth for management. SpecWeave stays your source of truth for development. Both in sync."

#### Bidirectional Flow

**[VISUAL: Diagram showing sync flow]**

```
         ┌─────────────┐
         │    JIRA     │
         │   (Epics)   │
         └──────┬──────┘
                │ bidirectional
         ┌──────▼──────┐
         │  SpecWeave  │
         │  (Specs)    │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │    Code     │
         │  (Reality)  │
         └─────────────┘
```

> "JIRA for managers. SpecWeave for developers. Code as proof. All aligned."

---

### DEMO 6: AZURE DEVOPS WITH HIERARCHY INTELLIGENCE (60:30 - 64:30) — NEW!

**[VISUAL: Azure DevOps board with SAFe hierarchy]**

> "Microsoft shops — Azure DevOps works the same way. BUT — here's what's NEW in v0.28: Intelligent Hierarchy Mapping."

#### The Problem (Before v0.28)

> "ADO has different process templates. Agile. Scrum. CMMI. SAFe. Each has DIFFERENT hierarchy levels."

**[VISUAL: ADO hierarchy comparison table]**

```
Process Templates:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Agile:  Epic → Feature → User Story → Task     (4 levels)
Scrum:  Epic → Feature → PBI → Task            (4 levels)
CMMI:   Epic → Feature → Requirement → Task    (4 levels)
SAFe:   Capability → Epic → Feature → US → Task (5 levels!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> "Before v0.28, SAFe was BROKEN. Capabilities ended up in Feature folders. Epics got lost. Total mess."

#### Auto-Detection (NEW!)

**[VISUAL: Init detecting process template]**

```bash
npx specweave init .
# → Select "Azure DevOps"
# → Enter organization, project, PAT
```

```
🔍 Detecting ADO Process Template...

Project: MyEnterprise
Organization: contoso
Process Template: SAFe (5 levels detected)

Hierarchy Mapping:
  ADO Capability  → SpecWeave Epic   (_epics/EP-XXXE/)
  ADO Epic        → SpecWeave Feature (FS-XXXE/)
  ADO Feature     → SpecWeave Feature (nested under Epic)
  ADO User Story  → SpecWeave US     (us-xxxe.md)
  ADO Task        → SpecWeave Task   (tasks.md)

Proceed with import? [Y/n]
```

> "It DETECTS your process template automatically. SAFe? It maps 5 levels to SpecWeave's 4-level structure intelligently."

#### Intelligent Mapping

**[VISUAL: Before/after folder structure comparison]**

> "Here's what happens with SAFe projects now:"

```
BEFORE v0.28 (Broken):
━━━━━━━━━━━━━━━━━━━━━━━━
.specweave/docs/internal/specs/
├── FS-001E/           # ADO Capability (WRONG LEVEL!)
│   └── FEATURE.md
├── FS-002E/           # ADO Epic (WRONG LEVEL!)
│   └── FEATURE.md
└── FS-003E/           # Actual Feature
    └── FEATURE.md

AFTER v0.28 (Intelligent):
━━━━━━━━━━━━━━━━━━━━━━━━
.specweave/docs/internal/
├── _epics/
│   └── EP-001E/       # ADO Capability → SpecWeave Epic
│       └── EPIC.md
└── specs/
    └── FS-001E/       # ADO Epic → SpecWeave Feature
        ├── FEATURE.md # Links to parent EP-001E
        └── us-001e.md # ADO User Story
```

> "Capabilities go to `_epics/`. Epics become Features WITH parent references. Nothing lost. Hierarchy preserved."

#### Parent References

**[VISUAL: Opening FEATURE.md with parent link]**

```markdown
# FS-001E: Payment Processing System

**Parent Epic**: [EP-001E: 2025 Q4 Platform Initiative](../../_epics/EP-001E/EPIC.md)
**ADO Work Item**: #12345

## Overview
...
```

> "Every feature knows its parent. Full traceability. Click to navigate the hierarchy."

#### Sync Commands

```bash
# Import with auto-detection
/specweave:ado-sync --mode import

# Export preserving hierarchy
/specweave:ado-sync --mode export --increment 0005

# Bidirectional with pull
/specweave:ado-sync --mode bidirectional
```

#### Area Path Support

> "ADO uses area paths for team organization. SpecWeave maps them:"

```
ADO: /MyProject/Team-Backend/API
→ SpecWeave: projects/backend/api/

ADO: /MyProject/Team-Frontend/Mobile
→ SpecWeave: projects/frontend/mobile/
```

> "Your team structure preserved. Your hierarchy intact. Enterprise-grade."

---

### BACKGROUND JOBS MONITORING (64:30 - 66:30) — NEW!

**[VISUAL: Terminal with specweave jobs output]**

> "Quick section on monitoring all those background jobs we've been launching."

#### The Jobs Command

```bash
specweave jobs
```

```
Background Jobs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID         TYPE               STATUS     PROGRESS   ETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
abc123     clone-repos        completed  10/10      -
def456     import-issues      running    1847/2847  12min
ghi789     living-docs-builder waiting    -          -
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> "At a glance: what's running, what's waiting, what's done."

#### Real-Time Follow

```bash
specweave jobs --follow def456
```

> "Streams progress updates every second. Great for long-running imports."

#### Logs and Debugging

```bash
specweave jobs --logs def456
```

> "Last 50 lines of worker output. Essential for debugging failures."

#### Pause and Resume

```bash
# Pause (saves checkpoint)
specweave jobs --kill def456

# Resume from checkpoint
specweave jobs --resume def456
```

> "Long-running job? Pause it. Go home. Resume tomorrow. Checkpoint-based — zero data loss."

---

### AGENT.MD — NON-CLAUDE AI TOOLS (66:30 - 68:30)

**[VISUAL: Multiple AI logos - GPT, Gemini, Copilot, etc.]**

> "Here's a question I get: 'What if I don't use Claude? What if my team uses GPT? Or Gemini? Or Copilot?'

> Good news: SpecWeave still works. Here's how."

#### The AGENT.md Workaround

**[VISUAL: AGENT.md file]**

> "Any AI that reads markdown can use SpecWeave. You just need to give it context."

```markdown
# AGENT.md (put in your project root)

## Project Context

This project uses SpecWeave for spec-driven development.

## Key Files

- `.specweave/increments/` - Active work units
- Current increment: `0042-user-auth/`
  - `spec.md` - User stories and acceptance criteria
  - `tasks.md` - Task list with status

## How to Work

1. Read `spec.md` to understand requirements
2. Read `tasks.md` to see current progress
3. When completing a task, update its status in `tasks.md`:
   - Change `[ ] pending` to `[x] completed`
4. Link your changes to acceptance criteria

## Task Format

When updating tasks.md, use this format:
```
### T-001: Task name
**Satisfies**: AC-US1-01
**Status**: [x] completed
```
```

> "This file teaches ANY AI how to work with SpecWeave. GPT reads it. Gemini reads it. Even basic assistants can follow it."

#### Why This Works

**[VISUAL: Diagram showing AI reading AGENT.md]**

> "SpecWeave's power isn't in Claude magic. It's in STRUCTURE.

> - specs.md is just markdown
> - tasks.md is just markdown
> - Acceptance criteria are just checkboxes

> Any AI that can read and write markdown can participate."

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR PROJECT                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  AGENT.md ─────────────────┐                            │
│                            │                            │
│  ┌───────────┐  ┌──────────▼────────┐  ┌────────────┐  │
│  │  Claude   │  │   GPT / Gemini    │  │   Copilot  │  │
│  │   Code    │  │   (with context)  │  │            │  │
│  └─────┬─────┘  └────────┬──────────┘  └─────┬──────┘  │
│        │                 │                    │         │
│        └─────────────────┼────────────────────┘         │
│                          ▼                              │
│               .specweave/increments/                    │
│                    spec.md                              │
│                    tasks.md                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

> "Claude Code gets the BEST experience — slash commands, hooks, skills. But any AI can read the specs and update the tasks."

#### Team with Mixed AI Tools

**[VISUAL: Team icons with different AI tools]**

> "Real scenario: Your team has different preferences.

> - Sarah uses Claude Code (full integration)
> - Mike uses GPT-4 with AGENT.md
> - Alex uses Copilot for quick edits

> Everyone works on the same specs. Same tasks.md. Same acceptance criteria. The sync still works. The structure doesn't care which AI wrote the code."

#### Setting Up AGENT.md

**[VISUAL: Quick setup steps]**

```bash
# Copy template
cp .specweave/templates/AGENT.md ./AGENT.md

# Or create minimal version
cat > AGENT.md << 'EOF'
# AI Agent Context

Read `.specweave/increments/*/spec.md` for requirements.
Update `.specweave/increments/*/tasks.md` when completing work.
Mark tasks as `[x] completed` when done.
EOF
```

> "30 seconds. Now your project works with any AI."

#### Best of Both Worlds

> "Use Claude Code for the full experience:
> - Slash commands
> - Auto-sync hooks
> - Plugin ecosystem

> Use AGENT.md for compatibility:
> - Team members with different tools
> - Quick edits in any AI
> - CI/CD integrations

> SpecWeave doesn't lock you in. It gives you structure that works everywhere."

---

### SPECWEAVE ACADEMY (68:30 - 70:00)

**[VISUAL: Academy page / docs structure]**

> "Everything you just saw is documented. Free. Open source."

#### What's in the Academy

**[VISUAL: Folder structure]**

```
.specweave/docs/public/academy/
├── videos/           # Scripts for every video
├── guides/           # Step-by-step tutorials
└── reference/        # Command documentation
```

> "This video's script? It's there. Every config I showed? It's there. Copy-paste ready."

#### Where to Find Everything

**[VISUAL: URLs appearing]**

> "GitHub: All public repos — github.com/anton-abyzov/specweave
>
> Docs: spec-weave.com
>
> Academy: In the repo under .specweave/docs/public/academy/
>
> Everything except EasyChamp is public. Clone it. Fork it. Learn from it."

#### Learn the Foundation

> "The Academy teaches more than SpecWeave. It teaches:
> - Spec-driven development principles
> - Software engineering fundamentals
> - AI-assisted workflows
> - Real production patterns

> This isn't just a tool. It's a methodology. And you can learn all of it for free."

---

### OUTRO (70:00 - 71:00)

**[VISUAL: Split screen - all 4 terminals + final code]**

> "Okay. That was A LOT.

> I'm not gonna lie — building SpecWeave was MASSIVE. 90+ increments now. Thousands of lines of code. And honestly? It was exhausting. But SO worth it."

**[VISUAL: Quick montage of features shown]**

> "Let me recap what you just saw:

> 15+ AI agents that orchestrate themselves. Enterprise hierarchy mapping — even SAFe with 5 levels. BIDIRECTIONAL sync that pulls changes back from JIRA, GitHub, Azure DevOps. Background jobs that clone repos, import items, and BUILD DOCUMENTATION automatically. Multi-language translation. Support for ANY AI tool. Not just Claude — GPT, Gemini, Copilot.

> This is the framework I wished existed when I started. Now it does. And it's FREE. Open source. No catch."

**[VISUAL: GitHub repo star animation]**

> "If this helped you — even a little — I need you to do a few things:

> ONE: Star the GitHub repo. Seriously. Stars are how developers find tools. Every star helps someone else discover SpecWeave.

> TWO: Subscribe and hit the bell. I'm at 140 subscribers. Help me get to 1,000 so I can keep making content like this.

> THREE: I want to hear from YOU. This is the most important one.

> Open an issue on GitHub. Drop a comment below. Tell me what problems you're running into. What features would make your life easier? What should I build next?

> Mobile app support? Better CI/CD integration? More AI tool integrations? Something I haven't even thought of?

> Your feedback literally shapes what I build next. I read every single issue. Every comment. This is open source — it's built FOR you, WITH your input.

> Got ideas? Got frustrations? Got a use case I didn't cover? I want to hear ALL of it.

> Drop a comment — tell me what demo was most useful. What should I cover next? Multi-repo? Advanced JIRA? Custom agents?

> Links in the description. This script is in the repo. Everything is documented.

> This was huge. Thanks for watching. See you in the next one."

**[VISUAL: Subscribe button + Star repo animation + end card with links]**

---

## VISUAL CUES & B-ROLL NOTES

### Screen Recordings Needed

| Timestamp | Recording |
|-----------|-----------|
| 0:00 | 4 terminals with Claude active |
| 10:00 | Mac terminal install |
| 13:00 | Windows PowerShell install |
| 16:00 | VS Code settings.json |
| 20:00 | Full greenfield demo |
| 32:00 | Translation commands |
| 38:00 | EasyChamp brownfield with Living Docs Builder (NEW!) |
| 43:00 | specweave jobs --follow output (NEW!) |
| 48:00 | SUGGESTIONS.md generated output (NEW!) |
| 53:00 | GitHub sync with pull sync demo (NEW!) |
| 57:00 | JIRA board sync |
| 60:00 | Azure DevOps with SAFe hierarchy detection (NEW!) |
| 64:00 | specweave jobs command (NEW!) |

### Graphics Needed

- SpecWeave logo intro
- Comparison table: BMAD vs SpecKit vs SpecWeave
- Background jobs workflow diagram (NEW!)
- Living Docs Builder 6-phase diagram (NEW!)
- ADO process template comparison table (NEW!)
- Bidirectional sync flow diagram (NEW!)
- Sync flow diagram (JIRA ↔ SpecWeave ↔ Code)
- 4-terminal layout diagram
- Feature cards animation
- Subscribe end card

### Energy Notes

| Section | Energy |
|---------|--------|
| Hook | HIGH - fast cuts, punchy |
| Problem | MEDIUM - relatable frustration |
| Installation | STEADY - clear, methodical |
| Demos | HIGH - excitement, "watch this" |
| Academy | WARM - inviting, educational |
| Outro | HIGH - call to action |

---

## YOUTUBE DESCRIPTION

```
Finally. A framework that works on legacy codebases, startup MVPs, AND enterprise platforms.

I've worked on 10-year-old legacy code where nobody knows how anything works. I've built startup MVPs at 2am with zero documentation. I've navigated enterprise platforms with 50 microservices and SAFe hierarchies.

Every time, I thought: there HAS to be a framework that works on ALL of these.

There wasn't. So I built one. SpecWeave.

IN THIS VIDEO (~71 min):

THE PROBLEM:
• Why BMAD/SpecKit fail on real projects
• Documentation that always goes stale
• Tools that don't sync BIDIRECTIONALLY

THE SOLUTION:
• Drop SpecWeave into ANY codebase — it GENERATES documentation automatically
• Living docs that update themselves after every task
• BIDIRECTIONAL sync: JIRA ↔ GitHub ↔ Azure DevOps (pull AND push!)
• Background jobs: clone, import, analyze while you work
• Works with ANY AI: Claude, GPT, Gemini, Copilot

🆕 NEW IN v0.28:
• 🔄 BIDIRECTIONAL SYNC: External changes flow back to SpecWeave
• 📚 LIVING DOCS BUILDER: Auto-generate docs for brownfield projects
• 🔧 BACKGROUND JOBS: Clone, import, analyze in background
• 🏢 ADO HIERARCHY INTELLIGENCE: Auto-detect SAFe, Agile, Scrum, CMMI
• ⏸️ PAUSE/RESUME: Long-running jobs with checkpoints

7 REAL DEMOS:
• 🆕 Greenfield: Build from scratch
• 🌍 Translation: Multi-language in one command
• 🏚️ Brownfield: Living Docs Builder (auto-generate docs!)
• 🐙 GitHub: Bidirectional sync with pull
• 📋 JIRA: Enterprise epic/story integration
• 🔷 Azure DevOps: SAFe hierarchy detection
• 📊 Background Jobs: Monitor, pause, resume

BONUS:
• Works with GPT/Gemini/Copilot (not just Claude!)
• Full script in the academy (free)

⭐ STAR THE REPO: https://github.com/anton-abyzov/specweave
Stars help other developers find this!

LINKS:
• SpecWeave: https://github.com/anton-abyzov/specweave
• Claude Code: https://github.com/anthropics/claude-code
• Academy: .specweave/docs/public/academy/

💬 I WANT YOUR FEEDBACK:
Open a GitHub issue or drop a comment! Tell me:
• What problems are you running into?
• What features would help YOU?
• What should I build next? Mobile app? CI/CD? More integrations?
Your ideas shape what gets built. I read everything!

TIMESTAMPS:
0:00 - Finally: Legacy, Startup, AND Enterprise
1:30 - The Problem (Why nothing else works)
6:30 - What is SpecWeave?
10:30 - Docs Architecture: Internal vs Public
13:30 - Enterprise Engineering + Hierarchy Mapping
19:30 - Project-aware sync & /next flow
23:30 - Plugins & Skills
27:30 - Installation (Mac + Windows)
32:30 - VS Code Setup
36:30 - DEMO: Greenfield
40:30 - DEMO: Translation
43:30 - DEMO: Brownfield with Living Docs Builder (NEW!)
53:30 - DEMO: GitHub Sync with Bidirectional Pull (NEW!)
57:30 - DEMO: JIRA Sync
60:30 - DEMO: Azure DevOps with Hierarchy Intelligence (NEW!)
64:30 - Background Jobs Monitoring (NEW!)
66:30 - Works with ANY AI (AGENT.md)
68:30 - Academy & Resources
70:00 - This was HUGE (Outro)

Free. Open Source. No catch.

#SpecWeave #LegacyCode #Startup #Enterprise #AIFramework #JIRA #GitHub #AzureDevOps #OpenSource #LivingDocs #Documentation #DevTools #BMAD #SoftwareEngineering #BackgroundJobs #BidirectionalSync #SAFe
```

---

## THUMBNAIL IDEAS

1. **Three icons + text**: 💀 Legacy → 🚀 Startup → 🏢 Enterprise + "FINALLY"
2. **Before/After split**: Chaotic tabs → Clean terminal
3. **Bold text overlay**: "Works on ANY Project" with surprised face
4. **Project montage**: Three project screenshots merging into one

**Text on thumbnail**: "FINALLY" or "Legacy + Startup + Enterprise"
**Colors**: Dark background, bright text (yellow/white), project icons
**Expression**: Relief/excitement (matches "Finally" emotion)

---

## QUICK REFERENCE CARD (for description/pinned comment)

```markdown
## SpecWeave Quick Start

# Install
npm install -g @anthropic-ai/claude-code
npx specweave init .

# Daily Commands
/specweave:increment "feature"   # Plan work
/specweave:do                    # Execute
/specweave:progress              # Check status
/specweave:sync-progress         # Sync all tools (bidirectional!)
/specweave:done 0001             # Close increment

# NEW in v0.28: Background Jobs
specweave jobs                   # List all jobs
specweave jobs --follow <id>     # Real-time progress
specweave jobs --logs <id>       # View job logs
specweave jobs --kill <id>       # Pause job
specweave jobs --resume <id>     # Resume from checkpoint

# NEW in v0.28: Pull Sync
/specweave:sync-pull             # Pull external changes

# External Sync
/specweave:github-sync
/specweave:jira-sync
/specweave:ado-sync

# VS Code Auto-Launch (Mac)
Add to settings.json:
"terminal.integrated.profiles.osx": {
    "zsh": {"path": "zsh", "args": ["-i", "-c", "claude && exec zsh"]}
}

# Skip Permissions (~/.zshrc)
function claude() {
    command claude --dangerously-skip-permissions "$@"
}
```

---

## PUBLISHING STRATEGY (Thanksgiving Nov 27, 2025)

### Timing Options

| Option | Time | Why |
|--------|------|-----|
| **BEST: Morning** | 10:00 AM EST | Before family activities, devs scrolling with coffee |
| Good: Evening | 8:00 PM EST | After dinner, people relaxing, catching up on content |
| Alternative: Friday | Nov 28, 10 AM | Black Friday - people recovering, doing side projects |
| Alternative: Saturday | Nov 29, 10 AM | Weekend warriors, back to coding |

### Recommendation: **Publish at 10:00 AM EST on Nov 27**

Why Thanksgiving morning works:
- 🦃 People have time off but aren't with family YET
- ☕ Morning coffee + scrolling time
- 📱 Devs checking feeds before holiday chaos
- 🌍 Non-US audience unaffected (normal Thursday)
- 📈 Less competition (others avoid holidays)

### Pre-Publish Checklist

```
[ ] Thumbnail uploaded (high contrast, "Legacy → Startup → Enterprise")
[ ] Description copied from this script
[ ] Tags added
[ ] End screen configured (subscribe + related video)
[ ] Cards added at key moments
[ ] Pinned comment ready (Quick Reference Card)
[ ] Schedule set: Nov 27, 2025, 10:00 AM EST
```

### First 24 Hours

1. **Immediately**: Pin the Quick Reference Card comment
2. **1 hour after**: Share to Twitter/X with hook quote
3. **2 hours after**: Share to LinkedIn (enterprise angle)
4. **4 hours after**: Share to relevant Discord servers
5. **Same day**: Reddit r/programming, r/webdev (follow rules!)

### Social Posts (Copy-Paste Ready)

**Twitter/X:**
```
Finally. A framework that works on legacy codebases, startup MVPs, AND enterprise platforms.

I've been building this for months. Free. Open source.

Full masterclass (61 min): [LINK]

⭐ Star if useful: github.com/anton-abyzov/specweave
```

**LinkedIn:**
```
I've worked on 10-year-old legacy code. Built startup MVPs at 2am. Navigated enterprise platforms with 50 microservices.

Every time, I thought: there HAS to be a framework that works on ALL of these.

There wasn't. So I built one.

SpecWeave: spec-driven development that actually scales.

Free. Open source. Full masterclass linked below.

#SoftwareEngineering #OpenSource #DevTools #AI
```

---

## POST-RECORDING: ADD TRANSCRIPT HERE

[Transcript will be added after video recording]

---

## RELATED VIDEOS

- **002**: Deep Dive: Increment Lifecycle
- **003**: Advanced JIRA Workflows
- **004**: Multi-Repo Enterprise Setup
- **005**: Custom Hooks & Skills
