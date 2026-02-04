# ADR-0183-03: Modular LSP Architecture

**Date**: 2026-02-04
**Status**: Accepted
**Increment**: 0183-multi-language-lsp

## Context

Current `src/core/lsp/` has flat structure with mixed concerns:
- `lsp-client.ts` (900+ lines): Generic LSP, language detection, warm-up
- `tsserver-client.ts`: TypeScript-specific
- `lsp-manager.ts`: Orchestration mixed with detection

This makes it hard to add new languages, test warm-up strategies, or modify caching independently.

## Decision

Refactor to **modular architecture**:

```
src/core/lsp/
├── index.ts              # Public API exports
├── types.ts              # Shared interfaces
├── lsp-manager.ts        # Orchestration (slimmed)
│
├── config/
│   ├── lsp-config.ts     # Config parsing with Zod validation
│   ├── timeout-resolver.ts # Timeout priority resolution
│   └── server-registry.ts  # Built-in + custom server registry
│
├── servers/
│   ├── base-server.ts    # Abstract LSP server interface
│   ├── generic-lsp.ts    # Standard LSP protocol client
│   ├── tsserver.ts       # TypeScript (existing, moved)
│   ├── csharp.ts         # C# with .sln detection
│   └── [language].ts     # One file per language
│
├── warmup/
│   ├── strategy.ts       # WarmupStrategy interface
│   ├── executor.ts       # Sequential execution logic
│   └── strategies/       # Per-language implementations
│       ├── typescript.ts
│       ├── csharp.ts
│       └── [language].ts
│
├── cache/
│   ├── symbol-cache.ts   # Disk-based symbol cache
│   └── cache-key.ts      # Cache key generation
│
└── diagnostics/
    ├── lsp-doctor.ts     # Doctor command implementation
    ├── progress.ts       # Progress bar reporter
    └── logger.ts         # Structured LSP logging
```

### Key Boundaries

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| config/ | Parse & validate config | None (pure) |
| servers/ | LSP protocol communication | config/ |
| warmup/ | File detection & opening | config/, servers/ |
| cache/ | Result persistence | config/ |
| diagnostics/ | Reporting & debugging | All |

### Migration Path

1. Create new modules without deleting old code
2. Move logic incrementally, keeping tests passing
3. Update imports in lsp-manager.ts
4. Delete old code when all moved

## Alternatives Considered

1. **Keep flat structure**: Faster short-term but blocks future languages
2. **Plugin architecture**: Over-engineered for internal refactor
3. **Monorepo packages**: Too heavy for single CLI tool

## Consequences

**Positive**:
- Clear separation of concerns
- Each module testable in isolation
- Easy to add new languages (one file per language)
- Config validation centralized

**Negative**:
- Initial refactoring effort
- More files to navigate
- Import paths change (breaking for any external consumers)
