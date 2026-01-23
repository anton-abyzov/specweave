---
sidebar_position: 1
---

# Frequently Asked Questions (FAQ)

## Two-Spec Architecture

### Why do I have specs in two places?

**Short Answer**: You might not! Most features only need increment specs. Living docs specs are OPTIONAL for major features spanning 3+ increments.

**The Two Types**:

1. **Living Docs Spec** (`.specweave/docs/internal/specs/spec-####-name/spec.md`)
   - **Optional** - Only for major features (3+ increments)
   - **Permanent** - Never deleted, evolves over time
   - **Complete** - Contains ALL user stories, requirements, acceptance criteria
   - **PM Tool Link** - Can be linked to Jira epic, ADO feature, GitHub milestone

2. **Increment Spec** (`.specweave/increments/####-name/spec.md`)
   - **Always created** - Every increment has one
   - **Focused** - Contains subset of work for THIS increment only
   - **Temporary** - Can be deleted after completion (optional)
   - **References** - May reference living docs spec: "See SPEC-0005 for complete requirements"

**Real-World Example**:

```
Authentication Feature (spans 3 increments):

Living Docs Spec (permanent):
.specweave/docs/internal/specs/spec-0005-authentication/spec.md
├── ALL 20 user stories (US-001 through US-020)
├── ALL acceptance criteria (AC-US1-01 through AC-US20-05)
├── Complete requirements (FR-001 through FR-030)
└── Linked to Jira epic AUTH-123

Increment 1: Basic Login
.specweave/increments/0007-basic-login/spec.md
├── References: "See SPEC-0005"
├── Implements: US-001, US-002, US-003 only
└── Out of scope: OAuth (US-010), 2FA (US-018)

Increment 2: OAuth Integration
.specweave/increments/0012-oauth-integration/spec.md
├── References: "See SPEC-0005"
├── Implements: US-010, US-011, US-012 only
└── Dependencies: Requires increment 0007 (basic login)

Increment 3: Two-Factor Auth
.specweave/increments/0018-two-factor-auth/spec.md
├── References: "See SPEC-0005"
├── Implements: US-018, US-019, US-020 only
└── Dependencies: Requires increment 0007, 0012
```

After all 3 increments complete:
- ✅ Living docs spec REMAINS (permanent knowledge base)
- ⏳ Increment specs can be deleted (optional)

---

### Which one is the source of truth?

**Important Distinction**: There are TWO different "source of truth" concepts:

1. **Requirements Truth**: What SHOULD be built (specs)
2. **Reality Truth**: What ACTUALLY exists (code)

```mermaid
graph TB
    subgraph "Requirements (Intent)"
        A[Living Docs Spec] --> B[Increment Spec]
        B --> C[tasks.md]
    end

    subgraph "Reality (What Exists)"
        D[Code] --> E[Running System]
        E --> F[Actual Behavior]
    end

    C -.->|"implements"| D

    style A fill:#90EE90
    style D fill:#87CEEB
    style F fill:#FFB6C1
```

**For Requirements** (what should we build?):
- **Living Docs Spec** = Source of truth (if it exists)
- Otherwise → Increment Spec is source of truth

**For Reality** (what actually works?):
- **Code** = Source of truth (always)
- Tests verify code matches requirements
- When specs and code disagree → you have either a **bug** (code wrong) or **spec drift** (spec outdated)

**Decision Tree for Spec Selection**:

```mermaid
graph TD
    A[Which spec defines<br/>requirements?] --> B{Does living docs<br/>spec exist?}
    B -->|Yes| C[Living Docs Spec<br/>defines requirements]
    B -->|No| D[Increment Spec<br/>defines requirements]

    C --> E[Increment spec<br/>references it]
    D --> F[Increment spec<br/>is standalone]

    style C fill:#90EE90
    style D fill:#87CEEB
```

**Practical Examples**:

| Scenario | Requirements Truth | Reality Truth |
|----------|-------------------|---------------|
| New feature planning | Living Docs / Increment Spec | N/A (not built yet) |
| During implementation | Spec defines expected behavior | Code defines current state |
| Bug found | Spec says X, code does Y → fix code | Code is wrong |
| Spec outdated | Code does Z (correctly), spec says X → update spec | Code is right |

