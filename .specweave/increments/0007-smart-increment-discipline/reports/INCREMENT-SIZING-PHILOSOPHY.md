# Increment Sizing Philosophy

**Document**: Understanding increment scale and project management tool mapping
**Created**: 2025-11-03
**Purpose**: Guide for deciding increment size and mapping to external PM tools

---

## Core Insight: Increments Are Scale-Agnostic

**Key Principle**: An increment is a **unit of planned, spec-driven work** - it can be tiny (2 hours) or massive (90% of your app).

The framework doesn't prescribe size. **YOU decide based on**:
- Project complexity
- Team size
- Risk tolerance
- Planning horizon
- External constraints

---

## The Spectrum: Micro to Mega Increments

### Micro Increment (Hours to Days)
**Size**: 2-8 hours
**Example**: "Add search button to navbar"

**When to use**:
- Small bug fixes
- Hotfixes
- Tiny features
- Documentation updates

**PM Tool Mapping**:
- **Jira**: Single Story or Sub-task
- **GitHub Issues**: Single issue
- **Azure DevOps**: Task or User Story
- **Linear**: Single issue

**Spec characteristics**:
```markdown
# Spec: Add Search Button to Navbar

## User Stories
- US1: As a user, I want a search button in the navbar

## Tasks
- T-001: Add button component
- T-002: Wire up onClick handler
- T-003: Add tests

Estimated: 4 hours
```

---

### Small Increment (Days to Week)
**Size**: 1-5 days
**Example**: "Add full-text search feature"

**When to use**:
- Standard features
- Most refactorings
- Integration work
- This is the SpecWeave "sweet spot"

**PM Tool Mapping**:
- **Jira**: Epic (3-5 stories)
- **GitHub Issues**: Issue with task list
- **Azure DevOps**: Feature
- **Linear**: Project milestone

**Spec characteristics**:
```markdown
# Spec: Add Full-Text Search Feature

## User Stories
- US1: Search by keyword
- US2: Search results pagination
- US3: Search filters (date, category)

## Tasks
- 15-25 tasks
- Multiple test cases
- Integration points

Estimated: 3-5 days
```

---

### Medium Increment (Weeks)
**Size**: 1-4 weeks
**Example**: "Build admin dashboard"

**When to use**:
- Complex features
- Multi-system integrations
- Major refactorings
- Platform capabilities

**PM Tool Mapping**:
- **Jira**: Epic or Initiative (10-20 stories)
- **GitHub Issues**: Milestone with multiple issues
- **Azure DevOps**: Feature (multiple user stories)
- **Linear**: Project (multiple issues)

**Spec characteristics**:
```markdown
# Spec: Build Admin Dashboard

## User Stories
- 10-15 user stories
- Multiple subsystems
- API + UI + Database

## Tasks
- 50-100 tasks
- Comprehensive test coverage
- Multiple deployment steps

Estimated: 2-4 weeks
```

---

### Large Increment (Months)
**Size**: 1-3 months
**Example**: "Build authentication system" or "Build entire e-commerce platform"

**When to use**:
- Core platform capabilities
- Greenfield projects (entire app)
- System-wide refactors
- Multi-phase initiatives

**PM Tool Mapping**:
- **Jira**: Initiative or Theme (multiple epics)
- **GitHub Issues**: Multiple milestones
- **Azure DevOps**: Initiative (multiple features)
- **Linear**: Project with multiple cycles

**Spec characteristics**:
```markdown
# Spec: Build E-Commerce Platform

## Phases
- Phase 1: User auth + product catalog (4 weeks)
- Phase 2: Shopping cart + checkout (4 weeks)
- Phase 3: Payment processing + order management (4 weeks)

## User Stories
- 50-100 user stories
- Multiple microservices
- Infrastructure + Backend + Frontend + Mobile

## Tasks
- 500+ tasks
- Extensive test coverage
- Multiple deployment pipelines

Estimated: 3 months (or break into 12 smaller increments!)
```

---

### Mega Increment (90% of App)
**Size**: 3-12 months
**Example**: "Build SaaS platform from scratch"

**When to use**:
- Entire product builds
- Startup MVPs (full scope)
- Platform migrations (lift-and-shift)
- Solo developer with long-term vision

