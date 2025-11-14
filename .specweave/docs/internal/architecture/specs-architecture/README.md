# Specs Architecture Documentation

**Purpose**: Meta-architecture about how specs are organized and managed

**Last Updated**: 2025-11-13

---

## What Goes Here

Documentation about specs organization patterns:
- How specs are structured and named
- Brownfield vs greenfield spec strategies
- Living docs architecture
- Spec synchronization patterns

**Note**: This is meta-architecture *about* specs. Actual feature specs live in `../../specs/`.

## Index of Specs Architecture Docs

| Document | Topic | Status | Created |
|----------|-------|--------|---------|
| [brownfield-first-architecture.md](brownfield-first-architecture.md) | Brownfield-First Specs Organization | Active | 2025-11 |
| [complete-example.md](complete-example.md) | Complete Spec Structure Example | Active | 2025-11 |
| [domain-vs-brownfield-comparison.md](domain-vs-brownfield-comparison.md) | Domain vs Brownfield Naming Comparison | Active | 2025-11 |

## Creating New Docs

```bash
# Create new specs architecture document
touch specs-architecture/{topic}.md
```

## Naming Convention

**Format**: `{topic}.md` (no "specs-" prefix - already in specs-architecture/ folder)

**Examples**:
- `naming-conventions.md`
- `folder-organization.md`
- `migration-strategies.md`

## Document Structure

Each document should include:
1. **Context** - Why this architecture exists
2. **Principles** - Key design principles
3. **Structure** - How it's organized
4. **Examples** - Concrete demonstrations
5. **Migration** - How to adopt this pattern

## Related Documentation

- [Architecture Overview](../README.md)
- [Specs Folder](../../specs/README.md) - Actual feature specs
- [ADRs](../adr/README.md) - Decisions about specs architecture