**With Living Docs Spec** (major feature):
- **Requirements Truth**: `.specweave/docs/internal/specs/spec-0005-authentication/spec.md`
- **Increment Reference**: "See SPEC-0005 for complete requirements"
- **Relationship**: Living docs = complete requirements, increment = current scope

**Without Living Docs Spec** (simple feature):
- **Requirements Truth**: `.specweave/increments/0009-add-dark-mode/spec.md`
- **No Reference**: Standalone specification
- **Relationship**: Increment spec = complete requirements

**Key Insight**: Specs define INTENT, code defines REALITY. Both matter, but for different questions.

---

### Do I need both for every feature?

**No!** Most features only need increment specs.

**Decision Flowchart**:

```mermaid
graph TD
    A[New Feature Request] --> B{Will this span<br/>3+ increments?}
    B -->|Yes| C[Create Living Docs Spec<br/>.specweave/docs/internal/specs/]
    B -->|No| D{Is this a major<br/>module/product?}
    D -->|Yes| C
    D -->|No| E[Only Create Increment Spec<br/>.specweave/increments/]

    C --> F[Create increment spec<br/>that references living docs]
    E --> G[Increment spec<br/>is standalone]

    style C fill:#FFB6C1
    style E fill:#90EE90
    style F fill:#87CEEB
    style G fill:#DDA0DD
```

**When to Create Living Docs Spec**:
- ✅ Feature spans 3+ increments (authentication, payment processing, messaging system)
- ✅ Major module/product (new product line, major refactor affecting multiple areas)
- ✅ Need PM tool link (Jira epic, ADO feature, GitHub milestone spanning months)
- ✅ Want permanent historical record (how did we build authentication? Check SPEC-0005)

**When to Skip Living Docs Spec** (just use increment spec):
- ✅ Feature completes in 1 increment (add dark mode toggle)
- ✅ Feature completes in 2 increments (refactor [API](/docs/glossary/terms/api) client)
- ✅ Bug fix, hotfix, experiment (temporary work)
- ✅ Small enhancement (add CSV export button)

**Rule of Thumb**: If you're unsure, start with increment spec only. You can always create living docs spec later if the feature grows.

---

### Can I delete increment specs after completion?

**Yes!** Increment specs are temporary references.

**What You Can Delete**:
- ✅ `.specweave/increments/0007-basic-login/spec.md` (after increment complete)
- ✅ `.specweave/increments/0007-basic-login/plan.md` (after increment complete)
- ✅ Entire increment folder (if you want clean history)

**What You Should NEVER Delete**:
- ❌ `.specweave/docs/internal/specs/` (permanent knowledge base)
- ❌ `.specweave/docs/internal/architecture/adr/` (architecture decisions)
- ❌ `.specweave/docs/internal/strategy/` (business context)

**Typical Workflow**:

```
Day 1: Create increment 0007 (basic login)
├── spec.md (references SPEC-0005)
├── plan.md
└── tasks.md

Day 30: Complete increment 0007
├── All tasks done ✅
├── Tests passing ✅
└── Code merged ✅

Day 31: Optional cleanup
├── Delete 0007/spec.md (not needed anymore)
├── Delete 0007/plan.md (not needed anymore)
└── Keep SPEC-0005 (permanent reference)

Day 60: Start increment 0012 (OAuth)
└── Create new spec.md that references SPEC-0005
    (SPEC-0005 still there, providing complete context!)
```

**Why Delete Increment Specs?**
- **Reduce clutter**: Keep increment folders minimal
- **Focus on living docs**: One permanent spec vs many temporary ones
- **Historical traceability**: [Git](/docs/glossary/terms/git) history shows what was implemented when

**Why Keep Increment Specs?**
- **Historical snapshot**: What did we plan THEN vs where are we NOW?
- **Audit trail**: Track how scope evolved across increments
- **Learning**: Understand how features were broken down

**Recommendation**: Keep increment specs if you need historical traceability. Delete if you prefer cleaner folders (living docs remain either way).

---

### What about [brownfield](/docs/glossary/terms/brownfield) projects (existing code)?

**Living Docs Specs integrate with existing project docs!**

**Pattern**:

