# ADR-0008: Brownfield Project Support

**Status**: Accepted
**Date**: 2025-01-23
**Deciders**: Core Team
**Updated**: 2025-11-03 (Clarified migration philosophy)

## Context

Most real-world projects are **brownfield** (existing code), not greenfield.

Challenge: How to safely modify existing code without regression?

**CRITICAL DISTINCTION**: Two types of "migration":
1. **Documentation Structure Migration** (one-time setup) ✅
2. **Feature/Code Migration** (just-in-time, per-increment) ✅

## Decision

**Philosophy**: Awareness, not prescription. Just-in-time migration, not big-bang planning.

### Two-Phase Brownfield Approach

#### Phase 1: Documentation Structure Migration (One-Time Setup)

**What**: Migrate existing docs to SpecWeave folder structure
**When**: During `specweave init --brownfield`
**Scope**: Documentation only, NOT code features
**Output**: Project Context Map

**Process**:
1. Scan existing documentation (`docs/`, `wiki/`, `README.md`)
2. Classify by pillar (strategy, architecture, operations, delivery, governance)
3. Map to `.specweave/docs/internal/` structure
4. Create project context map (tech stack, inventory, suggested plugins)
5. Save to `.specweave/brownfield-context.json`

**What NOT to do**:
- ❌ Don't create migration plan for ALL features
- ❌ Don't prescribe which features to work on
- ❌ Don't generate 50+ placeholder increments
- ❌ Don't overwhelm user with big-bang planning

**Example Project Context Map**:
```json
{
  "type": "brownfield-context",
  "scannedAt": "2025-11-03",
  "techStack": {
    "frontend": "React 18 + Next.js",
    "backend": "Node.js + Express",
    "database": "PostgreSQL",
    "auth": "Auth0"
  },
  "suggestedPlugins": ["specweave-frontend", "specweave-backend"],
  "codebaseStats": {
    "files": 1847,
    "estimatedFeatures": 127,
    "modules": ["auth", "payments", "dashboard"]
  },
  "documentation": {
    "coverage": "moderate",
    "migratedTo": ".specweave/docs/internal/"
  },
  "nextSteps": [
    "Run /specweave:inc when ready to work on a feature",
    "SpecWeave will auto-detect related existing code",
    "Migration happens per-increment, just-in-time"
  ]
}
```

#### Phase 2: Feature Migration (Just-In-Time, Per-Increment)

**What**: Migrate/refactor specific features when user works on them
**When**: During increment planning (`/specweave:inc`)
**Scope**: Only the feature being worked on, NOT everything
**Output**: Increment with migration strategy

**Process**:
1. User creates increment: `/specweave:inc "modernize authentication"`
2. Auto-detect related code: `src/lib/auth/` (Auth0, 3400 LOC, 12 tests)
3. Offer analysis: "Include existing auth analysis in spec?"
4. Generate spec with:
   - Current State: Auth0 implementation details
   - Migration Strategy: Auth0 → NextAuth (gradual rollout)
   - Backwards Compatibility: Parallel running period
   - Rollout Plan: Feature flag, A/B testing
5. User decides: Accept, modify, or reject migration

**Example Increment Spec (with migration)**:
```markdown
# Spec: Modernize Authentication to NextAuth

## Current State Analysis

**Existing Implementation**: Auth0
- Location: src/lib/auth/
- LOC: 3400 (23 files)
- Tests: 12 unit, 4 E2E
- Dependencies: auth0-js, @auth0/nextjs-auth0

## Desired State

**New Implementation**: NextAuth.js
- Better Next.js integration
- Self-hosted option
- More provider flexibility

## Migration Strategy

### Approach: Gradual Rollout
1. **Week 1**: Implement NextAuth in parallel (feature flag)
2. **Week 2**: 10% traffic to NextAuth (beta users)
3. **Week 3**: 50% traffic (monitor metrics)
4. **Week 4**: 100% traffic, deprecate Auth0

### Backwards Compatibility
- Both systems run in parallel (Weeks 1-3)
- Session migration helper (convert Auth0 → NextAuth tokens)
- Fallback to Auth0 if NextAuth errors

### Rollback Plan
- Feature flag kill switch (instant rollback)
- Database not affected (same user table)
- Monitor: error rate, login success rate, latency
```

**Key Principle**: Migration happens ONLY when user chooses to work on that feature. NOT upfront for all 127 features!

### WRONG vs RIGHT Approach

| Aspect | ❌ WRONG (Big-Bang) | ✅ RIGHT (Just-In-Time) |
|--------|---------------------|------------------------|
| **When** | During init | During increment planning |
| **Scope** | ALL 127 features | ONE feature at a time |
| **Output** | Massive migration plan | Project context map |
| **Prescription** | "Migrate these 50 features" | "Here's what exists, you decide" |
| **User Burden** | Overwhelming (200 page plan) | Minimal (awareness only) |
| **Philosophy** | Big-bang transformation | Incremental improvement |
| **Alignment** | Against SpecWeave principles | Aligned with SpecWeave |
| **Example** | "Create increments 0001-0127 for all features" | "Detected 127 features, work on any when ready" |

### Regression Prevention Workflow (When Modifying Existing Code)

