# SpecWeave Learning Journey: From Software Engineering to AI-Native Development

**A Comprehensive Course on Modern Spec-Driven Development**

> *"The best way to predict the future is to build it."* — Alan Kay

---

## Course Overview

Welcome to the SpecWeave Learning Journey — a comprehensive educational path that takes you from traditional software engineering through the AI revolution to mastering spec-driven development.

**What You'll Learn:**
- Software engineering cycles and principles that remain timeless
- The evolution of AI-assisted development (2020-2025)
- Current AI tool landscape: Claude, Copilot, Cursor, and beyond
- SpecWeave's unique approach to preserving AI work
- Practical workflow mastery with hands-on exercises

**Navigation System:**
Throughout this journey, use `:next` to advance to the next lesson. This mirrors SpecWeave's `/sw:next` command — your constant companion in real-world development.

```
:next → Proceed to next lesson
:back → Return to previous lesson
:overview → Show course outline
:practice → Jump to hands-on exercise
```

---

## Module 1: The Software Engineering Foundation

### Lesson 1.1: Why Software Engineering Matters

**The Problem of Scale**

In 1968, NATO held a conference that coined the term "software engineering." The reason? Software projects were failing at alarming rates. The "software crisis" was real:

- Projects delivered late (or never)
- Budgets exploded
- Software didn't do what users needed
- Maintenance was a nightmare

**The Solution: Discipline**

Software engineering emerged as the application of systematic, disciplined, quantifiable approaches to software development. Core principles that emerged:

1. **Requirements First** — Know what you're building
2. **Design Before Code** — Think before typing
3. **Test What You Build** — Verify correctness
4. **Document Your Work** — Knowledge persists
5. **Iterate and Improve** — Perfection is a journey

These principles remain **timeless** — even in the AI era.

> **:next** → *Lesson 1.2: Development Methodologies*

---

### Lesson 1.2: Development Methodologies

**The Waterfall Era (1970s-1990s)**

```
Requirements → Design → Implementation → Testing → Deployment → Maintenance
     ↓            ↓           ↓              ↓           ↓
  Complete    Complete    Complete      Complete    Complete
```

Linear, sequential, complete-each-phase. Works for well-understood domains (building bridges), fails for evolving software.

**The Agile Revolution (2001-Present)**

```
Plan → Build → Test → Review → Adapt
  ↑________________________________↓
       (Repeat in short cycles)
```

**Agile Manifesto Core Values:**
- Individuals and interactions over processes and tools
- Working software over comprehensive documentation
- Customer collaboration over contract negotiation
- Responding to change over following a plan

**Modern Reality: Hybrid Approaches**

Today's best teams combine:
- Agile's adaptability
- Waterfall's discipline in critical phases
- DevOps continuous delivery
- AI-assisted acceleration

**Where SpecWeave Fits:**

SpecWeave is **spec-driven but agile** — you get the rigor of documented specs with the flexibility of incremental delivery. Every increment is:
- **Planned** ([spec.md](/docs/glossary/terms/spec-md))
- **Designed** ([plan.md](/docs/glossary/terms/plan-md))
- **Executed** ([tasks.md](/docs/glossary/terms/tasks-md))
- **Validated** ([quality gates](/docs/glossary/terms/quality-gate))
- **Delivered** ([living docs](/docs/glossary/terms/living-docs))

> **:next** → *Lesson 1.3: The Testing Pyramid*

---

### Lesson 1.3: The Testing Pyramid

**The Classic Pyramid**

```
          /\
         /E2E\        ← Few, slow, expensive
        /------\
       /  Integ  \    ← Some, moderate cost
      /------------\
     /    Unit      \ ← Many, fast, cheap
    ------------------
```

**Distribution Guidelines:**
- **Unit Tests (70%)**: Test individual functions/classes
- **Integration Tests (20%)**: Test component interactions
- **E2E Tests (10%)**: Test full user journeys

**Modern Evolution: The Testing Trophy**

```
    Static Analysis    ← TypeScript, ESLint
         /\
        /E2E\
       /------\
      / Integ  \      ← "Integration tests give
     /------------\      the most confidence"
                         — Kent C. Dodds
```

**SpecWeave's Testing Philosophy:**

Every task in `tasks.md` includes embedded tests:

```markdown
### T-001: Implement AuthService (P1)

**Test Plan** (BDD):
- **Given** user exists with valid credentials
- **When** login() called with correct password
- **Then** JWT token returned

**Test Cases**:
- Unit (`auth-service.test.ts`):
  - login_validCredentials_returnsToken
  - login_invalidPassword_throwsError
  - Coverage: >95%
```

**[Quality Gates](/docs/glossary/terms/quality-gate) Enforce This:**
- Gate 1: All tasks complete
- Gate 2: Tests passing (60%+ coverage minimum)
- Gate 3: Documentation updated

> **:next** → *Lesson 1.4: DevOps and CI/CD*

---

### Lesson 1.4: DevOps and CI/CD

**The DevOps Philosophy**