```
your-existing-project/
├── docs/
│   ├── api-design.md             ← Existing docs (keep them!)
│   ├── database-schema.md        ← Existing docs (keep them!)
│   └── authentication-design.md  ← Existing docs (keep them!)
│
└── .specweave/                   ← SpecWeave overlay (non-invasive)
    ├── docs/internal/specs/
    │   └── spec-0005-authentication/
    │       └── spec.md           ← Links to existing docs!
    │           └── "See: /docs/authentication-design.md (existing system)"
    │
    └── increments/
        └── 0007-enhance-auth/
            └── spec.md           ← "Enhancing existing system (see SPEC-0005)"
```

**Living Docs Spec for [Brownfield](/docs/glossary/terms/brownfield)**:

```markdown
# SPEC-0005: Authentication Enhancements

## Brownfield Context

**Existing System**:
- See: `/docs/authentication-design.md` (current JWT implementation)
- See: `/docs/api-design.md#auth-endpoints` (existing endpoints)
- Current state: Basic JWT auth, no OAuth, no 2FA

## Enhancement Goals

This spec ENHANCES the existing system with:
- OAuth2 integration (US-010)
- Two-factor authentication (US-018)
- Session management improvements (US-020)

**What We're NOT Changing**:
- JWT implementation (keep existing)
- User database schema (keep existing)
- Existing endpoints (backward compatible)
```

**Benefits for [Brownfield](/docs/glossary/terms/brownfield)**:
- ✅ Living docs REFERENCE existing docs (don't duplicate)
- ✅ Clear "what exists" vs "what we're adding"
- ✅ Increment specs focus on NEW work only
- ✅ Existing docs remain authoritative for legacy code

---

### What about small features (1 increment)?

**Use increment spec only! No living docs spec needed.**

**Example: Add Dark Mode Toggle** (1 increment)

```
.specweave/increments/0015-dark-mode-toggle/
├── spec.md                    ← Complete specification (no living docs reference)
│   ├── US-001: Toggle in settings
│   ├── US-002: Persist preference
│   ├── US-003: CSS variable switching
│   └── Success criteria
├── plan.md                    ← Implementation approach
└── tasks.md                   ← 5 tasks, 1 week

NO living docs spec needed!
Increment spec is complete and standalone.
```

**When Small Features Grow**:

```
Iteration 1 (Increment 0015): Dark mode toggle
└── spec.md (3 user stories)

User feedback: "Can we have scheduled dark mode?"

Iteration 2 (Increment 0022): Scheduled dark mode
└── spec.md (2 more user stories)

User feedback: "Can we have per-app dark mode?"

Iteration 3 (Increment 0030): Per-app dark mode
└── spec.md (3 more user stories)

At this point: Consider creating living docs spec!
├── SPEC-0020: Dark Mode System
│   └── ALL 8 user stories (complete)
└── Future increments reference SPEC-0020
```

**Rule**: Start simple (increment spec only). Promote to living docs spec if feature grows beyond 2 increments.

---

### How do PM tools (Jira/GitHub/ADO) fit in?

**Living Docs Specs link to PM tools!**

**Integration Pattern**:

```mermaid
graph LR
    A[Jira Epic<br/>AUTH-123] --> B[Living Docs Spec<br/>SPEC-0005]
    B --> C[Increment 0007<br/>Basic Login]
    B --> D[Increment 0012<br/>OAuth]
    B --> E[Increment 0018<br/>2FA]

    C --> F[Jira Story<br/>AUTH-124]
    D --> G[Jira Story<br/>AUTH-125]
    E --> H[Jira Story<br/>AUTH-126]

    style A fill:#FFB6C1
    style B fill:#90EE90
    style C fill:#87CEEB
    style D fill:#87CEEB
    style E fill:#87CEEB
```

**Living Docs Spec with Jira Epic**:

```markdown
# SPEC-0005: Authentication System

**External PM Tool**:
- **Jira Epic**: AUTH-123
- **URL**: https://jira.company.com/browse/AUTH-123
- **Stakeholder**: VP Engineering
- **Business Case**: See `.specweave/docs/internal/strategy/authentication/business-case.md`

## User Stories

