# ADR-0008: Brownfield Project Support

**Status**: Accepted  
**Date**: 2025-01-23  
**Deciders**: Core Team  

## Context

Most real-world projects are **brownfield** (existing code), not greenfield.

Challenge: How to safely modify existing code without regression?

## Decision

**Regression Prevention Strategy**: Document before modifying

### Workflow

**Step 1**: Analyze existing code
- `brownfield-analyzer` skill scans codebase
- Generates specs from implementation
- Creates retroactive ADRs

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

1. **Just Start Coding**
   - Pros: Fast
   - Cons: High regression risk
   
2. **AI Infers Everything**
   - Pros: No manual work
   - Cons: Unreliable, misses context
   
3. **Copy All Code to Docs**
   - Pros: Complete documentation
   - Cons: Massive duplication

## Consequences

### Positive
- ✅ Prevents regression  
- ✅ Documents existing behavior
- ✅ Safe modification process
- ✅ Preserves project knowledge

### Negative
- ❌ Upfront documentation effort
- ❌ Slower initial setup
- ❌ Requires discipline

## Metrics

**Documentation Time**: 2-4 hours for average module
**Regression Prevention**: 95%+ (with tests)
**Developer Confidence**: High

## Related

- [Brownfield Workflow](../../../../CLAUDE.md#for-brownfield-projects)
- [Brownfield Integration Strategy](../../delivery/BROWNFIELD-INTEGRATION-STRATEGY.md)
