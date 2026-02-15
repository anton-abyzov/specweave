# Philosophy

SpecWeave is built on a set of core principles that guide every design decision. Understanding these principles will help you get the most out of SpecWeave.

## Core Principles

### 1. Plan as Source of Truth

**The plan is the source of truth. Code is a derivative.**

Every line of code traces back to a specification. The three-file structure (spec.md, plan.md, tasks.md) is not just documentation — it is the **single source of truth** that drives implementation:

```
Plan → Code (always)
Code → Plan (never)
```

**What this means in practice:**
- **Before implementing**: Read and understand the current plan
- **Mid-implementation discovery**: If you find a better approach, **stop coding**, update the plan first, then resume implementation based on the updated plan
- **Bug fixes**: Assess impact on the plan before writing a fix — update tasks.md if the fix changes scope
- **Code and plan must always match**: If they diverge, update the plan first, then adjust code to follow — never retrofit the plan to match code you've already written

**Why this matters**: Plans are cheap to change. Code is expensive to change. By keeping the plan as the authoritative source, you catch design problems early (in the plan) rather than late (in code review or production). AI agents working with Claude Code are most efficient in plan mode — skipping planning wastes more tokens on rework than planning costs upfront.

### 2. Specification Before Implementation

**Define WHAT and WHY before HOW.**

While Principle 1 governs the *ongoing relationship* between plan and code, this principle governs the *order of work*. Traditional development often jumps straight to implementation without clear specifications. This leads to:
- Unclear requirements
- Scope creep
- Missing features
- Undocumented systems

SpecWeave enforces specification-first development:

\`\`\`
Specification → Architecture → Implementation → Testing
\`\`\`

### 3. Append-Only Snapshots + Living Documentation

**Historical audit trails + current state = complete context.**

**SpecWeave's revolutionary approach**: Most documentation systems force you to choose between historical context (version control) or current documentation (wikis). SpecWeave gives you BOTH simultaneously.

#### The Dual-Documentation System

**Append-Only Increments** (Never Modified)
- Each increment is an immutable snapshot of a feature
- Contains: spec, plan, tasks, tests, logs, reports
- Provides complete audit trail and historical context
- Like [Git](/docs/glossary/terms/git) commits for specifications

**Living Documentation** (Always Current)
- Auto-updated by Claude hooks after each task
- Reflects actual code state
- Organized by purpose (strategy, architecture, operations)
- Single source of truth for current system

#### Why Both Are Essential

| Need | Source | Example |
|------|--------|---------|
| "Why was this built?" | Increment snapshot | `.specweave/increments/0001-feature/spec.md` |
| "What's the current state?" | Living docs | `.specweave/docs/internal/strategy/feature.md` |
| "How did it evolve?" | All related increments | Search increments 0001, 0005, 0012 |
| "Compliance proof?" | Increment audit trail | Complete snapshots with timestamps |

#### Key Properties

- **Append-only increments**: Never modified after completion (like event sourcing)
- **Auto-updated docs**: Hooks maintain current state automatically
- **Version controlled**: Both stored in [Git](/docs/glossary/terms/git)
- **Searchable**: Find historical context or current state
- **Audit-ready**: Complete paper trail for compliance ([SOC 2](/docs/glossary/terms/soc2), [HIPAA](/docs/glossary/terms/hipaa), [FDA](/docs/glossary/terms/fda))
- **Context recovery**: Understand decisions from months/years ago

**Think of it as "Git for Specifications"**:
- Increments = commits (snapshots in time)
- Living docs = working directory (current state)
- Both essential for different purposes

### 4. Context Precision

**Load only what's needed (70%+ token reduction).**

Loading entire specifications wastes tokens and money. SpecWeave uses:
- **Progressive disclosure**: Skills metadata loads first (~75 tokens), full content on-demand
- **CLAUDE.md guidance**: Teaches Claude WHERE to look and HOW to search living docs
- **Explicit loading**: `/sw:docs <topic>` loads relevant docs into conversation
- **Scalable**: Works with 10 pages or 1000+ pages

### 5. Extensible Skills (Open/Closed Principle)

**Skills are transparent programs you can customize without forking.**

Unlike traditional software where behavior is compiled and locked, SpecWeave skills follow the **Open/Closed Principle** from SOLID design:

**Closed for modification**
- Skill logic defined in `SKILL.md` (stable core)
- Don't fork or edit skill source
- Predictable, tested behavior

**Open for extension**
- Add YOUR rules in `.specweave/skill-memories/*.md`
- Override defaults without touching source
- Extend logic the original developer never imagined

**Self-improving**
- Corrections during sessions → permanent knowledge
- Claude reads SKILL.md + your skill-memories
- Auto-learning enabled with `/sw:reflect-on`

**Example: Customizing the Frontend Skill**

```markdown
# .specweave/skill-memories/frontend.md

### Component Preferences
- Always use our Button component from @/components/ui
- Never use inline styles — Tailwind utilities only

### Form Handling
- React Hook Form + Zod validation
- Display errors with toast notifications, not inline

### Custom Logic
When generating components:
1. Check design system directory first
2. Use composition over prop drilling
3. Extract to custom hooks if logic >50 lines
```

Next session, Claude automatically follows these rules — you've **programmed the skill** to match your project's needs.

**Traditional Tools vs SpecWeave:**

| Tool | Behavior |
|------|----------|
| **GitHub Copilot** | Black box — can't customize reasoning |
| **Cursor** | Proprietary — take it or leave it |
| **SpecWeave** | Transparent SKILL.md + customizable skill-memories |

**Why this matters:**
- 🎯 **No vendor lock-in** — You control behavior
- 🧠 **Knowledge compounds** — Corrections persist forever
- 🔍 **Full transparency** — See exactly what skills do
- 🎨 **Infinite extensibility** — Add logic developers never planned

**Skills as Programs, Not Prompts**

Think of skill-memories as "runtime configuration" for Claude's expertise:
- `SKILL.md` = compiled program (closed)
- `skill-memories/*.md` = your config file (open)
- Claude reads both and applies your overrides

This is the power of programmable AI — you're not using tools, you're **programming the tools themselves**.

**For skill developers:** Design skills with clear extension points. Document what users can customize. See [Skill Development Guidelines](https://github.com/anton-abyzov/specweave#skill-development-guidelines).

### 6. Test-Validated Features

**Every feature proven through automated tests.**

Four levels of testing ensure quality:
1. Specification acceptance criteria (AC-IDs like AC-US1-01)
2. Feature test strategy (embedded in tasks.md)
3. Skill test cases (YAML)
4. Code tests ([E2E](/docs/glossary/terms/e2e), unit, integration)

**Truth-telling requirement**: E2E tests MUST tell the truth—no false positives.

### 7. Regression Prevention

**Document existing code before modification.**

Modifying [brownfield](/docs/glossary/terms/brownfield) code without documentation is dangerous. SpecWeave enforces:

1. Analyze current implementation
2. Generate retroactive documentation
3. Create baseline tests
4. User reviews and approves
5. Implement modifications safely

### 8. Scalable from Solo to Enterprise

**Modular structure that grows with project size.**

Whether you're a solo developer or a 100-person team, SpecWeave scales:

- **Solo/Startup**: Start with 10-20 pages, grow incrementally
- **Enterprise**: Create 500-600+ pages upfront
- **Both approaches supported**: Comprehensive or incremental

### 9. Auto-Role Routing

**Skills detect expertise automatically.**

No manual agent selection—SpecWeave routes intelligently:

\`\`\`
User: "Create payment integration"
→ specweave-detector activates
→ Routes to increment skill
→ Invokes PM, Architect, Security agents
→ Generates complete specification
\`\`\`

>90% routing accuracy.

### 10. Closed-Loop Validation

**[E2E](/docs/glossary/terms/e2e) tests must tell the truth (no false positives).**

Test validation is not enough—tests must be **truthful**:

- ✅ If test passes → feature actually works
- ✅ If test fails → exactly what failed
- ❌ No masking failures
- ❌ No assuming success without verification

## Design Decisions

### Why Markdown?

**Human-readable, version-controllable, AI-friendly.**

- [Git](/docs/glossary/terms/git)-friendly (easy diffs)
- Tooling-agnostic (works anywhere)
- Readable without rendering
- AI can parse and generate
- Supports Mermaid diagrams
- No vendor lock-in

### Why Mermaid Diagrams?

**Diagrams-as-code, version controlled, maintainable.**

- Text-based (git-friendly)
- No binary files
- Easy to update
- Renders beautifully
- C4 Model support
- No external tools required

### Why C4 Model?

**Industry-standard architecture visualization.**

- Clear hierarchy (Context → Container → Component → Code)
- Scales to enterprise systems
- Well-documented methodology
- Tool support (Mermaid, PlantUML, Structurizr)
- Familiar to architects

### Why Auto-Numbering?

**Prevents merge conflicts, maintains order.**

- Increments: `0001-feature-name`
- ADRs: `0001-decision-title.md`
- RFCs: `0001-proposal-title.md`
- Test cases: `TC-0001`

No manual numbering = no conflicts.

### Why Framework-Agnostic?

**Works with ANY tech stack.**

SpecWeave doesn't impose technology choices:
- Detects your stack ([TypeScript](/docs/glossary/terms/typescript), Python, Go, etc.)
- Adapts commands to your framework
- Generates stack-specific examples
- No vendor lock-in

### Why Claude Code?

**Best AI coding assistant for production software.**

- Opus 4.5: Best-in-class for coding and complex agents
- Agentic workflows: Multi-agent orchestration
- Tool use: Read, Write, Edit, Bash, etc.
- Context awareness: Large context window
- Production-ready: Not a toy

## Documentation Approaches

SpecWeave supports TWO valid approaches:

### Approach 1: Comprehensive Upfront (Enterprise)

**When to use**:
- Enterprise systems with complex requirements
- Regulated industries (healthcare, finance, government)
- Large teams (10+ developers)
- Production systems requiring complete spec before implementation

**Characteristics**:
- 500-600+ page specifications created before development
- Complete architecture documentation upfront
- All ADRs documented in advance

**Benefits**:
- Complete clarity before code is written
- Easier team coordination
- Better for regulated environments

### Approach 2: Incremental/Evolutionary (Startup)

**When to use**:
- Startups with evolving requirements
- Exploratory projects
- Small teams (1-5 developers)
- MVPs and prototypes

**Characteristics**:
- Start with high-level overview (10-20 pages)
- Build documentation as you go (like Microsoft)
- Add modules/specs as features are planned

**Benefits**:
- Faster time-to-first-code
- Adapts to changing requirements
- Less documentation maintenance

**Both approaches are equally valid!** Choose based on your project needs.

## Workflow Philosophy

### [Greenfield](/docs/glossary/terms/greenfield) Projects

1. Choose documentation approach (comprehensive or incremental)
2. Create specifications (strategy docs)
3. Design architecture (ADRs, system design)
4. Plan increments
5. Implement with context precision
6. Tests validate automatically

### [Brownfield](/docs/glossary/terms/brownfield) Projects

1. **Step 0**: Merge existing CLAUDE.md (if exists)
2. **Step 1**: Analyze existing code
3. **Step 2**: Document related modules
4. **Step 3**: Create tests for current behavior
5. **Step 4**: Plan modifications
6. **Step 5**: Implement with regression monitoring

## Anti-Patterns

### ❌ What SpecWeave Prevents

1. **Vibe Coding**: Implementing without specifications
2. **Plan Drift**: Code diverging from the plan without updating specs first
3. **Documentation Divergence**: Code and docs out of sync
4. **Context Bloat**: Loading entire specs unnecessarily
5. **Regression Bugs**: Modifying code without tests
6. **Tech Debt**: Missing architecture decisions
7. **False Confidence**: Tests that lie about functionality

### ✅ What SpecWeave Enforces

1. **Plan as Source of Truth**: Plan drives code, never the reverse
2. **Specification-First**: Always define before implementing
3. **Living Documentation**: Auto-update via hooks
4. **Context Precision**: Load only what's needed
5. **Regression Prevention**: Document before modifying
6. **Architecture Clarity**: ADRs for all major decisions
7. **Truth-Telling Tests**: [E2E](/docs/glossary/terms/e2e) tests must be honest

## Success Metrics

How do you know SpecWeave is working?

### Code Quality
- ✅ >80% test coverage for critical paths
- ✅ All P1 tasks have specifications
- ✅ All ADRs documented
- ✅ 0% false positive tests

### Efficiency
- ✅ 70%+ token reduction (context precision)
- ✅ >90% routing accuracy
- ✅ &lt;5 minutes to find relevant specs
- ✅ Auto-documentation updates

### Team Collaboration
- ✅ New developers onboard in &lt;1 day
- ✅ Specifications are single source of truth
- ✅ No "tribal knowledge" silos
- ✅ Clear decision history (ADRs)

### Production Readiness
- ✅ All features have specifications
- ✅ All features have tests
- ✅ All features have documentation
- ✅ Regression tests before modifications

---

**Ready to get started?**

- [Quick Start](/docs/getting-started/) - Get up and running in 5 minutes
- [Core Concepts](/docs/guides/core-concepts/what-is-an-increment) - Understand the fundamentals

**Previous**: [Key Features](/docs/overview/features) ←