### US-001: Basic Login (Jira: AUTH-124)
...

### US-010: OAuth Integration (Jira: AUTH-125)
...

### US-018: Two-Factor Auth (Jira: AUTH-126)
...
```

**Benefits**:
- ✅ Living docs spec = single source of truth (linked to Jira epic)
- ✅ Each increment = Jira story (subset of epic)
- ✅ Stakeholders track epic in Jira, engineers use SpecWeave
- ✅ No duplication (living docs references Jira, Jira references SpecWeave)

**For GitHub** (SpecWeave native integration):
- ✅ Auto-create GitHub Issues for increments
- ✅ Auto-sync progress after each task
- ✅ Auto-close issues when increments complete
- ✅ See: [GitHub Integration](/docs/academy/specweave-essentials/14-github-integration)

---

### What if my project doesn't match this structure?

**SpecWeave is flexible! You can adapt the structure.**

**Common Adaptations**:

**1. Monorepo with Multiple Apps**:
```
monorepo/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── admin/
└── .specweave/                    ← One SpecWeave root for entire monorepo
    ├── docs/internal/specs/
    │   ├── spec-0001-web-auth/    ← Specs can be app-specific
    │   └── spec-0002-mobile-auth/
    └── increments/
        ├── 0007-web-basic-login/  ← Increments can target specific apps
        └── 0008-mobile-basic-login/
```

**2. [Microservices](/docs/glossary/terms/microservices) (Multiple Repos)**:
```
parent-folder/                     ← Create parent folder
├── .specweave/                    ← One SpecWeave for entire system
│   ├── docs/internal/specs/
│   │   └── spec-0005-auth/        ← System-wide authentication
│   └── increments/
│       ├── 0007-user-svc-auth/    ← Auth for user-service
│       └── 0008-order-svc-auth/   ← Auth for order-service
├── user-service/                  ← Separate git repo (or submodule)
├── order-service/                 ← Separate git repo (or submodule)
└── notification-service/
```

**3. Small Project (No Living Docs)**:
```
small-project/
└── .specweave/
    ├── docs/internal/
    │   ├── architecture/          ← Keep architecture docs
    │   └── strategy/              ← Optional: high-level strategy
    └── increments/
        ├── 0001-setup/
        ├── 0002-feature-a/        ← No living docs specs
        └── 0003-feature-b/        ← Increment specs only

Every feature = 1 increment = standalone spec
No living docs specs needed!
```

**4. Enterprise (Heavy PM Integration)**:
```
enterprise-project/
└── .specweave/
    ├── docs/internal/specs/
    │   ├── spec-0001-auth/        ← Links to Jira epic AUTH-123
    │   ├── spec-0002-billing/     ← Links to ADO feature FEA-456
    │   └── spec-0003-reporting/   ← Links to GitHub milestone v2.0
    └── increments/
        └── (increments reference living docs specs)
```

**Key Principle**: SpecWeave provides structure but doesn't enforce rigidity. Adapt to your project's needs!

---

## Architecture & Performance

### Why does SpecWeave use Skills instead of MCP?

**Short Answer**: Code execution achieves 98% token reduction vs MCP tool calls. This is based on [Anthropic's own engineering research](https://www.anthropic.com/engineering/code-execution-with-mcp).

**The Problem with MCP**:

| Issue | Impact |
|-------|--------|
| **Tool definition bloat** | All tools loaded upfront → context window consumed |
| **Data duplication** | Same data flows through model 2-3× |
| **Token explosion** | 150,000 tokens for tasks achievable in 2,000 |

**How SpecWeave Solves This**:

```
❌ MCP Pattern:
   Load 50 tools → Claude picks one → fetch data → process → call another tool
   = Multiple round trips, all definitions in context, data duplicated

✅ SpecWeave Pattern:
   Skill activates on-demand → Claude writes code → execute locally → minimal tokens
   = 98% reduction, deterministic, reusable code
```

**Key Quote from Anthropic**:
> "LLMs are adept at writing code and developers should take advantage of this strength to build agents that interact with MCP servers more efficiently."

**Practical Benefits**:
- **Reusable**: Code commits to git, runs in CI/CD
- **Deterministic**: Same code = same result every time
- **Debuggable**: Full stack traces, not opaque tool failures
- **Cheaper**: 70-98% token savings

**For Non-Claude Tools (Cursor, Copilot, etc.)**:
This is even MORE important! MCP support varies across tools, but `npx` works everywhere:

```bash
# Instead of Playwright MCP:
npx playwright test

