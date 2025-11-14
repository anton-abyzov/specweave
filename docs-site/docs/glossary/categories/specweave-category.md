---
sidebar_position: 1
---

# 🚀 SpecWeave Core Concepts

All SpecWeave-specific terms in one place - from fundamental concepts to advanced features.

## Framework Fundamentals

### [SpecWeave](../terms/specweave.md)
Spec-driven development framework that brings enterprise-level discipline to AI-assisted software development. Combines Claude Code's native plugin system with structured workflows, living documentation, and automated quality gates.

**Key Features**:
- ✅ Spec-first workflow (requirements before code)
- ✅ Living documentation (auto-syncs as you build)
- ✅ 75%+ context reduction (modular plugins)
- ✅ Enterprise-ready (compliance, auditing)

---

### [Increment](../terms/increment.md)
Product increment - focused, measurable unit of work that delivers value. Contains spec.md (requirements), plan.md (strategy), and tasks.md (implementation with embedded tests).

**Six Types**:
- **feature**: Standard feature development
- **hotfix**: Critical production fixes (can interrupt)
- **bug**: Production bugs with investigation
- **change-request**: Stakeholder requests
- **refactor**: Code improvement
- **experiment**: POC/spike work (auto-abandons after 14 days)

**WIP Limits**: 1 active increment (maximum focus), 2 max for emergencies

---

### [Spec](../terms/spec.md)
Specification document that defines **what** to build, **why**, and **how success is measured**. Used in TWO locations:

1. **Living Docs Specs** (`.specweave/docs/internal/specs/spec-NNN-feature.md`): Permanent, feature-level knowledge base
2. **Increment Specs** (`.specweave/increments/####-name/spec.md`): Temporary, focused implementation snapshot

**Key Difference**: Specs use **3-digit numbers** (001, 002, 003) for **feature areas**, increments use **4-digit numbers** (0001, 0002, 0003) for **implementations**.

---

### [Living Docs](../terms/living-docs.md)
Automatic documentation synchronization system that ensures docs never become stale. After every task completion, living docs auto-sync from increment specs to permanent knowledge base.

**Benefits**:
- ✅ Always current (syncs after every task)
- ✅ Zero manual effort (hooks-based)
- ✅ Complete audit trail (know what was built when)
- ✅ Easy onboarding (read living docs)

---

### [Tasks.md](../terms/tasks-md.md)
Structured task file with embedded test plans (BDD format). Contains tasks, test specifications, AC-ID traceability, and coverage targets.

**Key Innovation**: Tests EMBEDDED in tasks (not separate file)

**Structure per Task**:
- AC-ID links (AC-US1-01, AC-US1-02, etc.)
- Test plan (Given/When/Then BDD format)
- Test cases (unit, integration, E2E with file paths)
- Coverage targets (80-90% realistic, not 100%)
- Implementation steps

---

### [AC-ID](../terms/ac-id.md)
Acceptance Criteria ID - unique identifier for acceptance criteria enabling complete traceability from specs through tasks to tests and implementation.

**Format**: `AC-US\{story\}-\{number\}`

**Examples**:
- `AC-US1-01` - User Story 1, Acceptance Criterion 1
- `AC-US1-02` - User Story 1, Acceptance Criterion 2
- `AC-US2-01` - User Story 2, Acceptance Criterion 1

**Traceability Flow**:
```
spec.md (AC-US1-01) → tasks.md (T-001: AC-US1-01) →
test plan (Given/When/Then) → test file (auth.test.ts) →
implementation (AuthService.ts)
```

---

## Plugin Architecture

### [Plugin](../terms/plugin.md)
Modular package that adds capabilities to SpecWeave. Everything is a plugin - even the core framework!

**Three Types**:
1. **Core Plugin** (`specweave`): Auto-loaded, ~12K tokens
   - 9 skills, 22 agents, 22 commands, 8 hooks
2. **Integration Plugins**: GitHub, Jira, ADO, Figma
3. **Tech Stack Plugins**: Frontend, Kubernetes, ML, Payments

**Context Efficiency**: 70%+ reduction vs monolithic (16K vs 50K tokens)

---

### Skill
Auto-activating AI capability defined in SKILL.md files. Activates based on keywords in description (no manual @ mentions needed).

**Examples**:
- `increment-planner`: Plans new increments
- `spec-generator`: Generates specifications
- `tdd-workflow`: Test-driven development

---

### Agent
Specialized AI role defined in AGENT.md files. Provides expertise in specific domains.

**Core Agents**:
- **PM**: Product Manager (market research, specs)
- **Architect**: System Architect (HLD, ADRs)
- **Tech Lead**: Implementation guidance

**Specialized Agents** (19+): QA Lead, Security Engineer, DevOps Expert, etc.

---

### Command
Slash command defined in .md files. All SpecWeave commands use `/specweave:*` namespace.

**Essential 8**:
1. `/specweave:increment` - Plan new increment
2. `/specweave:do` - Execute tasks (smart resume)
3. `/specweave:progress` - Check progress
4. `/specweave:validate` - Rule-based validation
5. `/specweave:qa` - AI quality assessment
6. `/specweave:check-tests` - Validate test coverage
7. `/specweave:done` - Close increment
8. `/specweave:sync-docs` - Sync living docs

---

### Hook
Lifecycle automation script that triggers on events (post-task-completion, pre-implementation, etc.).

