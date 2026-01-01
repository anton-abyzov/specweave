# ADR-0140: Code Execution Over Direct MCP Tool Calls

**Status**: Accepted (Partially Superseded)
**Date**: 2025-11-25
**Decision Makers**: SpecWeave Core Team
**Note**: LSP operations are EXEMPT - see [ADR-0222](./0222-smart-lsp-integration.md)

## Context

In late 2024/early 2025, the AI development community (including Anthropic's engineering team) published research showing that direct MCP tool calls create significant inefficiencies at scale.

Reference: [Anthropic Engineering: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)

## Problem

Direct MCP tool calls suffer from three critical issues:

| Issue | Impact |
|-------|--------|
| **Tool definition bloat** | Loading all tool definitions upfront consumes context window |
| **Intermediate result duplication** | Data flows through model 2-3× (fetch → process → write) |
| **Token explosion** | 150,000 tokens for tasks achievable in 2,000 |

### Example: 2-Hour Meeting Transcript

```
❌ MCP Direct Approach:
1. Call tool to fetch transcript → 50,000 tokens into context
2. Model processes content
3. Call tool to write summary → transcript flows through AGAIN
= 100,000+ tokens consumed

✅ Code Execution Approach:
1. Agent writes code to fetch, filter, summarize, and write
2. Code executes locally
3. Only final summary (2,000 tokens) enters context
= 98% token reduction
```

## Decision

SpecWeave adopts a **"Code First, Tools Second"** architecture:

1. **Skills over MCP tools**: Skills provide context and patterns; Claude writes code
2. **Progressive loading**: Skills activate on keyword match, not all upfront
3. **Local execution**: Data processing happens in execution environment
4. **Sub-agent isolation**: Each agent has isolated context (no accumulation)

## Exception: LSP Operations

**LSP (Language Server Protocol) operations are EXEMPT from this ADR.**

LSP is fundamentally different from generic MCP tools:

| Generic MCP Tools | LSP Operations |
|------------------|----------------|
| Large tool definitions | Zero overhead (built-in) |
| Bulk data transfer | Minimal responses (~100-5000 bytes) |
| Unpredictable result size | Predictable, small responses |
| Context explosion risk | No bloat risk |

**LSP operations to USE actively:**
- `goToDefinition` - Navigate to implementations
- `findReferences` - Impact analysis for refactoring
- `documentSymbol` - Map file structure
- `hover` - Extract type signatures
- `getDiagnostics` - Code quality checks

See [ADR-0222: Smart LSP Integration](./0222-smart-lsp-integration.md) for full details.

## Consequences

### Positive

- **70-98% token reduction** depending on task complexity
- **Deterministic execution**: Code runs the same way every time
- **Reusable skill library**: Skills accumulate as project knowledge
- **Privacy protection**: Sensitive data stays in execution environment

### Negative

- **Requires sandboxing**: Code execution needs secure environment
- **Learning curve**: Developers must understand skill vs. tool distinction
- **Not always applicable**: Some tasks genuinely need direct tool interaction

## Implementation

### Skill Structure (Correct)

```yaml
---
name: data-processor
description: Processes data files. Activates for CSV, JSON, data analysis.
---

# Data Processing Skill

## Patterns
- Use streaming for large files
- Filter data before returning to context
- Write intermediate results to files
```

### Anti-Pattern (Avoid)

```yaml
# ❌ DON'T: Create MCP tools that fetch entire datasets
# ❌ DON'T: Pass large data through model context
# ❌ DON'T: Chain multiple tools with shared large data
```

## Related Decisions

- [ADR-0002: Agent Types](../adr/0002-agent-types-roles-vs-tools.md)
- [ADR-0127: Agent Chunking Pattern](./0127-agent-chunking-pattern.md)
- [ADR-0133: Skills Must Not Spawn Large Agents](./0133-skills-must-not-spawn-large-agents.md)

## References

- [Anthropic: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Anthropic: Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Code Sub-Agents](https://docs.claude.com/en/docs/claude-code/sub-agents)
