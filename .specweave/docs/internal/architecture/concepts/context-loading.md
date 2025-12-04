# Context Management Architecture

**Purpose**: Achieve efficient context usage through Claude's native progressive disclosure and sub-agent parallelization.

**Key Principle**: Leverage built-in Claude Code mechanisms instead of custom systems.

---

## Why Code Execution, Not MCP (2024/2025 Community Insight)

Anthropic's engineering team published critical findings on AI agent efficiency:

> "LLMs are adept at writing code and developers should take advantage of this strength to build agents that interact with MCP servers more efficiently."
> — [Anthropic Engineering: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)

### The MCP Problem

| Issue | Impact |
|-------|--------|
| **Tool definition bloat** | All tools loaded upfront → context window consumed |
| **Intermediate result duplication** | Data flows through model multiple times (2-3×) |
| **Token explosion** | 150,000 tokens for tasks achievable in 2,000 |

### Example: Meeting Transcript Processing

```
❌ MCP Direct:
1. Fetch transcript (50k tokens into context)
2. Model processes
3. Write to another system (50k tokens AGAIN)
= 100k+ tokens

✅ Code Execution:
1. Agent writes code to fetch + process + write
2. Only summary enters context
= 2k tokens (98% reduction)
```

### SpecWeave's Implementation

SpecWeave applies these insights through:

1. **Progressive Loading**: Skills activate only when keywords match (not all upfront)
2. **Local Processing**: Data filtering happens in execution environment
3. **Sub-Agent Isolation**: Each agent has isolated context (no accumulation)
4. **Deterministic Code**: Claude writes code, code executes deterministically

**Result**: 70-98% token reduction depending on task complexity.

---

## Related Documentation

- [ADR-0002: Agent Types](../adr/0002-agent-types-roles-vs-tools.md) - Architecture decision
- [ADR-0140: Code over MCP Strategy](./adr/0140-code-over-mcp) - Engineering rationale
- **Context Optimization** - Built into SpecWeave core plugin via progressive disclosure pattern
- [Claude Skills Documentation](https://support.claude.com/en/articles/12512176-what-are-skills) - How skills work
- [Agent Skills Engineering Blog](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) - Anthropic's approach
- [Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) - Why code beats tools
- [Sub-Agents Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents) - How sub-agents isolate context
