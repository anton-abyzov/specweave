# ADR-0005: Documentation Philosophy - Comprehensive OR Incremental

**Status**: Accepted  
**Date**: 2025-01-19  
**Deciders**: Core Team  

## Context

Different projects have different documentation needs:
- **Enterprise**: Need complete specs upfront (regulated, large teams)
- **Startups**: Evolving requirements, build docs as you go

Question: Should SpecWeave force one approach?

## Decision

**Support BOTH approaches** - Let users choose

### Approach 1: Comprehensive Upfront
**When**: Enterprise, regulated industries, large teams, production systems
**Characteristics**: 500-600+ pages created before development
**Benefits**: Complete clarity, easier coordination, compliance-ready

### Approach 2: Incremental/Evolutionary
**When**: Startups, MVPs, small teams, evolving requirements  
**Characteristics**: Start with 10-20 pages, build as you go (like Microsoft)
**Benefits**: Faster time-to-code, adapts to change, less upfront investment

## Key Insight

**The framework scales from 10 pages to 1000+ pages**

Same features work for both:
- Context manifests load only relevant sections
- Modular structure supports growth
- Living documentation stays in sync
- Auto-role routing works at any scale

## Consequences

### Positive
- ✅ Works for ALL project types
- ✅ Startups can grow into enterprise
- ✅ No forced methodology
- ✅ Documentation matches project maturity

### Negative
- ❌ Must explain two approaches
- ❌ Users must choose

## Guidelines

**Choose Comprehensive if**:
- Requirements well-understood
- Regulated industry
- Large team coordination needed
- Production system

**Choose Incremental if**:
- Rapid iteration required
- Startup with changing needs
- MVP/prototype
- Small team (1-5 developers)

## Implementation

`specweave init` asks:
```
Documentation approach?
A) Comprehensive (500+ pages upfront)
B) Incremental (build as you go)
```

Saves to `.specweave/config.yaml`:
```yaml
documentation:
  approach: incremental  # or comprehensive
```

## Related

- [Documentation Philosophy](../../../../CLAUDE.md#documentation-philosophy--approaches)
- [Strategy Docs](../../strategy/index.md)
