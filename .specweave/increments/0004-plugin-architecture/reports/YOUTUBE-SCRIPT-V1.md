# SpecWeave YouTube Video Script v1.0

**Target Length**: 25-30 minutes
**Target Audience**: Senior engineers, tech leads, architects who've suffered through spec-less chaos
**Goal**: 1,000+ GitHub stars in first week

---

## SECTION 1: HOOK (0:00-0:45)

### Visual: Black screen, text appears word by word

**Script**:
> "Three months into your project. Product changes direction. Again.
>
> Your docs? Outdated on day one.
>
> Your tests? Passing... but testing the wrong thing.
>
> Your team? No clue what 'done' actually means.
>
> **Sound familiar?**"

### Cut to: You on camera, high energy

**Script**:
> "I'm Anton, and I just open-sourced SpecWeave—a framework that solves a problem every dev team has but nobody talks about: **specs that actually work.**
>
> This isn't vaporware. I'm going to build **five real projects** in front of you, greenfield AND brownfield, and show you why this destroys both BMAD Method and SpecKit.
>
> Stick around. By minute 25, you'll understand why **Den Delimarsky's SpecKit**, as brilliant as it is, only gives you **40% of what you actually need.**"

**[CTA overlay]**: "GitHub link in description ⬇️"

---

## SECTION 2: THE PROBLEM (0:45-3:30)

### Visual: Split screen - left shows traditional dev chaos, right shows SpecWeave flow

**Script**:
> "Let me show you the **traditional workflow disaster**:"

### Animation: Chaotic flowchart

**Points (rapid fire)**:
1. PM writes vague Jira ticket
2. Engineer guesses what it means
3. Build something
4. Tests written AFTER code (if at all)
5. Docs? 'We'll do it later' (narrator: they didn't)
6. Product pivot
7. **Everything is garbage**

**Script**:
> "Now look at the **'spec-driven' alternatives**:"

### Visual: Show BMAD Method screenshot

**Script**:
> "**BMAD Method**—brilliant research framework. But it's **manual**. Every artifact handcrafted. Every doc sync—your job. It's like writing a PhD thesis for every feature."

### Visual: Show SpecKit screenshot

**Script**:
> "**SpecKit** by Den Delimarsky—lightweight, practical. But it's just **templates**. No automation. No living docs. No hooks. You're still doing everything manually."

### Visual: Zoom into "The Gap"

**Script**:
> "Both miss the **critical insight**: Specs aren't documentation. **Specs are EXECUTABLE INFRASTRUCTURE.**
>
> And that's what SpecWeave is."

---

## SECTION 3: THE SOLUTION - SPECWEAVE ARCHITECTURE (3:30-8:00)

### Visual: Clean title card "SpecWeave: Spec-Driven Development, Automated"

**Script**:
> "SpecWeave has three core principles:"

### Principle 1: Living Specs (not dead docs)

**Visual**: Show `.specweave/increments/` structure

**Script**:
> "Every feature is an **increment**—a folder with:
> - `spec.md` - WHAT you're building (acceptance criteria)
> - `plan.md` - HOW you'll build it (architecture)
> - `tasks.md` - Step-by-step work breakdown
> - `tests.md` - Quality gates
>
> But here's the magic: **These update themselves.**"

### Principle 2: Hooks (automation without thought)

**Visual**: Show hook firing in terminal

**Script**:
> "Every time you complete a task, a **post-task hook** fires:
> - ✅ Logs completion
> - ✅ Updates progress
> - ✅ Syncs docs with reality
> - ✅ Plays completion sound (yes, really)
>
> You never **think** about documentation. It just **happens**."

### Principle 3: Plugin Architecture (context efficiency)

**Visual**: Show plugin system diagram

**Script**:
> "Here's where we destroy the competition. Traditional frameworks load **EVERYTHING**:
> - React skills? Loaded.
> - Kubernetes skills? Loaded.
> - ML pipeline expertise? Loaded.
>
> **Total**: 50,000 tokens. **Every. Single. Time.**
>
> SpecWeave v0.4.0? **Modular plugins.**"