# Instead of Kafka MCP:
import { Kafka } from 'kafkajs';
```

See the Architecture Decision Records in `.specweave/docs/internal/architecture/adr/` for full technical decisions.

---

## Installation Issues

### "SyntaxError: Unexpected token 'with'"

**Your Node.js version is too old.** SpecWeave requires **Node.js 20.12.0 or higher** (we recommend Node.js 22 LTS).

**Quick check:**
```bash
node --version
# If below v20.12.0, you need to upgrade
```

**Solution**: See [detailed upgrade instructions](/docs/guides/troubleshooting/common-errors#node-version-error) for all platforms (macOS, Linux, Windows) and version managers (nvm, fnm, Volta, asdf, Homebrew).

**Quick fix for nvm users:**
```bash
nvm install 22
nvm use 22
nvm alias default 22
npm install -g specweave
```

---

## Getting Started

### I'm new to SpecWeave. Where do I start?

**Quick Start** (5 minutes):

```bash
# 1. Install SpecWeave (requires Node.js 20.12.0+)
npm install -g specweave

# 2. Initialize your project
cd my-project
specweave init

# 3. Create your first increment
/sw:increment "Add user registration"

# Result: spec.md, plan.md, tasks.md created
# No living docs spec needed for first feature!
```

**When to Add Living Docs Spec**:
- After 2-3 increments → If you realize the feature is growing
- Before starting large feature → If you know it will span 3+ increments
- For major modules → If you're building a new product/subsystem

---

### How do I decide: Living Docs Spec vs Increment Spec only?

**Use this checklist**:

**Create Living Docs Spec if ANY of these are true**:
- [ ] Feature will span 3+ increments (3+ months of work)
- [ ] Feature is a major module (authentication, payments, messaging)
- [ ] Need PM tool link (Jira epic, ADO feature, GitHub milestone)
- [ ] Want permanent historical record (how did we build X?)
- [ ] [Brownfield](/docs/glossary/terms/brownfield): Enhancing major existing system
- [ ] Multiple teams working on different parts

**Skip Living Docs Spec (use increment spec only) if ALL of these are true**:
- [ ] Feature completes in 1-2 increments (less than 1 month)
- [ ] Feature is small/focused (add button, fix bug, refactor file)
- [ ] No PM tool needed (local tracking only)
- [ ] No long-term documentation value
- [ ] Solo developer or small team

**When in doubt**: Start with increment spec only. Promote to living docs spec later if needed.

---

### Can I migrate existing specs to SpecWeave?

**Yes! SpecWeave is [brownfield](/docs/glossary/terms/brownfield)-friendly.**

**Migration Pattern**:

```bash
# Step 1: Initialize SpecWeave (non-invasive)
cd your-existing-project
specweave init

# Step 2: Create living docs specs that REFERENCE existing docs
# Don't duplicate - link to existing documentation!

# Step 3: Create increments for NEW work
/sw:increment "Enhance authentication"

# Your existing docs remain unchanged
# SpecWeave overlays on top
```

**Example Migration**:

```markdown
# SPEC-0001: Authentication Enhancements

## Existing System (Brownfield)
- **Current Docs**: `/docs/auth-design.md` (keep as-is)
- **Current Implementation**: `/src/auth/` (JWT-based)
- **Gaps Identified**: No OAuth, no 2FA, session issues

## Enhancement Plan
This spec documents ONLY the enhancements:
- US-001: Add OAuth2 (NEW)
- US-002: Add 2FA (NEW)
- US-003: Fix session management (ENHANCEMENT)

