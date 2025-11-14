# High-Level Designs (HLD)

**Purpose**: System-level architecture using C4 Model (Levels 1-2)

**Last Updated**: 2025-11-13

---

## What Goes Here

High-Level Designs (HLDs) describe system architecture using the C4 Model:
- **Level 1 (Context)**: System in its environment, external dependencies
- **Level 2 (Container)**: Applications, services, databases, communication

## Index of HLDs

| HLD | Topic | Status | Created |
|-----|-------|--------|---------|
| [hld-diagram-generation.md](hld-diagram-generation.md) | Diagram Generation Architecture | Active | 2025-11 |
| [hld-external-tool-status-sync.md](hld-external-tool-status-sync.md) | External Tool Status Synchronization | Active | 2025-11 |
| [hld-intelligent-model-selection.md](hld-intelligent-model-selection.md) | Intelligent Model Selection System | Active | 2025-11 |

## Creating New HLDs

```bash
# Create new HLD
cp ../../../templates/docs/hld-template.md hld-{topic}.md

# Create diagrams (co-located)
touch hld-{topic}-context.mmd
touch hld-{topic}-container.mmd
```

## Naming Convention

**Format**: `hld-{system-name}.md`

**Examples**:
- `hld-payment-processing.md`
- `hld-user-authentication.md`
- `hld-notification-system.md`

## Diagram Co-location

Keep diagrams next to their parent HLD:
```
hld/
├── hld-payment-processing.md
├── hld-payment-processing-context.mmd
├── hld-payment-processing-container.mmd
└── hld-payment-processing-sequence-checkout.mmd
```

## Related Documentation

- [Architecture Overview](../README.md)
- [ADRs](../adr/README.md) - Architecture decisions
- [Concepts](../concepts/README.md) - Conceptual documentation
- [Implementation Guides](../guides/README.md) - How to implement