```
     Dev                    Ops
   (Build)                (Run)
      \                    /
       \                  /
        \    DevOps     /
         \   Culture   /
          \          /
           \        /
            ↘    ↙
         Collaboration
         Automation
         Measurement
         Sharing
```

**CI/CD Pipeline**

```
Code → Build → Test → Deploy → Monitor
  ↑_______________________________|
         (Continuous Feedback)
```

**Key Practices:**
- **Continuous Integration**: Merge often, test automatically
- **Continuous Delivery**: Always deployable
- **Continuous Deployment**: Auto-deploy on green
- **Infrastructure as Code**: Version control everything

**DORA Metrics (What Elite Teams Measure):**

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | Multiple/day | Weekly | Monthly | &lt;6mo |
| Lead Time for Changes | &lt;1 hour | &lt;1 week | &lt;1 month | &gt;6mo |
| Change Failure Rate | 0-15% | 16-30% | 31-45% | &gt;45% |
| Mean Time to Recovery | &lt;1 hour | &lt;1 day | &lt;1 week | &gt;1mo |

**SpecWeave tracks DORA automatically:**
```
.specweave/metrics/dora-latest.json
.specweave/metrics/dora-report.md
```

> **:next** → *Module 2: The AI Revolution*

---

## Module 2: The AI Revolution in Software Development

### Lesson 2.1: The Pre-AI Era (Before 2020)

**Traditional Developer Workflow:**

```
Requirement → Research → Design → Code → Debug → Test → Document
     ↓           ↓         ↓        ↓       ↓        ↓        ↓
  Read docs   Stack     UML/   Manual   Print   Manual   Manual
             Overflow  Diagrams typing  debug  testing   docs
```

**Pain Points:**
- Hours spent on boilerplate code
- Context-switching between tasks
- Documentation as afterthought
- Knowledge silos in teams
- Onboarding new developers took weeks

**Tools of the Era:**
- IDEs: VS Code, IntelliJ, Eclipse
- Version Control: Git, GitHub, GitLab
- Project Management: JIRA, Trello
- Documentation: Confluence, Notion
- Communication: Slack, Teams

**What Was Missing:**
- Intelligent code completion
- Automated documentation generation
- Natural language to code
- Context-aware suggestions
- Knowledge synthesis

> **:next** → *Lesson 2.2: Early AI Tools (2020-2023)*

---

### Lesson 2.2: Early AI Tools (2020-2023)

**GitHub Copilot Changes Everything (June 2021)**

```
Developer types:
"// function to validate email"

Copilot suggests:
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

**The Paradigm Shift:**
- From "search for solution" to "describe problem"
- From "write everything" to "guide and refine"
- From "memorize syntax" to "express intent"

**Early AI Tool Landscape:**

| Tool | Type | Strength | Weakness |
|------|------|----------|----------|
| GitHub Copilot | Code completion | Inline suggestions | Context limited |
| ChatGPT | Chat interface | General knowledge | No codebase context |
| Tabnine | Code completion | Privacy-focused | Less capable |
| Amazon CodeWhisperer | Code completion | AWS integration | Amazon-centric |

**Limitations of Early Tools:**
- No persistent memory across sessions
- Limited context window (4K-8K tokens)
- Chat sessions lost forever
- No integration with project management
- Generated code without tests
- Documentation? What documentation?

**The Core Problem Remained:**

```
Session 1: "Help me design authentication"
  → Great conversation, decisions made
  → Session ends, everything disappears

Session 2: "How did we decide to handle JWT?"
  → AI has no memory
  → Start from scratch
  → Inconsistent decisions
```

> **:next** → *Lesson 2.3: The Claude Era (2024-2025)*

---

### Lesson 2.3: The Claude Era (2024-2025)

**Claude's Evolution:**

| Release | Date | Key Advancement |
|---------|------|-----------------|
| Claude 1 | Mar 2023 | Constitutional AI |
| Claude 2 | Jul 2023 | 100K context window |
| Claude 3 Opus | Mar 2024 | Near-human reasoning |
| Claude 3.5 Sonnet | Jun 2024 | Speed + capability |
| Claude 3.5 Sonnet (v2) | Oct 2024 | Computer use |
| **Claude Opus 4.5** | **Nov 2025** | **Extended reasoning** |

**What Makes Claude Different:**

1. **Constitutional AI**: Values-aligned, helpful, harmless
2. **Extended Context**: 200K tokens = entire codebases
3. **Reasoning Quality**: Understands nuance, handles ambiguity
4. **Tool Use**: Can execute code, search web, use computer

**Claude Code (CLI) Revolution:**

```bash
# Traditional approach
vim auth.ts    # Write code manually
npm test       # Run tests manually
vim README.md  # Update docs manually
git commit     # Commit manually

# Claude Code approach
> "Add JWT authentication with refresh tokens"
  ✓ Created auth.ts
  ✓ Added tests (94% coverage)
  ✓ Updated README
  ✓ Ready for review
