# Spec-Driven Brainstorming Skill

## Overview

The **spec-driven-brainstorming** skill transforms rough, vague ideas into specification-ready designs through structured Socratic questioning, alternative exploration, and incremental validation. It prepares ideas for SpecWeave's increment creation workflow.

## Purpose

This skill bridges the gap between **"I have an idea"** and **"I have a validated design ready for implementation."**

It helps users:
- Clarify vague requirements through targeted questioning
- Explore multiple architectural approaches with trade-offs
- Validate designs incrementally before committing to code
- Make informed technology choices aligned with existing projects
- Leverage deep reasoning (ultrathink) for complex problems
- Create SpecWeave increments with confidence

## Inspired By

This skill is **adapted from** [obra/superpowers brainstorming skill](https://github.com/obra/superpowers/tree/main/skills/brainstorming) and modified for SpecWeave's spec-driven development methodology.

**Key differences from the original:**
- ✅ Integrates with SpecWeave's increment workflow (spec.md, plan.md, context manifests)
- ✅ Includes tech stack detection phase (aligns with existing projects)
- ✅ Incorporates **ultrathink mode** for complex reasoning (31,999 thinking tokens)
- ✅ Adapts file paths to SpecWeave structure (`.specweave/docs/`, `.specweave/increments/`)
- ✅ Hands off to SpecWeave agents (PM, Architect, QA Lead) instead of superpowers sub-skills
- ✅ Supports both full increment creation and quick-start approaches
- ✅ Emphasizes SpecWeave principles (YAGNI, test-validated, context precision)

## When to Use This Skill

### ✅ Use spec-driven-brainstorming when:
- User has a **rough, unclear idea** needing refinement
- Multiple **architectural approaches** need evaluation
- Complex design requiring **deep thinking** (ultrathink)
- Requirements need clarification through **Socratic questioning**
- User says: "I want to build...", "Help me think through...", "What's the best way to..."

### ❌ Skip to increment-planner when:
- User has **clear, well-defined requirements**
- Tech stack is **obvious** from existing code
- Solution approach is **straightforward** (no alternatives needed)
- No exploration or questioning needed

## Activation Triggers

This skill activates automatically when users say:
- "Brainstorm a feature for..."
- "Help me think through this idea"
- "I want to build something with [vague description]"
- "What's the best approach for..."
- "Ultrathink this design" (activates deep reasoning mode)
- "Explore architecture options for..."

## Five-Phase Process

### Phase 1: Understanding
**Goal:** Gather requirements through Socratic questioning

- Ask **ONE question at a time** (not 5 at once!)
- Use **AskUserQuestion tool** for structured choices (2-4 options)
- Gather: purpose, users, constraints, success criteria
- Be flexible: revisit earlier questions if new constraints emerge

**Example:**
```
Q: "What's your primary goal with crypto prices?"
Options:
  - Real-time price tracking dashboard
  - Price alerts and notifications
  - Historical data analysis
  - Automated trading bot
```

### Phase 2: Tech Stack Detection
**Goal:** Understand existing/desired technology context

- **Detect existing tech stack** (brownfield):
  - Scan for `package.json`, `requirements.txt`, `.csproj`
  - Identify frameworks (Next.js, FastAPI, ASP.NET Core)
- **Ask about desired tech stack** (greenfield):
  - Present 2-3 appropriate stacks based on project type
  - Consider team expertise, budget, timeline
- **Activate relevant SpecWeave skills**:
  - `nextjs`, `nodejs-backend`, `python-backend`, `dotnet-backend`, `frontend`

### Phase 3: Exploration
**Goal:** Propose and evaluate 2-3 architectural approaches

- Generate **2-3 distinct approaches** (not just variations)
- For each: architecture pattern, trade-offs, complexity, cost
- Use **AskUserQuestion** to present choices with trade-offs
- Apply **YAGNI ruthlessly** (remove unnecessary complexity)
- For complex problems: **suggest ultrathink mode** (31,999 thinking tokens)

**Example:**
```
Q: "Which approach for real-time updates?"
Options:
  - Event-driven with WebSockets (real-time, complex, $$$)
  - Polling with REST API (simple, delayed, $)
  - Server-Sent Events (middle ground, $$)
```

### Phase 4: Design Validation
**Goal:** Present complete design incrementally and validate

- Present in **250-word sections** (matches SpecWeave's spec.md limit)
- Cover: architecture, components, data flow, error handling, testing, security, performance
- Ask after each section: **"Does this align with your vision?"** (open-ended)
- Use **open-ended questions** for validation (not structured choices)

### Phase 5: SpecWeave Handoff
**Goal:** Create SpecWeave increment with validated design

**Option A: Full Increment Creation** (recommended for production)
- Invoke `increment-planner` skill
- PM agent creates `.specweave/docs/internal/strategy/` documentation
- Architect agent creates `.specweave/docs/internal/architecture/` documentation
- Creates `.specweave/increments/0001-feature/` with spec.md, plan.md, tasks.md, tests.md, context-manifest.yaml

**Option B: Quick Increment** (fast start for personal projects)
- Create increment directory directly
- Write spec.md, basic plan.md outline, tasks.md, tests.md
- Minimal context manifest
- Expand documentation incrementally during implementation

## Ultrathink Mode

**What is ultrathink?**
- Claude Code feature that allocates **31,999 thinking tokens** for deep reasoning
- Enables deeper analysis, edge case exploration, nuanced trade-off evaluation
- Most useful for: complex architecture, security-critical design, distributed systems, novel problems

**When to use ultrathink:**
- Complex distributed systems (e.g., "distributed task queue with exactly-once delivery")
- Security-critical design (e.g., "financial transaction processing with audit trail")
- Performance/scale optimization (e.g., "handle 100K requests/sec")
- Novel problem domains requiring creative solutions

**How to activate:**
- Suggest to user: "This seems complex - let me **ultrathink** the architecture options."
- Or user requests: "Can you **ultrathink** this design?"

**Other thinking modes:**
- `think` - 4,000 tokens (simple problems)
- `megathink` - 10,000 tokens (moderate complexity)
- `ultrathink` - 31,999 tokens (high complexity)

## Integration with SpecWeave

### Relationship to Other Skills

```
spec-driven-brainstorming (this skill)
  ↓ validated design
increment-planner
  ↓ orchestration
├─ PM Agent → .specweave/docs/internal/strategy/
├─ Architect Agent → .specweave/docs/internal/architecture/
└─ Increment Files → .specweave/increments/0001-feature/
```

### Documentation Flow

1. **spec-driven-brainstorming** produces: Validated design (in conversation)
2. **increment-planner** creates: Living docs + increment files
3. **PM agent** writes: Product requirements, user stories, success criteria
4. **Architect agent** writes: System design, component design, ADRs
5. **QA Lead agent** writes: Test strategy, test cases

## Test Cases

This skill includes **3 comprehensive test cases**:

### TC-001: Simple Idea to Validated Design
- **Scenario:** "I want to add user authentication to my app"
- **Focus:** Basic flow, tech stack detection, NextAuth.js integration
- **Phases:** Understanding → Tech Stack → Exploration (3 approaches) → Design Validation → Handoff
- **Complexity:** Low
- **Time:** 10-15 minutes

### TC-002: Complex Problem with Ultrathink Mode
- **Scenario:** "I need a distributed task queue with exactly-once delivery guarantees"
- **Focus:** Deep reasoning, edge case analysis, distributed systems patterns
- **Phases:** Socratic questioning → Tech stack choice → **Ultrathink exploration** → Comprehensive validation → Full increment
- **Complexity:** High (financial systems, compliance, fault tolerance)
- **Time:** 20-30 minutes

### TC-003: Unclear Requirements with Socratic Questioning
- **Scenario:** "I want to build something with crypto prices" (vague!)
- **Focus:** Extracting requirements through dialogue, budget constraints, flexibility
- **Phases:** **6 Socratic questions** → Tech stack detection + database choice → Budget-aware exploration → Validation → Quick increment
- **Complexity:** Medium (requirements gathering)
- **Time:** 15-20 minutes

## Key Principles

| Principle | Application |
|-----------|-------------|
| **One question at a time** | Phase 1: Single question per message |
| **Structured choices** | Use AskUserQuestion for 2-4 options with trade-offs |
| **Tech stack awareness** | Phase 2: Detect existing or choose appropriate technologies |
| **YAGNI ruthlessly** | Remove unnecessary complexity from ALL designs |
| **Explore alternatives** | Always propose 2-3 approaches before settling |
| **Incremental validation** | Present design in 250-word sections, validate each |
| **Flexible progression** | Go backward when needed - flexibility > rigidity |
| **SpecWeave integration** | End with increment creation, not just design document |
| **Ultrathink for complexity** | Use "ultrathink" for deep reasoning (31,999 tokens) |

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What to Do Instead |
|--------------|--------------|-------------------|
| Asking 5 questions at once | Overwhelming, unclear priorities | ONE question at a time |
| Jumping to implementation | Skips validation, no alternatives | Follow Phase 1→2→3→4→5 |
| Presenting only 1 approach | No trade-off evaluation | Always propose 2-3 alternatives |
| Skipping tech stack detection | Mismatch with existing code | Phase 2: Scan or ask |
| Design dump (no validation) | User overwhelmed, no feedback | 250-word sections with validation |
| Creating files directly | Bypasses SpecWeave structure | Use increment-planner handoff |
| Over-engineering simple tasks | Unnecessary complexity | Apply YAGNI ruthlessly |

## Installation

This skill is part of the SpecWeave framework. To install:

```bash
# From SpecWeave project root:
npm run install:skills

# Or install this specific skill to .claude/ (local project):
cp -r src/skills/spec-driven-brainstorming ~/.claude/skills/

# Restart Claude Code after installation
```

## Contributing

This skill is part of the SpecWeave framework. To contribute:

1. **Edit the source**: `src/skills/spec-driven-brainstorming/SKILL.md`
2. **Update test cases**: Add `.yaml` files to `test-cases/` directory
3. **Test the skill**: Use SpecWeave's skill testing framework
4. **Run installation**: `npm run install:skills` to sync to `.claude/`
5. **Create PR**: Follow SpecWeave's contribution guidelines

## License

This skill is part of SpecWeave and licensed under [LICENSE].

**Acknowledgment:** Adapted from [obra/superpowers brainstorming skill](https://github.com/obra/superpowers) by Jesse Vincent. Thank you to the superpowers project for the inspiration and methodology!

## Changelog

### v1.0.0 (2025-01-XX)
- ✅ Initial release
- ✅ Adapted from obra/superpowers brainstorming skill
- ✅ Integrated with SpecWeave increment workflow
- ✅ Added tech stack detection phase
- ✅ Incorporated ultrathink mode for complex reasoning
- ✅ Created 3 comprehensive test cases
- ✅ SpecWeave-specific documentation paths and agent orchestration
