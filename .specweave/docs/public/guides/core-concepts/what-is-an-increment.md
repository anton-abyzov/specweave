# What is an Increment?

An **increment** is SpecWeave's fundamental unit of work—a complete, self-contained feature with specifications, architecture, implementation plan, and tests.

## Think of Increments as "Git Commits for Features"

Just like Git commits capture code changes with messages and history, **increments capture feature development** with complete context:

```mermaid
graph LR
    A[Increment 0001] --> B[Increment 0002]
    B --> C[Increment 0003]
    C --> D[Increment 0004]

    style A fill:#e1f5e1
    style B fill:#e1f5e1
    style C fill:#e1f5e1
    style D fill:#fff3cd
```

**Each increment contains:**
- 📋 **spec.md** - What and Why (requirements, user stories, acceptance criteria)
- 🏗️ **plan.md** - How (architecture, test strategy, implementation approach)
- ✅ **tasks.md** - Checklist with embedded tests (v0.7.0+)
- 📊 **logs/** - Execution history
- 📝 **reports/** - Completion summaries, scope changes

## Anatomy of an Increment

```
.specweave/increments/0001-user-authentication/
├── spec.md              # WHAT: Requirements, user stories, AC-IDs
│                        # - US-001: Basic login flow
│                        # - US-002: Password reset
│                        # - AC-US1-01: Valid credentials → dashboard
│
├── plan.md              # HOW: Architecture + test strategy
│                        # - JWT authentication design
│                        # - Database schema
│                        # - Test coverage targets (85% unit, 80% integration)
│
├── tasks.md             # Checklist + embedded tests (v0.7.0+)
│                        # - T-001: AuthService [in_progress]
│                        # - T-002: Login endpoint [pending]
│                        # - Each task has BDD test plan
│
├── logs/                # Execution logs
│   └── session-2025-11-04.log
│
└── reports/             # Completion reports, scope changes
    └── COMPLETION-REPORT.md
```

## Why Increments?

### 1. Complete Context

Every increment is a **snapshot in time** with all context preserved:

```mermaid
graph TB
    subgraph "Increment 0001: User Auth"
        A[Requirements<br/>What was needed?]
        B[Architecture<br/>How was it built?]
        C[Tasks<br/>What was done?]
        D[Tests<br/>How was it validated?]
    end

    A --> B --> C --> D

    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style C fill:#e3f2fd
    style D fill:#e3f2fd
```

**6 months later**, you can answer:
- ✅ "Why did we choose JWT over sessions?" → Read spec.md
- ✅ "How does password reset work?" → Read plan.md
- ✅ "What tests cover this?" → Read tasks.md (embedded tests)

### 2. Traceability

Clear path from requirements → implementation → tests:

```
AC-US1-01 (spec.md)
   ↓
T-001: AuthService (tasks.md)
   ↓
validLogin() test (tests/unit/auth.test.ts)
```

**For compliance** (HIPAA, SOC 2, FDA):
- Complete audit trail
- Requirement-to-code traceability
- Test coverage proof

### 3. Focused Work

**ONE increment at a time** prevents context switching:

| Without Increments | With Increments |
|-------------------|-----------------|
| Multiple features in progress | **Focus on ONE thing** |
| Unclear what's done | **Clear completion criteria** |
| Documentation scattered | **Everything in one place** |
| Hard to rollback | **Self-contained units** |

## Increment Types

SpecWeave supports different work types:

| Type | Use When | Can Interrupt? | Example |
|------|----------|----------------|---------|
| **feature** | New functionality | No | User authentication, payments |
| **hotfix** | Critical production bug | ✅ Yes | Security patch, crash fix |
| **bug** | Production bugs needing investigation | ✅ Yes | Memory leak, performance issue |
| **change-request** | Stakeholder request | No | UI redesign, API changes |
| **refactor** | Code improvement | No | Extract service layer, TypeScript migration |
| **experiment** | POC/spike work | No | Evaluate libraries, architecture spike |

**Note**: All types use the same structure (spec.md, plan.md, tasks.md). The type is just a label for tracking.

## Increment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Planning: /specweave:inc "feature"
    Planning --> Active: /specweave:do
    Active --> Active: Complete tasks
    Active --> Paused: /specweave:pause
    Paused --> Active: /specweave:resume
    Active --> Completed: All tasks done
    Active --> Abandoned: /specweave:abandon
    Completed --> [*]
    Abandoned --> [*]
```

**States explained:**
- **Planning**: PM agent creates spec.md, plan.md, tasks.md
- **Active**: Implementation in progress
- **Paused**: Temporarily on hold (with reason)
- **Completed**: All tasks done, tests passing
- **Abandoned**: Work canceled (with reason)

## Best Practices

### ✅ DO

1. **Keep increments focused** - One feature or fix per increment
2. **Complete before starting new** - Finish 0001 before 0002
3. **Use descriptive names** - `0001-user-authentication` not `0001`
4. **Document scope changes** - Use `/specweave:update-scope`
5. **Close properly** - Validate tests, update docs, create completion report

### ❌ DON'T

1. **Don't start multiple increments** - Causes context switching
2. **Don't skip specs** - Leads to unclear requirements
3. **Don't modify completed increments** - They're immutable snapshots
4. **Don't work without a plan** - Create plan.md before implementation
5. **Don't forget tests** - Every task needs test validation

## Real-World Examples

### Example 1: Simple Feature

```
Increment: 0005-dark-mode
Duration: 2 days
Tasks: 4
Type: feature

Structure:
├── spec.md (1 user story, 3 AC-IDs)
├── plan.md (CSS variables, theme switching)
├── tasks.md (4 tasks, embedded tests, 85% coverage)
└── reports/COMPLETION-REPORT.md
```

### Example 2: Complex Feature

```
Increment: 0012-payment-processing
Duration: 3 weeks
Tasks: 18
Type: feature

Structure:
├── spec.md (5 user stories, 15 AC-IDs)
├── plan.md (Stripe integration, webhooks, refunds)
├── tasks.md (18 tasks, embedded tests, 90% coverage)
├── logs/ (multiple sessions)
└── reports/
    ├── COMPLETION-REPORT.md
    └── scope-changes-2025-11-10.md
```

### Example 3: Emergency Hotfix

```
Increment: 0008-sql-injection-fix
Duration: 4 hours
Tasks: 3
Type: hotfix

Structure:
├── spec.md (Security vulnerability, CVE reference)
├── plan.md (Parameterized queries, input validation)
├── tasks.md (3 tasks, security tests, 100% coverage)
└── reports/COMPLETION-REPORT.md (impact analysis)
```

## Increments vs Living Documentation

**Increments** (immutable snapshots):
- Historical record
- "What was done and why"
- Never modified after completion
- Complete audit trail

**Living Docs** (always current):
- Current system state
- "What exists now"
- Auto-updated by hooks
- Single source of truth

**Both are essential:**
```
Question: "Why did we build it this way?"
Answer: Read increment snapshot

Question: "What's the current implementation?"
Answer: Read living docs
```

## Summary

- **Increment = complete feature unit** (spec, plan, tasks, tests)
- **Immutable snapshots** preserved forever
- **Clear lifecycle** (planning → active → completed)
- **Focus on ONE** increment at a time
- **Complete context** for future reference
- **Traceability** from requirements to code

## Next Steps

- [Creating Your First Increment](/docs/workflows/planning)
- [The /do Workflow](/docs/workflows/implementation)
- [Living Documentation](/docs/guides/core-concepts/living-documentation)

---

**Learn More:**
- [Increment Planning Workflow](/docs/workflows/planning)
- [Increment Discipline (WIP Limits)](/docs/guides/core-concepts/increment-discipline)
- [Test-Aware Planning](/docs/guides/core-concepts/test-aware-planning)