```

**Claude Desktop with Web Sessions (Nov 2025):**

A game-changer for knowledge work:
- Browse live documentation
- Research while coding
- Fetch real-time API specs
- Stay current with releases

> **:next** → *Lesson 2.4: The Non-Claude Landscape*

---

### Lesson 2.4: The Non-Claude Landscape (2025)

**Current AI Coding Tools:**

| Tool | Model | Unique Strength | Best For |
|------|-------|-----------------|----------|
| **Claude Code** | Claude 4.5 | Extended context, reasoning | Complex projects |
| **GitHub Copilot** | GPT-4 | IDE integration | Inline completion |
| **Cursor** | Multiple | VS Code fork, AI-native | IDE replacement |
| **Windsurf** | Cascade | Real-time collaboration | Team coding |
| **Cody** | Multiple | Code graph understanding | Large codebases |
| **Aider** | Multiple | Git-native workflow | Solo developers |
| **Continue** | Multiple | Open source, customizable | Privacy-focused |

**IDE-Integrated vs Terminal-First:**

```
IDE-Integrated (Cursor, Windsurf):
┌─────────────────────────────────────┐
│ Editor          │ AI Chat           │
│                 │                   │
│ code.ts         │ > "Add logging"   │
│                 │ ✓ Modified code   │
│                 │                   │
└─────────────────────────────────────┘

Terminal-First (Claude Code, Aider):
┌─────────────────────────────────────┐
│ Terminal                            │
│                                     │
│ $ claude                            │
│ > "Add authentication to API"       │
│ Creating auth.ts...                 │
│ Editing routes.ts...                │
│ Running tests...                    │
│                                     │
└─────────────────────────────────────┘
```

**Open Source Alternatives:**

| Tool | Foundation | Key Feature |
|------|------------|-------------|
| **Ollama** | Local LLMs | Privacy, offline |
| **LLaMA 3** | Meta | Open weights |
| **Mistral** | Mistral AI | EU-based, efficient |
| **DeepSeek** | DeepSeek | Code-specialized |

**The Convergence Trend:**

All tools are moving toward:
- Multi-file editing
- Codebase understanding
- Tool use (terminal, browser)
- Memory/context persistence

**But They All Share One Problem:**

```
Session ends → Knowledge disappears → Start over

AI creates brilliant architecture → Chat history
AI writes tests → Chat history
AI documents decisions → Chat history

Team member asks "Why did we choose React Query?"
→ "I think there was a chat about this..."
→ Knowledge lost
```

> **:next** → *Lesson 2.5: The Documentation Crisis*

---

### Lesson 2.5: The Documentation Crisis

**The AI Paradox:**

```
AI generates MORE code FASTER
         ↓
But documentation?
         ↓
Still an afterthought
         ↓
Knowledge loss ACCELERATES
```

**What Happens in Practice:**

```
Week 1: "Claude, design user authentication"
  → Brilliant session
  → JWT + refresh tokens decided
  → Security considerations discussed
  → Implementation started

Week 3: New developer joins
  → "How does auth work?"
  → "Check the chat... wait, which chat?"
  → "Just read the code"
  → Developer makes conflicting decisions

Week 6: Security audit
  → "Where's the threat model?"
  → "We discussed it with AI..."
  → "In a chat session... somewhere..."
```

**The Industry Problem:**

| Metric | Reality |
|--------|---------|
| Time to onboard new dev | 2-4 weeks |
| Documentation accuracy | ~40% current |
| Architecture decisions recorded | &lt;20% |
| Knowledge lost per team churn | 30-50% |

**Why Traditional Docs Fail:**

1. **Separate from code**: Markdown in /docs, code in /src
2. **Manual updates**: Developers "forget"
3. **No validation**: Docs can lie
4. **No connection**: Docs ≠ Tasks ≠ Tests

**The SpecWeave Solution:**

```
AI Session → spec.md (permanent)
AI Session → plan.md (permanent)
AI Session → tasks.md (permanent)
            ↓
Living Documentation (auto-updated)
            ↓
GitHub/JIRA (auto-synced)
```

> **:next** → *Module 3: SpecWeave Core Concepts*

---

## Module 3: SpecWeave Core Concepts

### Lesson 3.1: The Philosophy

**Core Principle: Specs Are Source of Truth**

```
NOT this:
Code → (maybe) Documentation

THIS:
Specs → Code → Docs Auto-Update
  ↑_______________↓
    (Validation)
```

**The Three Immutable Rules:**

1. **Specs First**: No code without spec
2. **Tests Embedded**: Every task has tests
3. **Docs Live**: Documentation updates automatically

**Why This Matters:**

| Without SpecWeave | With SpecWeave |
|-------------------|----------------|
| AI conversations lost | Specs persisted |
| No architecture records | ADRs captured |
| Tests added "later" | Tests in every task |
| Docs outdated in days | Docs always current |
| Onboarding: 2 weeks | Onboarding: 1 day |

> **:next** → *Lesson 3.2: The Three-File Foundation*

---

### Lesson 3.2: The Three-File Foundation

Every increment produces exactly three files:

```
.specweave/increments/0001-dark-mode/
├── spec.md    ← WHAT (Business)
├── plan.md    ← HOW (Technical)
└── tasks.md   ← DO (Execution)
```

**spec.md — The Business Contract**

```markdown
# Dark Mode Feature

