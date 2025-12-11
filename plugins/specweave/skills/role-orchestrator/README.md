# role-orchestrator Skill

**Status**: To be developed
**Priority**: CRITICAL (Highest priority)
**Claude Model**: Opus 4.5 (best reasoning + quality)

## Purpose

**Determines which role-based agents are needed** based on user prompt context

This is the **entry point** for the role-based agent system.

## How It Works

```
User: "Build a SaaS for project management with real-time collaboration"

↓ role-orchestrator analyzes:
   - Type: new-product
   - Complexity: high
   - Features: real-time, collaboration, multi-user
   - Domain: saas, project-management

↓ Determines roles needed:
   ✅ pm-agent (product strategy)
   ✅ architect-agent (system design for real-time)
   ✅ qa-lead-agent (E2E testing for real-time)
   ✅ devops-agent (infrastructure for SaaS)
   ✅ security-agent (auth for multi-user)

↓ Orchestrates execution:
   1. PM agent → pm-analysis.md
   2. Architect agent → architecture.md
   3. QA lead agent → test-strategy.md
   4. DevOps agent → infrastructure.md
   5. Security agent → security.md

↓ Consolidates into increment
```

## Role Detection Rules

```typescript
const roleRules = {
  'pm-agent': {
    keywords: ['saas', 'product', 'business', 'customers', 'market', 'mvp'],
    contexts: ['new-product', 'startup', 'business-model'],
    priority: 'high'
  },

  'architect-agent': {
    keywords: ['scalable', 'distributed', 'real-time', 'microservices', 'architecture'],
    contexts: ['new-product', 'complex-feature', 'system-design'],
    priority: 'high'
  },

  'qa-lead-agent': {
    keywords: ['quality', 'reliable', 'testing', 'e2e', 'test-strategy'],
    contexts: ['new-product', 'critical-feature'],
    priority: 'high'
  },

  'devops-agent': {
    keywords: ['deploy', 'infrastructure', 'kubernetes', 'ci/cd', 'saas', 'production'],
    contexts: ['new-product', 'scaling', 'deployment'],
    priority: 'medium'
  },

  'security-agent': {
    keywords: ['auth', 'security', 'payment', 'pci', 'gdpr', 'compliance'],
    contexts: ['auth-feature', 'payment', 'compliance', 'multi-user'],
    priority: 'high'
  },

  'tech-lead-agent': {
    keywords: ['refactor', 'code-review', 'best-practices', 'patterns'],
    contexts: ['code-quality', 'refactoring'],
    priority: 'medium'
  },

  'performance-agent': {
    keywords: ['performance', 'optimization', 'fast', 'cache', 'slow'],
    contexts: ['performance-issue', 'optimization'],
    priority: 'medium'
  },

  'docs-writer-agent': {
    keywords: [], // Always include for documentation
    contexts: ['always'],
    priority: 'low'
  }
};
```

## Example Scenarios

### Scenario 1: New SaaS Product

**User**: "Build a SaaS for project management"

**Roles activated**:
- ✅ pm-agent (product strategy)
- ✅ architect-agent (system architecture)
- ✅ qa-lead-agent (quality strategy)
- ✅ devops-agent (SaaS infrastructure)
- ✅ docs-writer-agent (documentation)

### Scenario 2: Add Feature

**User**: "Add payment processing with Stripe"

**Roles activated**:
- ✅ architect-agent (Stripe integration design)
- ✅ security-agent (PCI compliance)
- ✅ backend-agent (nodejs-backend for implementation)
- ✅ qa-lead-agent (payment testing strategy)

### Scenario 3: Optimization

**User**: "Optimize performance - app is slow"

**Roles activated**:
- ✅ performance-agent (profiling, optimization)
- ✅ architect-agent (caching strategy)
- ✅ tech-lead-agent (code review)

### Scenario 4: Simple Feature

**User**: "Add dark mode toggle"

**Roles activated**:
- ✅ frontend-agent (implementation only)
- ✅ docs-writer-agent (document the feature)

## Execution Order

**Strategic roles first** (define WHAT and WHY):
1. pm-agent
2. architect-agent
3. qa-lead-agent
4. devops-agent
5. security-agent

**Then execution roles** (define HOW):
6. task-builder (creates tasks.md based on strategic outputs)
7. implementation agents (backend, frontend, etc.)

**Finally support roles**:
8. tech-lead-agent (code review)
9. docs-writer-agent (documentation)
10. performance-agent (optimization)

## Integration

**Called by**: detector (when new increment created)

**Calls**: PM, Architect, QA, DevOps, Security agents as needed

**Outputs**: Orchestration plan in `.specweave/increments/####-feature/orchestration.md`

## Configuration



## Future Enhancements

- Machine learning to improve role detection
- User can override role selection
- Role templates for common scenarios (SaaS, mobile app, API, etc.)
- Cost estimation before running roles

---

**To implement**: See `.specweave/increments/` (when created)

**Critical dependency**: All other role-based agents depend on this