### Visual: Show before/after comparison

**Script**:
> "Simple React app:
> - **Before**: 50K tokens
> - **After**: 12K tokens
> - **Reduction**: 76%
>
> That's 4x more context for your **actual code**."

---

## SECTION 4: FLOW DIAGRAM - THE COMPLETE LIFECYCLE (8:00-11:00)

### Visual: SHOW UPDATED MERMAID DIAGRAM (I'll create this next)

**Script**:
> "Let me walk you through the **complete SpecWeave lifecycle**—start to finish."

### Narrate each phase:

1. **Research/Analytics Phase**
   > "Starts with market research, competitive analysis, user stories. But unlike BMAD, this is **semi-automated**—AI helps, you validate."

2. **Decision Points** (NEW - highlight this)
   > "Here's where SpecWeave asks YOU:
   > - How deep should we spec? (High-level vs detailed)
   > - Test-driven development? (TDD vs test-after)
   > - Test quality level? (Basic coverage vs AI judge validation)
   > - Living docs sync? (Auto vs manual)
   >
   > **You control the rigor.** Not some framework author who doesn't know your deadlines."

3. **Plugin Detection** (4-phase system)
   > "SpecWeave scans your project:
   > - Found `package.json` with React? Suggests `frontend-stack` plugin.
   > - Found `.git/` with `github.com` remote? Enables `github-sync` plugin.
   > - Found `kubernetes/` folder? Loads `k8s-deployer` plugin.
   >
   > **Context efficiency: automatic.**"

4. **Increment Execution**
   > "Tasks execute one by one. After each:
   > - Hook fires
   > - Docs sync
   > - Progress updates
   > - **You never break flow.**"

5. **Quality Gates**
   > "Before closing an increment:
   > - All tasks complete?
   > - All tests passing?
   > - Docs synced?
   >
   > If not, **SpecWeave blocks you.** No 'we'll fix it later.'"

6. **Living Docs Update**
   > "Final hook: sync learnings back to strategic docs. Your architecture docs **reflect reality**, not wishful thinking."

---

## SECTION 5: GREENFIELD DEMOS (11:00-20:00)

### Demo 1: Stock Portfolio Tracker (3 min)

**Visual**: Screen recording, picture-in-picture

**Script**:
> "First project: **Real-time stock portfolio tracker**.
> - Frontend: React + Tailwind
> - Backend: Node.js + WebSockets
> - APIs: Alpha Vantage for stock data
>
> Watch how fast we go from idea to production-ready spec."

**Commands shown**:
```bash
specweave init stock-portfolio-tracker
# Auto-detects: React, Node.js, suggests plugins

/specweave:inc "real-time stock portfolio with live price updates"
# Creates spec.md, plan.md, tasks.md, tests.md

/specweave:do
# Executes Task 1: Setup project structure
# Hook fires → docs update

/specweave:progress
# Shows: 15% complete, 3/20 tasks done
```

**Script**:
> "**Three commands.** Full spec. Living docs. Ready to build.
>
> Let's check the spec..."

**Visual**: Show `spec.md` with acceptance criteria

**Script**:
> "Look at this:
> - US-001: User can add stocks to portfolio
> - US-002: Real-time price updates every 5 seconds
> - US-003: Portfolio value calculations with gains/losses
>
> **Testable. Measurable. Unambiguous.**"

---

### Demo 2: Blockchain Transaction Monitor (3 min)

**Script**:
> "Project two: **Blockchain monitor** for Ethereum transactions.
> - Backend-only: Node.js + Ethers.js
> - Real-time: WebSocket connection to Infura
> - Features: Track wallet, alert on large txns
>
> This time, let's add complexity: **TDD mode**."

**Commands shown**:
```bash
specweave init blockchain-monitor

/specweave:inc "blockchain transaction monitor with alerts"
# Decision point: "Enable TDD mode? (Y/n)"
# User selects: Y

# Spec created with test-first requirement
```