## User Stories

### US-001: Toggle Dark Mode
As a user, I want to toggle dark mode
so that I can reduce eye strain at night.

### Acceptance Criteria
- **AC-US1-01**: Toggle persists across sessions
- **AC-US1-02**: Theme applies to all components
- **AC-US1-03**: System preference detected on first visit
```

**Owner**: Product Manager
**Audience**: Stakeholders, QA, Developers
**Language**: Business (no code)

---

**plan.md — The Technical Solution**

```markdown
# Implementation Plan

## Architecture

### Component: ThemeProvider
**Purpose**: Manage theme state globally
**Pattern**: React Context
**File**: `src/providers/ThemeProvider.tsx`

### Data Model
```typescript
interface Theme {
  mode: 'light' | 'dark' | 'system';
  colors: ColorPalette;
}
```

## Technical Decisions
- CSS Variables for theming (performance)
- localStorage for persistence (simplicity)
- prefers-color-scheme for system detection
```

**Owner**: Architect / Tech Lead
**Audience**: Developers
**Language**: Technical

---

**tasks.md — The Execution Plan**

```markdown
### T-001: Create ThemeProvider (P1)

**Effort**: 3h | **AC-IDs**: AC-US1-01, AC-US1-02

**Implementation**:
- [ ] Create ThemeProvider with React Context
- [ ] Implement toggleTheme() function
- [ ] Add localStorage persistence
- [ ] Connect to CSS variables

**Test Plan** (BDD):
- **Given** user in light mode
- **When** user clicks toggle
- **Then** theme changes to dark mode

**Test Cases**:
- Unit: toggle_lightToDark_changesTheme
- Unit: persistence_reloadPage_maintainsTheme
- Coverage: >95%
```

**Owner**: Developer
**Audience**: Developers, QA
**Language**: Technical + Testable

> **:next** → *Lesson 3.3: The Increment Lifecycle*

---

### Lesson 3.3: The Increment Lifecycle

**States of an Increment:**

```
planning → in-progress → completed
              ↓              ↓
           paused        archived
              ↓
           backlog
              ↓
          abandoned
```

**Lifecycle Commands:**

| Command | Transition | Purpose |
|---------|------------|---------|
| `/sw:increment "feature"` | → planning | Create new |
| `/sw:do` | planning → in-progress | Start work |
| `/sw:pause 0001` | in-progress → paused | Temporary stop |
| `/sw:resume 0001` | paused → in-progress | Continue |
| `/sw:backlog 0001` | any → backlog | Defer |
| `/sw:done 0001` | in-progress → completed | Finish |
| `/sw:abandon 0001` | any → abandoned | Cancel |
| `/sw:archive 0001` | completed → archived | Clean up |

**The Magic of `/sw:next`:**

```
/sw:next

What it does:
1. Finds active increment
2. Validates completion (3 gates)
3. Auto-closes if ready
4. Runs quality assessment
5. Suggests next work

One command. Full workflow.
```

**Example Flow:**

```bash
# Day 1: Start feature
/sw:increment "Add dark mode"
  → Creates 0001-dark-mode/
  → Generates spec.md, plan.md, tasks.md

# Day 2-4: Implementation
/sw:do
  → Executes tasks T-001 through T-008
  → Updates status automatically
  → Hooks update living docs

# Day 5: Completion
/sw:next
  → Validates: ✓ Tasks ✓ Tests ✓ Docs
  → Closes 0001
  → Runs QA assessment
  → Suggests: "Start 0002-user-settings?"
```

> **:next** → *Lesson 3.4: Quality Gates*

---

### Lesson 3.4: [Quality Gates](/docs/glossary/terms/quality-gate)

**Three Gates Before Closure:**

```
Gate 1: Tasks    Gate 2: Tests    Gate 3: Docs
   ↓                 ↓                ↓
All P1/P2        All passing      All updated
complete         60%+ coverage    Living docs
                                  synced
```

**Gate 1: Task Completion**

```
✅ PASS conditions:
- All P1 (critical) tasks: complete
- All P2 (important) tasks: complete or deferred with reason
- P3 (nice-to-have): complete, deferred, or moved to backlog

❌ FAIL conditions:
- Any P1 task incomplete
- P2 task incomplete without documented reason
- Tasks in "blocked" state
```

**Gate 2: Test Validation**

```
✅ PASS conditions:
- All test suites passing
- Coverage meets threshold (default: 60%)
- No skipped tests without documentation

❌ FAIL conditions:
- Any test failing
- Coverage below threshold
- Critical paths not tested
```

**Gate 3: Documentation**

```
✅ PASS conditions:
- spec.md acceptance criteria updated
- plan.md reflects implementation
- Living docs synced
- CHANGELOG updated (if public API changed)

