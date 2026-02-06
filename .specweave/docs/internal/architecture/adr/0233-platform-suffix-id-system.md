# ADR-0233: Platform Suffix ID System (G/J/A)

**Date**: 2026-02-06
**Status**: Accepted
**Increment**: 0190-sync-architecture-redesign

## Context

External items use an `E` suffix (FS-042E) with shared namespace requiring collision detection between FS-042 and FS-042E. The `isExternalId()` function uses brittle `endsWith('E')` check. This leaks implementation details and creates allocation complexity.

## Decision

Replace single `E` suffix with platform-specific suffixes using **independent namespaces**:

| Platform | Suffix | Example | Regex |
|----------|--------|---------|-------|
| Internal | (none) | `FS-042` | `/^(FS\|US\|T)-(\d+)$/` |
| GitHub | `G` | `FS-042G` | `/^(FS\|US\|T)-(\d+)G$/` |
| JIRA | `J` | `FS-042J` | `/^(FS\|US\|T)-(\d+)J$/` |
| ADO | `A` | `FS-042A` | `/^(FS\|US\|T)-(\d+)A$/` |

Key rules:
- **Independent namespaces**: `FS-042` and `FS-042G` can coexist (no collision detection needed)
- **Folder names mirror**: `0042G-auth-flow` derives to `FS-042G`
- **Backward compat**: `E` suffix recognized during deprecation (maps to `unknown` platform)
- **Single regex**: `/^(FS|US|T)-(\d+)([GJAE])?$/` matches all variants

## Alternatives Considered

1. **Keep E suffix**: Simple but loses platform info and requires collision detection
2. **Origin in metadata only**: Cleanest IDs but loses at-a-glance visibility in file explorer
3. **Tilde prefix (~FS-042)**: Sorting issues, not filesystem-safe on all platforms

## Consequences

**Positive**: Platform visible at a glance, no collision detection, simpler allocator
**Negative**: Migration needed for existing E-suffix items, more suffix values to handle