**Visual**: Show `tasks.md` with TDD structure

**Script**:
> "Notice the tasks:
> - T-001: Write test for WebSocket connection
> - T-002: Implement WebSocket connection
> - T-003: Write test for transaction parsing
> - T-004: Implement transaction parsing
>
> **Tests BEFORE code. Enforced by the framework.**"

---

### Demo 3: AI-Powered Task Manager (3 min)

**Script**:
> "Project three: **AI task manager** with smart scheduling.
> - Frontend: Next.js 14 (App Router)
> - AI: OpenAI GPT-4 for task prioritization
> - Database: Prisma + PostgreSQL
>
> This one's interesting—we'll enable the **AI Quality Judge**."

**Commands shown**:
```bash
specweave init ai-task-manager

/specweave:inc "AI task manager with smart scheduling"
# Decision: "Use AI Quality Judge for spec validation? (Y/n)"
# User selects: Y

/specweave:validate 0001
# AI judge analyzes spec for clarity, testability, edge cases
```

**Visual**: Show judge output

**Script**:
> "The AI judge caught this:
> - ⚠️ Warning: 'Smart scheduling' is vague. Define criteria.
> - ⚠️ Missing: Edge case for conflicting deadlines
> - ✅ Good: Clear acceptance criteria for task creation
>
> **It's like a senior architect reviewing your spec.**"

---

### Demo 4: E-commerce Microservices (2 min)

**Script**:
> "Project four: **E-commerce backend** with microservices.
> - Services: Auth, Products, Orders, Payments
> - Stack: Node.js, Kubernetes, PostgreSQL
> - Complexity: High
>
> Watch how plugins handle this:"

**Commands shown**:
```bash
specweave init ecommerce-backend

# Auto-detects:
# - kubernetes/ folder → Suggests k8s plugin
# - Stripe in package.json → Suggests payment plugin
# - Multiple services → Suggests microservices plugin

/specweave:inc "microservices architecture for e-commerce"
# Spec includes: API contracts, data models, deployment architecture
```

**Visual**: Show generated architecture diagram (Mermaid C4)

**Script**:
> "Look at this—**auto-generated architecture diagram**:
> - API Gateway
> - 4 microservices
> - Database per service
> - Event bus for async communication
>
> **From spec to architecture in 30 seconds.**"

---

### Demo 5: DevOps Monitoring Dashboard (2 min)

**Script**:
> "Final greenfield: **DevOps dashboard** for Kubernetes monitoring.
> - Frontend: React
> - Backend: Prometheus + Grafana
> - Features: Real-time cluster health, pod metrics
>
> This demonstrates **full plugin ecosystem**:"

**Commands shown**:
```bash
specweave init devops-dashboard

# Plugins enabled:
# - frontend-stack (React)
# - kubernetes (K8s deployment)
# - observability (Prometheus/Grafana)
# - github-sync (Issue tracking)

/specweave:do
# Executes tasks with ALL plugin skills available
```

**Visual**: Show skill auto-activation in logs

**Script**:
> "See this in the logs:
> - ✅ `k8s-deployer` skill activated (detected 'Kubernetes')
> - ✅ `grafana-dashboard` skill activated (detected 'monitoring')
> - ✅ `github-sync` skill activated (detected GitHub remote)
>
> **Context-aware. Automatic. Efficient.**"

---

## SECTION 6: BROWNFIELD DEMO - EasyChamp (20:00-24:00)

### Visual: Show EasyChamp codebase (messy, realistic)

**Script**:
> "Greenfield is easy. What about **brownfield**—a real, messy codebase with:
> - Zero documentation
> - Tests that don't match features
> - Tribal knowledge everywhere
>
> This is **EasyChamp**—a tournament management platform I built 2 years ago. Let's SpecWeave-ify it."

---

### Step 1: Brownfield Analysis

**Commands shown**:
```bash
cd easychamp
specweave init --brownfield

# Brownfield analyzer scans:
# - package.json → Detects React, Node.js, PostgreSQL
# - /docs folder → Finds 12 Markdown files
# - GitHub issues → Finds 45 open issues
# - git log → Analyzes commit patterns
```