**Step 1**: Analyze existing code (per-increment)
- `brownfield-analyzer` skill scans related codebase
- Generates specs from current implementation
- Creates retroactive ADRs if architecture decisions found

**Step 2**: Document current behavior
- Create specs in `.specweave/docs/internal/strategy/{module}/existing/`
- Extract data models, API contracts
- Document business rules

**Step 3**: Create tests for current behavior
- Write E2E tests validating current functionality
- User reviews tests for completeness
- Tests act as regression safety net

**Step 4**: Plan modifications
- Create increment in `.specweave/increments/####/`
- Reference existing specs in context manifest
- Show what changes vs what stays same

**Step 5**: Implement with regression monitoring
- Run existing tests before changes
- Implement new feature
- Verify existing tests still pass

## CLAUDE.md Merging

**Problem**: User already has CLAUDE.md → SpecWeave overwrites it

**Solution**: `brownfield-onboarder` skill
- Analyzes backup CLAUDE.md
- Extracts project-specific content
- Distributes to appropriate SpecWeave folders
- Updates CLAUDE.md with minimal project summary (12 lines max)

**Result**: 99%+ content in folders, not bloating CLAUDE.md

## Alternatives Considered

### For Initial Setup (Phase 1)

1. **Skip Doc Migration** (rejected)
   - Pros: No setup time
   - Cons: Lose existing knowledge, start from scratch

2. **Manual Doc Migration** (rejected)
   - Pros: Complete control
   - Cons: Time-consuming, error-prone

3. **Automated Analysis + Context Map** (✅ chosen)
   - Pros: Fast, preserves knowledge, non-prescriptive
   - Cons: Requires initial scanning effort

### For Feature Migration (Phase 2)

1. **Big-Bang Migration Plan** (❌ rejected - THE PROBLEM!)
   - Pros: Clear roadmap upfront
   - Cons: Overwhelming, prescriptive, violates incremental philosophy, wasted effort (plan 200 features, only work on 5)

2. **AI Auto-Migrates Everything** (rejected)
   - Pros: No manual work
   - Cons: Unreliable, high regression risk, no user control

3. **Just-In-Time Migration** (✅ chosen)
   - Pros: Aligned with SpecWeave, user decides, minimal waste, incremental approach
   - Cons: No upfront roadmap (but that's a feature, not a bug!)

## Consequences

### Positive
- ✅ **Prevents regression** (test-first for existing code)
- ✅ **Preserves existing knowledge** (doc migration)
- ✅ **Non-prescriptive** (user decides what to work on)
- ✅ **Incremental approach** (aligned with SpecWeave philosophy)
- ✅ **No wasted effort** (only plan features you'll actually work on)
- ✅ **Just-in-time context** (related code detected automatically)
- ✅ **Gradual adoption** (migrate one feature at a time)
- ✅ **Low barrier to entry** (context map, not 200-page plan)

### Negative
- ❌ **Initial setup time** (Phase 1: doc scanning and migration)
- ❌ **No upfront roadmap** (can't see "all 200 features planned" - but this prevents over-planning!)
- ❌ **Requires discipline** (resist urge to plan everything upfront)
- ❌ **Per-increment overhead** (analyze existing code each time)

## Metrics

### Phase 1 (Initial Setup)
- **Setup Time**: 30-60 minutes (automated scanning)
- **Doc Migration**: 1-2 hours (depending on existing docs)
- **Context Map Generation**: Automated
- **User Burden**: Low (review and approve)

### Phase 2 (Per-Increment)
- **Related Code Detection**: Automated (seconds)
- **Current State Analysis**: 15-30 minutes per increment
- **Regression Prevention**: 95%+ (with tests)
- **Developer Confidence**: High
- **Wasted Planning Effort**: Near zero (only plan what you work on)

### Comparison: Big-Bang vs Just-In-Time

| Metric | Big-Bang Approach | Just-In-Time Approach |
|--------|-------------------|----------------------|
| **Initial Setup** | 40+ hours (plan all features) | 2 hours (context map) |
| **Wasted Effort** | 80%+ (plan 200, work on 10) | Near 0% (plan on demand) |
| **User Overwhelm** | Very high (200-page plan) | Low (awareness only) |
| **Time to First Increment** | Days (after full planning) | Minutes (start immediately) |
| **Alignment with SpecWeave** | Poor (violates incremental) | Excellent (embodies philosophy) |

## Summary

**Brownfield support uses a two-phase approach**:

1. **Phase 1 (Init)**: Create awareness via Project Context Map
   - Scan docs, detect tech stack, suggest plugins
   - NO prescriptive migration plan for features
   - Output: `.specweave/brownfield-context.json`

2. **Phase 2 (Per-Increment)**: Just-in-time feature migration
   - User decides what to work on via `/specweave:inc`
   - Auto-detect related existing code
   - Include migration strategy in spec if modifying existing code
   - Gradual, safe, incremental approach

**Key Insight**: SpecWeave doesn't force you to migrate everything. It helps you work on what matters, when it matters, with context about what exists.

## Related

- [Brownfield Workflow](../../../../CLAUDE.md#for-brownfield-projects)
- [Brownfield Integration Strategy](../../delivery/BROWNFIELD-INTEGRATION-STRATEGY.md)
- [Main Flow Diagram](./../diagrams/1-main-flow.mmd) - See brownfield path
