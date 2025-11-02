---
name: project-kickstarter
description: Proactively detects product/project descriptions and guides users through SpecWeave increment planning. Activates when user provides product name, features, tech stack, timeline, or problem description. Keywords: project, product, SaaS, app, MVP, build, new project, features, tech stack, core functionality, monetization, timeline, I want to build, let's build, quick build, core features.
---

# Project Kickstarter - Generic Pattern-Based Auto-Detection

## Purpose

The project-kickstarter skill is a **generic, pattern-based detection system** that:
- ✅ Works for ANY product/project (not hardcoded for specific products)
- ✅ Detects structural patterns (features list, tech stack, timeline, etc.)
- ✅ Integrates with specweave-detector to check SpecWeave context
- ✅ Routes to appropriate SpecWeave workflow automatically

**Not product-specific!** This skill recognizes the STRUCTURE of product descriptions, not specific products.

## When to Activate

**CRITICAL CONTEXT**: When working in a **SpecWeave-initialized project** (`.specweave/` directory exists), ANY product/feature description MUST be interpreted as "create an increment for this."

This skill activates when:

1. **User is in SpecWeave project** (.specweave/ directory exists) AND
2. **Message contains 3+ of these signals**:
   - **Project Name/Description**: "Project: RosterSync", "I want to build X"
   - **Features List**: Bullet points or numbered list of features (3+ items)
   - **Tech Stack**: Languages, frameworks, databases, platforms mentioned
   - **Timeline/Scope**: "MVP", "2 weeks", "Phase 1", "Quick build"
   - **Problem Statement**: "For teams...", "Helps users...", "Solves..."
   - **Business Model**: "Freemium", "$X/mo", "B2B", "Consumer"

**Key Insight**: If user is in a SpecWeave folder and describes a product, they're implicitly asking "create a SpecWeave increment for this."

## Pattern Recognition

**SpecWeave Context Multiplier**: When `.specweave/` exists, apply +2 confidence boost to signal count.

### High Confidence (5-6 signals OR 3-4 signals + SpecWeave context) → Auto-Route

**Example 1: In SpecWeave project**
```
Working directory: /project-with-specweave/ (.specweave/ exists)

User: "Project: RosterSync - Team scheduling SaaS
Core features: roster management, availability calendar, scheduling
Tech stack: .NET 8, Next.js 14+, PostgreSQL
MVP time: 2-3 weeks
Monetization: Freemium ($10/mo)"

Detected signals: ✅ Name, ✅ Features, ✅ Tech, ✅ Timeline, ✅ Business (5 signals)
SpecWeave context: ✅ +2 bonus
Adjusted confidence: 5 + 2 = 7/6 = 100% → AUTO-ROUTE to increment planning
```

**Example 2: In SpecWeave project (fewer signals still triggers)**
```
Working directory: /project-with-specweave/ (.specweave/ exists)

User: "I want to build a task manager with React and Node.js"

Detected signals: ✅ Intent ("build"), ✅ Type ("task manager"), ✅ Tech stack (3 signals)
SpecWeave context: ✅ +2 bonus
Adjusted confidence: 3 + 2 = 5/6 = 83% → AUTO-ROUTE to increment planning
```

### Medium Confidence (3-4 signals, no SpecWeave context) → Clarify Then Route
```
Working directory: /regular-project/ (no .specweave/)

User: "I want to build a task manager with React and Node.js"

Detected signals: ✅ Intent ("build"), ✅ Type ("task manager"), ✅ Tech stack
SpecWeave context: ❌ No bonus
Confidence: 3/6 = 50% → ASK 1-2 clarifying questions, THEN route
```

### Low Confidence (<3 signals) → Don't Activate
```
User: "What do you think about using PostgreSQL?"

Detected signals: ✅ Tech mention
Confidence: 1/6 = 17% → Regular conversation (not product planning)
```

## Workflow

### Step 1: Detect Pattern
Scan user message for the 6 signals above.

### Step 2: Calculate Confidence
- 5-6 signals = High (>80%)
- 3-4 signals = Medium (50-80%)
- 0-2 signals = Low (<50%)

### Step 3: Route Based on Confidence

**High Confidence:**
```
"I see you're describing [ProjectName] - a [type] project with [key features].

SpecWeave works best when we start with a proper increment plan. I'm going to:
1. Clarify any ambiguities (1-2 questions max)
2. Create a SpecWeave increment with complete specs

Let's start: [Ask 1 clarifying question if needed, otherwise proceed]"

[Automatically invoke /specweave.inc or spec-driven-brainstorming]
```

**Medium Confidence:**
```
"It looks like you're planning a new project. To help you best, I need to understand:
1. [Ask about missing signals: features? timeline? tech stack?]

Once I have these details, I'll guide you through SpecWeave's increment planning process."

[Wait for response, then route to increment-planner or spec-driven-brainstorming]
```

**Low Confidence:**
Don't activate. Let other skills handle it.

### Step 4: Hand Off

Based on clarity of requirements:

- **Clear requirements** (detailed features, tech stack known) → `/specweave.inc` directly
- **Unclear requirements** (vague features, tech stack uncertain) → `spec-driven-brainstorming` first

## Examples

### Example 1: Auto-Route (High Confidence)

