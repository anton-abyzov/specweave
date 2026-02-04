# ADR-0183-02: LSP Configuration Schema

**Date**: 2026-02-04
**Status**: Accepted
**Increment**: 0183-multi-language-lsp

## Context

The current LSP implementation has hardcoded timeouts (60s) and no way to configure custom LSP servers. Users with large C# projects experience timeouts, and developers using uncommon languages cannot use SpecWeave's LSP features.

We need a configuration schema that:
1. Supports global and per-language timeout overrides
2. Allows custom LSP server registration
3. Maintains backward compatibility (though breaking changes are acceptable)

## Decision

Adopt a **nested configuration schema** under `lsp` key in `.specweave/config.json`:

```typescript
interface LspConfig {
  timeout: number;           // Global timeout in seconds (default: 120)
  warmupTimeout: number;     // Warm-up phase timeout (default: 90)
  perLanguage: {
    [lang: string]: {
      timeout?: number;
      warmupTimeout?: number;
      openCount?: number;    // Files to open during warm-up
    };
  };
  servers: {
    [name: string]: {
      command: string;       // LSP binary path
      args: string[];        // CLI arguments
      filePatterns: string[]; // Glob patterns (e.g., "*.xyz")
      languageId: string;    // LSP language identifier
    };
  };
  cache?: {
    enabled: boolean;        // Default: true
    maxAge: number;          // Seconds before invalidation
  };
}
```

### Timeout Resolution Order
1. `perLanguage.<lang>.timeout` (most specific)
2. `lsp.timeout` (global)
3. Default constant (120s)

## Alternatives Considered

1. **Flat config keys** (`lsp.csharp.timeout`): Simpler but harder to validate and extend
2. **Array-based** (`lsp.languages: [{name, timeout}]`): More flexible but verbose for common cases
3. **Environment variables**: Good for CI but poor developer experience

## Consequences

**Positive**:
- Clear hierarchy for timeout resolution
- Extensible for future per-language settings
- Custom servers enable any LSP-supporting language
- Schema is validatable with JSON Schema

**Negative**:
- Nested structure requires careful null-checking
- Migration needed from current implicit defaults
- Custom server security requires warning on first use
