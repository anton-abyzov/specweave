# Implementation Guides

**Purpose**: Step-by-step guides for implementing architectural patterns and systems

**Last Updated**: 2025-11-13

---

## What Goes Here

Implementation guides provide detailed instructions for:
- Setting up complex architectural patterns
- Implementing cross-cutting concerns
- Integrating systems and tools
- Following best practices and conventions

## Index of Guides

| Guide | Topic | Status | Created |
|-------|-------|--------|---------|
| [intelligent-living-docs-implementation.md](intelligent-living-docs-implementation.md) | Intelligent Living Docs Sync | Active | 2025-11 |
| [spec-commit-sync-implementation.md](spec-commit-sync-implementation.md) | Spec-Commit Synchronization | Active | 2025-11 |

## Creating New Guides

```bash
# Create new implementation guide
touch guides/{topic}-implementation.md
```

## Naming Convention

**Format**: `{topic}-implementation.md`

**Examples**:
- `authentication-implementation.md`
- `multi-tenant-setup-implementation.md`
- `cicd-pipeline-implementation.md`

## Guide Structure

Each guide should include:
1. **Overview** - What you'll implement
2. **Prerequisites** - What you need before starting
3. **Step-by-Step Instructions** - Numbered steps
4. **Verification** - How to verify it works
5. **Troubleshooting** - Common issues and fixes
6. **Next Steps** - What to do after implementation

## Related Documentation

- [Architecture Overview](../README.md)
- [HLDs](../hld/README.md) - High-level designs these guides implement
- [ADRs](../adr/README.md) - Decisions behind the architecture