**PM Tool Mapping**:
- **Jira**: Product Roadmap (Year-long initiative)
- **GitHub Issues**: Entire repository
- **Azure DevOps**: Product Backlog
- **Linear**: Annual roadmap

**Spec characteristics**:
```markdown
# Spec: Build SaaS Platform (90% of App)

## Modules
1. Authentication & Authorization (10%)
2. Core Platform (30%)
3. Payment & Billing (15%)
4. Admin Dashboard (10%)
5. User Dashboard (15%)
6. Mobile Apps (10%)
7. Infrastructure (10%)

## Estimated: 6-12 months

## Notes
- Consider breaking into 20-30 smaller increments
- Or keep as one mega increment with phased delivery
```

---

## Who Decides Increment Size?

### Traditional Roles (Problematic)

| Role | Responsibility | Problem |
|------|---------------|---------|
| **Product Owner** | Business value, priorities | Lacks technical depth, over-scopes |
| **Tech Lead** | Technical breakdown, feasibility | Lacks product context, under-scopes |
| **Architect** | System design, dependencies | Too abstract, no delivery focus |
| **Scrum Master** | Process facilitation | No decision authority |

**Result**: Disconnect between business goals and technical reality

---

### Better Role: "Increment Owner"

**Definition**: A **hybrid role** that combines:
- Product Owner's business acumen (what, why, value)
- Tech Lead's technical judgment (how, risk, effort)
- Architect's system thinking (dependencies, design)

**Responsibilities**:
1. **Scope Definition** - Decide increment boundaries
2. **Value Alignment** - Ensure business goals met
3. **Technical Feasibility** - Validate implementation approach
4. **Risk Management** - Assess dependencies, blockers
5. **Quality Standards** - Define done, test coverage
6. **Delivery Commitment** - Own completion timeline

**In Practice**:
- **Small teams (1-5)**: Tech Lead or Senior Developer (they know business context)
- **Medium teams (5-20)**: Product Manager + Tech Lead pair (collaborative)
- **Large teams (20+)**: Dedicated Increment Owner role (full-time)
- **Solo developer**: You wear all hats (SpecWeave helps!)

---

## Mapping to Project Management Tools

### Philosophy: SpecWeave is Tool-Agnostic

**Core Concept**: SpecWeave increments are **internal implementation units**, external PM tools are **external coordination layer**.

**Mapping is many-to-many**:
- 1 increment → 1 Jira epic (common)
- 1 increment → 5 Jira stories (rare, micro increment)
- 1 increment → 1 Jira initiative (rare, mega increment)
- 5 increments → 1 Jira epic (common, breaking down work)

---

### Mapping Strategies

#### Strategy 1: 1:1 Mapping (Simplest)

**Rule**: One increment = One epic (or equivalent)

**Example**:
```
Increment 0005-user-dashboard
  ↕️  1:1 mapping
Jira Epic PROJ-100: User Dashboard
  ├── PROJ-101: Setup dashboard layout
  ├── PROJ-102: Add widgets
  ├── PROJ-103: Real-time updates
  └── PROJ-104: Tests and deployment
```

**Pros**:
- ✅ Simple mental model
- ✅ Easy status sync
- ✅ Clear traceability

**Cons**:
- ❌ Forces increment size = epic size (not flexible)

---

#### Strategy 2: Hierarchical Mapping (Recommended)

**Rule**: Map increments to PM tool hierarchy based on size

| Increment Size | Jira | GitHub | Azure DevOps | Linear |
|---------------|------|--------|--------------|--------|
| **Micro** (hours) | Sub-task | Issue comment | Task | Sub-issue |
| **Small** (days) | Story | Issue | User Story | Issue |
| **Medium** (weeks) | Epic | Milestone | Feature | Project |
| **Large** (months) | Initiative | Multiple milestones | Initiative | Multi-cycle project |
| **Mega** (quarters) | Theme | Repository | Product Backlog | Annual roadmap |