**User:**
```
Project: RosterSync - Team scheduling & availability management SaaS
Quick build for sports teams, esports orgs, or any team-based groups to manage player/member availability, practice schedules, and lineup confirmations.
Core features:
- Team roster management
- Availability calendar (who's available when)
- Event/practice scheduling with auto-notifications
- Simple lineup builder
- Basic analytics on attendance patterns

Tech stack:
- .NET 8 Web API (backend)
- Next.js 14+ (frontend with App Router)
- PostgreSQL (local dev, easy cloud migration)
- Auth: .NET Identity or simple JWT

MVP time: 2-3 weeks
Monetization: Freemium (5 teams free, $10/mo for unlimited)
```

**project-kickstarter detects:**
- ✅ Name: "RosterSync"
- ✅ Features: 5 core features listed
- ✅ Tech stack: .NET 8, Next.js 14+, PostgreSQL
- ✅ Timeline: "2-3 weeks"
- ✅ Problem: "sports teams, esports orgs"
- ✅ Business model: "Freemium ($10/mo)"

**Confidence:** 6/6 = 100% → **AUTO-ROUTE**

**Response:**
```
Perfect! I can see you have a well-defined product concept for RosterSync - a team scheduling SaaS.

SpecWeave works by creating a complete increment specification first (spec.md, plan.md, tasks.md, tests.md), then implementing incrementally.

I'm going to use SpecWeave's increment planning process to:
1. Create the product specification (WHAT & WHY)
2. Design the technical architecture (HOW)
3. Break down implementation tasks (STEPS)
4. Define test strategy

Since you've provided the tech stack (.NET 8 + Next.js 14+), I'll structure this as a full-stack increment.

Creating increment now with /specweave.inc...

[Invokes /specweave.inc "RosterSync team scheduling SaaS"]
```

### Example 2: Clarify Then Route (Medium Confidence)

**User:**
```
I want to build a price tracking system that monitors crypto prices in real-time
```

**project-kickstarter detects:**
- ✅ Intent: "I want to build"
- ✅ Type: "price tracking system"
- ✅ Domain: "crypto prices"
- ❌ Features: Not specified
- ❌ Tech stack: Not specified
- ❌ Timeline: Not specified

**Confidence:** 3/6 = 50% → **CLARIFY THEN ROUTE**

**Response:**
```
Great! A real-time crypto price tracking system is a solid project.

To help you plan this properly, I need a bit more context:

1. **Features:** Beyond real-time price monitoring, what should it do?
   - Just display prices, or also alerts/notifications?
   - Historical data tracking?
   - Portfolio tracking?
   - Price predictions/analysis?

2. **Tech Stack:** Do you have a preferred stack, or should I recommend one?
   - Frontend: React, Next.js, Vue, or other?
   - Backend: Node.js, Python, .NET, or other?
   - Database: PostgreSQL, MongoDB, Redis?

3. **Timeline/Scope:** Is this a quick MVP or a production-ready system?

Please share what you have in mind, and I'll create a complete SpecWeave increment plan for you.
```

### Example 3: Don't Activate (Low Confidence)

**User:**
```
What do you think about using PostgreSQL vs MongoDB for this project?
```

**project-kickstarter detects:**
- ✅ Tech mention: "PostgreSQL", "MongoDB"
- ❌ Project name: Not mentioned
- ❌ Features: Not mentioned
- ❌ Timeline: Not mentioned
- ❌ Problem: Not mentioned
- ❌ Business: Not mentioned

**Confidence:** 1/6 = 17% → **DON'T ACTIVATE**

This is a technical question, not a project description. Let other skills or general conversation handle it.

## Integration Architecture

**Workflow**:
```
User message → specweave-detector (checks .specweave/ exists)
                    ↓
              project-kickstarter (pattern detection)
                    ↓
         [3+ signals detected?]
                    ↓ YES
         [Calculate confidence with SpecWeave context bonus]
                    ↓
         [Route to /specweave.inc or spec-driven-brainstorming]
```

**Calls:**
- `specweave-detector` - Checks if .specweave/ directory exists (SpecWeave context)
- `/specweave.inc` - For clear requirements (high confidence)
- `spec-driven-brainstorming` - For unclear requirements (medium confidence)
- `increment-planner` - Directly if enough detail provided

**Called By:**
- Automatically when pattern detected in SpecWeave folder
- `skill-router` when routing ambiguous "build X" requests

**Key Design**:
- ✅ Generic pattern matching (not product-specific)
- ✅ Context-aware (SpecWeave folder = higher confidence)
- ✅ Confidence-based routing (no false positives)
- ✅ User can opt-out with explicit instructions

## Opt-Out Mechanism

Users can override auto-routing with explicit instructions:
- "Just brainstorm first" → Uses spec-driven-brainstorming
- "Don't plan yet" → Regular conversation
- "Quick discussion" → No automatic routing
- "Let's explore ideas first" → spec-driven-brainstorming

## Success Criteria

- ✅ Users with product descriptions are automatically guided to increment planning
- ✅ No "I forgot to use /specweave.inc" scenarios
- ✅ Confidence >80% routes immediately (no friction)
- ✅ Confidence 50-80% clarifies then routes (1-2 questions max)
- ✅ Confidence <50% doesn't activate (avoids false positives)
- ✅ Users can opt out with explicit instructions

## Related Skills

- **spec-driven-brainstorming**: For unclear requirements needing exploration
- **increment-planner**: Creates the actual increment structure
- **skill-router**: Routes ambiguous requests to appropriate skills

---

This skill solves the "I described my product but SpecWeave didn't help me plan it" problem by proactively detecting project descriptions and routing to increment planning.
