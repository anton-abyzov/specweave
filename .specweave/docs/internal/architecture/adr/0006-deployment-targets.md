# ADR-0006: Multi-Platform Deployment Intelligence

**Status**: Accepted  
**Date**: 2025-01-20  
**Deciders**: Core Team  

## Context

Problem: Agents were generating cloud infrastructure code (Terraform) on Day 1, even for prototypes.

Challenge: Balance between local development and production deployment.

## Decision

**Progressive Disclosure** - Ask about deployment only when relevant

**Detection Flow**:
```
User mentions deployment keywords?
  → Settings auto-detected
    → deployment.target defined?
      → NO: Ask deployment questions
        → Save to config
          → Generate appropriate infrastructure
```

**Supported Targets**:
- local (Docker Compose)
- hetzner (cheapest, EU-focused)
- railway (easiest, auto-scaling)
- vercel (best for Next.js)
- aws, azure, gcp (enterprise)
- digitalocean (developer-friendly)

## Alternatives Considered

1. **Always Ask Upfront**
   - Pros: Complete config from start
   - Cons: Annoying for prototypes
   
2. **Always Assume Local**
   - Pros: Simple, no questions
   - Cons: Can't deploy to production
   
3. **AI Auto-Detect**
   - Pros: No user input
   - Cons: Unreliable, can guess wrong

## Consequences

### Positive
- ✅ No deployment questions for prototypes
- ✅ Cost optimization when user ready
- ✅ Adaptive infrastructure generation
- ✅ Multi-platform support

### Negative
- ❌ Config can be incomplete initially
- ❌ Must track when to ask

## Configuration

`.specweave/config.yaml`:
```yaml
deployment:
  target: hetzner
  environment: production
  regions: [eu-central]

infrastructure:
  compute:
    type: vm
    size: cx21
  database:
    type: managed
    engine: postgresql

cost_budget:
  monthly_max: 20
```

## Cost Optimization

`cost-optimizer` skill shows comparison:
```
Hetzner:  $10/month
Railway:  $20/month  
AWS:      $65/month
```

## Related

- [Deployment Intelligence](../../../../CLAUDE.md#deployment-target-intelligence)
- [Cost Optimizer Skill](../../../../src/skills/cost-optimizer/)
