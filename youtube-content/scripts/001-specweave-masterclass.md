# SpecWeave Masterclass: Spec-Driven Development for the AI Era

**Duration**: ~2 hours 50 minutes
**Target Audience**: Software developers, architects, technical leads, AI-assisted development practitioners
**Format**: Comprehensive tutorial with live demonstrations

---

## Table of Contents

1. [Introduction](#1-introduction-5-min) (5 min)
2. [The Problem & Solution](#2-the-problem--solution-10-min) (10 min)
3. [Comparison to Alternatives](#3-comparison-to-alternatives-15-min) (15 min)
4. [Core Concepts](#4-core-concepts-20-min) (20 min)
5. [Greenfield Demo](#5-greenfield-demo-30-min) (30 min)
6. [Brownfield Demo - EasyChamp](#6-brownfield-demo---easychamp-40-min) (40 min)
7. [Advanced Features](#7-advanced-features-20-min) (20 min)
8. [Testing Demonstrations](#8-testing-demonstrations-15-min) (15 min)
9. [Best Practices](#9-best-practices-10-min) (10 min)
10. [Conclusion & Resources](#10-conclusion--resources-5-min) (5 min)

---

## 1. Introduction (5 min)

### Opening Hook (0:00-1:00)

**[ON SCREEN: Code editor with AI assistant making random changes]**

> "Have you ever had an AI assistant refactor your entire codebase... only to realize it broke critical functionality that wasn't documented anywhere? Or watched as Claude or GPT generates beautiful code that completely misses the *why* behind your business requirements?"

**[PAUSE]**

> "This is what I call 'vibe coding' - letting AI make decisions based on vibes rather than verified specifications. And it's costing us time, quality, and confidence."

**[ON SCREEN: SpecWeave logo]**

> "Today, I'm going to show you a better way. Welcome to SpecWeave - a specification-driven development framework that brings rigor, clarity, and safety to AI-assisted development."

### What You'll Learn (1:00-2:30)

**[ON SCREEN: Bullet points appear]**

> "In this masterclass, you'll discover:
>
> - How to build software where specifications are the source of truth - not an afterthought
> - How to reduce AI context usage by 70% or more through intelligent context loading
> - How to safely transform legacy codebases without breaking existing functionality
> - How to create custom AI skills that understand YOUR domain and YOUR codebase
> - How to implement closed-loop validation with tests that actually tell the truth
>
> And I'll show you all of this through real examples - including a live transformation of a production codebase."

### Who This Is For (2:30-3:30)

**[ON SCREEN: Developer personas]**

> "This masterclass is for:
>
> - **Developers** who want to work faster with AI without sacrificing quality
> - **Architects** who need to maintain system integrity as projects scale
> - **Technical Leads** responsible for code quality and team velocity
> - **Anyone** who's frustrated with AI assistants that forget context or make breaking changes
>
> Whether you're starting a new project from scratch or maintaining a 10-year-old codebase, SpecWeave has patterns for you."

### About Me (3:30-4:30)

> "I'm Anton Abyzov, and I've spent the last year exploring how to make AI-assisted development actually work at scale. I've used frameworks like BMAD-METHOD, experimented with various AI coding assistants, and learned the hard way what works and what doesn't.
>
> SpecWeave is the result of that journey - a distillation of proven patterns for specification-driven development with AI."

### What Makes SpecWeave Different (4:30-5:00)

**[ON SCREEN: Key differentiators]**

> "Here's what makes SpecWeave unique:
>
> 1. **Specifications ARE the source of truth** - code expresses them
> 2. **Context precision** - 70%+ token reduction through selective loading
> 3. **Skills-based architecture** - AI agents with specialized expertise
> 4. **Brownfield-ready** - designed for real-world legacy code
> 5. **Test-validated** - every feature proven through automation
> 6. **🔄 Meta-capability** - Agents build agents, skills build skills, the framework builds itself
>
> Let's dive in."

---

## 2. The Problem & Solution (10 min)

### The Vibe Coding Problem (5:00-7:00)

**[ON SCREEN: Split screen - Chaotic code changes on left, confused developer on right]**

> "Let me paint a picture. You're working with Claude Code or GitHub Copilot. You ask it to 'improve the authentication flow.'
>
> The AI confidently:
> - Refactors your auth service
> - Changes the session management
> - Updates the middleware
> - Modifies the database schema
>
> It looks great! The code is cleaner. But..."

**[ON SCREEN: Production error dashboard lighting up]**

> "You deploy it and suddenly:
> - Users can't log in
> - Sessions expire randomly
> - The mobile app breaks
> - Your integration tests pass but the feature is broken
>
> Why? Because the AI didn't know:
> - The *why* behind your current implementation
> - The edge cases you handle
> - The business rules you must maintain
> - The downstream systems that depend on your API contract"

**[ON SCREEN: Three root causes]**

> "This happens because of three fundamental problems:
>
> **1. No Source of Truth**
> - Requirements live in Slack messages, JIRA tickets, someone's head
> - The 'why' behind decisions is lost to time
> - AI has to guess intent from code alone
>
> **2. Context Overload**
> - You can't fit your entire codebase in an AI's context window
> - But which parts are relevant? You're guessing.
> - AI either gets incomplete context or hits token limits
>
> **3. No Validation Loop**
> - Tests that pass but features that fail
> - No way to verify AI understood the requirements
> - Regression bugs discovered in production"

### The SpecWeave Solution (7:00-10:00)

**[ON SCREEN: SpecWeave architecture diagram]**

> "SpecWeave solves these problems through three core innovations:
>
> **1. Specifications as Source of Truth**
>
> In SpecWeave, we flip the traditional model. Instead of:
>
> Code → Documentation (maybe) → Tests (hopefully)
>
> We do:
>
> Specification → Implementation → Tests → Validation
>
> Your specs are not Word docs gathering dust. They're living documents that AI agents read directly to understand:
> - What the system should do (requirements)
> - Why it should do it (business context)
> - How it should behave (acceptance criteria)
> - What NOT to change (constraints)"

**[ON SCREEN: Context manifest example]**

> "**2. Context Precision (70%+ Token Reduction)**
>
> Instead of dumping your entire codebase into the AI's context, SpecWeave uses 'context manifests' - declarations of exactly what context each task needs.
>
> For example, when working on payment processing, the AI loads:
> - specifications/modules/payments/
> - .specweave/docs/architecture/payment-flow.md
> - features/023-stripe-integration/
>
> NOT:
> - specifications/modules/authentication/
> - specifications/modules/email/
> - features/001-initial-setup/
>
> Result: 70% fewer tokens, faster responses, lower costs, more focused AI."

**[ON SCREEN: Skills demonstration]**

> "**3. Skills-Based Architecture**
>
> SpecWeave extends Claude Code with specialized 'skills' - AI agents with expertise in specific domains:
>
> - `specweave-detector` - Recognizes SpecWeave projects, activates automatically
> - `increment-planner` - Creates comprehensive implementation plans
> - `context-loader` - Loads only relevant specs via manifests
> - `spec-author` - Writes and maintains specifications
> - `developer` - Implements code following plans
> - `qa-engineer` - Generates and validates tests
> - `playwright-tester` - Creates E2E tests for UI
> - `brownfield-analyzer` - Analyzes legacy code safely
>
> These skills know YOUR conventions, YOUR architecture, YOUR domain."

**[ON SCREEN: Before/After comparison]**

> "The result? You go from vibe coding to spec-driven development:
>
> **Before SpecWeave:**
> - AI: 'I made some improvements!'
> - You: 'But did you break anything?'
> - Production: 💥
>
> **With SpecWeave:**
> - Spec defines requirements
> - AI generates implementation plan
> - Tests validate behavior
> - Changes deployed with confidence
>
> Let's see how this compares to other frameworks."

---

## 3. Comparison to Alternatives (15 min)

### Overview of the Landscape (10:00-11:00)

**[ON SCREEN: Framework comparison matrix]**

> "SpecWeave isn't the only framework trying to solve these problems. Let's compare it to two prominent alternatives:
>
> - **BMAD-METHOD** - Business-Method-Agentic-Development
> - **SpecKit** - Specification toolkit
>
> Each has strengths and ideal use cases. Let's break them down."

### BMAD-METHOD Comparison (11:00-15:30)

**[ON SCREEN: BMAD logo and architecture]**

> "**What is BMAD-METHOD?**
>
> BMAD is an agentic agile development framework with a strong focus on role-based collaboration. It defines specific roles:
> - @pm (Product Manager) - Manages PRDs
> - @architect - Creates architecture docs
> - @dev - Implements features
> - @qa - Quality assurance with risk assessment
> - @po (Product Owner) - Reviews and accepts
> - @scrum - Facilitates sprints
>
> BMAD emphasizes a two-phase workflow: planning phase and development phase."

**[ON SCREEN: Side-by-side comparison]**

> "**How SpecWeave Compares to BMAD:**
>
> | Aspect | BMAD-METHOD | SpecWeave |
> |--------|-------------|-----------|
> | **Philosophy** | Agentic agile with defined roles | Spec-first with flexible roles |
> | **Role System** | Explicit roles (@pm, @dev, @qa) | Skills auto-route to expertise |
> | **Documentation** | PRDs, architecture docs | Specifications + living docs |
> | **Context Management** | Full context loading | Selective loading (70% reduction) |
> | **QA Approach** | @qa with *risk, *design, *trace, *review commands | qa-engineer skill + E2E validation |
> | **Brownfield Support** | Limited guidance | Dedicated brownfield-analyzer skill |
> | **AI Integration** | Role-based commands | Skills-based automation |
> | **Learning Curve** | Steeper (must learn roles) | Gradual (skills activate automatically) |
> | **Best For** | Teams with clear agile structure | Solo devs to teams, any methodology |
>
> **When to Choose BMAD:**
> - You're running formal agile/scrum processes
> - You want explicit role separation
> - You need sprint-based workflows
> - Your team is already using @role conventions
>
> **When to Choose SpecWeave:**
> - You want flexible, auto-routing skills
> - You need brownfield/legacy support
> - Context efficiency is critical (large codebases)
> - You prefer specifications over PRDs
> - You're solo or small team without formal agile"

**[ON SCREEN: Example comparison]**

> "**Example: Adding a Feature**
>
> **BMAD Approach:**
> ```
> User: '@pm create PRD for payment processing'
> → @pm creates PRD
> User: '@architect design payment architecture'
> → @architect creates architecture doc
> User: '@dev implement payment feature'
> → @dev implements
> User: '@qa *risk assess payment feature'
> → @qa performs risk assessment
> ```
>
> **SpecWeave Approach:**
> ```
> User: 'Plan payment processing feature'
> → increment-planner skill activates automatically
> → Creates spec.md, plan.md, tasks.md, context-manifest.yaml
> User: 'Implement the payment feature'
> → developer skill loads relevant context via manifest
> → Implements with test validation
> → qa-engineer generates tests
> → playwright-tester creates E2E tests
> ```
>
> Notice: BMAD requires you to invoke roles explicitly. SpecWeave skills activate automatically based on intent."

**[ON SCREEN: Integration possibilities]**

> "**Can You Use Both?**
>
> Absolutely! They're complementary:
> - Use BMAD's role structure for team collaboration
> - Use SpecWeave's skills for context precision and brownfield support
> - Use BMAD's @qa commands + SpecWeave's test validation
> - Use BMAD's sprint workflow + SpecWeave's specifications
>
> Many teams use both together."

### SpecKit Comparison (15:30-20:00)

**[ON SCREEN: SpecKit overview]**

> "**What is SpecKit?**
>
> SpecKit is a lightweight specification toolkit focused on creating and managing technical specifications. It provides templates, validation, and workflows for spec-driven development."

**[ON SCREEN: Comparison table]**

> "**How SpecWeave Compares to SpecKit:**
>
> | Aspect | SpecKit | SpecWeave |
> |--------|---------|-----------|
> | **Scope** | Specification management | Full development framework |
> | **AI Integration** | Minimal/manual | Deep (skills, auto-routing) |
> | **Context Loading** | Manual | Automatic via manifests |
> | **Implementation** | Separate tools | Integrated workflow |
> | **Testing** | Not included | Mandatory E2E + skill tests |
> | **Brownfield** | Documentation focus | Analysis + transformation tools |
> | **Learning Curve** | Easy (just specs) | Moderate (full framework) |
> | **Flexibility** | High (bring your own tools) | Opinionated (integrated) |
> | **Best For** | Spec-only projects | End-to-end development |
>
> **When to Choose SpecKit:**
> - You only need specification management
> - You want maximum flexibility in tools
> - You're not using AI assistants heavily
> - You prefer lightweight solutions
>
> **When to Choose SpecWeave:**
> - You want end-to-end AI-assisted development
> - You need intelligent context loading
> - You're working on brownfield projects
> - You want integrated testing and validation
> - You need custom AI skills for your domain"

**[ON SCREEN: Example comparison]**

> "**Example: Creating a Specification**
>
> **SpecKit Approach:**
> ```
> $ speckit create --template api-spec payment
> → Creates payment-spec.md from template
> → You fill in manually
> → You validate with speckit validate
> → You implement separately
> ```
>
> **SpecWeave Approach:**
> ```
> User: 'Create payment processing specification'
> → spec-author skill activates
> → Asks about business requirements
> → Creates modular spec in specifications/modules/payments/
> → Links to architecture docs
> → Creates context manifest
> → increment-planner can immediately use it for implementation
> ```
>
> SpecKit gives you templates. SpecWeave gives you an AI agent that understands your domain."

**[ON SCREEN: Summary matrix]**

### Framework Selection Guide (20:00-25:00)

> "**Quick Decision Guide:**
>
> **Choose BMAD if:**
> - ✅ You run formal agile/scrum
> - ✅ You need explicit role separation
> - ✅ Your team is comfortable with @role syntax
> - ✅ You want sprint-based workflows
>
> **Choose SpecKit if:**
> - ✅ You only need spec management
> - ✅ You prefer minimal tooling
> - ✅ You want to choose your own AI tools
> - ✅ Your project is small/medium
>
> **Choose SpecWeave if:**
> - ✅ You need brownfield/legacy support
> - ✅ Context efficiency is critical (large codebases)
> - ✅ You want automatic skill routing
> - ✅ You need end-to-end AI-assisted development
> - ✅ You're building from solo to enterprise scale
> - ✅ You want living documentation + test validation
>
> **Use Multiple:**
> - BMAD + SpecWeave = Team collaboration + context precision
> - SpecKit + SpecWeave = Lightweight specs + full framework (when needed)
>
> Now let's see SpecWeave in action."

---

## 4. Core Concepts (20 min)

### Concept 1: Specifications as Source of Truth (25:00-30:00)

**[ON SCREEN: Traditional vs SpecWeave flow]**

> "**The Paradigm Shift**
>
> Traditional development:
> - Code is the source of truth
> - Documentation lags behind
> - Tests try to catch up
> - Intent is lost
>
> SpecWeave approach:
> - Specification defines WHAT and WHY
> - Code expresses HOW
> - Tests validate THAT it works
> - Intent is preserved forever"

**[ON SCREEN: Spec structure]**

> "**Specification Structure**
>
> SpecWeave organizes specs modularly:
>
> ```
> specifications/
> ├── overview.md                    # System overview
> └── modules/                       # Feature modules
>     ├── payments/                  # Payment module
>     │   ├── overview.md            # Module overview
>     │   ├── stripe/
>     │   │   ├── spec.md            # Stripe integration
>     │   │   ├── api-contracts.md   # API contracts
>     │   │   └── data-model.md      # Data entities
>     │   ├── paypal/
>     │   │   └── spec.md
>     │   └── shared/
>     │       ├── payment-entities.md
>     │       └── compliance.md      # PCI-DSS requirements
>     └── authentication/
>         ├── overview.md
>         ├── oauth/
>         │   └── spec.md
>         └── session-management/
>             └── spec.md
> ```
>
> Why modular?
> - Load only relevant parts (context precision)
> - Share common concepts (DRY for specs)
> - Scale to enterprise (100+ modules)
> - Team ownership (each team owns modules)"

**[ON SCREEN: Example spec]**

> "**Example Specification:**
>
> ```markdown
> # Stripe Payment Integration
>
> ## Purpose
> Process credit card payments through Stripe API with support for:
> - One-time payments
> - Subscription billing
> - Refunds and disputes
>
> ## Business Requirements
>
> ### BR-1: Payment Processing
> - User can pay with credit card
> - Payment confirmed within 5 seconds
> - Failed payments show clear error message
> - Success triggers order confirmation email
>
> ### BR-2: Security
> - Card data never touches our servers
> - PCI-DSS compliance via Stripe.js
> - 3D Secure for European customers
>
> ## Acceptance Criteria
>
> Given a user with valid payment method
> When they complete checkout
> Then:
> - Payment is processed via Stripe
> - Order status updated to 'paid'
> - Confirmation email sent
> - Receipt generated
>
> ## API Contract
>
> POST /api/payments
> {
>   \"amount\": 1000,
>   \"currency\": \"usd\",
>   \"paymentMethodId\": \"pm_123\",
>   \"orderId\": \"order_456\"
> }
>
> Response 200:
> {
>   \"paymentId\": \"pi_789\",
>   \"status\": \"succeeded\",
>   \"receiptUrl\": \"https://...\"
> }
>
> ## Constraints
> - MUST NOT store raw card numbers
> - MUST use Stripe API v2023-10-16 or later
> - MUST handle webhooks for async events
> - MUST support idempotency
> ```
>
> This spec is the source of truth. Code implements it. Tests validate it."

### Concept 2: Context Precision (30:00-35:00)

**[ON SCREEN: Token usage comparison graph]**

> "**The Context Problem**
>
> Imagine your codebase has:
> - 50 specification files
> - 200 source files
> - 30 architecture documents
>
> That's ~500,000 tokens if you load everything.
> Claude's context limit? 200,000 tokens.
> Even if it fit, it's slow and expensive.
>
> **The SpecWeave Solution: Context Manifests**"

**[ON SCREEN: Context manifest example]**

> "**Context Manifest:**
>
> ```yaml
> # features/023-stripe-integration/context-manifest.yaml
> ---
> spec_sections:
>   # Only payment-related specs
>   - specifications/modules/payments/stripe/spec.md
>   - specifications/modules/payments/shared/payment-entities.md
>   - specifications/modules/payments/shared/compliance.md
>
> documentation:
>   # Only relevant architecture
>   - .specweave/docs/architecture/payment-flow.md
>   - .specweave/docs/decisions/015-stripe-vs-paypal.md
>
> code:
>   # Related code only
>   - src/payments/stripe-client.ts
>   - src/payments/payment-processor.ts
>
> max_context_tokens: 10000
> priority: high
> auto_refresh: false
> ---
> ```
>
> **Result:**
> - Full codebase: 500,000 tokens
> - With manifest: 9,500 tokens
> - **Reduction: 98%**
>
> And the AI gets exactly the context it needs, nothing more."

**[ON SCREEN: How it works diagram]**

> "**How Context Loading Works:**
>
> 1. User starts task: 'Implement Stripe integration'
> 2. `context-loader` skill activates
> 3. Reads `features/023-stripe-integration/context-manifest.yaml`
> 4. Loads only specified files
> 5. AI has perfect context, minimal tokens
> 6. Implementation proceeds efficiently
>
> **Benefits:**
> - 70-98% token reduction
> - Faster AI responses
> - Lower costs
> - More focused suggestions
> - Scales to any codebase size"

### Concept 3: Skills-Based Architecture (35:00-40:00)

**[ON SCREEN: Skills architecture diagram]**

> "**What are Skills?**
>
> Skills are specialized AI agents with domain expertise. Think of them as roles, but smarter:
> - They activate automatically based on context
> - They have access to specific tools and knowledge
> - They can call other skills
> - They're customizable and extensible"

**[ON SCREEN: Core skills list]**

> "**SpecWeave Core Skills:**
>
> **Entry & Routing:**
> - `specweave-detector` - Detects SpecWeave projects, auto-activates
> - `skill-router` - Routes requests to appropriate skills
>
> **Planning & Design:**
> - `increment-planner` - Creates comprehensive implementation plans
> - `spec-author` - Writes/updates specifications
> - `architect` - Designs architecture, creates ADRs
>
> **Implementation:**
> - `context-loader` - Loads specs selectively via manifests
> - `developer` - Implements code following plans
>
> **Quality Assurance:**
> - `qa-engineer` - Generates and validates tests
> - `playwright-tester` - Creates E2E tests for UI
>
> **Brownfield:**
> - `brownfield-analyzer` - Analyzes legacy code safely
>
> **Integration:**
> - `jira-sync` - Syncs with JIRA
> - `github-sync` - Syncs with GitHub
> - `ado-sync` - Syncs with Azure DevOps
>
> **Automation:**
> - `docs-updater` - Auto-updates documentation via hooks"

**[ON SCREEN: Skill activation example]**

> "**How Skills Activate:**
>
> ```
> User: 'Plan a new user authentication feature'
>
> → specweave-detector: Detects SpecWeave project
> → skill-router: Identifies need for feature planning
> → increment-planner: Activates automatically
>   → Analyzes request
>   → Creates feature-###-user-auth/
>   → Generates spec.md, plan.md, tasks.md
>   → Creates context-manifest.yaml
>   → Returns plan to user
>
> User: 'Implement the authentication feature'
>
> → skill-router: Identifies implementation task
> → context-loader: Loads context from manifest
> → developer: Implements code
> → qa-engineer: Generates tests
> → Returns implementation
> ```
>
> Notice: You never explicitly invoke skills. They route automatically."

**[ON SCREEN: Creating custom skills]**

> "**Creating Custom Skills:**
>
> You can create custom skills for your domain:
>
> ```markdown
> # src/skills/ecommerce-expert/SKILL.md
> ---
> name: ecommerce-expert
> description: E-commerce domain expert. Knows Shopify, WooCommerce,
>              payment gateways, inventory management. Activates for
>              e-commerce, shopping cart, checkout, product catalog.
> ---
>
> # E-commerce Domain Expert
>
> ## Expertise
> - Shopping cart best practices
> - Checkout optimization
> - Payment gateway integration
> - Inventory management
> - Product catalog design
>
> ## When to Use
> - Designing e-commerce features
> - Optimizing conversion funnels
> - Implementing payment flows
> - Managing product data
> ```
>
> Install it:
> ```bash
> npx specweave install ecommerce-expert --local
> ```
>
> Now when you mention 'shopping cart', the skill activates automatically.
>
> We'll create a custom skill live in the demos."

### Concept 4: Living Documentation (40:00-43:00)

**[ON SCREEN: Documentation structure]**

> "**The Documentation Problem:**
>
> Traditional docs:
> - Written once, never updated
> - Out of sync with code
> - No one reads them
>
> **SpecWeave Solution: Living Documentation**
>
> Documentation that:
> - Updates automatically via hooks
> - Stays in sync with specs and code
> - Has clear ownership (auto vs manual)
> - Built gradually, not 500 pages upfront"

**[ON SCREEN: Documentation folder structure]**

> "**Documentation Structure:**
>
> ```
> .specweave/docs/
> ├── getting-started/        # Installation, quickstart
> ├── guides/                 # How-to guides
> ├── reference/              # API/CLI reference (AUTO-UPDATED)
> ├── architecture/           # System design (HOW)
> ├── decisions/              # Architecture Decision Records (ADRs)
> └── changelog/              # Releases (AUTO-UPDATED)
> ```
>
> **Auto-Updated:**
> - CLI reference when commands change
> - API reference when code changes
> - Changelog when features complete
> - CLAUDE.md when structure changes
>
> **Manually Written (Preserved):**
> - Getting started guides
> - How-to tutorials
> - Architecture overviews
> - ADRs (after initial creation)"

**[ON SCREEN: Hook in action]**

> "**How Auto-Update Works:**
>
> 1. Developer completes feature
> 2. `post-task-completion` hook fires
> 3. `docs-updater` skill activates
> 4. Scans for changes:
>    - New CLI commands?
>    - API changes?
>    - Feature completed?
> 5. Updates relevant docs
> 6. Commits changes
>
> You get accurate docs without manual work."

### Concept 5: Hooks System (43:00-45:00)

**[ON SCREEN: Hooks diagram]**

> "**Claude Code Hooks:**
>
> SpecWeave uses Claude Code's hook system for automation:
>
> ```yaml
> # .specweave/config.yaml
> hooks:
>   post_task_completion:
>     enabled: true
>     actions:
>       - update_documentation
>       - update_changelog
>
>   pre_implementation:
>     enabled: true
>     actions:
>       - check_regression_risk
>       - verify_specs_exist
>
>   human_input_required:
>     enabled: true
>     actions:
>       - create_notification
>       - log_to_progress
> ```
>
> **Available Hooks:**
> - `post_task_completion` - After tasks finish
> - `pre_implementation` - Before modifying code
> - `human_input_required` - When AI needs input
>
> **Use Cases:**
> - Auto-update documentation
> - Regression risk checks
> - Audit logging
> - Custom workflows
>
> We'll see these in action during the demos."

---

## 5. Greenfield Demo (30 min)

### Demo Introduction (45:00-46:00)

**[ON SCREEN: Clean terminal]**

> "Now let's build something from scratch using SpecWeave. We'll create a task management application with:
> - User authentication
> - Task CRUD operations
> - Team collaboration
> - Real-time updates
>
> I'll show you the complete workflow from specification to deployed code."

### Part 1: Project Setup (46:00-50:00)

**[ON SCREEN: Terminal]**

> "**Step 1: Install SpecWeave**
>
> ```bash
> npm install -g specweave
> ```
>
> **Step 2: Create New Project**
>
> ```bash
> mkdir taskmaster
> cd taskmaster
> specweave init
> ```
>
> This creates the directory structure:
> ```
> taskmaster/
> ├── .specweave/
> │   └── config.yaml
> ├── .claude/
> │   ├── commands/
> │   └── skills/              # Core skills installed
> ├── specifications/
> │   └── overview.md
> ├── .specweave/docs/
> │   ├── getting-started/
> │   └── architecture/
> ├── features/
> ├── work/
> ├── src/
> ├── tests/
> ├── CLAUDE.md
> ├── README.md
> └── package.json
> ```"

**[ON SCREEN: Code editor showing config.yaml]**

> "**Step 3: Configure Project**
>
> `.specweave/config.yaml`:
> ```yaml
> project:
>   name: TaskMaster
>   type: greenfield
>   tech_stack:
>     - Node.js
>     - TypeScript
>     - React
>     - PostgreSQL
>
> context:
>   max_tokens: 50000
>   auto_load: true
>
> hooks:
>   post_task_completion:
>     enabled: true
>   pre_implementation:
>     enabled: true
>
> testing:
>   e2e_framework: playwright
>   mandatory_e2e: true
> ```"

**[DEMO: Show terminal output]**

### Part 2: Writing Specifications (50:00-57:00)

**[ON SCREEN: Claude Code terminal]**

> "**Step 4: Create System Overview**
>
> I'll ask Claude:
> ```
> Create a specification for TaskMaster - a task management app
> for teams. Include user auth, task CRUD, team collaboration,
> and real-time updates.
> ```
>
> Watch what happens..."

**[DEMO: Live interaction with Claude]**

**[ON SCREEN: Generated spec file]**

> "The `spec-author` skill activated and created:
>
> `specifications/overview.md`:
> ```markdown
> # TaskMaster System Overview
>
> ## Purpose
> TaskMaster is a collaborative task management application
> enabling teams to create, assign, track, and complete tasks
> in real-time.
>
> ## Core Features
>
> ### F-1: User Authentication
> - Email/password registration and login
> - OAuth support (Google, GitHub)
> - Session management with JWT
> - Password reset flow
>
> ### F-2: Task Management
> - Create tasks with title, description, priority, due date
> - Assign tasks to team members
> - Update task status (todo, in-progress, done)
> - Delete tasks
> - Filter and sort tasks
>
> ### F-3: Team Collaboration
> - Create teams
> - Invite members
> - Role-based permissions (owner, admin, member)
> - Activity feed
>
> ### F-4: Real-Time Updates
> - WebSocket connections
> - Live task updates across clients
> - Presence indicators
> - Notifications
>
> ## Technical Requirements
>
> ### Performance
> - Page load < 2 seconds
> - Real-time updates < 100ms latency
> - Support 100 concurrent users per team
>
> ### Security
> - HTTPS only
> - XSS protection
> - CSRF tokens
> - Rate limiting
>
> ### Browser Support
> - Chrome, Firefox, Safari (latest 2 versions)
> - Mobile responsive
> ```"

**[ON SCREEN: Modular specs]**

> "Notice it also created modular specs:
>
> ```
> specifications/modules/
> ├── authentication/
> │   ├── overview.md
> │   ├── email-auth/
> │   │   └── spec.md
> │   └── oauth/
> │       └── spec.md
> ├── tasks/
> │   ├── overview.md
> │   ├── crud-operations/
> │   │   └── spec.md
> │   └── real-time-sync/
> │       └── spec.md
> └── teams/
>     ├── overview.md
>     └── collaboration/
>         └── spec.md
> ```
>
> This modular structure enables context precision later."

### Part 3: Feature Planning (57:00-1:05:00)

**[ON SCREEN: Claude Code]**

> "**Step 5: Plan First Feature**
>
> Now I'll ask Claude:
> ```
> Plan the implementation of user authentication feature
> using the specifications.
> ```"

**[DEMO: Live interaction]**

**[ON SCREEN: Generated feature plan]**

> "The `increment-planner` skill created:
>
> `features/001-user-authentication/`:
> ```
> ├── spec.md                    # Feature specification
> ├── plan.md                    # Implementation plan
> ├── tasks.md                   # Executable checklist
> ├── tests.md                   # Test strategy
> └── context-manifest.yaml      # Context to load
> ```
>
> Let's look at each:"

**[ON SCREEN: spec.md]**

> "`spec.md`:
> ```markdown
> # Feature 001: User Authentication
>
> ## Overview
> Implement email/password authentication with JWT tokens.
>
> ## Requirements
> - User registration with email validation
> - Login with email/password
> - JWT token generation and validation
> - Password hashing with bcrypt
> - Session management
>
> ## Acceptance Criteria
> - [ ] User can register with email/password
> - [ ] Email validation required
> - [ ] User can log in with credentials
> - [ ] JWT token issued on successful login
> - [ ] Protected routes require valid token
> - [ ] User can log out
> ```"

**[ON SCREEN: plan.md]**

> "`plan.md`:
> ```markdown
> # Implementation Plan: User Authentication
>
> ## Phase 1: Database Setup
> 1. Create users table
> 2. Create sessions table
> 3. Add indexes
>
> ## Phase 2: Backend API
> 1. POST /api/auth/register
> 2. POST /api/auth/login
> 3. POST /api/auth/logout
> 4. GET /api/auth/me
> 5. Middleware: authenticateToken
>
> ## Phase 3: Frontend
> 1. Register form component
> 2. Login form component
> 3. Auth context provider
> 4. Protected route wrapper
>
> ## Phase 4: Testing
> 1. Unit tests for auth service
> 2. Integration tests for API endpoints
> 3. E2E tests for registration and login flows
> ```"

**[ON SCREEN: context-manifest.yaml]**

> "`context-manifest.yaml`:
> ```yaml
> ---
> spec_sections:
>   - specifications/modules/authentication/overview.md
>   - specifications/modules/authentication/email-auth/spec.md
>
> documentation:
>   - .specweave/docs/architecture/authentication.md
>
> dependencies:
>   - specifications/modules/shared/security.md
>
> max_context_tokens: 8000
> priority: high
> ---
> ```
>
> This tells `context-loader` exactly what to load during implementation."

### Part 4: Implementation (1:05:00-1:12:00)

**[ON SCREEN: Claude Code]**

> "**Step 6: Implement the Feature**
>
> Now I ask Claude:
> ```
> Implement feature 001-user-authentication following the plan.
> ```"

**[DEMO: Live implementation]**

**[ON SCREEN: Files being created]**

> "Watch as the `developer` skill:
>
> 1. Loads context from manifest (only 8000 tokens)
> 2. Creates database migration:
>    `src/db/migrations/001_create_users_table.sql`
>
> 3. Implements auth service:
>    `src/services/auth.service.ts`
>
> 4. Creates API routes:
>    `src/routes/auth.routes.ts`
>
> 5. Adds middleware:
>    `src/middleware/authenticate.ts`
>
> 6. Creates React components:
>    `src/components/RegisterForm.tsx`
>    `src/components/LoginForm.tsx`
>
> 7. Sets up auth context:
>    `src/contexts/AuthContext.tsx`"

**[ON SCREEN: Generated code example]**

> "Here's the auth service it generated:
>
> ```typescript
> // src/services/auth.service.ts
> import bcrypt from 'bcrypt';
> import jwt from 'jsonwebtoken';
> import { db } from '../db';
>
> export class AuthService {
>   async register(email: string, password: string) {
>     // Validate email format
>     if (!this.isValidEmail(email)) {
>       throw new Error('Invalid email format');
>     }
>
>     // Check if user exists
>     const existing = await db.users.findByEmail(email);
>     if (existing) {
>       throw new Error('User already exists');
>     }
>
>     // Hash password (from spec: use bcrypt)
>     const hashedPassword = await bcrypt.hash(password, 10);
>
>     // Create user
>     const user = await db.users.create({
>       email,
>       password: hashedPassword,
>     });
>
>     return { userId: user.id, email: user.email };
>   }
>
>   async login(email: string, password: string) {
>     // Find user
>     const user = await db.users.findByEmail(email);
>     if (!user) {
>       throw new Error('Invalid credentials');
>     }
>
>     // Verify password
>     const valid = await bcrypt.compare(password, user.password);
>     if (!valid) {
>       throw new Error('Invalid credentials');
>     }
>
>     // Generate JWT (from spec: use JWT)
>     const token = jwt.sign(
>       { userId: user.id, email: user.email },
>       process.env.JWT_SECRET!,
>       { expiresIn: '7d' }
>     );
>
>     return { token, user: { id: user.id, email: user.email } };
>   }
> }
> ```
>
> Notice: It follows the spec exactly. Uses bcrypt, JWT, validates email, all as specified."

### Part 5: Testing (1:12:00-1:15:00)

**[ON SCREEN: Test generation]**

> "**Step 7: Generate Tests**
>
> The `qa-engineer` skill automatically generated:
>
> **Unit Tests:**
> ```typescript
> // tests/unit/auth.service.test.ts
> describe('AuthService', () => {
>   describe('register', () => {
>     it('should create user with hashed password', async () => {
>       const email = 'test@example.com';
>       const password = 'password123';
>
>       const result = await authService.register(email, password);
>
>       expect(result.email).toBe(email);
>       expect(result.userId).toBeDefined();
>
>       // Verify password is hashed
>       const user = await db.users.findById(result.userId);
>       expect(user.password).not.toBe(password);
>     });
>
>     it('should reject invalid email', async () => {
>       await expect(
>         authService.register('invalid-email', 'password')
>       ).rejects.toThrow('Invalid email format');
>     });
>
>     it('should reject duplicate email', async () => {
>       await authService.register('test@example.com', 'pass1');
>       await expect(
>         authService.register('test@example.com', 'pass2')
>       ).rejects.toThrow('User already exists');
>     });
>   });
> });
> ```"

**[ON SCREEN: E2E tests]**

> "**E2E Tests (Playwright):**
>
> The `playwright-tester` skill created:
>
> ```typescript
> // tests/e2e/auth-flow.spec.ts
> import { test, expect } from '@playwright/test';
>
> test.describe('User Authentication', () => {
>   test('complete registration and login flow', async ({ page }) => {
>     // Registration
>     await page.goto('/register');
>     await page.fill('[name=\"email\"]', 'newuser@example.com');
>     await page.fill('[name=\"password\"]', 'SecurePass123!');
>     await page.click('button[type=\"submit\"]');
>
>     // Should redirect to login
>     await expect(page).toHaveURL('/login');
>
>     // Login
>     await page.fill('[name=\"email\"]', 'newuser@example.com');
>     await page.fill('[name=\"password\"]', 'SecurePass123!');
>     await page.click('button[type=\"submit\"]');
>
>     // Should be authenticated
>     await expect(page).toHaveURL('/dashboard');
>     await expect(page.locator('[data-testid=\"user-email\"]'))
>       .toHaveText('newuser@example.com');
>   });
>
>   test('should reject invalid credentials', async ({ page }) => {
>     await page.goto('/login');
>     await page.fill('[name=\"email\"]', 'wrong@example.com');
>     await page.fill('[name=\"password\"]', 'wrongpass');
>     await page.click('button[type=\"submit\"]');
>
>     // Should show error
>     await expect(page.locator('.error-message'))
>       .toHaveText('Invalid credentials');
>   });
> });
> ```
>
> These tests MUST tell the truth - no false positives allowed."

**[DEMO: Run tests]**

```bash
npm test
```

**[ON SCREEN: All tests passing]**

> "All tests pass! Feature is validated."

---

## 6. Brownfield Demo - EasyChamp (40 min)

### Demo Introduction (1:15:00-1:17:00)

**[ON SCREEN: EasyChamp repository]**

> "Now let's tackle a real-world challenge: transforming an existing codebase.
>
> EasyChamp is a production application I built. It has:
> - Existing authentication system
> - Database schema
> - API endpoints
> - No comprehensive specs
> - No end-to-end tests
> - Undocumented business logic
>
> We're going to:
> 1. Analyze the codebase
> 2. Generate retroactive specifications
> 3. Create regression tests
> 4. Plan and implement a new feature
> 5. Verify nothing broke
>
> This is SpecWeave's brownfield workflow in action."

### Part 1: Project Onboarding (1:17:00-1:23:00)

**[ON SCREEN: Terminal with EasyChamp]**

> "**Step 1: Initialize SpecWeave in Existing Project**
>
> ```bash
> cd easychamp
> specweave init --brownfield
> ```
>
> This creates the SpecWeave structure WITHOUT touching existing code:
> ```
> easychamp/
> ├── .specweave/
> │   └── config.yaml              # Brownfield mode enabled
> ├── .claude/
> │   └── skills/                  # Core skills installed
> ├── specifications/              # NEW - will generate retroactively
> ├── .specweave/docs/               # NEW - will document current state
> ├── features/                    # NEW - for future features
> ├── work/                        # NEW - active work
> ├── tests/                       # NEW - will add E2E tests
> ├── CLAUDE.md                    # NEW - development guide
> ├── src/                         # EXISTING - untouched
> ├── package.json                 # EXISTING - updated with new scripts
> └── ... (existing files)         # EXISTING - all preserved
> ```"

**[ON SCREEN: Claude Code]**

> "**Step 2: Analyze Existing Codebase**
>
> I'll ask Claude:
> ```
> Analyze the EasyChamp codebase and generate specifications
> for the existing authentication system.
> ```"

**[DEMO: Live analysis]**

**[ON SCREEN: Analysis in progress]**

> "The `brownfield-analyzer` skill is:
>
> 1. **Scanning codebase**
>    - Finding entry points (routes, controllers)
>    - Identifying database schema
>    - Discovering business logic
>    - Mapping API endpoints
>
> 2. **Extracting behavior**
>    - User registration flow
>    - Login mechanism
>    - Session handling
>    - Password reset
>
> 3. **Generating dependency graph**
>    - What depends on what
>    - Impact analysis for changes
>
> This takes ~2-3 minutes for a medium codebase."

### Part 2: Generating Retroactive Specs (1:23:00-1:30:00)

**[ON SCREEN: Generated specifications]**

> "**Generated Specifications:**
>
> The analyzer created:
>
> `specifications/modules/authentication/existing/overview.md`:
> ```markdown
> # Existing Authentication System
>
> **Status**: Production
> **Last Analyzed**: 2025-01-26
> **Files**: src/auth/*.ts (12 files)
>
> ## Current Behavior
>
> ### User Registration
> **Endpoint**: POST /api/auth/register
> **Input**:
> ```json
> {
>   \"email\": \"string\",
>   \"password\": \"string\",
>   \"username\": \"string\"
> }
> ```
>
> **Process**:
> 1. Validates email format (regex: /^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$/)
> 2. Checks username uniqueness (case-insensitive)
> 3. Validates password strength (min 8 chars, 1 uppercase, 1 number)
> 4. Hashes password with bcrypt (10 rounds)
> 5. Stores in `users` table
> 6. Sends verification email
> 7. Returns user object (excluding password)
>
> **Database**:
> ```sql
> CREATE TABLE users (
>   id SERIAL PRIMARY KEY,
>   email VARCHAR(255) UNIQUE NOT NULL,
>   username VARCHAR(50) UNIQUE NOT NULL,
>   password_hash VARCHAR(255) NOT NULL,
>   email_verified BOOLEAN DEFAULT FALSE,
>   created_at TIMESTAMP DEFAULT NOW()
> );
> ```
>
> **Edge Cases Handled**:
> - Duplicate email: Returns 409 Conflict
> - Duplicate username: Returns 409 Conflict
> - Invalid email: Returns 400 Bad Request
> - Weak password: Returns 400 Bad Request
> - Email service down: Queues for retry
>
> ### Login
> **Endpoint**: POST /api/auth/login
> **Input**:
> ```json
> {
>   \"email\": \"string\",
>   \"password\": \"string\"
> }
> ```
>
> **Process**:
> 1. Finds user by email (case-insensitive)
> 2. Compares password with bcrypt
> 3. Checks if email verified
> 4. Generates JWT (HS256, 7-day expiry)
> 5. Creates session in Redis (30-day TTL)
> 6. Returns token + user object
>
> **JWT Payload**:
> ```json
> {
>   \"userId\": \"number\",
>   \"email\": \"string\",
>   \"username\": \"string\",
>   \"iat\": \"number\",
>   \"exp\": \"number\"
> }
> ```
>
> **Edge Cases Handled**:
> - User not found: Returns 401 Unauthorized
> - Wrong password: Returns 401 Unauthorized (same message)
> - Email not verified: Returns 403 Forbidden
> - Redis down: Falls back to stateless JWT
>
> ## Dependencies
> - bcrypt@5.1.0
> - jsonwebtoken@9.0.0
> - express-validator@7.0.0
> - nodemailer@6.9.0
> - redis@4.6.0
>
> ## Constraints (DO NOT CHANGE)
> - JWT secret stored in environment variable JWT_SECRET
> - Session prefix in Redis: \"session:\"
> - Email templates in src/templates/email/
> - Password reset tokens expire in 1 hour
> - Rate limiting: 5 login attempts per 15 minutes
> ```"

**[ON SCREEN: More specs]**

> "It also generated:
> - `specifications/modules/authentication/existing/api-contracts.md` - Full API docs
> - `specifications/modules/authentication/existing/data-model.md` - Database schema
> - `specifications/modules/authentication/existing/business-rules.md` - All validation logic
> - `specifications/modules/authentication/existing/dependencies.md` - What relies on auth
>
> Now we have a complete understanding of the current system!"

### Part 3: Creating Regression Tests (1:30:00-1:38:00)

**[ON SCREEN: Claude Code]**

> "**Step 3: Generate Tests for Current Behavior**
>
> I ask Claude:
> ```
> Create comprehensive E2E tests that validate the current
> authentication behavior as documented in the specifications.
> ```"

**[DEMO: Test generation]**

**[ON SCREEN: Generated tests]**

> "The `playwright-tester` skill created:
>
> `tests/e2e/auth-regression.spec.ts`:
> ```typescript
> import { test, expect } from '@playwright/test';
>
> test.describe('Authentication Regression Tests', () => {
>   test.describe('User Registration (Current Behavior)', () => {
>     test('should register user with valid data', async ({ page }) => {
>       const uniqueEmail = `user${Date.now()}@example.com`;
>
>       await page.goto('/register');
>       await page.fill('[name=\"email\"]', uniqueEmail);
>       await page.fill('[name=\"username\"]', `user${Date.now()}`);
>       await page.fill('[name=\"password\"]', 'SecurePass1');
>       await page.click('button[type=\"submit\"]');
>
>       // Current behavior: Shows success + verification message
>       await expect(page.locator('.success-message'))
>         .toContainText('Please check your email to verify');
>     });
>
>     test('should reject duplicate email', async ({ page }) => {
>       // This test validates CURRENT behavior: 409 Conflict
>       await page.goto('/register');
>       await page.fill('[name=\"email\"]', 'existing@example.com');
>       await page.fill('[name=\"username\"]', 'newuser123');
>       await page.fill('[name=\"password\"]', 'SecurePass1');
>       await page.click('button[type=\"submit\"]');
>
>       // Validates current error handling
>       await expect(page.locator('.error-message'))
>         .toContainText('Email already registered');
>     });
>
>     test('should enforce password requirements', async ({ page }) => {
>       await page.goto('/register');
>       await page.fill('[name=\"email\"]', 'test@example.com');
>       await page.fill('[name=\"username\"]', 'testuser');
>       await page.fill('[name=\"password\"]', 'weak'); // Too short
>       await page.click('button[type=\"submit\"]');
>
>       // Validates current password rules
>       await expect(page.locator('.error-message'))
>         .toContainText('Password must be at least 8 characters');
>     });
>
>     test('should handle case-insensitive usernames', async ({ page }) => {
>       // Creates user with username 'TestUser'
>       await registerUser(page, 'user1@test.com', 'TestUser', 'Pass1234');
>
>       // Try to register with 'testuser' (different case)
>       await page.goto('/register');
>       await page.fill('[name=\"email\"]', 'user2@test.com');
>       await page.fill('[name=\"username\"]', 'testuser'); // lowercase
>       await page.fill('[name=\"password\"]', 'Pass1234');
>       await page.click('button[type=\"submit\"]');
>
>       // Current behavior: Rejects (case-insensitive check)
>       await expect(page.locator('.error-message'))
>         .toContainText('Username already taken');
>     });
>   });
>
>   test.describe('Login (Current Behavior)', () => {
>     test('should login with valid credentials', async ({ page }) => {
>       await page.goto('/login');
>       await page.fill('[name=\"email\"]', 'verified@example.com');
>       await page.fill('[name=\"password\"]', 'KnownPass1');
>       await page.click('button[type=\"submit\"]');
>
>       // Current behavior: Redirects to dashboard
>       await expect(page).toHaveURL('/dashboard');
>       await expect(page.locator('[data-testid=\"username\"]'))
>         .toContainText('verifieduser');
>     });
>
>     test('should reject unverified email', async ({ page }) => {
>       await page.goto('/login');
>       await page.fill('[name=\"email\"]', 'unverified@example.com');
>       await page.fill('[name=\"password\"]', 'CorrectPass1');
>       await page.click('button[type=\"submit\"]');
>
>       // Current behavior: 403 Forbidden
>       await expect(page.locator('.error-message'))
>         .toContainText('Please verify your email');
>     });
>
>     test('should use same error for wrong email and wrong password', async ({ page }) => {
>       // Test 1: Wrong email
>       await page.goto('/login');
>       await page.fill('[name=\"email\"]', 'nonexistent@example.com');
>       await page.fill('[name=\"password\"]', 'anypass');
>       await page.click('button[type=\"submit\"]');
>       const error1 = await page.locator('.error-message').textContent();
>
>       // Test 2: Wrong password
>       await page.goto('/login');
>       await page.fill('[name=\"email\"]', 'real@example.com');
>       await page.fill('[name=\"password\"]', 'wrongpass');
>       await page.click('button[type=\"submit\"]');
>       const error2 = await page.locator('.error-message').textContent();
>
>       // Current behavior: Same message (security best practice)
>       expect(error1).toBe(error2);
>       expect(error1).toBe('Invalid credentials');
>     });
>
>     test('should enforce rate limiting', async ({ page }) => {
>       // Make 5 failed login attempts
>       for (let i = 0; i < 5; i++) {
>         await page.goto('/login');
>         await page.fill('[name=\"email\"]', 'test@example.com');
>         await page.fill('[name=\"password\"]', 'wrong');
>         await page.click('button[type=\"submit\"]');
>       }
>
>       // 6th attempt should be rate-limited
>       await page.goto('/login');
>       await page.fill('[name=\"email\"]', 'test@example.com');
>       await page.fill('[name=\"password\"]', 'wrong');
>       await page.click('button[type=\"submit\"]');
>
>       // Current behavior: Rate limit error
>       await expect(page.locator('.error-message'))
>         .toContainText('Too many attempts. Try again in 15 minutes');
>     });
>   });
> });
> ```
>
> These tests document CURRENT behavior. If they pass now, they should pass after changes."

**[DEMO: Run tests]**

```bash
npm run test:e2e
```

**[ON SCREEN: Tests running and passing]**

> "All tests pass! We've captured the current behavior.
>
> **Critical**: I review these tests with stakeholders to ensure they're complete.
> Missing edge cases? Add tests. Incorrect behavior documented? Fix and retest.
>
> Only once stakeholders confirm 'yes, this is the complete current behavior' do we proceed."

### Part 4: Planning New Feature (1:38:00-1:43:00)

**[ON SCREEN: Feature request]**

> "**Step 4: Plan New Feature**
>
> Now we want to add: **Social login (Google OAuth)**
>
> I ask Claude:
> ```
> Plan implementation of Google OAuth login as a new feature.
> Reference the existing authentication system specs.
> Ensure backward compatibility.
> ```"

**[DEMO: Feature planning]**

**[ON SCREEN: Generated plan]**

> "`increment-planner` creates:
>
> `features/015-google-oauth/spec.md`:
> ```markdown
> # Feature 015: Google OAuth Login
>
> ## Overview
> Add Google OAuth as an alternative login method while maintaining
> existing email/password authentication.
>
> ## Requirements
>
> ### FR-1: OAuth Registration
> - User can sign up with Google account
> - Email from Google account used as primary email
> - Username auto-generated or prompted
> - No password required (OAuth-only users)
>
> ### FR-2: OAuth Login
> - User can log in with Google
> - Existing OAuth users redirected to Google
> - Same JWT and session mechanism as email/password
>
> ### FR-3: Account Linking
> - If email exists, prompt to link accounts
> - Requires password verification
> - Linked accounts can use either method
>
> ## Backward Compatibility
>
> **MUST NOT CHANGE:**
> - Existing email/password flow
> - JWT payload structure (add optional `oauthProvider` field)
> - Session management
> - Database schema for `users` table (only additions)
> - API endpoints (only additions)
>
> **MUST PRESERVE:**
> - All existing tests pass
> - Email verification for email/password users
> - Rate limiting
> - Error messages
>
> ## Database Changes (Additive Only)
>
> ```sql
> -- Add columns to users table
> ALTER TABLE users
> ADD COLUMN oauth_provider VARCHAR(50),
> ADD COLUMN oauth_id VARCHAR(255),
> ADD COLUMN oauth_picture TEXT;
>
> -- Add index
> CREATE INDEX idx_oauth ON users(oauth_provider, oauth_id);
> ```
>
> ## API Additions
>
> **New endpoints:**
> - GET /api/auth/google - Redirects to Google OAuth
> - GET /api/auth/google/callback - Handles OAuth callback
> - POST /api/auth/link-google - Links Google to existing account
>
> **Modified endpoints:**
> - None (all existing endpoints unchanged)
>
> ## Impact Analysis
>
> **Affected modules:**
> - specifications/modules/authentication/ (add google-oauth/)
> - src/auth/ (add google-oauth.ts)
> - src/routes/ (add google-oauth.routes.ts)
> - tests/e2e/ (add oauth-flow.spec.ts)
>
> **Not affected:**
> - specifications/modules/authentication/existing/* (preserved)
> - src/auth/email-auth.ts (unchanged)
> - tests/e2e/auth-regression.spec.ts (must still pass)
> ```"

**[ON SCREEN: Context manifest]**

> "`context-manifest.yaml`:
> ```yaml
> ---
> spec_sections:
>   # Existing auth to understand and preserve
>   - specifications/modules/authentication/existing/overview.md
>   - specifications/modules/authentication/existing/api-contracts.md
>   - specifications/modules/authentication/existing/constraints.md
>
>   # New OAuth spec
>   - specifications/modules/authentication/google-oauth/spec.md
>
> documentation:
>   - .specweave/docs/architecture/authentication.md
>   - .specweave/docs/decisions/023-oauth-provider-choice.md
>
> code:
>   # Existing code to preserve
>   - src/auth/email-auth.ts
>   - src/middleware/authenticate.ts
>
>   # New code to create
>   - src/auth/google-oauth.ts (create)
>   - src/routes/google-oauth.routes.ts (create)
>
> tests:
>   # Regression tests that MUST still pass
>   - tests/e2e/auth-regression.spec.ts
>
> constraints:
>   - MUST NOT modify existing auth flow
>   - MUST pass all existing tests
>   - Database changes additive only
>
> max_context_tokens: 12000
> ---
> ```
>
> Notice: The manifest explicitly includes constraints and existing tests."

### Part 5: Implementation with Regression Protection (1:43:00-1:52:00)

**[ON SCREEN: Claude Code]**

> "**Step 5: Implement with Safety Checks**
>
> I ask Claude:
> ```
> Implement feature 015-google-oauth.
> Run existing regression tests before and after.
> ```"

**[DEMO: Implementation]**

**[ON SCREEN: Pre-implementation hook]**

> "The `pre-implementation` hook activates:
>
> ```
> ⚠️  Pre-Implementation Check
>
> Detected: Modification to authentication module
>
> ✅ Specifications exist: specifications/modules/authentication/existing/
> ✅ Regression tests exist: tests/e2e/auth-regression.spec.ts
> ✅ Context manifest defined: features/015-google-oauth/context-manifest.yaml
>
> Running regression tests...
> ```"

**[DEMO: Tests running]**

```bash
npm run test:e2e -- tests/e2e/auth-regression.spec.ts
```

**[ON SCREEN: All passing]**

> "**Baseline established**: All 12 regression tests pass.
>
> Now implementation proceeds..."

**[ON SCREEN: Code being created]**

> "The `developer` skill:
>
> 1. Creates `src/auth/google-oauth.ts`:
>    ```typescript
>    import { OAuth2Client } from 'google-auth-library';
>    import { db } from '../db';
>    import { AuthService } from './email-auth'; // Reuses existing
>
>    export class GoogleOAuthService {
>      private client: OAuth2Client;
>
>      constructor() {
>        this.client = new OAuth2Client(
>          process.env.GOOGLE_CLIENT_ID,
>          process.env.GOOGLE_CLIENT_SECRET,
>          process.env.GOOGLE_REDIRECT_URI
>        );
>      }
>
>      async authenticate(code: string) {
>        // Get tokens from Google
>        const { tokens } = await this.client.getToken(code);
>        this.client.setCredentials(tokens);
>
>        // Get user info
>        const ticket = await this.client.verifyIdToken({
>          idToken: tokens.id_token!,
>          audience: process.env.GOOGLE_CLIENT_ID,
>        });
>
>        const payload = ticket.getPayload();
>        if (!payload) throw new Error('Invalid token');
>
>        // Find or create user
>        let user = await db.users.findByOAuth('google', payload.sub);
>
>        if (!user) {
>          // Check if email exists (account linking scenario)
>          const existingUser = await db.users.findByEmail(payload.email!);
>          if (existingUser) {
>            // User exists with email/password - require linking
>            return {
>              requiresLinking: true,
>              email: payload.email,
>              oauthId: payload.sub,
>            };
>          }
>
>          // Create new OAuth user
>          user = await db.users.create({
>            email: payload.email!,
>            username: this.generateUsername(payload.email!),
>            oauth_provider: 'google',
>            oauth_id: payload.sub,
>            oauth_picture: payload.picture,
>            email_verified: true, // Trust Google's verification
>          });
>        }
>
>        // Use existing AuthService to generate JWT (preserves contract)
>        const authService = new AuthService();
>        return authService.createSession(user);
>      }
>    }
>    ```
>
> 2. Adds routes in `src/routes/google-oauth.routes.ts`
> 3. Updates database with migration
> 4. Creates React components for OAuth button"

**[ON SCREEN: Post-implementation]**

> "**Step 6: Verify Regression Tests**
>
> Implementation complete. Now re-running regression tests..."

**[DEMO: Tests re-running]**

**[ON SCREEN: All still passing]**

> "✅ All 12 existing tests still pass!
>
> Plus 8 new tests for OAuth flow.
>
> **This is the power of brownfield workflow:**
> 1. Document current behavior
> 2. Capture in tests
> 3. Verify tests pass
> 4. Implement new feature
> 5. Verify tests STILL pass
> 6. Deploy with confidence
>
> No regressions. No broken functionality. Just safe evolution."

### Part 6: Documentation Auto-Update (1:52:00-1:55:00)

**[ON SCREEN: Hook firing]**

> "**Step 7: Documentation Update**
>
> The `post-task-completion` hook fires:
>
> ```
> 📝 Post-Task Completion Hook
>
> Task completed: Implement Google OAuth
>
> Detected changes:
> - New specification: specifications/modules/authentication/google-oauth/
> - Database migration: 015-add-oauth-columns.sql
> - New API endpoints: /api/auth/google*
>
> Updating documentation...
> ```"

**[ON SCREEN: Files being updated]**

> "The `docs-updater` skill updates:
>
> 1. **API Reference** (`.specweave/docs/api/api.md`):
>    - Adds OAuth endpoints
>    - Documents request/response
>    - Updates authentication section
>
> 2. **Architecture Docs** (`.specweave/docs/architecture/authentication.md`):
>    - Adds OAuth flow diagram
>    - Documents account linking
>    - Updates session management
>
> 3. **Changelog** (`.specweave/docs/changelog/2025-01.md`):
>    ```markdown
>    ## [2025-01-26] Feature 015: Google OAuth Login
>
>    ### Added
>    - Google OAuth authentication
>    - Account linking for existing users
>    - OAuth session management
>
>    ### Database
>    - Added `oauth_provider`, `oauth_id`, `oauth_picture` columns to `users` table
>
>    ### API
>    - GET /api/auth/google
>    - GET /api/auth/google/callback
>    - POST /api/auth/link-google
>
>    ### Tests
>    - 8 new E2E tests for OAuth flow
>    - All existing regression tests pass
>    ```
>
> 4. **CLAUDE.md** - Updated with OAuth patterns
>
> All done automatically!"

---

## 7. Advanced Features (20 min)

### Creating Custom Skills (1:55:00-2:05:00)

**[ON SCREEN: Skill creation]**

> "**Advanced Feature 1: Custom Skills**
>
> Let's create a custom skill for our domain. For TaskMaster, we'll create an `agile-expert` skill:
>
> **Step 1: Create Skill Structure**
>
> ```bash
> mkdir -p .claude/skills/agile-expert
> cd .claude/skills/agile-expert
> ```
>
> **Step 2: Write SKILL.md**"

**[ON SCREEN: SKILL.md file]**

> "```markdown
> # .claude/skills/agile-expert/SKILL.md
> ---
> name: agile-expert
> description: Expert in agile methodologies, sprint planning, user stories,
>              story points, velocity tracking. Activates for: sprint,
>              user story, story points, backlog, velocity, agile, scrum.
> allowed-tools: Read, Write, Edit, Grep, Glob
> ---
>
> # Agile Development Expert
>
> ## Expertise
>
> I specialize in:
> - Writing user stories in proper format
> - Estimating story points
> - Sprint planning and capacity
> - Backlog refinement
> - Velocity tracking
>
> ## User Story Format
>
> **Template:**
> ```
> As a [role]
> I want [feature]
> So that [benefit]
>
> Acceptance Criteria:
> - [ ] [criterion 1]
> - [ ] [criterion 2]
> - [ ] [criterion 3]
>
> Story Points: [1, 2, 3, 5, 8, 13]
> Priority: [High, Medium, Low]
> ```
>
> **Example:**
> ```
> As a team member
> I want to assign tasks to other team members
> So that work is clearly distributed
>
> Acceptance Criteria:
> - [ ] Can select assignee from team dropdown
> - [ ] Assignee receives notification
> - [ ] Task shows assignee's avatar
> - [ ] Can reassign tasks
>
> Story Points: 3
> Priority: High
> ```
>
> ## Story Point Guidelines
>
> - **1 point**: Trivial (< 1 hour)
> - **2 points**: Simple (1-2 hours)
> - **3 points**: Moderate (half day)
> - **5 points**: Complex (1 day)
> - **8 points**: Very complex (2-3 days)
> - **13 points**: Too large - break down!
>
> ## When to Use This Skill
>
> Activate me when you:
> - Create user stories
> - Plan sprints
> - Estimate work
> - Refine backlog
> - Track velocity
> - Need agile best practices
> ```"

**[ON SCREEN: Testing the skill]**

> "**Step 3: Test the Skill**
>
> Restart Claude Code, then ask:
> ```
> Write a user story for allowing team members to comment on tasks.
> ```"

**[DEMO: Skill activation]**

**[ON SCREEN: Skill response]**

> "The `agile-expert` skill activates:
>
> ```markdown
> # User Story: Task Comments
>
> As a team member
> I want to comment on tasks
> So that I can discuss details and provide updates
>
> ## Acceptance Criteria
> - [ ] Comment box visible on task detail page
> - [ ] Can write and submit comments
> - [ ] Comments show author name and timestamp
> - [ ] Comments display in chronological order
> - [ ] Can edit own comments within 5 minutes
> - [ ] Can delete own comments
> - [ ] Real-time updates when others comment
> - [ ] Mentions (@username) send notifications
>
> ## Story Points: 5
> **Reasoning**: Requires backend API, real-time updates via WebSocket,
> mention parsing, and notification integration. Moderate complexity.
>
> ## Priority: High
> **Reasoning**: Core collaboration feature. Blocks other communication features.
>
> ## Technical Notes
> - Use WebSocket for real-time updates
> - Store comments in separate table (task_comments)
> - Implement mention parser (@username)
> - Trigger notifications via notification service
>
> ## Testing Considerations
> - Test with multiple users commenting simultaneously
> - Verify real-time updates across browsers
> - Test mention notifications
> - Test edit/delete permissions
> ```
>
> Perfect! The skill knows our conventions and provides comprehensive stories."

### Context Manifest Best Practices (2:05:00-2:10:00)

**[ON SCREEN: Advanced manifest example]**

> "**Advanced Feature 2: Context Manifest Patterns**
>
> Here's an advanced manifest with optimization strategies:
>
> ```yaml
> # features/042-task-search/context-manifest.yaml
> ---
> # Selective section loading (use anchors)
> spec_sections:
>   - specifications/modules/tasks/overview.md#data-model  # Just data model
>   - specifications/modules/search/spec.md                # Full search spec
>   - specifications/modules/tasks/crud-operations/spec.md#read  # Just read operation
>
> # Architecture (only relevant docs)
> documentation:
>   - .specweave/docs/architecture/database-schema.md#tasks-table
>   - .specweave/docs/architecture/search-indexing.md
>   - .specweave/docs/decisions/028-search-engine-choice.md
>
> # Code (specific files)
> code:
>   - src/models/task.model.ts
>   - src/services/search.service.ts
>   - src/utils/query-parser.ts
>
> # Dependencies (other features)
> dependencies:
>   features:
>     - features/003-task-crud/context-manifest.yaml  # Inherit task context
>
>   external:
>     - node_modules/elasticsearch/README.md  # Library docs
>
> # Performance tuning
> max_context_tokens: 15000
> priority: high
> auto_refresh: false  # Don't reload on every query
> cache_duration: 3600  # Cache for 1 hour
>
> # Include/exclude patterns
> include_patterns:
>   - \"src/**/*.ts\"
>   - \"!src/**/*.test.ts\"  # Exclude tests
>   - \"!src/**/mock-*.ts\"  # Exclude mocks
>
> # Custom variables
> variables:
>   search_engine: elasticsearch
>   version: v8.11.0
>   index_name: tasks_v2
> ---
> ```
>
> **Advanced Techniques:**
> - **Anchors** (#data-model) - Load specific sections
> - **Dependencies** - Inherit from other manifests
> - **Cache control** - Reduce repeated loads
> - **Variables** - Parameterize context
> - **Patterns** - Include/exclude files
>
> This is how you optimize for massive codebases!"

### Integration with External Tools (2:10:00-2:15:00)

**[ON SCREEN: Integration examples]**

> "**Advanced Feature 3: External Integrations**
>
> SpecWeave integrates with your existing tools via skills:
>
> **JIRA Integration:**
> ```
> User: 'Sync features to JIRA'
>
> → jira-sync skill activates
> → Reads features/*/spec.md
> → Creates JIRA epics for each feature
> → Creates stories from tasks.md
> → Links back to SpecWeave
> → Updates roadmap.md with JIRA links
> ```
>
> **GitHub Integration:**
> ```
> User: 'Create PR for feature 015'
>
> → github-sync skill activates
> → Reads features/015-google-oauth/
> → Creates branch: feature/015-google-oauth
> → Commits implementation
> → Creates PR with:
>   - Title from spec.md
>   - Description from plan.md
>   - Checklist from tasks.md
>   - Links to specs
> → Adds reviewers based on module ownership
> ```
>
> **Azure DevOps Integration:**
> ```
> User: 'Push to ADO'
>
> → ado-sync skill activates
> → Creates work items
> → Links to Git commits
> → Updates sprint board
> → Syncs test results
> ```
>
> These skills wrap MCP (Model Context Protocol) servers for bidirectional sync."

### 🔄 Meta-Capability: Agents Build Agents (2:15:00-2:25:00)

**[ON SCREEN: Meta-capability diagram - recursive chain]**

> "**Advanced Feature 4: The Ultimate Power - Meta-Capability**
>
> This is where SpecWeave gets really powerful. The framework is **self-extending**:
> - ✅ Agents build agents
> - ✅ Skills build skills
> - ✅ SpecWeave uses itself to build new SpecWeave features
>
> And YOU control every step."

**[ON SCREEN: Three-layer architecture]**

> "Let me show you the three layers:
>
> **Layer 1: SpecWeave Framework (The Factory)**
> - 20 core agents (pm, architect, devops, etc.)
> - 24 core skills (increment-planner, context-loader, etc.)
> - The foundation
>
> **Layer 2: Your Project (Using SpecWeave)**
> - Your increments (auth, payments, etc.)
> - Your specifications
> - Your production code
>
> **Layer 3: Custom Extensions (Agents Build Agents)**
> - Custom agents for YOUR domain
> - Custom skills for YOUR needs
> - Tools that build MORE tools"

**[DEMO: Creating Custom Agent]**

**[ON SCREEN: Terminal]**

> "Let's create a Stripe integration expert:
>
> ```
> User: 'Create a custom agent that knows Stripe API,
>        webhooks, subscriptions, and PCI compliance'
> ```"

**[ON SCREEN: SpecWeave architect agent activates]**

> "Watch what happens:
>
> 1. SpecWeave's **architect agent** activates
> 2. Designs the new agent structure
> 3. Generates `.claude/agents/stripe-integration/AGENT.md`
> 4. Asks YOU to review the prompt
> 5. You approve or modify
> 6. New agent is created!"

**[ON SCREEN: Generated AGENT.md]**

> "```yaml
> ---
> name: stripe-integration
> description: Expert in Stripe API integration, webhooks,
>              subscriptions, PCI compliance
> tools: Read, Write, Edit, Bash
> model: sonnet
> ---
>
> You are a Stripe integration expert with deep knowledge of:
> - Stripe API (Charges, Payment Intents, Subscriptions)
> - Webhook handling and signature verification
> - PCI compliance best practices
> - Error handling for payment failures
> - Idempotency keys for retry safety
> - Testing with Stripe test mode
>
> When implementing Stripe integrations:
> 1. Always use Payment Intents (not legacy Charges)
> 2. Verify webhook signatures
> 3. Handle all webhook events
> 4. Use idempotency keys
> 5. Follow PCI compliance guidelines
> ...
> ```
>
> Now when I ask 'Implement Stripe subscriptions', the `stripe-integration` agent handles it with EXPERT knowledge!"

**[ON SCREEN: Real-world example]**

> "**Real-World Impact:**
>
> **Before custom agent:**
> - You read Stripe docs for 2 hours
> - Write boilerplate code
> - Miss edge cases
> - Repeat for EVERY project
>
> **After custom agent:**
> - Agent remembers everything
> - Applies best practices automatically
> - Handles edge cases
> - Reusable across ALL your projects
> - Share with your team (git commit)"

**[ON SCREEN: SpecWeave building SpecWeave]**

> "**The Ultimate Recursion: SpecWeave Builds Itself**
>
> Here's the mind-bending part. SpecWeave uses itself to add new features:
>
> ```
> Increment: 003-figma-integration
> ↓
> pm agent: Creates requirements spec
> ↓
> architect agent: Designs architecture
> ↓
> docs-writer agent: Writes AGENT.md
> ↓
> Result: New figma-implementer agent added!
> ↓
> SpecWeave now has Figma capabilities (built by SpecWeave!)
> ```
>
> **Pattern we observed**:
> - ✅ Increment 001: Core framework (built manually)
> - ✅ Increment 002+: Built using increment 001's agents
> - ✅ Each increment adds new agents/skills
> - ✅ New capabilities improve future development
> - ✅ **Continuous self-improvement loop**"

**[ON SCREEN: Benefits list]**

> "**Why This Matters:**
>
> **1. Infinite Extensibility**
> - Healthcare? Create `hipaa-compliance` agent
> - Gaming? Create `game-balance` agent
> - Finance? Create `sox-compliance` agent
> - IoT? Create `mqtt-protocol` skill
> - ANY domain, ANY niche
>
> **2. Domain Expertise On-Demand**
> - Capture YOUR company's knowledge
> - Codify YOUR best practices
> - Enforce YOUR standards automatically
>
> **3. Continuous Learning**
> ```
> Discover better pattern
>    ↓
> Update custom agent
>    ↓
> All future work uses improvement
>    ↓
> Share with team (git commit)
>    ↓
> Team benefits immediately
> ```
>
> **4. Zero Lock-In**
> - You own custom agents (in `.claude/`)
> - Version controlled
> - Can modify SpecWeave agents (fork `src/`)
> - Can remove SpecWeave entirely (specs remain)
>
> **5. You Control Everything**
> ```
> SpecWeave: 'I can create a custom agent. Review the prompt?'
> You: [Reviews] 'Approved' or 'Modify error handling'
>    ↓
> No autonomous changes - you're always in control
> ```"

**[ON SCREEN: Healthcare SaaS example]**

> "**Real Example: Healthcare SaaS**
>
> **Phase 1**: Core agents build foundation
> ```
> pm agent → HIPAA requirements
> architect agent → Encryption design
> python-backend agent → Implementation
> ```
>
> **Phase 2**: Create custom healthcare agent
> ```
> User: 'Create HIPAA compliance agent'
>    ↓
> SpecWeave creates: hipaa-compliance agent
>    ↓
> Agent knows: PHI handling, audit trails, BAA requirements
> ```
>
> **Phase 3**: Agent builds specialized tools
> ```
> hipaa-compliance agent → Creates: phi-scanner skill
>    ↓
> phi-scanner detects PHI in code/logs automatically
>    ↓
> Prevents HIPAA violations before deployment
> ```
>
> **Result**: Healthcare SaaS with HIPAA expertise (built by SpecWeave!)"

**[ON SCREEN: The factory builds factories]**

> "**The Factory Builds Factories**
>
> SpecWeave is a factory that produces:
> 1. ✅ Production applications (your SaaS, API, etc.)
> 2. ✅ Custom agents (domain experts)
> 3. ✅ Custom skills (specialized tools)
> 4. ✅ New framework features (SpecWeave improvements)
>
> **And you're the architect of it all** - controlling what gets built, how it's built, and what feeds back to the framework.
>
> No other framework does this. This is SpecWeave's superpower."

---

## 8. Testing Demonstrations (15 min)

### Skill Testing (2:15:00-2:20:00)

**[ON SCREEN: Skill test structure]**

> "**Testing Framework 1: Skill Testing**
>
> Every SpecWeave skill must have minimum 3 tests. Let's look at how this works:
>
> **Test Structure:**
> ```
> src/skills/increment-planner/
> ├── SKILL.md
> ├── scripts/
> ├── references/
> ├── test-cases/              # Test definitions (YAML)
> │   ├── test-1-basic.yaml
> │   ├── test-2-complex.yaml
> │   └── test-3-edge-case.yaml
> └── test-results/            # Generated results (gitignored)
>     ├── test-1-result.md
>     ├── test-2-result.md
>     └── test-3-result.md
> ```"

**[ON SCREEN: Test case YAML]**

> "**Example Test Case:**
>
> ```yaml
> # src/skills/increment-planner/test-cases/test-1-basic.yaml
> ---
> test_id: increment-planner-001
> name: Basic Feature Planning
> description: Test that increment-planner creates complete feature structure
>
> setup:
>   project_type: greenfield
>   existing_features: 0
>
> input:
>   user_request: |
>     Plan a user authentication feature with email/password login,
>     registration, and password reset.
>
> expected_outputs:
>   - type: directory
>     path: features/001-user-authentication/
>
>   - type: file
>     path: features/001-user-authentication/spec.md
>     contains:
>       - \"User Authentication\"
>       - \"email/password\"
>       - \"registration\"
>       - \"password reset\"
>
>   - type: file
>     path: features/001-user-authentication/plan.md
>     contains:
>       - \"Implementation Plan\"
>       - \"Phase\"
>
>   - type: file
>     path: features/001-user-authentication/tasks.md
>     contains:
>       - \"[ ]\"  # Has checkboxes
>
>   - type: file
>     path: features/001-user-authentication/tests.md
>     contains:
>       - \"Test Strategy\"
>
>   - type: file
>     path: features/001-user-authentication/context-manifest.yaml
>     contains:
>       - \"spec_sections\"
>       - \"authentication\"
>
> validation:
>   - check: file_exists
>     path: features/001-user-authentication/spec.md
>
>   - check: yaml_valid
>     path: features/001-user-authentication/context-manifest.yaml
>
>   - check: feature_number
>     expected: \"001\"
>
>   - check: all_files_created
>     count: 5
>
> pass_criteria:
>   - All expected files created
>   - Content contains required keywords
>   - YAML is valid
>   - Feature number is correct
> ---
> ```"

**[DEMO: Run skill test]**

```bash
npm run test:skills -- increment-planner
```

**[ON SCREEN: Test execution]**

> "**Test Result:**
>
> `test-results/test-1-result.md`:
> ```markdown
> # Test Result: increment-planner-001
>
> **Status**: ✅ PASSED
> **Duration**: 12.3s
> **Timestamp**: 2025-01-26T10:30:45Z
>
> ## Setup
> - Created temporary project
> - No existing features
>
> ## Execution
>
> Sent request:
> > Plan a user authentication feature with email/password login,
> > registration, and password reset.
>
> ## Outputs
>
> Created files:
> - ✅ features/001-user-authentication/spec.md (342 lines)
> - ✅ features/001-user-authentication/plan.md (156 lines)
> - ✅ features/001-user-authentication/tasks.md (45 lines)
> - ✅ features/001-user-authentication/tests.md (78 lines)
> - ✅ features/001-user-authentication/context-manifest.yaml (23 lines)
>
> ## Validations
>
> ✅ spec.md contains \"User Authentication\"
> ✅ spec.md contains \"email/password\"
> ✅ spec.md contains \"registration\"
> ✅ spec.md contains \"password reset\"
> ✅ plan.md contains \"Implementation Plan\"
> ✅ plan.md contains \"Phase\"
> ✅ tasks.md contains checkboxes
> ✅ tests.md contains \"Test Strategy\"
> ✅ context-manifest.yaml is valid YAML
> ✅ context-manifest.yaml contains \"spec_sections\"
> ✅ Feature number is 001
> ✅ All 5 files created
>
> ## Conclusion
>
> All validations passed. Skill performed as expected.
> ```"

### E2E Testing Deep Dive (2:20:00-2:27:00)

**[ON SCREEN: E2E test philosophy]**

> "**Testing Framework 2: E2E with Playwright**
>
> E2E testing is MANDATORY in SpecWeave when UI exists. Here's why:
>
> **The Problem with Unit Tests:**
> ```typescript
> // This test passes...
> test('login returns token', async () => {
>   const result = await authService.login('user@test.com', 'pass123');
>   expect(result.token).toBeDefined();
> });
>
> // But the UI might be completely broken!
> // - Form doesn't submit
> // - Token not stored in localStorage
> // - Redirect doesn't work
> // - User sees error despite valid login
> ```
>
> **E2E Tests Close the Loop:**
> ```typescript
> test('user can actually log in', async ({ page }) => {
>   // Test REAL UI
>   await page.goto('http://localhost:3000/login');
>   await page.fill('[name=\"email\"]', 'user@test.com');
>   await page.fill('[name=\"password\"]', 'pass123');
>   await page.click('button[type=\"submit\"]');
>
>   // Verify REAL outcome
>   await expect(page).toHaveURL('http://localhost:3000/dashboard');
>   await expect(page.locator('[data-testid=\"username\"]'))
>     .toHaveText('testuser');
>
>   // Check REAL side effects
>   const token = await page.evaluate(() => localStorage.getItem('authToken'));
>   expect(token).toBeTruthy();
> });
> ```
>
> If this test passes, the feature ACTUALLY works."

**[ON SCREEN: Truth-telling tests]**

> "**Critical: Tests Must Tell the Truth**
>
> ❌ **Bad Test (Lies):**
> ```typescript
> test('payment succeeds', async ({ page }) => {
>   await page.goto('/checkout');
>   await page.fill('[name=\"card\"]', '4242424242424242');
>   await page.click('button:has-text(\"Pay\")');
>
>   // Just waits, doesn't actually verify
>   await page.waitForTimeout(2000);
>
>   // Passes even if payment failed!
> });
> ```
>
> ✅ **Good Test (Tells Truth):**
> ```typescript
> test('payment succeeds', async ({ page }) => {
>   await page.goto('/checkout');
>   await page.fill('[name=\"card\"]', '4242424242424242');
>   await page.click('button:has-text(\"Pay\")');
>
>   // Verify actual success indicator
>   await expect(page.locator('.success-message'))
>     .toBeVisible();
>   await expect(page.locator('.success-message'))
>     .toContainText('Payment successful');
>
>   // Verify order status changed
>   await page.goto('/orders');
>   await expect(page.locator('[data-order-id=\"123\"] .status'))
>     .toHaveText('Paid');
>
>   // Verify database updated (via API)
>   const response = await page.request.get('/api/orders/123');
>   const order = await response.json();
>   expect(order.status).toBe('paid');
>   expect(order.paymentId).toBeDefined();
> });
> ```
>
> **Truth-telling principles:**
> 1. Verify visible outcomes (not timeouts)
> 2. Check side effects (database, API)
> 3. Test the happy path AND error cases
> 4. If test passes, feature MUST work
> 5. If test fails, report EXACTLY what failed"

**[DEMO: Show failing vs passing test]**

### Closed-Loop Validation (2:27:00-2:30:00)

**[ON SCREEN: Validation cycle diagram]**

> "**The Closed-Loop Validation Cycle:**
>
> ```
> Specification
>      ↓
> Implementation
>      ↓
> E2E Tests
>      ↓
> Validation Report → Updates Specification if gaps found
>      ↓
> Deploy with Confidence
> ```
>
> **Example Validation Report:**
>
> ```markdown
> # Validation Report: Feature 015 (Google OAuth)
>
> ## Tests Executed
>
> ### Regression Tests (Existing Behavior)
> - ✅ 12/12 passed
> - No regressions detected
>
> ### New Feature Tests (OAuth)
> - ✅ 8/8 passed
> - OAuth flow working correctly
>
> ## Coverage Analysis
>
> **Scenarios Tested:**
> - [x] New user signs up with Google
> - [x] Existing OAuth user logs in with Google
> - [x] Existing email user sees account linking prompt
> - [x] User links Google to existing account
> - [x] Linked user can use either login method
> - [x] OAuth failure shows appropriate error
> - [x] Invalid OAuth token rejected
> - [x] OAuth user profile picture synced
>
> **Edge Cases:**
> - [x] Email from OAuth matches existing user (prompts linking)
> - [x] User cancels Google OAuth (returns to login)
> - [x] OAuth returns no email (error)
> - [x] OAuth returns unverified email (still trusted)
>
> ## Spec Gaps Found
>
> During testing, discovered:
>
> **Gap 1**: Spec didn't address: \"What if user starts OAuth,
> creates account, then tries OAuth again?\"
>
> **Resolution**: Added to spec - should recognize existing
> account and log in (not create duplicate).
>
> **Gap 2**: Spec unclear on profile picture updates.
>
> **Resolution**: Specified - sync picture on every OAuth login
> (keep it current).
>
> ## Deployment Recommendation
>
> ✅ **READY TO DEPLOY**
>
> - All tests pass
> - No regressions
> - Spec gaps addressed
> - Edge cases covered
>
> ## Confidence Level: HIGH
> ```
>
> This report closes the loop. We KNOW the feature works because tests prove it."

---

## 9. Best Practices (10 min)

### Do's and Don'ts (2:30:00-2:35:00)

**[ON SCREEN: Best practices list]**

> "**SpecWeave Best Practices**
>
> **DO:**
>
> ✅ **Write specs before code**
>    - Define WHAT and WHY first
>    - Code expresses HOW
>
> ✅ **Use modular specifications**
>    - Break large specs into modules
>    - Enable context precision
>    - Share common concepts
>
> ✅ **Create context manifests**
>    - Declare what context is needed
>    - Aim for 70%+ token reduction
>    - Update when dependencies change
>
> ✅ **Trust but verify with E2E tests**
>    - Test actual UI, not mocks
>    - Verify real outcomes
>    - Close the loop
>
> ✅ **Document before modifying (brownfield)**
>    - Capture current behavior
>    - Create regression tests
>    - Get stakeholder approval
>
> ✅ **Let skills activate automatically**
>    - Don't micro-manage
>    - Use natural language
>    - Let skill-router do its job
>
> ✅ **Build documentation gradually**
>    - Create docs as needed
>    - Don't write 500 pages upfront
>    - Let hooks auto-update
>
> **DON'T:**
>
> ❌ **Don't skip specifications**
>    - \"Just build it\" leads to vibe coding
>    - AI needs source of truth
>
> ❌ **Don't load entire codebase**
>    - Use context manifests
>    - Be selective
>    - 70% reduction is achievable
>
> ❌ **Don't trust unit tests alone**
>    - They don't test integration
>    - UI can still break
>    - Use E2E for validation
>
> ❌ **Don't modify brownfield without specs**
>    - High regression risk
>    - Document first
>    - Test current behavior
>
> ❌ **Don't manually invoke skills**
>    - Avoid \"@skill-name do this\"
>    - Use natural language
>    - Let auto-routing work
>
> ❌ **Don't ignore test failures**
>    - If test fails, feature is broken
>    - Tests must tell truth
>    - Fix before deploying"

### Common Pitfalls (2:35:00-2:38:00)

**[ON SCREEN: Pitfalls list]**

> "**Common Pitfalls to Avoid:**
>
> **Pitfall 1: Monolithic Specifications**
>
> ❌ Problem:
> ```
> specifications/
> └── entire-system.md  (500 pages)
> ```
>
> ✅ Solution:
> ```
> specifications/modules/
> ├── payments/
> ├── authentication/
> ├── users/
> └── ...
> ```
>
> **Pitfall 2: No Context Manifests**
>
> ❌ Problem: Loading entire codebase every time
>
> ✅ Solution: Create context-manifest.yaml for each feature
>
> **Pitfall 3: False Positive Tests**
>
> ❌ Problem:
> ```typescript
> test('works', async ({ page }) => {
>   await page.click('button');
>   await page.waitForTimeout(1000);
>   // Passes even if nothing happened
> });
> ```
>
> ✅ Solution:
> ```typescript
> test('works', async ({ page }) => {
>   await page.click('button');
>   await expect(page.locator('.result'))
>     .toContainText('Success');
> });
> ```
>
> **Pitfall 4: Skipping Brownfield Analysis**
>
> ❌ Problem: Modifying code without understanding it
>
> ✅ Solution: Use brownfield-analyzer, generate specs, test first
>
> **Pitfall 5: Manual Documentation**
>
> ❌ Problem: Manually updating docs, they fall behind
>
> ✅ Solution: Enable hooks, let docs-updater handle it"

### Tips for Success (2:38:00-2:40:00)

**[ON SCREEN: Success tips]**

> "**Tips for Success with SpecWeave:**
>
> **1. Start Small**
> - Begin with one module
> - Create basic specs
> - Add features incrementally
> - Don't try to spec entire system at once
>
> **2. Iterate on Specs**
> - Specs evolve with understanding
> - Update when you discover gaps
> - Review with stakeholders
> - Living documents, not set in stone
>
> **3. Custom Skills for Your Domain**
> - Create domain-specific skills
> - E-commerce, fintech, healthcare, etc.
> - Encode your expertise
> - Share across projects
>
> **4. Use ADRs for Decisions**
> - Document WHY you chose X over Y
> - Future you will thank you
> - Helps onboarding
> - Prevents revisiting old debates
>
> **5. Review Test Results with Stakeholders**
> - Especially for brownfield
> - Confirm tests capture all behavior
> - Missing edge cases? Add them
> - Tests are your safety net
>
> **6. Integrate with Your Workflow**
> - Sync with JIRA/GitHub/ADO
> - Fit SpecWeave into your process
> - Don't change everything at once
> - Gradual adoption
>
> **7. Measure Token Reduction**
> - Track before/after
> - Aim for 70%+
> - Optimize manifests
> - Share wins with team"

---

## 10. Conclusion & Resources (5 min)

### Summary (2:40:00-2:42:00)

**[ON SCREEN: Key takeaways]**

> "**What We Covered Today:**
>
> 1. **The Problem**: Vibe coding leads to broken features and lost context
>
> 2. **The Solution**: SpecWeave - specification-driven development for AI
>
> 3. **Core Innovations**:
>    - Specifications as source of truth
>    - Context precision (70%+ token reduction)
>    - Skills-based architecture
>    - Living documentation
>    - Hooks automation
>
> 4. **Comparisons**:
>    - BMAD: Role-based agile framework (complementary)
>    - SpecKit: Lightweight spec toolkit (subset)
>    - SpecWeave: Full end-to-end framework (brownfield-ready)
>
> 5. **Greenfield Demo**: Built TaskMaster from spec to tested code
>
> 6. **Brownfield Demo**: Safely evolved EasyChamp with no regressions
>
> 7. **Advanced Features**:
>    - Custom skills
>    - Advanced context manifests
>    - External integrations
>
> 8. **Testing**:
>    - Skill tests (3+ per skill)
>    - E2E tests (truth-telling)
>    - Closed-loop validation
>
> 9. **Best Practices**: Do's, don'ts, pitfalls, and tips"

### Getting Started (2:42:00-2:43:30)

**[ON SCREEN: Getting started steps]**

> "**How to Get Started:**
>
> **Installation:**
> ```bash
> npm install -g specweave
> ```
>
> **For Greenfield:**
> ```bash
> specweave init
> ```
>
> **For Brownfield:**
> ```bash
> specweave init --brownfield
> ```
>
> **Resources:**
> - Documentation: https://docs.specweave.dev
> - GitHub: https://github.com/yourusername/specweave
> - Examples: https://github.com/specweave/examples
> - Community: https://discord.gg/specweave
>
> **Two Ways to Start:**
>
> **Option 1: Interactive Quick Build** (Perfect for learning or small projects)
>
> Simply describe what you want:
> ```
> "build a very simple web calculator app"
> ```
>
> SpecWeave guides you through interactive prompts:
> 1. **Approach** - Quick build OR plan first?
> 2. **Features** - Multi-select what you need (checkboxes!)
> 3. **Tech Stack** - Vanilla, React, or your choice
> 4. **Review & Submit** - Confirm and start building
>
> **Option 2: Specification-First** (Production-ready approach)
> 1. Read CLAUDE.md in your project
> 2. Create increment: `/specweave:inc "feature name"`
> 3. Review generated spec.md, plan.md, tasks.md
> 4. Implement: `/specweave:do`
> 5. Validate with E2E tests
>
> Both approaches use the same powerful multi-agent system under the hood!"

### Community & Support (2:43:30-2:44:30)

**[ON SCREEN: Community resources]**

> "**Join the Community:**
>
> - **Discord**: Real-time help and discussions
> - **GitHub Discussions**: Long-form Q&A
> - **Examples Repository**: Real-world SpecWeave projects
> - **Blog**: Best practices and case studies
> - **Twitter/X**: @SpecWeaveDev - Updates and tips
>
> **Contributing:**
> - Create custom skills and share them
> - Submit PRs for core skills
> - Write guides and tutorials
> - Report issues and suggest features
>
> **Enterprise Support:**
> - Custom skill development
> - Team training
> - Architecture consulting
> - Brownfield migration assistance"

### Final Thoughts (2:44:30-2:45:00)

**[ON SCREEN: Closing slide]**

> "**Final Thoughts:**
>
> AI-assisted development is incredibly powerful, but without structure, it's chaos.
>
> SpecWeave gives you that structure:
> - Specifications guide AI
> - Context precision keeps it focused
> - Skills bring expertise
> - Tests validate everything
> - You ship with confidence
>
> From solo developers to enterprise teams.
> From greenfield to brownfield.
> From vibe coding to spec-driven development.
>
> **Thank you for watching!**
>
> Start building with SpecWeave today, and let me know what you create.
>
> Drop your questions in the comments, and I'll see you in the next video!"

---

## Production Notes

### Pre-Recording Checklist

- [ ] Test all demo scripts
- [ ] Verify EasyChamp accessible
- [ ] Prepare clean environments
- [ ] Set up screen recording (1080p minimum)
- [ ] Configure audio (clear, no background noise)
- [ ] Prepare slides for concepts
- [ ] Test code examples
- [ ] Verify all tests pass
- [ ] Practice timing (aim for 2h 45min, allow 3h)

### Recording Setup

**Screen Layout:**
- Main: Code editor (VS Code with Claude Code)
- Secondary: Terminal
- Picture-in-picture: Webcam (optional)

**Tools:**
- Screen recorder: OBS Studio
- Audio: Good microphone
- Lighting: Soft, even
- Resolution: 1920x1080 minimum

**Pacing:**
- Speak clearly, not too fast
- Pause for code execution
- Show results, don't rush
- Allow time for concepts to land

### Post-Production

- [ ] Edit for clarity (cut dead air, mistakes)
- [ ] Add chapter markers (for each section)
- [ ] Create thumbnail (eye-catching)
- [ ] Write video description
- [ ] Add timestamps in description
- [ ] Tag appropriately (AI, development, testing, etc.)
- [ ] Create supplementary materials (code repo, slides)
- [ ] Schedule release

### Supplementary Materials

Create these to accompany the video:
- GitHub repository with demo code
- Slide deck (PDF)
- Cheat sheets (quick reference)
- Links to resources
- FAQ document

---

## Script Version

**Version**: 1.0
**Date**: 2025-01-26
**Author**: Anton Abyzov
**Status**: Ready for recording

---

**Total Duration**: ~170 minutes (2h 50min)
**Complexity**: Advanced
**Prerequisites**: Basic knowledge of software development, familiarity with AI coding assistants
