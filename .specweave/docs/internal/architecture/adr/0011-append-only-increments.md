# ADR-0011: Append-Only Increments + Living Documentation

**Status**: Accepted
**Date**: 2025-01-28
**Deciders**: Core Team

## Context

Traditional documentation approaches force a false choice:

1. **Waterfall**: Comprehensive docs upfront
   - Problem: Becomes outdated when code changes
   - Result: Docs and code diverge, manual sync burden

2. **Agile**: Minimal docs, evolve as you go
   - Problem: Historical context lost when updated
   - Result: No audit trail, "why did we do this?" questions unanswered

3. **Version Control**: Track doc changes in Git
   - Problem: Hard to navigate history
   - Result: Docs mixed with code history, difficult to trace feature evolution

**Key Question**: Can we maintain BOTH historical context AND current documentation without manual sync?

## Decision

**Implement a dual-documentation system inspired by event sourcing:**

### 1. Append-Only Increments (Historical Snapshots)

```
.specweave/increments/
├── 0001-user-authentication/
│   ├── spec.md              # What was planned (immutable)
│   ├── plan.md              # How it was built (immutable)
│   ├── tasks.md             # What was done (immutable)
│   ├── tests.md             # How validated (immutable)
│   ├── logs/                # Execution history (append-only)
│   └── reports/             # Results (append-only)
└── 0002-oauth-integration/  # New increment, never modifies 0001
```

**Rules**:
- ✅ Increments are NEVER modified after completion
- ✅ New features create new increments
- ✅ Modifications/extensions create new increments that reference originals
- ✅ Complete audit trail preserved forever
- ✅ Searchable by number, name, or content

### 2. Living Documentation (Current State)

```
.specweave/docs/
├── internal/
│   ├── strategy/auth-system.md       # CURRENT state of auth
│   └── architecture/
│       ├── system-design.md          # CURRENT architecture
│       └── adr/
│           └── 0001-auth-choice.md   # WHY (also append-only)
└── public/
    └── guides/authentication.md       # User-facing (CURRENT)
```

**Rules**:
- ✅ Auto-updated by Claude hooks after each task
- ✅ Always reflects actual code state
- ✅ Single source of truth for current system
- ✅ Version controlled (can see history in Git)
- ✅ Organized by purpose (strategy, architecture, operations)

### 3. The Bridge: Context Manifests

Each increment declares what living docs it affects:

```yaml
# .specweave/increments/0002-oauth/context-manifest.yaml
updates_living_docs:
  - .specweave/docs/internal/strategy/auth-system.md#oauth-flow
  - .specweave/docs/public/guides/authentication.md#login-methods
```

Hooks use this to auto-update living docs when increment completes.

## Rationale

### Event Sourcing for Documentation

This approach mirrors **event sourcing** in software architecture:

| Event Sourcing | SpecWeave Documentation |
|----------------|-------------------------|
| Events (immutable) | Increments (append-only) |
| Current state (projection) | Living docs (auto-updated) |
| Event store | `.specweave/increments/` |
| Read models | `.specweave/docs/` |

**Benefits of this pattern**:
- Complete audit trail
- Time-travel capability (see state at any point)
- Reproducible history
- Compliance-ready

### Git for Specifications

Think of SpecWeave as "Git for Specifications":

| Git | SpecWeave |
|-----|-----------|
| Commits (immutable) | Increments (append-only) |
| Working directory | Living docs |
| `git log` | Search increments |
| `git diff` | Compare increments |
| `HEAD` | Current docs state |

## Consequences

### Positive ✅

1. **Historical Context Preserved**
   - Understand "why" years later
   - See feature evolution
   - Learn from past decisions
   - Debug by tracing history

2. **Current State Always Accurate**
   - No manual sync needed
   - Developers work from latest specs
   - Users see accurate docs
   - No outdated information

3. **Compliance-Ready**
   - Complete audit trail (SOC 2, HIPAA, FDA)
   - Timestamped snapshots
   - Prove what was built, when, why
   - Traceable requirements

4. **Onboarding Excellence**
   - New developers read current docs
   - Dive into increments for deep context
   - Understand system evolution
   - No tribal knowledge

5. **Impact Analysis**
   - Search increments for related changes
   - See full change history
   - Understand dependencies
   - Safe refactoring

6. **Rollback Intelligence**
   - Know exactly what was added
   - Complete snapshot for reverting
   - Tests included for validation
   - Low-risk rollbacks

### Negative ❌

1. **Storage Overhead**
   - Increments accumulate over time
   - Duplicate information (spec vs living docs)
   - Mitigation: Text compresses well, storage is cheap