**Visual**: Show analyzer output

**Script**:
> "The analyzer found:
> - ✅ Existing docs: 12 files (scattered, outdated)
> - ✅ GitHub issues: 45 open (no structure)
> - ⚠️ No specs, no tests mapped to features
> - ❌ Documentation last updated: 18 months ago
>
> **SpecWeave generates a migration plan:**"

---

### Step 2: Incremental Migration

**Visual**: Show migration plan

**Script**:
> "Instead of 'rewrite everything' (which never happens), SpecWeave suggests:
>
> **Phase 1: Document what exists**
> - Create increment 0001: 'Existing tournament system'
> - Extract features from code into specs
> - Map tests to acceptance criteria
>
> **Phase 2: New features use SpecWeave**
> - Increment 0002: 'Bracket generation improvements'
> - Full spec, plan, tasks, tests
>
> **Phase 3: Gradual spec coverage**
> - Backfill specs for critical paths
> - Living docs for everything new"

**Commands shown**:
```bash
/specweave:inc "brownfield-migration-tournament-system"

# Creates increment with:
# - spec.md: Extracted features from code analysis
# - plan.md: Migration strategy
# - tasks.md: Incremental steps
```

---

### Step 3: First Migrated Feature

**Script**:
> "Let's migrate **bracket generation**—core feature, zero docs, fragile code."

**Commands shown**:
```bash
/specweave:inc "refactor-bracket-generation-with-spec"

# Decision points:
# - Extract existing logic as spec? Y
# - Add missing test coverage? Y
# - Enable TDD for refactor? Y

/specweave:do
# Task 1: Analyze existing code
# Task 2: Write spec from behavior
# Task 3: Write tests for current behavior
# Task 4: Refactor with tests as safety net
```

**Visual**: Show before/after code quality

**Script**:
> "**Before**: 300-line function, no tests, no docs
>
> **After**:
> - ✅ Spec: 8 user stories, clear acceptance criteria
> - ✅ Tests: 24 test cases, 95% coverage
> - ✅ Code: Refactored into 6 small functions
> - ✅ Docs: Auto-updated with learnings
>
> **From tribal knowledge to team knowledge.**"

---

## SECTION 7: COMPARISON - SpecWeave vs BMAD vs SpecKit (24:00-26:30)

### Visual: Split-screen comparison table

**Script**:
> "Let's settle this. **SpecWeave vs BMAD vs SpecKit**—no bullshit."

### Comparison Table (show on screen)

| Feature | BMAD Method | SpecKit | SpecWeave |
|---------|-------------|---------|-----------|
| **Specs** | ✅ Manual | ✅ Templates | ✅ Automated |
| **Living Docs** | ❌ Manual sync | ❌ Manual sync | ✅ Auto-sync (hooks) |
| **Test Integration** | ❌ None | ❌ None | ✅ Built-in |
| **Plugin System** | ❌ Monolithic | ❌ None | ✅ Modular |
| **Context Efficiency** | ❌ N/A | ❌ N/A | ✅ 60-80% reduction |
| **Multi-Tool Support** | ❌ Manual | ✅ Markdown | ✅ 4 adapters |
| **Brownfield Support** | ❌ None | ❌ None | ✅ Auto-migration |
| **Quality Gates** | ❌ Manual | ❌ None | ✅ Enforced |
| **GitHub/Jira Sync** | ❌ Manual | ❌ None | ✅ Bidirectional |
| **Learning Curve** | 🟡 High | 🟢 Low | 🟢 Low |

**Script narration**:

> "**BMAD Method**: Brilliant for research-heavy projects. But it's a **PhD thesis for every feature**. Manual everything. Great for solo architects, terrible for teams moving fast.

> **SpecKit**: Den Delimarsky nailed the **minimalism**. Markdown templates, zero lock-in. But it's just scaffolding—you still do all the work. No automation. No living docs. No enforcement.

