---
name: spec-driven-brainstorming
description: Refines rough ideas into spec-ready designs through structured Socratic questioning, alternative exploration, and incremental validation. Use BEFORE creating increments - transforms vague concepts into clear requirements. Activates for: brainstorm, explore idea, refine concept, design thinking, what should I build, help me think through, ultrathink design, deep thinking, architecture exploration.
---

# Spec-Driven Brainstorming

## Overview

Transform rough ideas into specification-ready designs through structured questioning and alternative exploration, preparing them for SpecWeave's increment workflow.

**Core principle:** Ask questions to understand, explore alternatives, validate design incrementally, then create specs.

**Announce at start:** "I'm using spec-driven brainstorming to refine your idea before creating the SpecWeave increment."

**🧠 Ultrathink Mode:** For complex designs requiring deep reasoning (31,999 thinking tokens), ask: "Can you **ultrathink** this design?" to enable extended analysis.

## Quick Reference

| Phase | Key Activities | Tool Usage | Output |
|-------|---------------|------------|--------|
| **1. Understanding** | Socratic questioning (one at a time) | AskUserQuestion for choices | Purpose, constraints, success criteria |
| **2. Tech Stack Detection** | Identify existing/desired technologies | Grep/Read existing code | Framework-specific guidance |
| **3. Exploration** | Propose 2-3 architectural approaches | AskUserQuestion with trade-offs | Architecture options evaluated |
| **4. Design Validation** | Present design in 250-word sections | Open-ended validation | Complete, validated design |
| **5. SpecWeave Handoff** | Create increment with validated design | increment-planner skill | spec.md, plan.md, tests.md |

## The Process

Track your progress with this checklist:

```
Brainstorming Progress:
- [ ] Phase 1: Understanding (purpose, constraints, criteria gathered)
- [ ] Phase 2: Tech Stack Detection (technologies identified)
- [ ] Phase 3: Exploration (2-3 approaches proposed and evaluated)
- [ ] Phase 4: Design Validation (design validated in sections)
- [ ] Phase 5: SpecWeave Handoff (increment created with specs)
```

### Phase 1: Understanding

**Goal:** Gather requirements through Socratic questioning

**Activities:**
- Check current project state (Glob for existing code structure)
- Ask **ONE question at a time** to refine the idea
- **Use AskUserQuestion tool** when presenting 2-4 structured choices
- Gather: Purpose, user needs, constraints, success criteria, non-functional requirements

**Example using AskUserQuestion:**
```
Question: "What's the primary goal of this feature?"
Options:
  - "User-facing functionality" (UI/UX focus, needs frontend + backend)
  - "Backend API/service" (Integration focus, no UI needed)
  - "Infrastructure/DevOps" (Platform capability, deployment-focused)
  - "Data processing/analytics" (Batch/stream processing, data-centric)
```

**Critical Guidelines:**
- ✅ Ask about user problems (WHY) before solutions (HOW)
- ✅ Identify constraints early (budget, timeline, team size)
- ✅ Discover non-functional requirements (performance, scale, security)
- ❌ Don't assume tech stack yet - that's Phase 2

### Phase 2: Tech Stack Detection

**Goal:** Understand existing/desired technology context

**Activities:**
- **Detect existing tech stack** (if brownfield):
  - Search for `package.json` (Node.js/TypeScript/Next.js)
  - Search for `requirements.txt` or `pyproject.toml` (Python)
  - Search for `.csproj` (.NET)
  - Check framework indicators (React, Vue, Angular, FastAPI, Django, etc.)
- **Ask about desired tech stack** (if greenfield):
  - Use AskUserQuestion to present 2-3 appropriate stacks
  - Consider project goals (web app, API, CLI, mobile, etc.)
- **Activate relevant SpecWeave skills**:
  - `nextjs` for Next.js projects
  - `nodejs-backend` for Node.js APIs
  - `python-backend` for Python backends
  - `dotnet-backend` for .NET/C#
  - `frontend` for React/Vue/Angular

**Example using AskUserQuestion (greenfield):**
```
Question: "Which technology stack fits your team's expertise and project needs?"
Options:
  - "Next.js 14 + TypeScript" (Full-stack React, best for web apps, great DX)
  - "FastAPI + Python" (Fast async APIs, ML-ready, Python ecosystem)
  - "ASP.NET Core + C#" (Enterprise-grade, strong typing, Microsoft stack)
```

### Phase 3: Exploration

**Goal:** Propose and evaluate 2-3 architectural approaches