**Example** (Large increment):
```
Increment 0006-llm-native-i18n (4 weeks)
  ↕️  maps to
Jira Initiative PROJ-200: Multilingual Support
  ├── Epic PROJ-201: System Prompt Injection (week 1)
  ├── Epic PROJ-202: In-Session Translation (week 2)
  ├── Epic PROJ-203: Living Docs Auto-Translate (week 3)
  └── Epic PROJ-204: Testing & Rollout (week 4)
```

**Pros**:
- ✅ Flexible (increment size independent of PM tool)
- ✅ Natural hierarchy
- ✅ Better granularity for reporting

**Cons**:
- ❌ More complex mapping
- ❌ Requires discipline to maintain

---

#### Strategy 3: Inverted Mapping (For Large Teams)

**Rule**: External PM tool is source of truth, increments are implementation details

**Example**:
```
Jira Initiative PROJ-300: Q2 E-Commerce Platform
  ├── Epic PROJ-310: Product Catalog
  │    ├── Increment 0007-catalog-api (1 week)
  │    └── Increment 0008-catalog-ui (1 week)
  ├── Epic PROJ-320: Shopping Cart
  │    ├── Increment 0009-cart-backend (1 week)
  │    └── Increment 0010-cart-frontend (1 week)
  └── Epic PROJ-330: Checkout
       ├── Increment 0011-payment-integration (2 weeks)
       └── Increment 0012-order-management (1 week)
```

**Pros**:
- ✅ PM tool remains source of truth (for stakeholders)
- ✅ Increments are lightweight (for developers)
- ✅ Easy to break down work iteratively

**Cons**:
- ❌ More increments to manage
- ❌ Requires discipline to keep in sync

---

### Bidirectional Sync (Advanced)

**Plugins for PM tool integration**:

| Plugin | PM Tool | Features |
|--------|---------|----------|
| **specweave-github** | GitHub Issues | Create issue per increment, sync status, task checklists |
| **specweave-jira** (future) | Jira | Create epic per increment, sync stories, automated transitions |
| **specweave-ado** (future) | Azure DevOps | Create feature per increment, work item linking |
| **specweave-linear** (future) | Linear | Create project per increment, issue sync |

**Example** (specweave-github):
```bash
/specweave:inc "Add search feature"
# Creates increment 0007

/specweave-github:create-issue
# Creates GitHub issue #42: "Increment 0007: Add search feature"
# Links increment metadata to issue
# Syncs task checklist to issue body

/do
# Work happens, tasks completed

/specweave-github:sync
# Updates issue #42 with progress (12/20 tasks done)

/done 0007
# Closes issue #42 automatically
```

---

## Decision Framework: Choosing Increment Size

### Step 1: Assess Scope

**Questions**:
- How many user stories? (1 = micro, 10 = medium, 50 = large)
- How many systems touched? (1 = small, 3 = medium, 10 = large)
- How many developers? (1 = any size, 5+ = prefer smaller)
- How long to implement? (hours = micro, days = small, weeks = medium, months = large)

### Step 2: Consider Risk

**High Risk** → Prefer **smaller increments**:
- New technology (learning curve)
- Critical path (blocks other work)
- Customer-facing (high visibility)
- Complex integration (many dependencies)

**Low Risk** → Can use **larger increments**:
- Well-understood domain
- Internal tooling
- Isolated work
- Solo developer (you control pace)

### Step 3: Check External Constraints

**Force smaller increments** if:
- ✅ Sprint-based delivery (2-week sprints = max 2-week increments)
- ✅ Frequent releases (weekly releases = max 1-week increments)
- ✅ Team handoffs (frontend → backend → QA)
- ✅ External dependencies (waiting for API keys, approvals)

**Allow larger increments** if:
- ✅ Solo developer (no handoffs)
- ✅ Greenfield project (no constraints)
- ✅ Long-term vision (months-long commitment)
- ✅ Continuous deployment (release anytime)

### Step 4: Apply SpecWeave Principles

**Spec-Driven** → Can the spec be written upfront?
- Yes → Any size increment
- Partly → Smaller increments (less uncertainty)
- No → Spike increment first (explore, then plan)

**Test-Driven** → Can tests be defined upfront?
- Yes → Any size increment
- Partly → Medium increments (test as you go)
- No → Micro increments (experiment-driven)

