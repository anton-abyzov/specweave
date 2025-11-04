# CORRECTED ARCHITECTURE: Living Docs = Source of Truth

**Created**: 2025-11-04
**Status**: Correcting previous misunderstanding

---

## My Mistake

I misunderstood the user's concern. I incorrectly made `increment spec.md` the source of truth, when it should be **living docs**.

---

## CORRECT Architecture (User's Intent)

### Source of Truth Hierarchy

```
1. RFC (living docs)               ← SOURCE OF TRUTH (connected to Jira/ADO/GitHub)
   └── rfc-####-{name}/spec.md

2. Strategy (living docs)          ← High-level summary ONLY
   └── {module}/overview.md

3. Increment spec.md               ← Can duplicate RFC (temporary, that's OK!)
   └── ####-{name}/spec.md
```

###The REAL Problem

**DUPLICATION WITHIN LIVING DOCS**:
- ❌ `strategy/{module}/user-stories.md` (detailed user stories)
- ❌ `strategy/{module}/requirements.md` (detailed requirements)
- ❌ `strategy/{module}/success-criteria.md` (detailed metrics)

**vs**

- ✅ `rfc/rfc-####-{name}/spec.md` (should have detailed user stories, requirements, metrics)

**Both exist = duplication within living docs!**

---

## Correct Solution

### Living Docs Structure

```
.specweave/docs/internal/
│
├── rfc/                          ← SOURCE OF TRUTH (detailed requirements)
│   └── rfc-####-{name}/
│       ├── spec.md               ← COMPLETE user stories, AC, requirements, metrics
│       ├── plan.md               ← Technical design (optional)
│       ├── tasks.md              ← Implementation tasks (optional)
│       └── tests.md              ← Test cases (optional)
│
├── strategy/                     ← High-level summary ONLY
│   └── {module}/
│       ├── overview.md           ← Product vision, market opportunity, personas
│       └── business-case.md      ← (optional) ROI, competitive analysis
│       # ❌ NO user-stories.md
│       # ❌ NO requirements.md
│       # ❌ NO success-criteria.md
│
└── architecture/
    └── adr/                      ← Architecture decisions (after RFC accepted)
```

### Increment Structure

```
.specweave/increments/####-{name}/
├── spec.md                       ← CAN duplicate RFC spec.md (temporary reference)
├── plan.md                       ← Technical design
├── tasks.md                      ← Implementation tasks
└── tests.md                      ← Test cases
```

**Key Point**: It's OK if `increment spec.md` duplicates `rfc/spec.md`! The increment is temporary (deleted after completion), the RFC is permanent.

---

## PM Agent Workflow (CORRECTED)

### STEP 2: Invoke PM Agent

```markdown
Task(
  subagent_type: "pm",
  description: "PM product strategy",
  prompt: "Create product strategy for: [user feature description]

  Context from existing docs: [summary from Step 1]

  You MUST create RFC (living docs - source of truth) AND optionally create increment spec.md:

  1. RFC (living docs - SOURCE OF TRUTH):
     - Create .specweave/docs/internal/rfc/rfc-####-{name}/spec.md
     - This is the COMPLETE, PERMANENT source of truth
     - Include ALL of:
       * User stories (US-001, US-002, etc.) with full details
       * Acceptance criteria (AC-US1-01, etc.)
       * Functional requirements (FR-001, etc.)
       * Non-functional requirements (NFR-001, etc.)
       * Success criteria (metrics, KPIs)
     - This RFC can be linked to Jira/ADO/GitHub Issues
     - RFC persists even after increment completes

  2. Strategy docs (optional, high-level ONLY):
     - IF this is a NEW module/product, create:
       .specweave/docs/internal/strategy/{module-name}/
       * overview.md (high-level product vision, market opportunity, personas)
       * business-case.md (optional - ROI, competitive analysis)
     - IMPORTANT:
       * ❌ NO detailed user stories (those go in RFC spec.md)
       * ❌ NO detailed requirements (those go in RFC spec.md)
       * ❌ NO acceptance criteria (those go in RFC spec.md)
       * ✅ ONLY strategic, high-level business context

  3. Increment spec.md (optional, can duplicate RFC):
     - Create .specweave/increments/{number}-{name}/spec.md
     - This CAN duplicate content from RFC spec.md (that's OK - temporary reference)
     - OR it can just reference the RFC: \"See RFC-####-{name} for complete requirements\"
     - Increment spec.md is deleted after increment completes
     - RFC spec.md persists as permanent documentation

  Tech stack: [detected tech stack]"
)
```