❌ FAIL conditions:
- ACs not checked off
- Docs not matching implementation
- Living docs out of sync
```

**What Happens on Failure:**

```
/sw:done 0001

❌ Gate 1: 2 P1 tasks incomplete
✅ Gate 2: All tests passing
❌ Gate 3: README not updated

Options:
A. Complete remaining work (recommended)
B. Force close with deferrals
C. Continue working
```

> **:next** → *Lesson 3.5: Living Documentation*

---

### Lesson 3.5: Living Documentation

**The Problem with Traditional Docs:**

```
Day 1: Write README
Day 30: Code changes
Day 60: README lies
Day 90: Nobody trusts docs
Day 120: "Just read the code"
```

**SpecWeave's Solution: Hooks**

```
Task Completed
     ↓
PostToolUse Hook Fires
     ↓
Living Docs Sync
     ↓
.specweave/docs/ Updated
     ↓
External Tools Notified
     ↓
GitHub/JIRA Updated
```

**Living Docs Structure:**

```
.specweave/docs/
├── public/                    ← User-facing
│   ├── FEATURES.md           ← Auto-updated feature list
│   ├── ARCHITECTURE.md       ← System overview
│   └── API.md                ← API documentation
│
├── internal/                  ← Team-only
│   ├── architecture/
│   │   └── adr/              ← Architecture Decision Records
│   ├── delivery/
│   │   ├── roadmap.md
│   │   └── dora-metrics.md
│   └── governance/
│       └── coding-standards.md
│
└── _features/                 ← Feature specs (from increments)
    ├── FS-001-authentication/
    ├── FS-002-payments/
    └── FS-003-notifications/
```

**Auto-Sync to External Tools:**

```
SpecWeave                External Tool
    │                         │
spec.md ─────────────────→ GitHub Issue
    │                         │
tasks.md ────────────────→ Issue Checklist
    │                         │
Status ──────────────────→ Issue State
    │                         │
    ←────────────────────── Comments
```

> **:next** → *Module 4: Practical Workflow*

---

## Module 4: Practical SpecWeave Workflow

### Lesson 4.1: Installation and Setup

**Prerequisites:**
- Node.js 20+
- Git repository
- Claude Code CLI

**Installation:**

```bash
# Install globally
npm install -g specweave

# Navigate to project
cd your-project

# Initialize SpecWeave
specweave init .
```

**What `init` Creates:**

```
.specweave/
├── config.json          ← Project settings
├── increments/          ← Your work
│   └── README.md
├── docs/                ← Living documentation
│   ├── public/
│   └── internal/
├── cache/               ← Performance cache
├── state/               ← Hook state
└── metrics/             ← DORA metrics
```

**Configure External Tools (Optional):**

```bash
# GitHub integration
export GITHUB_TOKEN=ghp_xxxxx

# JIRA integration
export JIRA_EMAIL=you@company.com
export JIRA_API_TOKEN=xxxxx
export JIRA_BASE_URL=https://company.atlassian.net

# Azure DevOps integration
export ADO_PAT=xxxxx
export ADO_ORGANIZATION=your-org
```

> **:next** → *Lesson 4.2: Your First Increment*

---

### Lesson 4.2: Your First Increment

**Step 1: Create the Increment**

```bash
/sw:increment "Add user registration"
```

**What Happens:**

1. **PM Agent activates**
   - Analyzes requirement
   - Creates user stories
   - Defines acceptance criteria

2. **Creates spec.md:**
   ```markdown
   # User Registration Feature

   ## User Stories

   ### US-001: Email Registration
   As a visitor, I want to register with email
   so that I can create an account.

   ### Acceptance Criteria
   - AC-US1-01: User provides email and password
   - AC-US1-02: Email validation enforced
   - AC-US1-03: Password strength requirements shown
   - AC-US1-04: Confirmation email sent
   ```

3. **Architect Agent activates**
   - Designs technical approach
   - Creates plan.md

4. **Creates plan.md:**
   ```markdown
   # Implementation Plan

   ## Architecture

   ### Component: AuthService
   - Handle registration logic
   - Password hashing (bcrypt)
   - Email service integration

   ### Component: RegistrationForm
   - React component
   - Form validation (Zod)
   - Error handling
   ```

5. **Tech Lead creates tasks.md:**
   ```markdown
   ### T-001: Create AuthService (P1)
   **AC-IDs**: AC-US1-01, AC-US1-04

   **Implementation**:
   - [ ] Create AuthService class
   - [ ] Implement register() method
   - [ ] Add password hashing
   - [ ] Integrate email service

   **Test Cases**:
   - register_validData_createsUser
   - register_weakPassword_rejects
   ```

> **:next** → *Lesson 4.3: Executing Tasks*

---

### Lesson 4.3: Executing Tasks

**Start Implementation:**

```bash
/sw:do
```

**What Happens:**

1. **Loads increment context**
   - Reads spec.md, plan.md, tasks.md
   - Understands requirements

2. **Executes tasks sequentially:**
   ```
   T-001: Create AuthService
   ├── Creating src/services/auth-service.ts
   ├── Implementing register() method
   ├── Adding bcrypt password hashing
   ├── Writing tests...
   ├── Running tests: ✓ 4/4 passing
   └── ✓ Task complete

   T-002: Create RegistrationForm
   ├── Creating src/components/RegistrationForm.tsx
   ...
   ```

3. **After each task:**
   - Hooks fire automatically
   - Living docs update
   - Progress syncs to external tools

**Monitoring Progress:**

```bash
/sw:progress