See `/docs/auth-design.md` for existing system details.
```

---

## Technical Details

### What's the file structure exactly?

**Complete Structure**:

```
.specweave/
├── docs/
│   ├── internal/                          # Internal docs (not published)
│   │   ├── specs/                         # Living docs specs (OPTIONAL)
│   │   │   └── spec-####-name/
│   │   │       └── spec.md                # Complete specification (permanent)
│   │   ├── strategy/                      # Business context (OPTIONAL)
│   │   │   └── module-name/
│   │   │       ├── overview.md            # High-level vision
│   │   │       └── business-case.md       # ROI, market analysis
│   │   ├── architecture/                  # Technical design (MANDATORY)
│   │   │   ├── adr/                       # [Architecture Decision Records](/docs/glossary/terms/adr)
│   │   │   └── diagrams/                  # System diagrams
│   │   ├── delivery/                      # Build & release
│   │   ├── operations/                    # Runbooks, SLOs
│   │   └── governance/                    # Policies, standards
│   │
│   └── public/                            # User-facing docs (can publish)
│       ├── guides/
│       └── api/
│
└── increments/                            # Implementation work
    ├── 0001-setup/
    ├── 0002-feature-a/
    │   ├── spec.md                        # WHAT & WHY (always present)
    │   ├── plan.md                        # HOW (always present)
    │   ├── tasks.md                       # STEPS (always present, with embedded tests)
    │   ├── metadata.json                  # Status tracking
    │   ├── reports/                       # Session reports, analyses
    │   ├── scripts/                       # Helper scripts
    │   └── logs/                          # Execution logs
    └── 0003-feature-b/
```

**Key Folders**:
- **`specs/`**: OPTIONAL living docs specs (permanent)
- **`increments/`**: MANDATORY work tracking (spec, plan, tasks for each)
- **`architecture/`**: MANDATORY technical decisions
- **`strategy/`**: OPTIONAL business context

---

### How does SpecWeave compare to other approaches?

**Comparison Table**:

| Aspect | SpecWeave | Traditional Docs | Jira/ADO Only | Code Comments Only |
|--------|-----------|------------------|---------------|-------------------|
| **Source of Truth** | Living docs + increment specs | Wiki (often stale) | PM tool (high-level only) | Code (no vision) |
| **Permanent Record** | ✅ Yes (living docs) | ⚠️ If maintained | ❌ Issues closed = lost | ❌ Code changes = lost |
| **Implementation Tracking** | ✅ Yes (increments) | ❌ Manual | ✅ Yes (issues) | ❌ No |
| **[Brownfield](/docs/glossary/terms/brownfield) Friendly** | ✅ Yes (references existing) | ⚠️ Duplicate effort | ⚠️ Separate system | ✅ Yes |
| **PM Tool Integration** | ✅ Yes (links to Jira/ADO/GitHub) | ❌ Manual sync | ✅ Native | ❌ No |
| **Test Integration** | ✅ Yes (tasks.md with embedded tests) | ❌ Separate test docs | ❌ No | ⚠️ Unit tests only |

**When to Use SpecWeave**:
- ✅ Spec-driven development (plan before implementing)
- ✅ Long-term projects (need permanent documentation)
- ✅ Team collaboration (clear source of truth)
- ✅ Brownfield projects (integrate with existing docs)

**When NOT to Use SpecWeave**:
- ❌ Prototyping (just code it)
- ❌ Throwaway projects (no long-term value)
- ❌ Solo tiny projects (overhead not worth it)

---

---

## Self-Improving AI (Reflect)

### What is the Reflect system?

**Reflect enables Claude to learn from your corrections and apply patterns automatically in future sessions.**

Instead of repeating yourself every session ("No, always use Button component, not button tag"), Claude captures these corrections and remembers them permanently.

**How it works:**

```mermaid
flowchart LR
    A["Session 1: You correct Claude"] --> B["Reflect captures pattern"]
    B --> C["Saved to .specweave/memory/"]
    C --> D["Session 2: Pattern auto-applied"]