---

## Why This Makes Sense

### RFC = Permanent Source of Truth

**RFC is connected to project management tools**:
- RFC → GitHub Issue (with bidirectional sync)
- RFC → Jira ticket
- RFC → Azure DevOps work item

**RFC survives increment completion**:
- Increment gets closed/archived → increment folder deleted
- RFC remains → permanent documentation of WHAT was built and WHY

**Example**:
```
1. Create RFC-0012-user-authentication (permanent)
   └── spec.md (complete requirements)

2. Create increment 0012-user-authentication (temporary)
   └── spec.md (can duplicate RFC or reference it)

3. Implement increment, close increment

4. Delete increment folder (temporary work is done)

5. RFC-0012 remains (permanent documentation)
```

### Strategy = High-Level Context

**Purpose**: Provide business context for WHY we're building this module/product

**Contents**:
- Target market (outdoor enthusiasts, event planners)
- Market opportunity (50M+ users)
- Competitive advantage (hyper-local vs. national forecasts)
- Product vision (weather dashboard for critical decisions)

**NOT detailed requirements** (those go in RFC)

### Increment = Temporary Work Tracker

**Purpose**: Track implementation progress

**Contents**:
- Can duplicate RFC spec.md (for convenience during implementation)
- tasks.md (implementation steps)
- tests.md (test cases)
- logs/ (execution logs)

**Lifecycle**: Created → implemented → closed → deleted

---

## Fixing the Duplication Problem

### Problem (Current)

PM agent creates:
- `strategy/{module}/user-stories.md` (detailed)
- `strategy/{module}/requirements.md` (detailed)
- `strategy/{module}/success-criteria.md` (detailed)

This duplicates what should be in RFC!

### Solution

**PM agent should create**:
1. **RFC spec.md** (detailed, permanent, source of truth)
2. **Strategy overview.md** (high-level only, if new module)
3. **Increment spec.md** (optional, can duplicate RFC)

**NO MORE**:
- ❌ `strategy/user-stories.md`
- ❌ `strategy/requirements.md`
- ❌ `strategy/success-criteria.md`

---

## Migration Path

**For existing increments with strategy/{module}/user-stories.md**:

1. **Move to RFC** (recommended):
   ```bash
   # Create RFC for module
   mkdir -p .specweave/docs/internal/rfc/rfc-0001-{module}

   # Move detailed requirements to RFC
   mv .specweave/docs/internal/strategy/{module}/user-stories.md \
      .specweave/docs/internal/rfc/rfc-0001-{module}/spec.md

   # Reduce strategy to high-level only
   # Edit overview.md to be product vision only
   ```

2. **Or keep both** (suboptimal but works):
   - Add note in strategy/user-stories.md: "See RFC-####-{module} for authoritative requirements"
   - Treat RFC as source of truth going forward

---

## Summary

✅ **RFC** = Source of truth (detailed, permanent, connected to Jira/ADO/GitHub)
✅ **Strategy** = High-level context (product vision, market opportunity)
✅ **Increment spec.md** = Can duplicate RFC (temporary, that's OK)

❌ **NO duplication within living docs** (strategy/ should NOT have detailed user stories)

---

**Next Steps**:
1. Revert my incorrect changes (spec.md as source of truth)
2. Update PM agent to create RFC as source of truth
3. Update increment-planner to invoke PM agent correctly
4. Keep strategy/ as high-level only (correct!)

