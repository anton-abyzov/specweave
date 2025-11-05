# Product Vision

## Vision Statement

**SpecWeave** is the spec-driven development framework that makes specifications the source of truth for building production software with AI.

## Problem

**Without SpecWeave**:
- Tell AI: "Build me a feature"
- AI generates code
- Test manually
- Fix bugs as they appear
- (Maybe) document later
- **Result**: No docs = regression risk, unclear requirements

**With SpecWeave**:
- Create specification (WHAT, WHY)
- Design architecture (HOW)
- AI generates implementation
- Tests validate automatically
- Docs update via hooks
- **Result**: Production-ready software with full traceability

## Core Principles

1. **Specification Before Implementation**
2. **Living Documentation** (never diverges)
3. **Regression Prevention** (document before modifying)
4. **Test-Validated Features** (4-level testing)
5. **Scalable from Solo to Enterprise**
6. **Context Precision** (70%+ token reduction)
7. **Auto-Role Routing** (>90% accuracy)
8. **Closed-Loop Validation** (E2E tests tell truth)

## Target Users

### Primary: Framework Developers
- Build SpecWeave framework itself
- Create agents, skills, commands
- Contribute to core

### Secondary: Software Teams
- Solo developers (MVP/prototypes)
- Startups (1-5 devs, rapid iteration)
- SMBs (5-20 devs, growing)
- Enterprises (20+ devs, production systems)

## Success Metrics

- **Adoption**: 1,000+ GitHub stars (Year 1)
- **Token Efficiency**: 70%+ reduction via context manifests
- **Routing Accuracy**: >90% to correct agent/skill
- **Test Coverage**: >80% for critical paths
- **User Satisfaction**: NPS >50

## Competitive Advantage

| Feature | SpecWeave | BMAD | SpecKit | OpenSpec | TaskMaster |
|---------|-----------|------|---------|----------|------------|
| Spec-Driven | ✅ Core | ✅ PRD-based | ✅ Templates | 🟡 Partial | ❌ |
| Living Docs | ✅ Auto-update | ❌ Manual | ❌ Static | ❌ | ❌ |
| Context Precision | ✅ 70% reduction | ❌ Full load | ❌ N/A | ❌ | ❌ |
| Auto-Role Routing | ✅ >90% | ❌ Manual @roles | ❌ N/A | ❌ | ❌ |
| Brownfield Support | ✅ Analyzer | 🟡 Limited | ❌ | ❌ | ❌ |
| Multi-Platform Deploy | ✅ | ❌ | ❌ | ❌ | 🟡 Partial |

## Related

- [Core Features](core-features.md)
- [ADR-0005: Documentation Philosophy](../architecture/adr/0005-documentation-philosophy.md)