0001-user-registration [████████░░░░] 67%
├── T-001 ✓ AuthService
├── T-002 ✓ RegistrationForm
├── T-003 ⏳ Email verification (in progress)
├── T-004 ○ Error handling
└── T-005 ○ Documentation
```

> **:next** → *Lesson 4.4: The Next Command*

---

### Lesson 4.4: The `/sw:next` Command

**The Central Workflow Command**

When you're done working (or think you are):

```bash
/sw:next
```

**Scenario 1: All Gates Pass**

```
📊 Checking current increment...

Active: 0001-user-registration

🔍 PM Validation:
  ✅ Gate 1: All tasks complete (5/5)
  ✅ Gate 2: Tests passing (47/47, 89% coverage)
  ✅ Gate 3: Documentation updated

🎯 Auto-closing increment 0001...
  ✓ Status: completed
  ✓ Completion report generated
  ✓ WIP freed (1/2 → 0/2)

🎉 Increment 0001 closed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 POST-CLOSURE QUALITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Score: 87/100 (GOOD) ✓

🎯 Next Work Suggestions

Found 1 planned increment:
0002-password-reset (P1)
  → Password reset flow
  → Dependencies: 0001 (✅ complete)

Next Action: Run `/sw:do 0002` to begin
```

**Scenario 2: Gates Fail**

```
📊 Checking current increment...

Active: 0001-user-registration

🔍 PM Validation:
  ❌ Gate 1: 2 tasks incomplete
  ✅ Gate 2: Tests passing
  ❌ Gate 3: README not updated

Options:
A. Complete remaining work (recommended)
B. Force close with deferrals
C. Continue working

What would you like to do? [A/B/C]
```

**Scenario 3: No Active Work**

```
📊 No active increments found.

Recent work:
  ✅ 0001-user-registration (closed today)

Current WIP: 0/2 (slots available)

🎯 Next Work Suggestions

Options:
1. Create new: /sw:increment "feature"
2. Check backlog: .specweave/increments/_backlog/
3. Review roadmap: .specweave/docs/internal/roadmap.md
```

> **:next** → *Lesson 4.5: External Tool Sync*

---

### Lesson 4.5: External Tool Sync

**Bidirectional Synchronization:**

```
SpecWeave ←──────────────→ External Tool

spec.md   ────────────────→ Issue created
tasks.md  ────────────────→ Checkboxes added
Status    ────────────────→ Issue state
          ←──────────────── Comments synced
          ←──────────────── Status changes
```

**GitHub Sync:**

```bash
/sw-github:sync 0001

Syncing 0001-user-registration to GitHub...
  ✓ Issue #42 created
  ✓ 5 tasks added as checkboxes
  ✓ Labels applied: feature, P1
  ✓ Milestone: v1.0.0
```

**JIRA Sync:**

```bash
/sw-jira:sync 0001

Syncing to JIRA...
  ✓ Epic PROJ-123 created
  ✓ 3 user stories created
  ✓ Subtasks generated
  ✓ Status: In Progress
```

**Sync Progress Command:**

```bash
/sw:sync-progress

Syncing to all configured tools...
  ✓ tasks.md → Living docs
  ✓ Living docs → GitHub Issue #42
  ✓ Progress: 67% synced
```

> **:next** → *Module 5: Advanced Topics*

---

## Module 5: Advanced Topics

### Lesson 5.1: Multi-Agent Orchestration

**SpecWeave's Specialized Agents:**

| Agent | Role | When Invoked |
|-------|------|--------------|
| **PM Agent** | User stories, ACs, requirements | `/sw:increment` |
| **Architect Agent** | System design, ADRs | During planning |
| **Tech Lead Agent** | Implementation, code review | `/sw:do` |
| **QA Lead Agent** | Test strategy, coverage | Test creation |
| **Security Agent** | Threat modeling, OWASP | Security reviews |
| **DevOps Agent** | IaC, pipelines, deployment | Infrastructure |

**Agent Orchestration Flow:**

```
User Request
     ↓
Role Orchestrator
     ↓
┌─────────────────────────────────────┐
│ PM Agent: "What should we build?"   │
│     ↓                               │
│ Architect: "How should we build?"   │
│     ↓                               │
│ Tech Lead: "Let's implement"        │
│     ↓                               │
│ QA Lead: "Let's test"               │
│     ↓                               │
│ Security: "Is it secure?"           │
│     ↓                               │
│ DevOps: "Let's deploy"              │
└─────────────────────────────────────┘
     ↓