**Key Hook**: `post-task-completion.sh`
- Fires after every TodoWrite tool use
- Auto-syncs living docs
- Updates tasks.md with completion status
- Syncs to external trackers (GitHub/Jira/ADO)

---

## Workflow Concepts

### WIP Limits
Work-in-progress discipline that enforces focus.

**Rules**:
- **Default**: 1 active increment (maximum productivity)
- **Emergency**: 2 active max (hotfix/bug can interrupt)
- **Hard Cap**: Never >2 active (enforced)

**Why 1?** Research shows:
- 1 task = 100% productivity
- 2 tasks = 20% slower (context switching)
- 3+ tasks = 40% slower + more bugs

---

### Increment Discipline
**The Iron Rule**: Complete increment N before starting N+1

**Enforcement**:
- **0 active** → Create new (no warnings)
- **1 active** → Warn about context switching
- **2 active** → HARD BLOCK (must complete or pause one)

**Exception**: Hotfix/bug can interrupt (emergency only)

---

### Living Completion Reports
Real-time scope evolution tracking throughout increment lifecycle. Updated during work (not at the end).

**Sections**:
- Original scope (what was planned)
- Scope evolution (living log of changes)
- Final delivery (what was delivered)
- What changed and why (rationale)
- Lessons learned
- Metrics (velocity, scope creep, coverage)

**Command**: `/specweave:update-scope` - Log scope changes during work

---

## Documentation Structure

### Internal Documentation
`.specweave/docs/internal/` - Strategic documentation (6 core folders)

**Folders**:
1. **strategy/**: Business rationale (PRDs, OKRs, vision)
2. **specs/**: Living specifications (feature-level knowledge base)
3. **architecture/**: Technical design (HLD, LLD, ADRs, diagrams)
4. **delivery/**: Build & release (roadmap, DORA metrics, branching)
5. **operations/**: Production operations (runbooks, SLOs, incidents)
6. **governance/**: Policies (security, compliance, coding standards)

---

### Multi-Project Support
`.specweave/docs/internal/projects/{project-id}/` - Organize by project/team

**Per-Project Folders**:
- **specs/**: Living docs specs for this project
- **modules/**: Module/component documentation
- **team/**: Team playbooks (onboarding, conventions)
- **architecture/**: Project-specific ADRs
- **legacy/**: Brownfield imports (temporary)

---

## Integration & Sync

### Sync Profile
External repository configuration for multi-project sync.

**Supports**:
- Unlimited GitHub repositories
- Unlimited Jira projects
- Unlimited Azure DevOps projects

**Configuration**:
```json
{
  "sync": {
    "profiles": {
      "specweave-dev": {
        "provider": "github",
        "config": {
          "owner": "anton-abyzov",
          "repo": "specweave"
        }
      }
    }
  }
}
```

---

### Time Range Filtering
Filter sync data by creation date to prevent rate limit exhaustion.

**Presets**:
- **1W**: 1 week (~50 items, 30 sec, LOW impact) ✅
- **1M**: 1 month (~200 items, 2 min, MEDIUM impact) ✅ Recommended
- **3M**: 3 months (~600 items, 5 min, MEDIUM impact)
- **6M**: 6 months (~1.2K items, 10 min, HIGH impact)
- **ALL**: All time (~5K+ items, 30+ min, CRITICAL impact) ❌ Avoid

---

### Rate Limiting
API call protection with pre-flight validation.

**Validates**:
- Estimate API calls based on time range
- Check current rate limit status
- Calculate impact: low/medium/high/critical
- Warn or block if risky

---

## Quality & Testing

### Test-Aware Planning
Generate tasks.md with embedded test plans (v0.7.0+).

**Features**:
- BDD format (Given/When/Then)
- AC-ID traceability
- Coverage targets per task (80-90%)
- Test-first workflow support

**Agent**: `test-aware-planner` (auto-invoked by `increment-planner`)

---

### TDD (Test-Driven Development)
Red-green-refactor cycle when `test_mode: TDD` in tasks.md.

**Workflow**:
1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass
3. **Refactor**: Improve while keeping tests green

---

### BDD (Behavior-Driven Development)
Given/When/Then format for test scenarios.

**Format**:
```
Given: Initial state/context
When: Action/event
Then: Expected outcome
```

**Example**:
- **Given** user with valid credentials
- **When** login
- **Then** receive JWT token + timestamp update

---

## Quality Gates

### Rule-Based Validation
`/specweave:validate` - Checks structure and format

**Validates**:
- ✅ spec.md has user stories
- ✅ tasks.md has AC-ID links
- ✅ All files have correct YAML frontmatter
- ✅ Markdown structure is valid

---

### AI Quality Assessment
`/specweave:qa` - AI-powered quality check with BMAD risk scoring

**Evaluates**:
- Clarity (requirements are clear)
- Testability (can be tested)
- Completeness (nothing missing)
- Feasibility (can be implemented)
- Maintainability (can be maintained)
- Edge cases (handled properly)
- Risk assessment (BMAD pattern)

**Decisions**: PASS | CONCERNS | FAIL

---

## Related Documentation

- [Getting Started Guide](/docs/intro)
- [Core Concepts](/docs/glossary/terms/increment)
- [Complete Workflow](/docs/workflows/overview)
- [Commands Reference](/docs/commands/overview)

---

**Total SpecWeave-Specific Terms**: 30+

**Quick Navigation**: [Back to Glossary Overview](../glossary.md) | [Browse by Category](../glossary-by-category.md)
