# Implementation Plan: Multi-Language LSP Warm-up & Configurable Timeouts

## Overview

Modular refactor of `src/core/lsp/` to support multi-language warm-up strategies, configurable timeouts, and intelligent LSP server recommendations. Breaking changes accepted.

## Architecture

See ADRs in `.specweave/docs/internal/architecture/adr/`:
- [0183-01-multi-language-strategy.md](../../docs/internal/architecture/adr/0183-01-multi-language-strategy.md) - Strategy pattern
- [0183-02-lsp-config-schema.md](../../docs/internal/architecture/adr/0183-02-lsp-config-schema.md) - Config schema
- [0183-03-modular-lsp-architecture.md](../../docs/internal/architecture/adr/0183-03-modular-lsp-architecture.md) - Module structure

### Module Structure

```
src/core/lsp/
├── config/           # Config parsing, timeout resolution
├── servers/          # Per-language LSP clients
├── warmup/           # Warm-up strategies
├── cache/            # Symbol caching
├── diagnostics/      # Doctor command, progress, logging
└── lsp-manager.ts    # Orchestration
```

### Key Interfaces

```typescript
interface WarmupStrategy {
  languageId: string;
  projectFiles: string[];
  sourcePatterns: string[];
  prewarm?(root: string): Promise<void>;
  getFilesToOpen(root: string, count: number): Promise<string[]>;
}

interface LspConfig {
  timeout: number;
  warmupTimeout: number;
  perLanguage: Record<string, LanguageConfig>;
  servers: Record<string, CustomServerConfig>;
}
```

## Technology Stack

- **Language**: TypeScript (ESM)
- **Schema Validation**: Zod
- **Progress Bar**: cli-progress or ora
- **Testing**: Vitest with mocked LSP

## Implementation Phases

### Phase 1: Foundation (US-002, US-008)
1. Create `config/` module with Zod schema
2. Implement timeout resolution (perLanguage > global > default)
3. Scaffold modular directory structure
4. Migrate existing code incrementally

### Phase 2: Multi-Language (US-001, US-003)
1. Implement WarmupStrategy interface
2. Create strategies: TypeScript, C#, Python, Go, Rust
3. Add project root detection (upward search)
4. Implement language analyzer with weighted scoring
5. Interactive prompt for LSP suggestions

### Phase 3: Diagnostics (US-005, US-007)
1. Progress bar during warm-up
2. Detailed symbol count reporting
3. `lsp doctor` command
4. Structured logging to `.specweave/logs/`
5. Grep fallback on LSP crash

### Phase 4: Advanced (US-004, US-006)
1. Custom server registration with security warning
2. Pre-flight binary validation
3. Symbol cache with mtime invalidation

## Testing Strategy

- **Unit tests**: Config parsing, timeout resolution, strategy selection
- **Integration tests**: Mock LSP server responses
- **E2E tests**: Real C# project with csharp-ls (CI optional)

## Technical Challenges

### Challenge 1: C# Solution Loading
**Problem**: csharp-ls needs `--solution` flag for multi-project repos
**Solution**: Detect .sln files, prompt if multiple, cache choice
**Risk**: User may have stale cache → add `--clear-cache` flag

### Challenge 2: Sequential Warm-up Timing
**Problem**: Opening files too fast may overwhelm LSP
**Solution**: Sequential with small delay (100ms between files)
**Risk**: Slower warm-up → mitigate with `--skip-warmup` flag

### Challenge 3: Cache Invalidation
**Problem**: mtime check on every query adds latency
**Solution**: Batch check mtimes, invalidate entire cache if any changed
**Risk**: Over-invalidation → acceptable for correctness