Completed Feature
```

**Invoking Specific Agents:**

```bash
# Security review
/sw:qa 0001

# TDD workflow
/sw:tdd-cycle

# Architecture planning
/sw:plan 0001
```

> **:next** → *Lesson 5.2: TDD Workflow*

---

### Lesson 5.2: TDD Workflow

**Red-Green-Refactor with SpecWeave:**

```
/sw:tdd-cycle

Phase 1: RED (Write Failing Tests)
  ↓
/sw:tdd-red
  → Writes comprehensive failing tests
  → Tests define expected behavior
  → All tests RED (failing)

Phase 2: GREEN (Make Tests Pass)
  ↓
/sw:tdd-green
  → Implements minimal code
  → Focus on making tests pass
  → All tests GREEN (passing)

Phase 3: REFACTOR (Improve Code)
  ↓
/sw:tdd-refactor
  → Improves code quality
  → Applies design patterns
  → Tests remain GREEN
```

**BDD Test Plans in tasks.md:**

```markdown
### T-001: Implement Login (P1)

**Test Plan** (BDD):
- **Given** user "test@example.com" exists
- **When** login() called with valid password
- **Then** JWT token returned

- **Given** user doesn't exist
- **When** login() called
- **Then** UserNotFoundError thrown

- **Given** user exists
- **When** login() called with wrong password
- **Then** InvalidCredentialsError thrown
```

> **:next** → *Lesson 5.3: Brownfield Projects*

---

### Lesson 5.3: Brownfield Projects

**Existing Projects Welcome!**

SpecWeave isn't just for new projects. Import existing documentation:

```bash
specweave init .

# Import from Notion
/sw:import-docs ~/exports/notion --source=notion

# Import from Confluence
/sw:import-docs ~/exports/confluence --source=confluence

# Import from GitHub Wiki
/sw:import-docs ~/repo/wiki --source=github-wiki
```

**Auto-Classification:**

```
Scanning 47 documents...

Classified:
  📋 Specs: 12 files → .specweave/docs/_features/
  🏗️ Architecture: 8 files → .specweave/docs/internal/architecture/
  👥 Team docs: 15 files → .specweave/docs/internal/team/
  📜 Legacy: 12 files → .specweave/docs/internal/legacy/
```

**Retroactive Specifications:**

For code without specs, create retroactive documentation:

```bash
/sw:increment "Document authentication system"

# AI analyzes existing code
# Creates spec.md describing current behavior
# Creates plan.md documenting architecture
# Creates tasks.md for any improvements
```

> **:next** → *Lesson 5.4: Token Efficiency*

---

### Lesson 5.4: Token Efficiency

**The Context Problem:**

```
Without optimization:
- Load ALL plugins: 50,000 tokens
- Load ALL docs: 100,000 tokens
- Load ALL history: 50,000 tokens
= 200,000 tokens before any work

With SpecWeave:
- Load relevant skill: 2,000 tokens
- Load increment context: 5,000 tokens
- Progressive loading: as needed
= 7,000 tokens to start (97% reduction)
```

**How SpecWeave Achieves 70%+ Reduction:**

1. **Progressive Disclosure (Native Claude)**
   - Skills metadata loads first (~75 tokens per skill)
   - Full skill content loads only when relevant
   - Living docs loaded on-demand via grep searches

2. **Selective Context Loading**
   ```bash
   /sw:docs authentication

   Searching living docs...
   Found 3 relevant files:
     - specs/us-001-authentication.md
     - architecture/adr/0001-jwt-auth.md
     - architecture/auth-flow.md

   Loading into context...
   Tokens used: ~2,500 (vs 45,000 if loading all docs)
   ```

3. **Sub-Agent Isolation**
   ```
   Main Context        Sub-Agent Context
   ┌──────────┐        ┌──────────┐
   │ Current  │  ───→  │ Focused  │
   │ work     │        │ task     │
   │ only     │        │ only     │
   └──────────┘        └──────────┘
   ```

> **:next** → *Lesson 5.5: Why Skills, Not MCP?*

---

### Lesson 5.5: Why Skills, Not MCP?

**The MCP (Model Context Protocol) Approach:**

```
User Request
     ↓
Load ALL tool definitions (50 tools)
     ↓
Model decides which tool
     ↓
Fetch data from tool
     ↓
Model processes data
     ↓
Call another tool?
     ↓
Repeat...
```

**Token Cost of MCP:**
- Tool definitions: ~500 tokens each × 50 = 25,000 tokens
- Data flows through model multiple times
- Same data processed 2-3x

**Anthropic's Engineering Insight:**

> *"LLMs are adept at writing code and developers should take advantage of this strength."*
> — [Anthropic Engineering Blog](https://www.anthropic.com/engineering/code-execution-with-mcp)

**The Skills Approach:**

```
User says "Add authentication"
     ↓
Keyword triggers skill loading
     ↓
ONE skill loaded: ~2,000 tokens
     ↓
Claude WRITES code to process locally
     ↓
