# ADR-0004: Increment Auto-Numbering Structure

**Status**: Accepted  
**Date**: 2025-01-18  
**Deciders**: Core Team  

## Context

Need organized way to manage features/increments without:
- Git merge conflicts (multiple people creating features)
- Manual numbering errors
- Unclear naming conventions

## Decision

**Auto-Numbered Increments**: `####-descriptive-name`

**Structure** (v0.7.0+):
```
.specweave/increments/
├── 0001-core-framework/
│   ├── spec.md              # WHAT & WHY (< 250 lines)
│   ├── plan.md              # HOW + Test Strategy (< 500 lines)
│   ├── tasks.md             # Implementation steps + Embedded tests (BDD)
│   ├── context-manifest.yaml
│   ├── logs/
│   ├── scripts/
│   └── reports/
├── 0002-diagram-agents/
└── 0003-jira-integration/
```

**Note**: Tests are now embedded in tasks.md (v0.7.0+) instead of separate tests.md file.

**WIP Limits**:
- Framework development: 2-3 in progress
- User projects (solo): 1-2 in progress
- User projects (team 10+): 3-5 in progress

**Lifecycle**: backlog → planned → in-progress → completed → closed

## Alternatives Considered

1. **Git Branches as Features**
   - Pros: Integrated with VCS
   - Cons: Hard to track completion, no structured docs
   
2. **GitHub Issues**
   - Pros: Built-in tracking
   - Cons: External dependency, limited structure
   
3. **Manual Numbering**
   - Pros: Simple
   - Cons: Merge conflicts, numbering errors

## Consequences

### Positive
- ✅ No merge conflicts (auto-increment)
- ✅ Clear progression (0001 → 0002 → 0003)
- ✅ WIP limits prevent context-switching
- ✅ Complete traceability
- ✅ Structured documentation

### Negative
- ❌ Numbers can have gaps (if increment deleted)
- ❌ Must enforce WIP limits
- ❌ Requires discipline

## Implementation

**Auto-increment logic**:
```typescript
const increments = fs.readdirSync('.specweave/increments')
  .filter(d => /^\d{4}-/.test(d));
const nextNumber = Math.max(...increments.map(d => parseInt(d))) + 1;
const paddedNumber = String(nextNumber).padStart(4, '0');
```

**Frontmatter tracking**:
```yaml
---
increment: 0001-core-framework
status: in-progress
wip_slot: 1
total_tasks: 50
completed_tasks: 44
---
```

## Metrics

**Average tasks per increment**: 25-50
**Average completion time**: 2-4 weeks
**WIP limit effectiveness**: 20-40% productivity gain

## Related

- [Increment Lifecycle](../../delivery/guides/increment-lifecycle.md)
- [CLAUDE.md](../../../../CLAUDE.md#increment-lifecycle-management)