2. **Search Complexity**
   - Must search both increments and living docs
   - Two sources of truth for different purposes
   - Mitigation: Clear guidelines on when to use each

3. **Cognitive Load**
   - Developers must understand dual system
   - When to create increment vs update docs?
   - Mitigation: Framework enforces the pattern

## Implementation Guidelines

### When to Create New Increment

✅ **Create increment for**:
- New features
- Feature modifications/extensions
- Bug fixes that change behavior
- Architecture changes
- Breaking changes

❌ **Don't create increment for**:
- Typo fixes in docs
- Reformatting
- Non-functional changes (unless significant)

### When to Update Living Docs

✅ **Update living docs**:
- After each task completion (via hooks)
- When current state changes
- When APIs/interfaces change
- When user-facing behavior changes

❌ **Don't update living docs**:
- Manually (hooks should do it)
- For historical information (use increments)
- For "why" explanations (use ADRs)

### The Flow

```
1. Create increment: /increment payment-system
2. PM, Architect, QA plan feature
   └── Generate: spec.md, plan.md, tasks.md, tests.md
3. Build: /build
   └── Execute tasks, capture logs
4. Completion hooks trigger:
   ├── Increment frozen (append-only)
   └── Living docs auto-updated
5. Next increment builds on top
```

### ADR Status and Increments

**Special case**: ADRs are also append-only but live in living docs:
- ADRs never updated after acceptance
- Superseded ADRs marked with status
- New decisions create new ADRs
- This gives "living docs" an append-only section

## Alternatives Considered

### Alternative 1: Version Control Only
**Approach**: Track all docs in Git, rely on history
**Rejected because**:
- Hard to navigate doc history
- No structured snapshots
- Mixes doc changes with code changes
- Difficult feature-level traceability

### Alternative 2: Wiki with Version History
**Approach**: Use Confluence/Notion with versioning
**Rejected because**:
- Separate from code (loses sync)
- Not version controlled properly
- Vendor lock-in
- Manual updates required

### Alternative 3: Generated Docs Only
**Approach**: Generate all docs from code/comments
**Rejected because**:
- No "why" or "what" context
- No planning documentation
- Loses spec-first approach
- Can't document before coding

### Alternative 4: Single Source (No Increments)
**Approach**: One set of docs, updated continuously
**Rejected because**:
- Loses historical context
- No audit trail
- Can't understand evolution
- Compliance challenges

## Real-World Examples

### Example 1: Authentication Evolution

```
.specweave/increments/
├── 0001-basic-auth/
│   └── spec.md: "Implement username/password authentication"
├── 0005-oauth/
│   └── spec.md: "Add OAuth support (extends 0001)"
├── 0012-mfa/
│   └── spec.md: "Add MFA (modifies 0001, 0005)"
└── 0018-passwordless/
    └── spec.md: "Add WebAuthn (alternative to 0001)"

.specweave/docs/internal/strategy/
└── auth-system.md: "Current authentication system"
    ├── Supports: password, OAuth, MFA, WebAuthn
    └── References: Increments 0001, 0005, 0012, 0018
```

**Query**: "Why do we support 4 auth methods?"
**Answer**: Read increments 0001, 0005, 0012, 0018 to see evolution

**Query**: "What auth methods are supported now?"
**Answer**: Read `auth-system.md` for current state

### Example 2: Compliance Audit

```
Auditor: "Prove you implemented security measures in Q2 2024"

Response:
1. Increments 0015-security-hardening/
   ├── spec.md: What was planned
   ├── plan.md: How we implemented
   ├── tasks.md: What was done
   ├── tests.md: How we validated
   └── reports/: Actual test results with timestamps

2. Complete audit trail:
   - Created: 2024-04-12
   - Completed: 2024-04-28
   - All tests passed
   - Living docs updated 2024-04-28
```

**Result**: Pass audit with complete documentation

## Related

- [ADR-0004: Increment Structure](0004-increment-structure.md)
- [ADR-0005: Documentation Philosophy](0005-documentation-philosophy.md)
- [Increment Lifecycle Guide](../../delivery/guides/increment-lifecycle.md)
- [Philosophy: Living Documentation](../../../public/overview/philosophy.md#append-only-snapshots--living-documentation)

## Status

**Accepted** - This is a core architectural principle of SpecWeave.

The append-only increments + living documentation system is what makes SpecWeave unique. It solves the fundamental documentation dilemma: historical context vs current state. By maintaining both, we enable compliance, knowledge transfer, debugging, and ongoing development simultaneously.

This is "Git for Specifications" - giving development teams the same power for documentation that Git gives for code.