Results returned
```

**Comparison:**

| Aspect | MCP | Skills |
|--------|-----|--------|
| Initial load | 25K+ tokens | 2K tokens |
| Data duplication | 2-3x | None |
| Execution | Model decides | Code executes |
| Determinism | Model-dependent | Predictable |
| Token cost | High | Low |

**Result:** 98%+ token reduction for the same capability.

> **:next** → *Module 6: The Future*

---

## Module 6: The Future of AI-Native Development

### Lesson 6.1: Where We're Heading

**Current State (2025):**

```
Human ←→ AI Assistant ←→ Tools
         (Claude)
```

- AI assists human decisions
- Human reviews AI output
- Tools execute deterministically

**Near Future (2026-2027):**

```
Human ←→ AI Orchestrator ←→ AI Agents ←→ Tools
              ↓
        Multi-agent
        coordination
```

- AI orchestrates other AI agents
- Specialized agents for each domain
- Human oversight at checkpoints

**What SpecWeave Enables:**

| Capability | Today | Tomorrow |
|------------|-------|----------|
| Spec generation | AI-assisted | Fully autonomous |
| Implementation | Human-guided | Agent-executed |
| Testing | Human-reviewed | Auto-verified |
| Documentation | Auto-updated | Self-evolving |
| Deployment | CI/CD triggered | Intelligent rollout |

**The Constant: Specs as Truth**

No matter how autonomous AI becomes:

```
Specs remain source of truth
     ↓
Humans can always audit
     ↓
Decisions are documented
     ↓
Knowledge persists
```

> **:next** → *Lesson 6.2: Your Learning Path*

---

### Lesson 6.2: Your Learning Path

**Beginner Path:**

```
Week 1: Fundamentals
  → Install SpecWeave
  → Create first increment
  → Complete with /sw:next
  → Experience full cycle

Week 2: Workflow Mastery
  → Use /sw:do for automation
  → Understand quality gates
  → Practice TDD workflow
  → Explore living docs
```

**Intermediate Path:**

```
Week 3-4: Integration
  → Connect GitHub/JIRA
  → Set up bidirectional sync
  → Configure hooks
  → Customize workflows

Week 5-6: Team Usage
  → Multi-project mode
  → Shared specifications
  → Code review with specs
  → Onboard team members
```

**Advanced Path:**

```
Week 7-8: Customization
  → Create custom skills
  → Build custom hooks
  → Extend agent capabilities
  → Optimize for your domain

Week 9+: Contribution
  → Contribute to SpecWeave
  → Share skills with community
  → Help shape the future
```

> **:next** → *Course Completion*

---

## Course Completion

**Congratulations!**

You've completed the SpecWeave Learning Journey. You now understand:

✅ **Software Engineering Fundamentals**
- Methodologies, testing, DevOps
- Why discipline matters in AI era

✅ **AI Tool Landscape**
- Claude's evolution to Opus 4.5
- Non-Claude alternatives
- Web sessions capability

✅ **SpecWeave Core Concepts**
- Three-file foundation
- Increment lifecycle
- Quality gates
- Living documentation

✅ **Practical Workflow**
- Installation and setup
- Creating increments
- The power of `/sw:next`
- External tool sync

✅ **Advanced Topics**
- Multi-agent orchestration
- TDD workflow
- Token efficiency
- Skills vs MCP

**Your Next Step:**

```bash
npm install -g specweave
cd your-project
specweave init .
/sw:increment "Your first feature"
```

**Then just keep using:**

```bash
/sw:next
```

It will guide you through the entire cycle.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                  SPECWEAVE COMMANDS                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  START WORK                                             │
│  /sw:increment "feature" → Create increment      │
│  /sw:do                  → Execute tasks         │
│                                                         │
│  FLOW CONTROL                                           │
│  /sw:next     → Smart transition (THE KEY!)      │
│  /sw:progress → Check status                     │
│  /sw:done ID  → Manual close                     │
│                                                         │
│  QUALITY                                                │
│  /sw:validate ID → Run checks                    │
│  /sw:qa ID       → Quality assessment            │
│  /sw:tdd-cycle   → TDD workflow                  │
│                                                         │
│  SYNC                                                   │
│  /sw:sync-progress → Sync all systems            │
│  /sw:sync-docs     → Sync living docs            │
│                                                         │
│  LIFECYCLE                                              │
│  /sw:pause ID   → Pause work                     │
│  /sw:resume ID  → Resume work                    │
│  /sw:backlog ID → Move to backlog                │
│  /sw:abandon ID → Cancel increment               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Welcome to the future of spec-driven development.**

*Stop losing your AI work. Start building permanent knowledge.*

---

## Resources

- **Documentation**: [spec-weave.com](https://spec-weave.com)
- **Discord**: [discord.gg/UYg4BGJ65V](https://discord.gg/UYg4BGJ65V)
- **YouTube**: [@antonabyzov](https://www.youtube.com/@antonabyzov)
- **GitHub**: [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)

---

*Built with SpecWeave*