> **SpecWeave**: Takes the best of both:
> - BMAD's rigor → Automated
> - SpecKit's simplicity → Enhanced with plugins
> - Adds what neither has: **Hooks, living docs, context efficiency**

> **When to use what?**
> - **BMAD**: Solo architect, research-heavy, infinite time
> - **SpecKit**: Tiny team, simple project, hate frameworks
> - **SpecWeave**: Team of 2-50, moving fast, need quality AND speed"

---

## SECTION 8: VIRAL STRATEGY & CTA (26:30-28:00)

### Visual: You on camera, high energy

**Script**:
> "If you've made it this far, you get it. **Specs aren't optional—they're infrastructure.**
>
> Here's what I need from you:"

---

### CTA 1: Star the Repo

**Visual**: GitHub repo on screen

**Script**:
> "**One**: Star the repo. Link in description. This helps other devs find it.
>
> **Goal**: 1,000 stars in 7 days. We're at [current count]. Let's crush this."

---

### CTA 2: Try It (Challenge)

**Script**:
> "**Two**: Try it on your messiest brownfield project. The one with zero docs and 'that one guy who knows how it works.'
>
> Film a 60-second before/after. Post it. Tag me. **Best one gets a free 1-hour architecture consultation.**"

---

### CTA 3: Contribute

**Script**:
> "**Three**: We need plugins. If you're an expert in:
> - Frontend (React, Vue, Angular)
> - Backend (Python, .NET, Go)
> - DevOps (Terraform, Kubernetes, AWS)
>
> **Build a plugin.** I'll feature you in the next video."

---

### CTA 4: Share (Controversy)

**Visual**: Show tweet draft

**Script**:
> "**Four**: Share this video with a **controversial take**:
>
> *'BMAD Method: Great research, terrible for teams. SpecKit: Great templates, zero automation. SpecWeave: Automated living specs. Fight me.'*
>
> Tag Den Delimarsky, tag BMAD creator. **Let's start a conversation.**"

---

### Final Hook

**Script**:
> "Here's the truth nobody says out loud: **Your docs are lies.**
>
> They were lies the day you wrote them. They'll be lies tomorrow.
>
> **Unless they're automated.**
>
> SpecWeave makes docs **tell the truth**—because they update themselves.
>
> Link in description. Star the repo. Build something.
>
> Let's make spec-driven development the default, not the exception.
>
> See you in the comments."

---

## VIRAL MARKETING STRATEGY

### Pre-Launch (Week Before)

1. **Tease on Twitter/LinkedIn**:
   - "Spent 6 months building a framework that makes BMAD obsolete. Video drops Friday."
   - "SpecKit is brilliant. But it's only 40% of what you need. Here's the other 60%."

2. **Reach Out to Influencers**:
   - **Den Delimarsky** (SpecKit): "Hey Den, huge fan of SpecKit. Built something that extends your vision—would love your thoughts."
   - **BMAD Creator**: "BMAD inspired this—automated your methodology. Can I get your feedback?"
   - **ThePrimeagen, Theo, other dev YouTubers**: "Controversial take on specs. Worth a reaction video?"

3. **Seed in Communities**:
   - r/programming: "I automated spec-driven development. Here's why BMAD and SpecKit aren't enough."
   - Hacker News: "SpecWeave: Living documentation that actually stays current"
   - Dev.to: Write companion article

---

### Launch Day

1. **Cross-Post Everywhere**:
   - Twitter thread (10 tweets)
   - LinkedIn article
   - Reddit (r/programming, r/softwareengineering, r/ExperiencedDevs)
   - Hacker News
   - Dev.to

2. **Controversial Framing** (pick one):
   - "Why every spec framework before this failed"
   - "BMAD is brilliant. And obsolete."
   - "SpecKit proved specs can be simple. SpecWeave makes them work."

3. **Engage Aggressively**:
   - Reply to EVERY comment in first 4 hours
   - Pin top comment: "Want the TLDR? Timestamp X:XX has the full comparison"

