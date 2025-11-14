# Conceptual Documentation

**Purpose**: High-level concepts and principles that guide the architecture

**Last Updated**: 2025-11-13

---

## What Goes Here

Conceptual documentation explains foundational ideas and principles:
- Core architectural patterns and their rationale
- System-wide concepts that apply across components
- Philosophical approaches to design decisions
- Mental models for understanding the system

## Index of Concepts

| Concept | Topic | Status | Created |
|---------|-------|--------|---------|
| [context-loading.md](context-loading.md) | Context Management via Progressive Disclosure | Active | 2025-01 |
| [increment-vs-spec-lifecycle.md](increment-vs-spec-lifecycle.md) | Increment vs Spec Lifecycle | Active | 2025-11 |
| [meta-capability.md](meta-capability.md) | SpecWeave as Meta-Capability | Active | 2025-01 |

## Creating New Concepts

```bash
# Create new concept document
touch concepts/{concept-name}.md

# Create diagrams (co-located)
touch concepts/{concept-name}-{diagram-type}.mmd
```

## Naming Convention

**Format**: `{concept-name}.md`

**Examples**:
- `separation-of-concerns.md`
- `event-driven-architecture.md`
- `eventual-consistency.md`

## Concept Structure

Each concept document should include:
1. **Overview** - What is this concept?
2. **Why It Matters** - Importance and benefits
3. **Core Principles** - Key ideas and rules
4. **Examples** - Concrete applications
5. **Anti-Patterns** - What to avoid
6. **Related Concepts** - Links to related ideas

## Related Documentation

- [Architecture Overview](../README.md)
- [ADRs](../adr/README.md) - Decisions applying these concepts
- [HLDs](../hld/README.md) - Systems built on these concepts