```

**Enable it:**
```bash
/sw:reflect-on     # Auto-learn from every session
/sw:reflect        # Manually capture learnings
/sw:reflect-status # Check memory status
```

**What gets learned:**
- ✅ Naming conventions ("Always use kebab-case for file names")
- ✅ Component patterns ("Use Button variant='primary' for main actions")
- ✅ Architecture decisions ("Always validate input at API boundary")
- ✅ Testing patterns ("Mock external APIs in unit tests")
- ✅ Code style preferences ("Prefer functional components over class")

**[Full Reflect Guide →](/docs/guides/self-improving-skills)**

---

### Why use Reflect instead of just telling Claude each time?

**Because compounding knowledge beats repetition.**

| Without Reflect | With Reflect |
|-----------------|--------------|
| Correct 10x per month | Correct once |
| 50 tokens × 10 = 500 tokens | 50 tokens × 1 = 50 tokens |
| Claude forgets next session | Claude remembers forever |
| You're the memory | AI has memory |

**Real example:**

```
Day 1: "No, use <Button>, not <button>"
Day 3: "Again, use <Button>"
Day 7: "STILL using <button>!"
Day 14: "Please remember: <Button>"
```

**With Reflect:**

```
Day 1: "No, use <Button>, not <button>"
       → Reflect captures learning
Day 3: Claude automatically uses <Button>
Day 7: Still uses <Button>
Forever: Pattern applied automatically
```

**Memory compounds over time** — the more you work with SpecWeave, the smarter Claude becomes about YOUR project.

---

### Where are learnings stored?

Learnings are stored in **centralized memory files**:

```
.specweave/memory/                  # Project-specific learnings
├── component-usage.md              # UI component patterns
├── api-patterns.md                 # API conventions
├── testing.md                      # Test patterns
├── deployment.md                   # Deploy procedures
└── general.md                      # Misc learnings

~/.specweave/memory/                # Global learnings (all projects)
├── general.md                      # Cross-project patterns
└── ...
```

**Benefits:**
- ✅ Git-trackable (team can share learnings)
- ✅ Human-readable markdown
- ✅ Easy to edit or remove specific learnings
- ✅ Project-specific + global memory

---

### Can I edit or delete learnings?

**Yes! Memory files are plain markdown.**

**View learnings:**
```bash
cat .specweave/memory/component-usage.md
```

**Edit learnings:**
```bash
# Remove or modify entries manually
vim .specweave/memory/component-usage.md
```

**Delete specific learning:**
```bash
/sw:reflect-clear "LRN-2026-01-05-abc"
```

**Clear all learnings:**
```bash
rm -rf .specweave/memory/
```

Memory is transparent and user-controlled.

---

## Hooks System

### What are hooks and why do they matter?

**Hooks are the secret to SpecWeave's autonomous quality.**

They execute automatically at key points:
- **SessionStart** — Load context, check prerequisites
- **UserPromptSubmit** — Validate increment status, enforce rules
- **ToolCall** — Auto-sync living docs, update task status
- **SessionEnd** — Generate reports, trigger Reflect

**Why they're critical:**

```mermaid
flowchart TB
    A["Claude marks task complete"] --> B["Hook: Sync spec.md ACs"]
    B --> C["Hook: Update living docs"]
    C --> D["Hook: Run quality checks"]
    D --> E["Result: Docs always current"]
```

Without hooks:
- ❌ Manual doc updates (forget 50% of the time)
- ❌ Specs drift from reality
- ❌ No quality gates

With hooks:
- ✅ **Automatic doc sync** after every task
- ✅ **Quality gates** prevent bad merges
- ✅ **Test validation** ensures code works
- ✅ **Living docs stay current** without manual work

**Hooks make `/sw:auto` reliable** for multi-hour autonomous sessions.

---

### Can I customize hooks?

**Yes! Hooks are customizable bash scripts.**

**Hook locations:**
```
.claude/hooks/
├── session-start/
├── user-prompt-submit/
├── tool-call/
└── session-end/
```

**Example custom hook** (validate environment):
```bash
# .claude/hooks/session-start/check-env.sh
if [ ! -f .env ]; then
  echo "⚠️  Missing .env file!"
  exit 1
