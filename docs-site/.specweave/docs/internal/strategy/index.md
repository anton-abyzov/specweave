# Strategy Documentation

Business specifications (WHAT and WHY) for SpecWeave framework.

## What Goes Here

- Product vision and roadmap
- PRDs (Product Requirements Documents)
- User stories and acceptance criteria
- OKRs and success metrics
- Technology-agnostic requirements

## Structure

Organize by functional modules:
```
strategy/
├── core/                    # Core framework specs
│   ├── skills-system.md
│   ├── context-loading.md
│   └── auto-routing.md
├── integrations/            # Integration modules
│   ├── jira/
│   ├── github/
│   └── ado/
└── deployment/              # Deployment strategies
    └── multi-platform.md
```

## Principles

1. **Technology-agnostic** - Describe WHAT and WHY, not HOW
2. **User-focused** - Written from user perspective
3. **Testable** - Include acceptance criteria with TC-0001 IDs
4. **Modular** - Organize by functional areas

## Related

- [Architecture docs](../architecture/index.md) - HOW to implement
- [CLAUDE.md](../../../CLAUDE.md) - Complete development guide
