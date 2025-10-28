# ADR-0002: Context Loading Approach

**Status**: Accepted  
**Date**: 2025-01-16  
**Deciders**: Core Team  

## Context

Problem: Loading ALL specifications (500+ pages) for EVERY task wastes tokens and slows AI responses.

Challenge: How to load only relevant context while maintaining full traceability?

## Decision

**Solution**: Context Manifests with Selective Loading

Each increment declares what context it needs via `context-manifest.yaml`:

```yaml
---
spec_sections:
  - .specweave/docs/internal/strategy/core/skills-system.md
  - .specweave/docs/internal/strategy/core/context-loading.md#selective-loading

documentation:
  - .specweave/docs/internal/architecture/skills-system.md
  - .specweave/docs/internal/architecture/adr/0002-context-loading-approach.md

max_context_tokens: 10000
priority: high
---
```

**Loader** (`context-loader` skill):
- Reads manifest
- Loads only specified files/sections
- Caches loaded context
- Achieves 70%+ token reduction

## Alternatives Considered

1. **Load Everything**
   - Pros: Simple, no configuration
   - Cons: 50k+ tokens wasted, slow responses
   
2. **Smart AI Detection**
   - Pros: No manual configuration
   - Cons: Unreliable, can miss critical context
   
3. **Per-File Annotations**
   - Pros: Fine-grained control
   - Cons: Too verbose, hard to maintain

## Consequences

### Positive
- ✅ 70%+ token reduction (50k → 15k typical)
- ✅ Faster AI responses
- ✅ Explicit context dependencies
- ✅ Scales to 1000+ page specs
- ✅ Cache-friendly

### Negative
- ❌ Requires manual manifest creation
- ❌ Manifests can become stale
- ❌ Developer must understand dependencies

## Mitigation

- `increment-planner` skill auto-generates manifests
- Validation warnings if manifest outdated
- Context refresh on user request

## Metrics

**Before**: 50,000 tokens average
**After**: 15,000 tokens average (70% reduction)
**Load Time**: 2s → 0.5s

## Related

- [Context Loading Architecture](../context-loading.md)
- [ADR-0003: Agents vs Skills](0003-agent-vs-skill.md)
- [CLAUDE.md](../../../../CLAUDE.md#context-manifests)
