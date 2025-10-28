# Architecture Documentation

Technical documentation (HOW) for SpecWeave framework.

## What Goes Here

- System design and HLDs
- ADRs (Architecture Decision Records)
- Component diagrams (Mermaid)
- Data models and schemas
- API contracts and interfaces

## Structure

```
architecture/
├── system-design.md         # Overall system architecture
├── adr/                     # Architecture Decision Records
│   ├── 0001-tech-stack.md
│   ├── 0002-context-loading.md
│   └── README.md
├── diagrams/                # Mermaid C4 diagrams
│   ├── system-context.mmd
│   └── system-container.mmd
└── data-models/             # Database schemas
    └── context-manifest.sql
```

## C4 Model Conventions

- **C4-1: Context** - System boundaries (HLD)
- **C4-2: Container** - Applications, services (HLD)
- **C4-3: Component** - Internal structure (LLD)
- **C4-4: Code** - Class diagrams (optional)

## Related

- [Strategy docs](../strategy/index.md) - WHAT and WHY
- [CLAUDE.md](../../../CLAUDE.md#c4-diagram-conventions) - Diagram conventions