fi
```

**SpecWeave provides default hooks** for:
- Living docs sync
- Task-AC auto-update
- Test validation
- Quality gates

**[Learn more about hooks →](/docs/glossary/terms/hooks)**

---

### What's the difference between hooks and skills?

**Hooks execute automatically, skills activate on keywords.**

| Aspect | Hooks | Skills |
|--------|-------|--------|
| **When** | Automatic (session start, tool calls) | Keyword-triggered ("architecture", "security") |
| **Purpose** | Quality gates, validation, sync | Specialized expertise (PM, Architect, QA) |
| **Customization** | Edit bash scripts in `.claude/hooks/` | Use provided skills or write custom |
| **Examples** | Sync docs after task, validate tests | Generate ADR, design system, write tests |

**Together they're powerful:**
- **Skills** = AI agents with domain expertise
- **Hooks** = Automation ensuring quality

---

## Troubleshooting & Recovery

### Commands not working? Skills not loading?

**Quick Fix** - Run this command to recover from most issues:

```bash
specweave update
```

**When to use:**
- ✅ Claude Code was updated and skills stopped working
- ✅ Commands like `/sw:increment` not recognized
- ✅ Hooks not firing properly
- ✅ After upgrading SpecWeave version

**What it does:**
- CLI self-update (npm)
- Regenerates CLAUDE.md and AGENTS.md
- Updates config with new defaults
- Refreshes marketplace plugins (24 plugins, 136 skills, 68 agents)

### When to use `refresh-marketplace` instead

Most users should use `specweave update`. The `refresh-marketplace` command exists for specific situations:

```bash
specweave refresh-marketplace
```

**What it does beyond Claude Code's native auto-update:**
- Fixes hook permissions (`chmod +x`) — Claude Code doesn't preserve executable bits on shell scripts
- Manages lazy loading state (router-only installation for token efficiency)
- Cleans up orphaned cache/skills directories
- Updates instruction files (CLAUDE.md, AGENTS.md)

**When to use it:**
- Hooks stopped working after Claude Code update (permission issue)
- Skills not activating despite being installed
- Want to refresh plugins without updating CLI version

**Note:** You can enable Claude Code's native marketplace auto-update via `/plugin` → Marketplaces → Enable auto-update. However, native auto-update doesn't fix hook permissions or manage SpecWeave-specific state like lazy loading.

### Auto Mode Issues

**Session stuck or not completing?**
```bash
# Check session status
/sw:auto-status

# Cancel current session
/sw:cancel-auto

# Resume with fresh session
/sw:auto
```

**Tests not running in auto mode?**

Auto mode requires tests to actually execute before completion. If you see:
- "All tasks marked complete but NO TEST EXECUTION detected"
- "E2E tests exist but were NOT executed"

Run tests explicitly, then auto mode will complete:
```bash
npm test
npx playwright test
```

### Skills not activating?
```bash
ls -la .claude/skills/
# Should see 17+ SpecWeave skills

# If missing, first try full update:
specweave update

# If still not working (hook permissions issue):
specweave refresh-marketplace
```

### Commands not found?
```bash
ls -la .claude/commands/
# Should see 22+ command files

# If missing, first try full update:
specweave update

# If still not working:
specweave refresh-marketplace
```

### Hooks not firing?

```bash
# Check hooks are installed
ls -la .claude/hooks/

# Verify hook output
cat .specweave/logs/hook*.log

# Reinstall hooks:
specweave init .
# Select: "Continue working"
```

### Errors during Bash or Edit tool calls?

**Install latest SpecWeave:**
```bash
npm install -g specweave@latest
specweave update
```

**Clear stale state:**
```bash
rm -f .specweave/state/*.lock
rm -rf .specweave/state/.dedup-cache
```

---

## Still Have Questions?

**Resources**:
- **User Guide**: [Quick Start](/docs/quick-start)
- **GitHub Sync**: [GitHub Integration](/docs/academy/specweave-essentials/14-github-integration)
- **Intro**: [Introduction](/docs/intro)
- **GitHub Issues**: [Ask a Question](https://github.com/anton-abyzov/specweave/issues/new)
- **Discord**: [Join Community](https://discord.gg/UYg4BGJ65V)

**Common Follow-Ups**:
- "How do I sync with Jira?" → See [JIRA Integration](/docs/academy/specweave-essentials/15-jira-integration)
- "Can I use SpecWeave with Cursor?" → See [Introduction](/docs/intro)
- "What's the increment lifecycle?" → See [Increment Lifecycle](/docs/academy/specweave-essentials/13-increment-lifecycle)
- "How do I use auto mode?" → See [Auto Mode Guide](#auto-mode-issues) above

---

**Last Updated**: 2026-01-02