---

### Post-Launch (First Week)

1. **Community Challenges**:
   - "Brownfield Challenge: Share your messiest codebase cleanup"
   - "Plugin Bounty: $500 for first community plugin"

2. **Guest Appearances**:
   - Pitch to podcasts: Changelog, Syntax.fm, Software Engineering Daily
   - "I automated living documentation—here's how"

3. **Analytics-Driven Follow-Up**:
   - See which demo got most engagement → Make standalone video
   - See which comparison point resonated → Double down

---

### Engagement Hooks in Video

1. **Timestamps with Controversy**:
   - 3:30 - "Why BMAD fails for teams"
   - 24:00 - "Why SpecKit is only 40% of the solution"
   - 26:30 - "The challenge: Try this on your worst project"

2. **Pin This Comment**:
   > "**Timestamps**:
   > - 0:45 - The Problem with Current Specs
   > - 3:30 - Why BMAD/SpecKit Aren't Enough
   > - 8:00 - SpecWeave Architecture Deep Dive
   > - 11:00 - Greenfield Demos (5 projects)
   > - 20:00 - Brownfield Demo (EasyChamp migration)
   > - 24:00 - BMAD vs SpecKit vs SpecWeave
   > - 26:30 - Try the Brownfield Challenge
   >
   > **Star the repo**: [link]
   > **Docs**: https://spec-weave.com"

3. **Community Building**:
   - "Comment your worst documentation horror story. Top 3 get featured in next video."
   - "Who should I interview next? BMAD creator? Den Delimarsky? Vote below."

---

## VIDEO PRODUCTION NOTES

### B-Roll Shots Needed

1. **Terminal recordings** (clean, fast):
   - `specweave init` sequence
   - `/specweave:inc` creating specs
   - `/specweave:do` executing tasks
   - Hooks firing with completion sounds

2. **IDE shots** (VS Code):
   - `spec.md` file structure
   - `tasks.md` with checkmarks
   - Plugin auto-detection logs
   - GitHub sync in action

3. **Diagrams** (animated):
   - Flow diagram (will create next)
   - Plugin architecture
   - Before/after context usage
   - BMAD vs SpecKit vs SpecWeave table

4. **GitHub shots**:
   - Issues syncing
   - Stars counter
   - Contributors graph

---

### Editing Style

- **Pace**: Fast cuts, 2-3 second max per shot
- **Music**: Upbeat, energetic (NCS, Epidemic Sound)
- **Graphics**: Clean, minimal (Canva or Figma)
- **Captions**: Auto-captions for accessibility + retention
- **Chapters**: MUST have YouTube chapters for each section

---

### Thumbnail Ideas

**Option A**: "BMAD vs SpecKit vs SpecWeave" (comparison chart)
**Option B**: "Living Docs That Actually Work" (before/after code)
**Option C**: "I Automated Spec-Driven Development" (your face + terminal)

**Text overlay**: "60% Less Context | 100% Automated | Open Source"

---

## NEXT STEPS FOR YOU

1. **Create Flow Diagram** (I'll do this next—updated for v0.4.0 plugins)
2. **Record 5 Greenfield Demos** (15-20 min total)
3. **Record EasyChamp Brownfield** (4 min)
4. **Film Intro/Outro** (5 min)
5. **Edit Together** (1-2 days)
6. **Prepare Cross-Post Content** (Twitter thread, Reddit post, HN submission)

---

## SUCCESS METRICS

**Week 1 Goals**:
- 10K views
- 1K GitHub stars
- 100+ comments
- 3+ community plugins started

**Month 1 Goals**:
- 50K views
- 5K stars
- Featured in 2+ podcasts
- 1,000+ projects using SpecWeave

**Viral Indicators**:
- Den Delimarsky responds (massive credibility boost)
- BMAD creator responds (controversy = engagement)
- Picked up by Hacker News (top 10)
- ThePrimeagen or Theo react (instant 100K views)

---

**READY TO FILM?** Let's build the diagrams next.
