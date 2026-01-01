# ADR-0222: Smart LSP Integration (Supersedes ADR-0140 for LSP)

**Status**: Accepted
**Date**: 2025-12-31
**Decision Makers**: SpecWeave Core Team
**Supersedes**: ADR-0140 (for LSP-specific operations only)

## Context

ADR-0140 established a "Code First, Tools Second" philosophy to avoid MCP tool bloat and context explosion. This was correct for generic MCP tools that:
- Load large tool definitions upfront
- Transfer bulk data through the model context
- Cause token explosion (150,000 tokens for 2,000 token tasks)

However, **LSP (Language Server Protocol) is fundamentally different**:

| MCP Generic Tools | LSP Operations |
|------------------|----------------|
| Large tool definitions | Zero definition overhead (built into Claude Code) |
| Bulk data transfer | Minimal responses (file:line, type signatures) |
| Context window bloat | Surgical, precise data |
| Unknown result size | Predictable, small responses |
| General purpose | Semantic code operations only |

## Problem

ADR-0140's broad prohibition of MCP tools was incorrectly applied to LSP, resulting in:

1. **Documentation claims LSP is "enabled by default"** but zero LSP calls in implementation
2. **Regex-based code analysis** instead of semantic LSP operations (100x slower, less accurate)
3. **No leverage of Claude Code's built-in LSP operations**: goToDefinition, findReferences, documentSymbol, hover, getDiagnostics
4. **Missed opportunity** for accurate API extraction, type hierarchies, and dead code detection

## Decision

**LSP operations are EXEMPT from ADR-0140's MCP tool restrictions.**

SpecWeave MUST actively use LSP for:

### 1. High-Value LSP Operations

| Operation | When to Use | Expected Response Size |
|-----------|-------------|----------------------|
| `goToDefinition` | Navigate to implementations | ~100 bytes (file:line) |
| `findReferences` | Impact analysis before refactoring | ~1KB (list of locations) |
| `documentSymbol` | Map file/module structure | ~5KB (symbol tree) |
| `hover` | Extract type signatures, JSDoc | ~500 bytes (type info) |
| `getDiagnostics` | Code quality assessment | ~2KB (warnings/errors) |

### 2. Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│ SpecWeave Operations Using LSP                              │
├─────────────────────────────────────────────────────────────┤
│ specweave init          → LSP for API extraction            │
│ /sw:living-docs         → LSP for type hierarchies          │
│ /sw:do (refactoring)    → findReferences before changes     │
│ Explore agent           → goToDefinition for navigation     │
│ Code review             → getDiagnostics for quality        │
│ Dead code detection     → findReferences = 0                │
└─────────────────────────────────────────────────────────────┘
```

### 3. Hybrid Approach (Code + LSP)

The "Code First, Tools Second" principle is PRESERVED for:
- Large data processing (files, logs, transcripts)
- Bulk transformations
- Operations that would flood context

But LSP is PREFERRED when:
- Precise symbol resolution needed
- Cross-file reference tracking required
- Type information extraction needed
- Semantic accuracy matters more than speed

### 4. Implementation Pattern

```typescript
// CORRECT: Use LSP for precision, code for processing
async function analyzeApiSurface(filePath: string) {
  // Step 1: LSP for accurate symbol extraction
  const symbols = await lsp.documentSymbol(filePath);
  const exports = symbols.filter(s => s.isExported);

  // Step 2: LSP for type information
  for (const exp of exports) {
    const typeInfo = await lsp.hover(filePath, exp.position);
    exp.signature = typeInfo.contents;

    // LSP for usage analysis
    const refs = await lsp.findReferences(filePath, exp.position);
    exp.usageCount = refs.length;
  }

  // Step 3: Code execution for heavy processing (not LSP)
  return processAndFormat(exports);
}
```

## Consequences

### Positive

- **100x faster symbol resolution** vs regex (50ms vs 45s)
- **Semantic accuracy** - understands types, inheritance, generics
- **Dead code detection** - findReferences = 0 means unused
- **Accurate API surfaces** - knows what's actually exported
- **Better refactoring** - understand impact before changes
- **Type-aware documentation** - extract actual signatures, not guesses

### Negative

- **Requires language servers** installed (documented in setup)
- **Startup latency** for language server initialization (~2-5s)
- **Language support varies** (TypeScript excellent, some languages limited)

### Unchanged from ADR-0140

- Large data STILL processed via code execution
- Bulk operations STILL avoid context bloat
- Agent isolation STILL applies
- Progressive skill loading STILL preferred

## Implementation Checklist

- [ ] Add LSP calls to living-docs API extraction
- [ ] Add LSP calls to specweave init brownfield analysis
- [ ] Use findReferences in refactoring operations
- [ ] Use getDiagnostics in code quality checks
- [ ] Update Explore agent to prefer LSP navigation

## Related Decisions

- [ADR-0140: Code Over MCP](./0140-code-over-mcp.md) - Parent ADR (LSP exempted)
- [ADR-0127: Agent Chunking Pattern](./0127-agent-chunking-pattern.md)

## References

- [Claude Code LSP Operations](https://docs.anthropic.com/en/docs/claude-code/lsp)
- [cclsp MCP Server](https://github.com/ktnyt/cclsp) - Enhanced LSP with smart position resolution
- [Anthropic: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