**Living Docs** → Will docs change frequently?
- Yes → Smaller increments (easier to sync)
- No → Larger increments (less sync overhead)

---

## Examples from SpecWeave Repository

### Micro Increment: Fix CLI Bug
**Size**: 4 hours
**Jira**: Sub-task under Epic
**Rationale**: Simple fix, low risk, fast turnaround

### Small Increment: Plugin Architecture (0004)
**Size**: 2 weeks
**Jira**: Epic
**Rationale**: Standard feature, well-scoped, multiple tasks

### Medium Increment: LLM-Native i18n (0006)
**Size**: 4 weeks
**Jira**: Initiative (3 epics)
**Rationale**: Complex feature, multiple phases, moderate risk

### Large Increment: Core Framework (0001)
**Size**: 8 weeks
**Jira**: Theme (entire product foundation)
**Rationale**: Greenfield, solo developer, long-term vision

### Mega Increment: Build Entire SaaS (Hypothetical)
**Size**: 6 months (90% of app)
**Jira**: Product roadmap
**Rationale**: Startup MVP, clear vision, willing to commit
**Alternative**: Break into 20-30 smaller increments (recommended!)

---

## Recommendations

### For Solo Developers
- ✅ **Prefer smaller increments** (1-2 weeks) for momentum
- ✅ **Use mega increments** if you have long-term commitment (6-12 months)
- ✅ **Break mega into phases** (phase 1 = month 1, phase 2 = month 2, etc.)

### For Small Teams (2-5)
- ✅ **Prefer medium increments** (1-4 weeks) for collaboration
- ✅ **Use small increments** for high-risk work
- ✅ **Align with sprints** (2-week sprint = 1-2 week increments)

### For Large Teams (5+)
- ✅ **Prefer small increments** (days to 1 week) for parallelization
- ✅ **Use inverted mapping** (Jira epic = multiple increments)
- ✅ **Coordinate via PM tool** (Jira/ADO remains source of truth)

---

## Anti-Patterns to Avoid

### ❌ Too Many Micro Increments
**Problem**: Overhead of planning exceeds value of work
**Example**: 100 increments for small project (too granular)
**Fix**: Batch into larger increments

### ❌ Mega Increments Without Phases
**Problem**: No sense of progress, easy to get lost
**Example**: "Build entire app" with no milestones
**Fix**: Define phases (month 1, month 2, etc.) or break down

### ❌ Mismatch with External PM Tool
**Problem**: Increment size doesn't align with team workflow
**Example**: 1-month increment in 2-week sprint team
**Fix**: Align increment size with sprint length

### ❌ No Increment Owner
**Problem**: Nobody responsible for scope, quality, delivery
**Example**: PM defines spec, dev implements, disconnect
**Fix**: Assign Increment Owner role

---

## Documentation Location

**Where to document YOUR increment sizing decisions**:

1. **Strategy Doc** (internal):
   ```
   .specweave/docs/internal/strategy/increment-sizing-strategy.md
   ```
   - Your project's increment sizing philosophy
   - Mapping to PM tools
   - Decision framework
   - Examples

2. **Public Guide** (for contributors):
   ```
   docs-site/docs/guides/increment-sizing.md
   ```
   - How to decide increment size
   - Examples
   - Best practices

3. **CLAUDE.md** (for AI coding assistants):
   ```
   CLAUDE.md # "Increment Sizing" section
   ```
   - Quick reference
   - Current project's approach
   - Link to full guide

---

## Conclusion

**Key Takeaways**:

1. ✅ **Increments are scale-agnostic** - Can be 2 hours or 90% of app
2. ✅ **YOU decide size** - Based on project, team, risk, constraints
3. ✅ **Increment Owner role** - Hybrid PM + Tech Lead responsibilities
4. ✅ **Mapping to PM tools** - Flexible, hierarchical, or inverted
5. ✅ **No one-size-fits-all** - Adapt to your context

**The SpecWeave Philosophy**:
> **Give developers the flexibility to choose increment size, while maintaining spec-driven discipline regardless of scale.**

---

**Status**: Philosophical Guide
**Next**: Add to public docs (guides/increment-sizing.md) and CLAUDE.md