**Activities:**
- Generate **2-3 distinct approaches** (not just variations)
- For each approach:
  - Core architecture pattern (microservices, monolith, serverless, event-driven)
  - Key components and their responsibilities
  - Trade-offs (complexity vs scalability, cost vs performance)
  - Estimated effort (relative complexity)
  - Technology fit (how well it matches existing stack)
- **Use AskUserQuestion tool** to present approaches as structured choices
- Apply YAGNI (You Aren't Gonna Need It) ruthlessly - remove unnecessary complexity

**Example using AskUserQuestion:**
```
Question: "Which architectural approach should we use for real-time price tracking?"
Options:
  - "Event-driven with WebSockets" (Real-time updates, complex setup, best UX, higher cost)
  - "Polling with REST API" (Simple, predictable, easier to debug, slightly delayed)
  - "Server-Sent Events (SSE)" (One-way real-time, simpler than WebSockets, HTTP-friendly)
```

**🧠 Ultrathink Tip:** For complex architecture decisions with many trade-offs, ask: "Can you **ultrathink** these approaches?" to get deeper analysis (31,999 thinking tokens).

**Critical Guidelines:**
- ✅ Present genuinely different approaches (not just implementation details)
- ✅ Explain trade-offs in business terms (cost, time-to-market, maintenance)
- ✅ Consider existing codebase patterns (consistency matters)
- ❌ Don't overwhelm with >3 options
- ❌ Don't propose over-engineered solutions for simple problems

### Phase 4: Design Validation

**Goal:** Present complete design incrementally and validate each section

**Activities:**
- Present design in **250-word sections** (SpecWeave's spec.md max is 250 lines)
- Cover essential sections:
  - **Architecture Overview:** High-level design pattern chosen
  - **Components:** Key modules/services and their responsibilities
  - **Data Flow:** How information moves through the system
  - **Error Handling:** Failure modes and recovery strategies
  - **Testing Strategy:** How to validate it works (unit, integration, E2E)
  - **Security Considerations:** Authentication, authorization, data protection
  - **Performance & Scale:** Expected load, bottlenecks, optimization approach
- Ask after each section: **"Does this align with your vision?"** (open-ended)
- Use **open-ended questions** here to allow freeform feedback

**Example validation question:**
```
"I've outlined the data flow from price API → WebSocket server → client browser.
Does this approach handle your offline/reconnection scenarios adequately?"
```

**Critical Guidelines:**
- ✅ Present incrementally (don't dump entire design at once)
- ✅ Focus on WHAT and WHY (not implementation details yet)
- ✅ Keep it technology-agnostic where possible (e.g., "message queue" not "RabbitMQ")
- ✅ Reference SpecWeave's validation criteria (testable, measurable, clear)
- ❌ Don't dive into code-level details (that's plan.md's job)

### Phase 5: SpecWeave Handoff

**Goal:** Create SpecWeave increment with validated design

When design is validated, ask: **"Ready to create the SpecWeave increment with this design?"**

When user confirms (any affirmative response):

**Option A: Full Increment Creation (Recommended)**

Announce: "I'm using the increment-planner skill to create the full increment."

**Handoff to increment-planner:**
- Pass validated design from Phase 4
- increment-planner will:
  1. Invoke **PM agent** to create `.specweave/docs/internal/strategy/` documentation
  2. Invoke **Architect agent** to create `.specweave/docs/internal/architecture/` documentation
  3. Create `.specweave/increments/0001-feature-name/` with:
     - `spec.md` (WHAT & WHY - references strategy docs)
     - `plan.md` (HOW - references architecture docs)
     - `tasks.md` (implementation checklist)
     - `tests.md` (test strategy and cases)
     - `context-manifest.yaml` (selective loading for 70%+ token reduction)

**Option B: Quick Increment (Fast Start)**

Announce: "I'm creating a quick-start increment. We can expand documentation later."

**Direct creation** (for rapid prototyping):
- Create `.specweave/increments/0001-feature-name/` directory
- Write `spec.md` with validated design (WHAT & WHY)
- Write basic `plan.md` outline (HOW - to be expanded)
- Write `tasks.md` checklist
- Write `tests.md` with acceptance criteria
- Create `context-manifest.yaml` with minimal context

**🔄 Follow-up:** After quick increment, documentation can be expanded incrementally as implementation proceeds.

## Question Patterns

### When to Use AskUserQuestion Tool

**Use AskUserQuestion for:**
- Phase 1: Clarifying questions with 2-4 clear options (project type, goals)
- Phase 2: Tech stack selection (2-3 technology options)
- Phase 3: Architectural approach selection (2-3 distinct approaches)
- Any decision with mutually exclusive choices
- When options have clear trade-offs to explain

**Benefits:**
- Structured presentation with descriptions
- Clear trade-off visibility
- Forces explicit choice (prevents vague "maybe both" responses)
- Tracks decision history for specs

### When to Use Open-Ended Questions

**Use open-ended questions for:**
- Phase 1: When gathering nuanced requirements ("What problem are you solving?")
- Phase 4: Design validation ("Does this handle your use case?")
- When you need detailed feedback or explanation
- When user should describe their own context
- When structured options would limit creative input

**Example decision flow:**
- "What authentication method?" → Use AskUserQuestion (OAuth, JWT, sessions)
- "Does this design meet your security needs?" → Open-ended (validation)

## When to Revisit Earlier Phases

**You can and should go backward when:**
- User reveals new constraint during Phase 3 or 4 → Return to Phase 1
- Tech stack discovery reveals misalignment → Return to Phase 2
- Validation shows fundamental gap in requirements → Return to Phase 1
- User questions approach during Phase 4 → Return to Phase 3
- Something doesn't make sense → Go back and clarify

**Example flow diagram:**
```
New constraint revealed?
  ├─ Yes → Return to Phase 1 (re-understand requirements)
  └─ No → Continue
     │
     Tech stack misalignment?
       ├─ Yes → Return to Phase 2 (re-detect or choose stack)
       └─ No → Continue
          │
          Approach questioned?
            ├─ Yes → Return to Phase 3 (re-explore alternatives)
            └─ No → Continue to Phase 4
```

**Don't force forward linearly** when going backward would give better results.

## Key Principles

| Principle | Application |
|-----------|-------------|
| **One question at a time** | Phase 1: Single question per message in Understanding phase |
| **Structured choices** | Use AskUserQuestion for 2-4 options with clear trade-offs |
| **Tech stack awareness** | Phase 2: Detect existing or choose appropriate technologies |
| **YAGNI ruthlessly** | Remove unnecessary complexity from ALL designs |
| **Explore alternatives** | Always propose 2-3 approaches before settling |
| **Incremental validation** | Present design in 250-word sections, validate each |
| **Flexible progression** | Go backward when needed - flexibility > rigidity |
| **SpecWeave integration** | End with increment creation, not just design document |
| **Ultrathink for complexity** | Use "ultrathink" keyword for deep reasoning (31,999 tokens) |

## Integration with SpecWeave

### Relationship to Other Skills

**spec-driven-brainstorming → increment-planner**
- Brainstorming refines rough idea → validated design
- increment-planner takes validated design → creates increment
- PM agent creates strategy docs (`.specweave/docs/internal/strategy/`)
- Architect agent creates architecture docs (`.specweave/docs/internal/architecture/`)

**When to use spec-driven-brainstorming:**
- ✅ User has vague/rough idea needing exploration
- ✅ Multiple approaches need evaluation
- ✅ Requirements need clarification through questioning
- ✅ Complex design needing deep thinking ("ultrathink")

**When to skip to increment-planner:**
- ✅ User has clear, well-defined requirements
- ✅ Tech stack is obvious from existing code
- ✅ Solution approach is straightforward
- ✅ No alternatives need exploration

### Relationship to SpecWeave Agents

**This skill orchestrates:**
- **No agents directly** (focuses on user dialogue)
- Hands off to `increment-planner` which invokes:
  - `pm` agent (requirements, user stories)
  - `architect` agent (technical design, ADRs)
  - `qa-lead` agent (test strategy)

### Documentation Flow

```
spec-driven-brainstorming (this skill)
  ↓ (validated design)
increment-planner skill
  ↓ (orchestration)
├─ PM Agent → .specweave/docs/internal/strategy/
│   ├── overview.md (product vision)
│   ├── requirements.md (FR-001, NFR-001)
│   └── user-stories.md (US1, US2, US3)
│
├─ Architect Agent → .specweave/docs/internal/architecture/
│   ├── system-design.md (HLD)
│   ├── component-design.md (LLD)
│   └── adr/0001-decision.md (ADRs)
│
└─ Increment Files → .specweave/increments/0001-feature/
    ├── spec.md (summary, references strategy)
    ├── plan.md (summary, references architecture)
    ├── tasks.md (implementation checklist)
    ├── tests.md (test strategy)
    └── context-manifest.yaml (selective loading)
```

## Ultrathink Deep Reasoning Mode

**What is Ultrathink?**
- Claude Code feature that allocates **31,999 thinking tokens** for complex reasoning
- Enables deeper analysis, exploration of edge cases, and nuanced trade-off evaluation
- Most useful for architecture decisions, security considerations, and complex system design

**When to use Ultrathink:**
- Complex architecture with many trade-offs
- Security-critical design decisions
- Performance/scale optimization challenges
- Novel problem domains requiring creative solutions
- Integrating multiple systems with constraints

**How to activate:**
Ask user: "Would you like me to **ultrathink** this design?" or suggest: "This seems complex - let me **ultrathink** the architecture options."

**Other thinking modes:**
- `think` - 4,000 tokens (simple problems)
- `megathink` - 10,000 tokens (moderate complexity)
- `ultrathink` - 31,999 tokens (high complexity)

**Example usage:**
```
User: "I need to design a distributed caching system that handles 100K requests/sec"
Assistant: "This is a complex distributed systems problem with many trade-offs.
Let me **ultrathink** the architecture approaches to evaluate:
- Consistency vs availability trade-offs (CAP theorem)
- Cache invalidation strategies
- Horizontal scaling patterns
- Network topology and latency considerations
- Cost optimization at scale"
```

## Examples

### Example 1: Vague Idea → Validated Design

**User:** "I want to build something with crypto prices"

**Assistant (Phase 1 - Understanding):**
"I'm using spec-driven brainstorming to refine your idea. Let me understand what you're trying to achieve."

[Asks ONE question at a time:]
- "What's your primary goal?" (AskUserQuestion: tracking, trading, analysis, alerts)
- "Who are the users?" (yourself, team, public)
- "What's your timeline?" (weekend project, production app)
- "Any budget/infrastructure constraints?" (free tier, cloud budget)

**Assistant (Phase 2 - Tech Stack):**
[Scans for package.json, finds Next.js project]
"I see you have Next.js 14 in your project. Great - we can build on that."

**Assistant (Phase 3 - Exploration):**
"Let me propose three approaches:" (AskUserQuestion with 3 options)
1. Event-driven with WebSockets (real-time, complex)
2. Polling with REST API (simple, delayed)
3. Server-Sent Events (middle ground)

[User selects SSE]

**Assistant (Phase 4 - Design Validation):**
[Presents architecture in 250-word sections]
- Component overview → "Does this make sense?"
- Data flow → "Does this handle reconnection?"
- Testing strategy → "Does this cover your needs?"

**Assistant (Phase 5 - SpecWeave Handoff):**
"Design validated! Ready to create the SpecWeave increment?"
[User confirms]
"I'm using the increment-planner skill to create the full increment with PM and Architect agents."

### Example 2: Complex Problem → Ultrathink

**User:** "I need a distributed task queue with exactly-once delivery guarantees"

**Assistant:**
"This is a complex distributed systems problem with many trade-offs. Let me **ultrathink** the architecture approaches to ensure we consider all the edge cases around consistency, failure modes, and exactly-once semantics."

[Engages ultrathink mode for deep analysis of distributed systems patterns]

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What to Do Instead |
|--------------|--------------|-------------------|
| Asking 5 questions at once | Overwhelming, unclear priorities | ONE question at a time in Phase 1 |
| Jumping to implementation | Skips validation, no alternatives explored | Follow Phase 1→2→3→4→5 progression |
| Presenting only 1 approach | No trade-off evaluation | Always propose 2-3 alternatives |
| Skipping tech stack detection | Mismatch with existing codebase | Phase 2: Scan existing or ask |
| Design dump (no validation) | User overwhelmed, no feedback | 250-word sections with validation |
| Creating files directly | Bypasses SpecWeave structure | Use increment-planner handoff |
| Over-engineering simple tasks | Unnecessary complexity | Apply YAGNI ruthlessly |

## Summary

**spec-driven-brainstorming** prepares rough ideas for SpecWeave's spec-driven workflow:

1. ✅ **Socratic questioning** refines vague concepts
2. ✅ **Tech stack awareness** ensures alignment
3. ✅ **Alternative exploration** evaluates trade-offs
4. ✅ **Incremental validation** confirms design
5. ✅ **Ultrathink mode** handles complex reasoning
6. ✅ **SpecWeave integration** creates increment with validated design
7. ✅ **Flexible progression** allows revisiting earlier phases

**When to use this skill:**
- Rough idea needing refinement
- Multiple approaches to evaluate
- Complex design requiring deep thinking
- Requirements unclear and need Socratic questioning

**When to skip to increment-planner:**
- Clear requirements already defined
- Obvious solution approach
- No alternatives need exploration

**End state:** Validated design ready for SpecWeave increment creation with PM/Architect agent orchestration.
